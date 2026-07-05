import { FlexibleTask, EnergyLevel, CalibrationProfile, BehaviorSignals, DelayCostResult, ConsequenceCore, ScheduledItem } from "../../types";
import { timeToMinutes, minutesToTime } from "./timeUtils";
import { getTaskCategory } from "../mlEngine";

export function getEnergyPriority(level: EnergyLevel): number {
  switch (level) {
    case "high": return 3;
    case "medium": return 2;
    case "low": return 1;
    default: return 0;
  }
}

/**
 * Programmatic Scheduling Engine (Section 2)
 */
/**
 * Programmatic Scheduling Engine (Section 2)
 */
export function getCalibratedTaskDuration(task: FlexibleTask, activeProfile: CalibrationProfile): number {
  const category = task.category || getTaskCategory(task.title);
  let biasMultiplier = activeProfile.underestimateRatio;
  
  if (activeProfile.phase === 2 && activeProfile.categoryBiases) {
    const biasObj = activeProfile.categoryBiases.find(b => b.category === category);
    if (biasObj) {
      biasMultiplier = biasObj.bias;
    }
  }
  
  let duration = activeProfile.phase === 2
    ? Math.round(task.duration_minutes * biasMultiplier)
    : task.duration_minutes;
    
  if (task.complexity && task.complexity > 5) {
    duration = Math.round(duration * (1 + Math.pow(task.complexity, 2) * 0.005));
  }
  
  return duration;
}

export function simulateDelayCost(
  items: ScheduledItem[],
  affectedTaskId: string,
  delayMins: number,   // 0 for Skip (removes task), > 0 for Break/Delay
  dayEndStr: string,
  todayFlexCount: number,  // total flex tasks today (for streak break detection)
  tasks: FlexibleTask[],
  streak: number
): DelayCostResult {
  const dayEndMins = timeToMinutes(dayEndStr);
  const taskIdx = items.findIndex(i => i.id === affectedTaskId);
  const affectedTask = tasks.find(t => t.id === affectedTaskId);

  const emptyCore: ConsequenceCore = {
    time_shift_mins: 0,
    backlog_mins: 0,
    streak_break: false,
    blocked_task_ids: [],
    deadline_risk_delta: 0
  };

  if (taskIdx === -1) {
    return {
      shiftedTasks: [],
      sleepShiftMins: 0,
      freeTimeLostMins: 0,
      streakBreaks: false,
      backlogIncrease: 0,
      core: emptyCore
    };
  }

  const isSkip = delayMins === 0;
  const shiftedTasks: { id: string; title: string; newStart: string; oldStart: string }[] = [];
  let sleepShiftMins = 0;
  let freeTimeLostMins = 0;

  // 1. Blocked task IDs (Task Graph structural lookup)
  const blocked_task_ids: string[] = [];
  if (isSkip && affectedTask && affectedTask.blocks) {
    blocked_task_ids.push(...affectedTask.blocks);
  }

  // 2. Deadline pressure risk delta calculation
  let deadline_risk_delta = 0;
  if (affectedTask && affectedTask.deadline) {
    const todayMs = new Date().setHours(0, 0, 0, 0);
    const deadlineMs = new Date(affectedTask.deadline).setHours(0, 0, 0, 0);
    const daysRemaining = Math.round((deadlineMs - todayMs) / (1000 * 60 * 60 * 24));
    
    if (daysRemaining <= 0) {
      deadline_risk_delta = isSkip ? 10 : 6;
    } else if (daysRemaining === 1) {
      deadline_risk_delta = isSkip ? 8 : 4;
    } else if (daysRemaining <= 3) {
      deadline_risk_delta = isSkip ? 5 : 2;
    } else {
      deadline_risk_delta = isSkip ? 2 : 1;
    }
  }
  if (blocked_task_ids.length > 0) {
    deadline_risk_delta = Math.min(10, deadline_risk_delta + 3);
  }

  if (isSkip) {
    const duration = items[taskIdx].duration_minutes;
    const streakBreaks = todayFlexCount <= 1 && streak > 0;
    
    const coreResult: ConsequenceCore = {
      time_shift_mins: 0,
      backlog_mins: duration,
      streak_break: streakBreaks,
      blocked_task_ids,
      deadline_risk_delta
    };

    return {
      shiftedTasks: [],
      sleepShiftMins: 0,
      freeTimeLostMins: duration, // productive time lost
      streakBreaks,
      backlogIncrease: 1,
      core: coreResult
    };
  }

  // Delay: all items AFTER the affected task shift by delayMins
  const itemsAfter = items.slice(taskIdx + 1);
  let cumulativeShift = delayMins;

  for (const item of itemsAfter) {
    const oldStartMins = timeToMinutes(item.start_time);
    const newStartMins = oldStartMins + cumulativeShift;

    if (newStartMins < dayEndMins) {
      shiftedTasks.push({
        id: item.id,
        title: item.title,
        oldStart: item.start_time,
        newStart: minutesToTime(newStartMins),
      });
    }
  }

  // Check if the last item now overflows the day end
  if (items.length > 0) {
    const lastItem = items[items.length - 1];
    const lastEndMins = timeToMinutes(lastItem.end_time) + cumulativeShift;
    if (lastEndMins > dayEndMins) {
      sleepShiftMins = lastEndMins - dayEndMins;
    }
  }

  freeTimeLostMins = delayMins;

  const coreResult: ConsequenceCore = {
    time_shift_mins: sleepShiftMins, // time pushed to sleep
    backlog_mins: 0,
    streak_break: false,
    blocked_task_ids,
    deadline_risk_delta
  };

  return {
    shiftedTasks,
    sleepShiftMins,
    freeTimeLostMins,
    streakBreaks: false,
    backlogIncrease: 0,
    core: coreResult
  };
}

/**
 * Execution Engine: Action Risk Classification
 * Determines whether to show a consequence card (high-risk) or execute silently (low-risk).
 * Low-risk actions feel instant. High-risk actions pause and inform before committing.
 */
export function getActionRisk(
  action: "break" | "move" | "skip",
  breakMins?: number
): "low" | "high" {
  if (action === "move") return "low";        // user still does the task, just later
  if (action === "break" && (breakMins ?? 0) <= 15) return "low";  // tiny break, no friction
  return "high";                              // skip or long break → show consequence first
}

