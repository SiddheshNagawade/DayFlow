import { FlexibleTask, TaskExecutionLog, WeeklyEvalSnapshot } from "../types";

// Helper to get Monday of the week for a given date object
export function getMondayOfDate(d: Date): string {
  const date = new Date(d.getTime());
  const day = date.getDay();
  // Adjust day: Sunday is 0, we want Monday to be 1. Sunday should diff by -6.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(date.setDate(diff));
  return monday.toISOString().split("T")[0];
}

// Calculate the completion streak ending on a specific Sunday date
export function calculateStreakForDate(tasks: FlexibleTask[], refDateStr: string): number {
  let streak = 0;
  // Parse date safely
  const parts = refDateStr.split("-");
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  const refDate = new Date(year, month, day);

  for (let i = 0; i < 30; i++) {
    const target = new Date(refDate.getTime());
    target.setDate(refDate.getDate() - i);
    const targetStr = target.toISOString().split("T")[0];
    const dayTasks = tasks.filter(t => t.scheduled_date === targetStr);
    
    if (dayTasks.length > 0) {
      const allDone = dayTasks.every(t => t.status === "done");
      if (allDone) {
        streak++;
      } else {
        break; // streak broke!
      }
    } else {
      if (streak > 0) {
        continue; // carry over streak if no tasks scheduled
      }
    }
  }
  return streak;
}

export function computeWeeklySnapshot(
  tasks: FlexibleTask[],
  logs: TaskExecutionLog[],
  weekStartStr: string
): WeeklyEvalSnapshot {
  // weekStartStr is Monday YYYY-MM-DD
  const startParts = weekStartStr.split("-");
  const startYear = parseInt(startParts[0], 10);
  const startMonth = parseInt(startParts[1], 10) - 1;
  const startDay = parseInt(startParts[2], 10);
  const startDate = new Date(startYear, startMonth, startDay);
  
  const endDate = new Date(startDate.getTime());
  endDate.setDate(startDate.getDate() + 6); // Sunday of the week
  const weekEndStr = endDate.toISOString().split("T")[0];

  // 1. Completion Rate
  const logsInWeek = logs.filter(l => l.date >= weekStartStr && l.date <= weekEndStr);
  const completedLogs = logsInWeek.filter(l => l.completed);
  const completionRate = logsInWeek.length > 0 
    ? Math.round((completedLogs.length / logsInWeek.length) * 100) / 100
    : 0;

  // 2. Carry Over Rate (average carry over count per task scheduled in this week)
  const tasksInWeek = tasks.filter(t => t.scheduled_date && t.scheduled_date >= weekStartStr && t.scheduled_date <= weekEndStr);
  const carryOverRate = tasksInWeek.length > 0
    ? Math.round((tasksInWeek.reduce((sum, t) => sum + (t.carry_over_count || 0), 0) / tasksInWeek.length) * 100) / 100
    : 0;

  // 3. Planning Accuracy (actual/planned ratio for completed tasks in this week)
  const completedLogsWithDuration = logsInWeek.filter(l => l.completed && l.actualDuration && l.plannedDuration > 0);
  let planningAccuracy = 1.0;
  if (completedLogsWithDuration.length > 0) {
    const totalPlanned = completedLogsWithDuration.reduce((sum, l) => sum + l.plannedDuration, 0);
    const totalActual = completedLogsWithDuration.reduce((sum, l) => sum + (l.actualDuration || 0), 0);
    planningAccuracy = totalPlanned > 0 
      ? Math.round((totalActual / totalPlanned) * 100) / 100
      : 1.0;
  }

  // 4. Streak Days (streak value ending on Sunday of this week)
  const streakDays = calculateStreakForDate(tasks, weekEndStr);

  // 5. Suggestion Acceptance Rate
  let aiSuggestionAcceptanceRate = 1.0; // default to 1.0 if no suggestions proposed
  try {
    const eventsData = localStorage.getItem("dayflow_ai_suggestion_events");
    if (eventsData) {
      const events = JSON.parse(eventsData);
      const startMs = startDate.getTime();
      // next Monday boundary
      const nextMon = new Date(startDate.getTime());
      nextMon.setDate(nextMon.getDate() + 7);
      const endMs = nextMon.getTime();
      
      const weekEvents = events.filter((e: any) => e.timestamp >= startMs && e.timestamp < endMs);
      const totalProposed = weekEvents.reduce((sum: number, e: any) => sum + (e.proposedCount || 0), 0);
      const totalAccepted = weekEvents.reduce((sum: number, e: any) => sum + (e.acceptedCount || 0), 0);
      
      if (totalProposed > 0) {
        aiSuggestionAcceptanceRate = Math.round((totalAccepted / totalProposed) * 100) / 100;
      }
    }
  } catch (e) {
    console.error("Failed to compute suggestion acceptance rate:", e);
  }

  // 6. Personal Growth Score (PGS) for the week
  const compFactor = completionRate * 100;
  let sssFactor = 85;
  if (logsInWeek.length > 0) {
    const moved = logsInWeek.filter(l => l.skipped || (tasks.find(t => t.id === l.taskId)?.delay_count || 0) > 0).length;
    sssFactor = Math.round(((logsInWeek.length - moved) / logsInWeek.length) * 100);
  }
  const planAccuracyFactor = Math.max(0, 100 - Math.min(50, Math.abs(1 - planningAccuracy) * 100));
  const carryOverFactor = Math.max(0, 100 - Math.min(100, carryOverRate * 25));

  const pgsScoreVal = Math.round(
    compFactor * 0.3 +
    sssFactor * 0.25 +
    planAccuracyFactor * 0.25 +
    carryOverFactor * 0.2
  );

  return {
    weekStart: weekStartStr,
    completionRate,
    carryOverRate,
    planningAccuracy,
    streakDays,
    aiSuggestionAcceptanceRate,
    pgsScore: pgsScoreVal,
  };
}

