import { FixedBlock, FlexibleTask, CalibrationProfile, BehaviorSignals, CalendarEvent } from "../../types";
import { timeToMinutes, minutesToTime } from "./timeUtils";
import { getCalibratedTaskDuration, getEnergyPriority } from "./capacity";
import { isFixedBlockActiveOnDate } from "./constraints";
import { getTaskCategory } from "../mlEngine";
import { TrainedModelWeights } from "../BehaviorModel";

/**
 * Section 3: Prediction Engine
 * Calculates average free hours, fits backlog tasks sequentially in future days gaps, and stamps est. completions.
 */
export function calculateFuturePredictions(
  backlogTasks: FlexibleTask[],
  fixedBlocks: FixedBlock[],
  dayStartStr = "07:00",
  dayEndStr = "23:00",
  startDateStr: string, // YYYY-MM-DD
  profile?: CalibrationProfile,
  mlModel?: TrainedModelWeights,
  behaviorSignals?: BehaviorSignals,
  calendarEvents?: CalendarEvent[]
): Record<string, { estDate: string; reason: string }> {
  const predictions: Record<string, { estDate: string; reason: string }> = {};
  
  const unassignedTasks = backlogTasks.filter((t) => t.status !== "done" && t.scheduled_date === null);
  
  if (unassignedTasks.length === 0) return predictions;

  const activeProfile = profile || {
    totalCompletions: 0,
    phase: 1 as const,
    underestimateRatio: 1.0,
    optimalWorkGap: 15,
    exerciseRecoveryGap: 25,
    peakFocusTime: "morning" as const,
    completionRate: 100
  };

  const sortedBacklog = [...unassignedTasks].sort((a, b) => {
    if (a.deadline && !b.deadline) return -1;
    if (!a.deadline && b.deadline) return 1;
    if (a.deadline && b.deadline) {
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return getEnergyPriority(b.energy_level) - getEnergyPriority(a.energy_level);
  });

  const [startYear, startMonth, startDayNum] = startDateStr.split("-").map(Number);
  const startDay = new Date(Date.UTC(startYear, startMonth - 1, startDayNum));
  let taskIndex = 0;
  
  for (let d = 0; d < 14; d++) {
    if (taskIndex >= sortedBacklog.length) break;

    const currentSimDate = new Date(startDay);
    currentSimDate.setUTCDate(startDay.getUTCDate() + d);
    const dateQueryStr = currentSimDate.toISOString().split("T")[0];

    const dayFixed = fixedBlocks.filter((b) => isFixedBlockActiveOnDate(b, dateQueryStr));
    const sortedFixed = [...dayFixed].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

    let availableMinutes = 0;
    let lastMins = timeToMinutes(dayStartStr);
    const endMins = timeToMinutes(dayEndStr);

    for (const fb of sortedFixed) {
      const fbStart = timeToMinutes(fb.start_time);
      const fbEnd = timeToMinutes(fb.end_time);

      if (fbStart > lastMins) {
        availableMinutes += fbStart - lastMins;
      }
      lastMins = Math.max(lastMins, fbEnd);
    }
    if (lastMins < endMins) {
      availableMinutes += endMins - lastMins;
    }

    let dailyRemPoints = availableMinutes;

    // Apply capacity reductions from calendar events
    const activeEvents = (calendarEvents || []).filter(e => {
      return dateQueryStr >= e.startDate && dateQueryStr <= e.endDate;
    });
    for (const e of activeEvents) {
      if (e.capacity_reduction_pct !== undefined) {
        dailyRemPoints = Math.round(dailyRemPoints * (1 - e.capacity_reduction_pct / 100));
      }
      if (e.capacity_impact) {
        const impactMins = parseInt(e.capacity_impact, 10);
        if (!isNaN(impactMins)) {
          dailyRemPoints = Math.max(0, dailyRemPoints - impactMins);
        }
      }
    }

    while (taskIndex < sortedBacklog.length && dailyRemPoints > 0) {
      const task = sortedBacklog[taskIndex];
      const taskDuration = getCalibratedTaskDuration(task, activeProfile);

      // Add transition gap cost of optimalWorkGap
      const totalCost = taskDuration + activeProfile.optimalWorkGap;

      if (totalCost <= dailyRemPoints || taskDuration <= dailyRemPoints) {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const dayOfWeek = dayNames[currentSimDate.getUTCDay()];
        
        predictions[task.id] = {
          estDate: dateQueryStr,
          reason: `Est. done: ${dayOfWeek} (${d === 0 ? "Today" : d === 1 ? "Tomorrow" : `${d} days`})`
        };
        dailyRemPoints -= Math.min(dailyRemPoints, totalCost);
        taskIndex++;
      } else {
        break;
      }
    }
  }

  while (taskIndex < sortedBacklog.length) {
    const task = sortedBacklog[taskIndex];
    predictions[task.id] = {
      estDate: "Future",
      reason: "Est. done: Pushed to next 2 weeks"
    };
    taskIndex++;
  }

  return predictions;
}


/**
 * Execution Engine: Simulate Delay Cost
 * Pure function — given a list of scheduled items, a task to delay/skip, and the delay in minutes,
 * calculate the cascade: which items shift, how much sleep is lost, how much free time disappears.
 * delayMins = 0 means skip (task is removed, no cascade shift, but backlog increases).
 */
