import { FixedBlock, FlexibleTask, TimeGap, ScheduledItem, DaySchedule, EnergyLevel, CalibrationProfile, DelayCostResult, ConsequenceCore, RoutineBlock } from "../types";
import { calculateAdvancedCalibration, getTaskCategory } from "./mlEngine";

// Helper to convert HH:MM string to minutes since midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

// Helper to convert minutes since midnight to HH:MM string
export function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}`;
}

// Helper to check if a fixed block is active on a given date (YYYY-MM-DD)
export function isFixedBlockActiveOnDate(block: FixedBlock, dateStr: string): boolean {
  if (block.repeats === "daily") return true;
  
  const [year, month, day] = dateStr.split("-").map(Number);
  const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();

  if (block.repeats === "weekdays") {
    return dayOfWeek >= 1 && dayOfWeek <= 5;
  }
  
  if (block.repeats === "custom") {
    return !!block.daysOfWeek?.includes(dayOfWeek);
  }
  
  if (block.repeats === "none") {
    return block.date === dateStr;
  }
  
  return false;
}

// Map energy level to priority (higher matches morning gaps better)
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

export function calculateCalibrationProfile(tasks: FlexibleTask[]): CalibrationProfile {
  return calculateAdvancedCalibration(tasks);
}

export function generateSchedule(
  dateStr: string,
  fixedBlocks: FixedBlock[],
  flexibleTasks: FlexibleTask[],
  dayStartStr = "07:00",
  dayEndStr = "23:00",
  emergencyTime: string | null = null,
  emergencyDurationMinutes = 60,
  profile?: CalibrationProfile,
  delayPatterns?: { category: string; problemHour: number; avgDelays: number }[],
  softRoutines?: RoutineBlock[]
): DaySchedule {
  const finalScheduledItems: ScheduledItem[] = [];
  const conflicts: FlexibleTask[] = [];

  const activeProfile = profile || {
    totalCompletions: 0,
    phase: 1 as const,
    underestimateRatio: 1.0,
    optimalWorkGap: 15,
    exerciseRecoveryGap: 25,
    peakFocusTime: "morning" as const,
    completionRate: 100
  };

  const activeSoftRoutines = (softRoutines || []).filter(r => {
    const [year, month, day] = dateStr.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return r.daysOfWeek.includes(dayOfWeek) && r.rigidity === "soft";
  });

  // 1. Get active fixed blocks for today
  const activeFixed = fixedBlocks.filter((b) => isFixedBlockActiveOnDate(b, dateStr));

  // Determine actual schedule window
  let windowStartMins = timeToMinutes(dayStartStr);
  const windowEndMins = timeToMinutes(dayEndStr);

  // If there is an emergency, we keep everything before the emergency locked/unchanged,
  // and re-evaluate only the timeframe after the emergency.
  let emergencyMins: number | null = null;
  if (emergencyTime) {
    emergencyMins = timeToMinutes(emergencyTime);
    
    // Add all existing scheduled items that started before emergency
    const preEmergencyFixed = activeFixed.filter((b) => timeToMinutes(b.start_time) < (emergencyMins as number));
    for (const fb of preEmergencyFixed) {
      finalScheduledItems.push({
        id: fb.id,
        type: "fixed",
        title: fb.title,
        start_time: fb.start_time,
        end_time: fb.end_time,
        duration_minutes: timeToMinutes(fb.end_time) - timeToMinutes(fb.start_time),
        locked: true,
        status: "fixed"
      });
    }

    // Insert the emergency block itself
    const emergencyEndMins = Math.min((emergencyMins as number) + emergencyDurationMinutes, windowEndMins);
    finalScheduledItems.push({
      id: "emergency_block_" + Date.now(),
      type: "fixed",
      title: "🚨 Emergency Handling",
      start_time: emergencyTime,
      end_time: minutesToTime(emergencyEndMins),
      duration_minutes: emergencyEndMins - (emergencyMins as number),
      locked: true,
      status: "fixed",
    });

    // Advance scheduling window start to after the emergency
    windowStartMins = Math.max(windowStartMins, emergencyEndMins);
  } else {
    // Normal schedule start: place all active fixed blocks
    for (const fb of activeFixed) {
      finalScheduledItems.push({
        id: fb.id,
        type: "fixed",
        title: fb.title,
        start_time: fb.start_time,
        end_time: fb.end_time,
        duration_minutes: timeToMinutes(fb.end_time) - timeToMinutes(fb.start_time),
        locked: true,
        status: "fixed"
      });
    }
  }

  // 2. Calculate remaining free gaps between windowStartMins and windowEndMins, accounting for any fixed blocks
  const futureFixed = activeFixed.filter((fb) => {
    const fs = timeToMinutes(fb.start_time);
    const fe = timeToMinutes(fb.end_time);
    return fs >= windowStartMins && fe <= windowEndMins;
  });

  // Sort by start time
  const sortedFixed = [...futureFixed].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  // Compute gaps
  const gaps: TimeGap[] = [];
  let currentMins = windowStartMins;

  for (const fb of sortedFixed) {
    const fbStart = timeToMinutes(fb.start_time);
    const fbEnd = timeToMinutes(fb.end_time);

    if (fbStart > currentMins) {
      gaps.push({
        start: minutesToTime(currentMins),
        end: fb.start_time,
        duration_minutes: fbStart - currentMins,
      });
    }
    currentMins = Math.max(currentMins, fbEnd);
  }

  if (currentMins < windowEndMins) {
    gaps.push({
      start: minutesToTime(currentMins),
      end: dayEndStr,
      duration_minutes: windowEndMins - currentMins,
    });
  }

  // 3. Sort candidate Flexible Tasks for scheduling
  const candidateTasks = flexibleTasks.filter(
    (t) => (t.status === "scheduled" || t.status === "backlog") && (t.scheduled_date === dateStr || t.scheduled_date === null)
  );

  // --- STEP 3a: Handle PINNED tasks first (user manually dragged to a specific time) ---
  const pinnedTasks = candidateTasks.filter(t => t.pinned_start_time);
  const unpinnedTasks = candidateTasks.filter(t => !t.pinned_start_time);

  for (const task of pinnedTasks) {
    const taskDuration = getCalibratedTaskDuration(task, activeProfile);
    const pinnedStartMins = timeToMinutes(task.pinned_start_time!);
    const pinnedEndMins = pinnedStartMins + taskDuration;

    if (pinnedEndMins > windowEndMins || pinnedStartMins < windowStartMins) {
      conflicts.push(task);
      continue;
    }

    finalScheduledItems.push({
      id: task.id,
      type: "flexible",
      title: task.title,
      start_time: task.pinned_start_time!,
      end_time: minutesToTime(pinnedEndMins),
      duration_minutes: taskDuration,
      energy_level: task.energy_level,
      locked: false,
      status: task.status === "backlog" ? "scheduled" : task.status,
      deadline: task.deadline,
      pinned: true,
      task_nature: task.task_nature,
      carried_over_from: task.carried_over_from,
      carry_over_count: task.carry_over_count,
    });

    // Split/trim affected gaps (handles partial and full overlaps robustly)
    const newGaps: TimeGap[] = [];
    for (const gap of gaps) {
      const gStart = timeToMinutes(gap.start);
      const gEnd = timeToMinutes(gap.end);
      
      // No overlap
      if (gEnd <= pinnedStartMins || gStart >= pinnedEndMins) {
        newGaps.push(gap);
      } 
      // Partial or full overlap
      else {
        const before = pinnedStartMins - gStart;
        const after = gEnd - pinnedEndMins;
        
        if (before > 0) {
          newGaps.push({
            start: gap.start,
            end: minutesToTime(pinnedStartMins),
            duration_minutes: before
          });
        }
        if (after > 0) {
          newGaps.push({
            start: minutesToTime(pinnedEndMins),
            end: gap.end,
            duration_minutes: after
          });
        }
      }
    }
    gaps.length = 0;
    gaps.push(...newGaps);
  }

  // --- STEP 3b: Sort unpinned tasks by priority → deadline → energy ---
  const sortedTasks = [...unpinnedTasks].sort((a, b) => {
    // Explicit priority order (set by drag-and-drop)
    const aPri = a.priority ?? 9999;
    const bPri = b.priority ?? 9999;
    if (aPri !== bPri) return aPri - bPri;

    const aHasDeadline = a.deadline !== null;
    const bHasDeadline = b.deadline !== null;
    if (aHasDeadline && !bHasDeadline) return -1;
    if (!aHasDeadline && bHasDeadline) return 1;
    if (aHasDeadline && bHasDeadline) {
      const aTime = new Date(a.deadline!).getTime();
      const bTime = new Date(b.deadline!).getTime();
      if (aTime !== bTime) return aTime - bTime;
    }

    const aEnergy = getEnergyPriority(a.energy_level);
    const bEnergy = getEnergyPriority(b.energy_level);
    return bEnergy - aEnergy;
  });

  // Helper: given peakFocusTime, returns preferred gap hour range [start, end]
  const getPeakRange = (): [number, number] => {
    switch (activeProfile.peakFocusTime) {
      case "morning":   return [7 * 60, 12 * 60];
      case "afternoon": return [12 * 60, 17 * 60];
      case "evening":   return [17 * 60, 22 * 60];
      default:          return [7 * 60, 12 * 60];
    }
  };

  // In Phase 2, re-order gaps so that the user's peak window comes first
  // for high-energy tasks, preserving original order for low/medium energy.
  const isProblematicSlot = (gapStartMins: number, category: string): boolean => {
    if (!delayPatterns) return false;
    const hour = Math.floor(gapStartMins / 60);
    return delayPatterns.some(p => p.category === category && p.problemHour === hour);
  };

  // Order gaps: normal peak gaps -> other normal gaps -> soft routine overlap gaps -> problematic gaps
  const orderGapsForTask = (task: FlexibleTask): TimeGap[] => {
    const category = task.category || getTaskCategory(task.title);
    
    const checkProblem = (g: TimeGap) => {
      const mid = (timeToMinutes(g.start) + timeToMinutes(g.end)) / 2;
      return isProblematicSlot(mid, category);
    };

    const checkSoftOverlap = (g: TimeGap) => {
      const gStart = timeToMinutes(g.start);
      const gEnd = timeToMinutes(g.end);
      return activeSoftRoutines.some(r => {
        const rStart = timeToMinutes(r.startTime);
        const rEnd = timeToMinutes(r.endTime);
        return gStart < rEnd && gEnd > rStart;
      });
    };

    // Partition gaps into good, soft overlap, and problem gaps
    const goodGaps: TimeGap[] = [];
    const softOverlapGaps: TimeGap[] = [];
    const problemGaps: TimeGap[] = [];

    for (const g of gaps) {
      if (checkProblem(g)) {
        problemGaps.push(g);
      } else if (checkSoftOverlap(g)) {
        softOverlapGaps.push(g);
      } else {
        goodGaps.push(g);
      }
    }

    const sortPeakOther = (arr: TimeGap[]): TimeGap[] => {
      if (activeProfile.phase < 2 || task.energy_level !== "high") {
        return arr;
      }
      const [peakStart, peakEnd] = getPeakRange();
      const peak = arr.filter(g => {
        const mid = (timeToMinutes(g.start) + timeToMinutes(g.end)) / 2;
        return mid >= peakStart && mid < peakEnd;
      });
      const other = arr.filter(g => {
        const mid = (timeToMinutes(g.start) + timeToMinutes(g.end)) / 2;
        return !(mid >= peakStart && mid < peakEnd);
      });
      return [...peak, ...other];
    };

    return [
      ...sortPeakOther(goodGaps),
      ...sortPeakOther(softOverlapGaps),
      ...sortPeakOther(problemGaps)
    ];
  };

  // 4. Fill gaps with flexible tasks (peak-aware in Phase 2, with transition buffers)
  for (const task of sortedTasks) {
    let slotted = false;
    const taskDuration = getCalibratedTaskDuration(task, activeProfile);

    // Get gaps ordered by preference for this task's energy level
    const orderedGaps = orderGapsForTask(task);

    for (const preferredGap of orderedGaps) {
      // Find actual index in the mutable gaps array
      const i = gaps.findIndex(g => g.start === preferredGap.start && g.end === preferredGap.end);
      if (i === -1) continue;

      const gap = gaps[i];
      const gapStartMins = timeToMinutes(gap.start);
      const gapEndMins = timeToMinutes(gap.end);

      // Determine required transition buffer
      let requiredBuffer = 0;

      // Find if any scheduled item ends at or close to gapStartMins
      const precedingItem = finalScheduledItems.find(
        (item) => Math.abs(timeToMinutes(item.end_time) - gapStartMins) <= 2
      );

      if (precedingItem) {
        const precedingCategory = getTaskCategory(precedingItem.title);
        const currentCategory = task.category || getTaskCategory(task.title);
        
        if (activeProfile.phase === 2 && activeProfile.transitionGaps) {
          const transObj = activeProfile.transitionGaps.find(
            g => g.fromType === precedingCategory && g.toType === currentCategory
          );
          if (transObj) {
            requiredBuffer = transObj.optimalGap;
          } else {
            requiredBuffer = precedingCategory === "exercise"
              ? activeProfile.exerciseRecoveryGap
              : activeProfile.optimalWorkGap;
          }
        } else {
          requiredBuffer = precedingCategory === "exercise"
            ? activeProfile.exerciseRecoveryGap
            : activeProfile.optimalWorkGap;
        }
      }

      if (gapEndMins - gapStartMins >= requiredBuffer + taskDuration) {
        const taskStartMins = gapStartMins + requiredBuffer;
        const taskEndMins = taskStartMins + taskDuration;

        finalScheduledItems.push({
          id: task.id,
          type: "flexible",
          title: task.title,
          start_time: minutesToTime(taskStartMins),
          end_time: minutesToTime(taskEndMins),
          duration_minutes: taskDuration,
          energy_level: task.energy_level,
          locked: false,
          status: task.status === "backlog" ? "scheduled" : task.status,
          deadline: task.deadline,
          task_nature: task.task_nature,
          carried_over_from: task.carried_over_from,
          carry_over_count: task.carry_over_count,
        });

        // Update the gap: shrink or remove
        if (taskEndMins < gapEndMins) {
          gaps[i] = {
            start: minutesToTime(taskEndMins),
            end: gap.end,
            duration_minutes: gapEndMins - taskEndMins,
          };
        } else {
          gaps.splice(i, 1);
        }

        slotted = true;
        break;
      }
    }

    if (!slotted) {
      conflicts.push(task);
    }
  }

  // 5. Post-process: slot remaining soft routines into the remaining gaps
  for (const r of activeSoftRoutines) {
    const rStart = timeToMinutes(r.startTime);
    const rEnd = timeToMinutes(r.endTime);
    const rDuration = rEnd - rStart;

    let schStart: number | null = null;
    let schEnd: number | null = null;

    // A. Try to place at preferred time
    const preferredGap = gaps.find(g => {
      const gStart = timeToMinutes(g.start);
      const gEnd = timeToMinutes(g.end);
      return gStart <= rStart && gEnd >= rEnd;
    });

    if (preferredGap) {
      schStart = rStart;
      schEnd = rEnd;
    } else {
      // B. Try to find the first gap at or after preferred start time
      const laterGap = gaps.find(g => {
        const gStart = timeToMinutes(g.start);
        const gEnd = timeToMinutes(g.end);
        return gStart >= rStart && (gEnd - gStart) >= rDuration;
      });
      if (laterGap) {
        schStart = timeToMinutes(laterGap.start);
        schEnd = schStart + rDuration;
      } else {
        // C. Try to find the first gap anywhere
        const anyGap = gaps.find(g => {
          const gStart = timeToMinutes(g.start);
          const gEnd = timeToMinutes(g.end);
          return (gEnd - gStart) >= rDuration;
        });
        if (anyGap) {
          schStart = timeToMinutes(anyGap.start);
          schEnd = schStart + rDuration;
        }
      }
    }

    if (schStart !== null && schEnd !== null) {
      finalScheduledItems.push({
        id: r.id,
        type: "fixed",
        title: r.title,
        start_time: minutesToTime(schStart),
        end_time: minutesToTime(schEnd),
        duration_minutes: rDuration,
        locked: false,
        status: "fixed",
        isRoutine: true,
        rigidity: "soft"
      });

      // Split the gap
      const targetStart = schStart;
      const targetEnd = schEnd;
      const gapIndex = gaps.findIndex(g => timeToMinutes(g.start) <= targetStart && timeToMinutes(g.end) >= targetEnd);
      if (gapIndex !== -1) {
        const gap = gaps[gapIndex];
        const gStart = timeToMinutes(gap.start);
        const gEnd = timeToMinutes(gap.end);
        const newGaps: TimeGap[] = [];
        if (targetStart > gStart) {
          newGaps.push({
            start: gap.start,
            end: minutesToTime(targetStart),
            duration_minutes: targetStart - gStart
          });
        }
        if (gEnd > targetEnd) {
          newGaps.push({
            start: minutesToTime(targetEnd),
            end: gap.end,
            duration_minutes: gEnd - targetEnd
          });
        }
        gaps.splice(gapIndex, 1, ...newGaps);
      }
    }
  }

  // Sort final items by start_time for sequential list representation
  finalScheduledItems.sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));

  return {
    items: finalScheduledItems,
    conflicts,
  };
}

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
  profile?: CalibrationProfile
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