export function saveWeeklySnapshot(snap: WeeklyEvalSnapshot): void {
  const history = loadEvalHistory();
  const existingIdx = history.findIndex(h => h.weekStart === snap.weekStart);
  if (existingIdx !== -1) {
    history[existingIdx] = snap;
  } else {
    history.push(snap);
  }
  // Sort history chronologically by weekStart
  history.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  localStorage.setItem("dayflow_eval_history", JSON.stringify(history));
}

export function loadEvalHistory(): WeeklyEvalSnapshot[] {
  try {
    const data = localStorage.getItem("dayflow_eval_history");
    if (!data) return [];
    return JSON.parse(data) as WeeklyEvalSnapshot[];
  } catch (e) {
    console.error("Failed to load evaluation history:", e);
    return [];
  }
}

export function getImprovementSummary(history: WeeklyEvalSnapshot[]): string {
  if (history.length === 0) {
    return "No evaluation history available yet. Complete a full week to see trends!";
  }
  
  const first = history[0];
  const last = history[history.length - 1];
  const firstPgs = first.pgsScore || Math.round(first.completionRate * 100 * 0.5 + 40);
  const lastPgs = last.pgsScore || Math.round(last.completionRate * 100 * 0.5 + 40);
  const diff = lastPgs - firstPgs;

  if (history.length === 1) {
    return `Week 1 PGS Baseline: ${firstPgs} points`;
  }
  
  const arrow = diff >= 0 ? "↑" : "↓";
  const sign = diff >= 0 ? "+" : "";
  
  return `Week 1 PGS: ${firstPgs} → Week ${history.length} PGS: ${lastPgs} ${arrow} (${sign}${diff} points)`;
}

// Automatically backfills snapshots for completed weeks
export function checkAndGenerateWeeklySnapshot(
  tasks: FlexibleTask[],
  logs: TaskExecutionLog[],
  selectedDateStr: string
): void {
  if (tasks.length === 0 && logs.length === 0) return;

  // Determine the earliest task/log date to start evaluation history
  let earliestDateStr = selectedDateStr;
  
  tasks.forEach(t => {
    if (t.scheduled_date && t.scheduled_date < earliestDateStr) {
      earliestDateStr = t.scheduled_date;
    }
  });
  logs.forEach(l => {
    if (l.date && l.date < earliestDateStr) {
      earliestDateStr = l.date;
    }
  });

  // Monday of the earliest week
  const startParts = earliestDateStr.split("-");
  const startYear = parseInt(startParts[0], 10);
  const startMonth = parseInt(startParts[1], 10) - 1;
  const startDay = parseInt(startParts[2], 10);
  const startDate = new Date(startYear, startMonth, startDay);
  let currentMondayStr = getMondayOfDate(startDate);

  // Monday of the current week (uncompleted week)
  const selParts = selectedDateStr.split("-");
  const selYear = parseInt(selParts[0], 10);
  const selMonth = parseInt(selParts[1], 10) - 1;
  const selDay = parseInt(selParts[2], 10);
  const selDate = new Date(selYear, selMonth, selDay);
  const currentWeekMondayStr = getMondayOfDate(selDate);

  const history = loadEvalHistory();
  let hasChanges = false;

  // Iterate week-by-week up to (but not including) the current uncompleted week
  while (currentMondayStr < currentWeekMondayStr) {
    const exists = history.some(h => h.weekStart === currentMondayStr);
    
    // We compute or update the snapshot for this past week
    const snap = computeWeeklySnapshot(tasks, logs, currentMondayStr);
    
    // Save/update in history
    const existingIdx = history.findIndex(h => h.weekStart === currentMondayStr);
    if (existingIdx !== -1) {
      // Overwrite/update if stats changed (e.g. backdated changes)
      history[existingIdx] = snap;
    } else {
      history.push(snap);
    }
    hasChanges = true;

    // Move to next Monday
    const nextParts = currentMondayStr.split("-");
    const nextYear = parseInt(nextParts[0], 10);
    const nextMonth = parseInt(nextParts[1], 10) - 1;
    const nextDay = parseInt(nextParts[2], 10);
    const nextDate = new Date(nextYear, nextMonth, nextDay + 7);
    currentMondayStr = getMondayOfDate(nextDate);
  }

  if (hasChanges) {
    history.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    localStorage.setItem("dayflow_eval_history", JSON.stringify(history));
    
    if (history.length > 0) {
      localStorage.setItem("dayflow_last_eval_week", history[history.length - 1].weekStart);
    }
  }
}

export interface AISuggestionEvent {
  timestamp: number;
  proposedCount: number;
  acceptedCount: number;
}

export function logProposedSuggestions(count: number): void {
  try {
    const data = localStorage.getItem("dayflow_ai_suggestion_events");
    const events: AISuggestionEvent[] = data ? JSON.parse(data) : [];
    // Clean old events older than 90 days to keep storage lean
    const cutoff = Date.now() - 90 * 86400000;
    const filtered = events.filter(e => e.timestamp >= cutoff);
    
    // Add new event
    filtered.push({
      timestamp: Date.now(),
      proposedCount: count,
      acceptedCount: 0
    });
    localStorage.setItem("dayflow_ai_suggestion_events", JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to log proposed suggestions:", e);
  }
}

export function logAcceptedSuggestions(count: number): void {
  try {
    const data = localStorage.getItem("dayflow_ai_suggestion_events");
    if (!data) return;
    const events: AISuggestionEvent[] = JSON.parse(data);
    if (events.length === 0) return;
    
    // Update the last event
    const last = events[events.length - 1];
    last.acceptedCount = count;
    localStorage.setItem("dayflow_ai_suggestion_events", JSON.stringify(events));
  } catch (e) {
    console.error("Failed to log accepted suggestions:", e);
  }
}

