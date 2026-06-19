/**
 * Pattern Engine — System 3 of DayFlow V3
 *
 * Pure math. No AI. No hardcoded circadian defaults.
 * Input:  TaskExecutionLog[] + FlexibleTask[] (Memory Engine output)
 * Output: BehaviorSignals (compact, confidence-gated behavioral model)
 *
 * Contract: this is the ONLY source that feeds AI context.
 * AI never receives raw task arrays or raw log arrays.
 */

import { FlexibleTask, TaskExecutionLog, BehaviorSignals, DataReliability } from "../types";
import { getTaskCategory } from "./mlEngine";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

// ─── Data Reliability ────────────────────────────────────────────────────────

function computeDataReliability(
  tasks: FlexibleTask[],
  windowDays = 30
): DataReliability {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const recent = tasks.filter(
    t => t.scheduled_date && t.scheduled_date >= cutoffStr
  );

  const total = recent.length;
  if (total === 0) {
    return {
      loggingConsistency: 0,
      completionConfidence: 0,
      scheduleAccuracy: 0,
      overallScore: 0,
      verdict: "unreliable",
    };
  }

  // How many tasks were explicitly resolved (not left in limbo as "scheduled")?
  const resolved = recent.filter(
    t => t.status === "done" || t.status === "skipped" || t.status === "expired"
  ).length;
  const loggingConsistency = clamp(resolved / total, 0, 1);

  // Trust in completion data
  const completionConfidence = loggingConsistency < 0.3
    ? loggingConsistency * 0.6
    : loggingConsistency * 0.9;

  // How many done tasks have an actual_start_time recorded?
  const done = recent.filter(t => t.status === "done");
  const withTimestamp = done.filter(t => t.actual_start_time).length;
  const scheduleAccuracy = done.length > 0
    ? clamp(withTimestamp / done.length, 0, 1)
    : 0;

  const overallScore = clamp(
    loggingConsistency * 0.5 + completionConfidence * 0.3 + scheduleAccuracy * 0.2,
    0, 1
  );

  const verdict: DataReliability["verdict"] =
    overallScore >= 0.7 ? "trusted"
    : overallScore >= 0.4 ? "partial"
    : "unreliable";

  return {
    loggingConsistency: Math.round(loggingConsistency * 100) / 100,
    completionConfidence: Math.round(completionConfidence * 100) / 100,
    scheduleAccuracy: Math.round(scheduleAccuracy * 100) / 100,
    overallScore: Math.round(overallScore * 100) / 100,
    verdict,
  };
}

// ─── Main Engine ─────────────────────────────────────────────────────────────

export function computeBehaviorSignals(
  tasks: FlexibleTask[],
  logs: TaskExecutionLog[],
  windowDays = 90
): BehaviorSignals {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  // Limit to at most 300 recent logs (rolling window)
  const recentLogs = logs
    .filter(l => l.date >= cutoffStr)
    .slice(-300);

  const reliability = computeDataReliability(tasks, 30);

  // ── Planning Bias ──────────────────────────────────────────────────────────
  let biasSamples = 0;
  let biasSum = 0;
  recentLogs.forEach(l => {
    if (l.completed && l.actualDuration && l.plannedDuration > 0) {
      biasSum += l.actualDuration / l.plannedDuration;
      biasSamples++;
    }
  });
  const planningBias = biasSamples > 0
    ? Math.round((biasSum / biasSamples) * 100) / 100
    : 1.0;
  const planningBiasConfidence = clamp(biasSamples / 15, 0, 1); // full confidence at 15+ samples

  // ── Hourly Success Map (REAL DATA ONLY — no defaults) ─────────────────────
  const hourScheduled: Record<number, number> = {};
  const hourCompleted: Record<number, number> = {};

  recentLogs.forEach(l => {
    if (l.scheduledStartHour !== undefined) {
      const h = l.scheduledStartHour;
      hourScheduled[h] = (hourScheduled[h] || 0) + 1;
      if (l.completed) hourCompleted[h] = (hourCompleted[h] || 0) + 1;
    }
  });

  const hourlySuccessMap: BehaviorSignals["hourlySuccessMap"] = {};
  for (let h = 0; h < 24; h++) {
    const sched = hourScheduled[h] || 0;
    if (sched === 0) continue; // skip hours with no data — no invented defaults
    const rate = Math.round(((hourCompleted[h] || 0) / sched) * 100) / 100;
    const confidence = clamp(sched / 8, 0, 1); // 8 samples = full confidence
    hourlySuccessMap[h] = { rate, confidence };
  }

  const bestHours = Object.entries(hourlySuccessMap)
    .filter(([, v]) => v.rate >= 0.75 && v.confidence >= 0.4)
    .map(([h]) => Number(h));

  const worstHours = Object.entries(hourlySuccessMap)
    .filter(([, v]) => v.rate < 0.4 && v.confidence >= 0.4)
    .map(([h]) => Number(h));

  // ── Category Success Rates ─────────────────────────────────────────────────
  const catScheduled: Record<string, number> = {};
  const catCompleted: Record<string, number> = {};

  recentLogs.forEach(l => {
    const task = tasks.find(t => t.id === l.taskId);
    if (!task) return;
    const cat = task.meta?.category || getTaskCategory(task.title);
    catScheduled[cat] = (catScheduled[cat] || 0) + 1;
    if (l.completed) catCompleted[cat] = (catCompleted[cat] || 0) + 1;
  });

  const categorySuccessRates: BehaviorSignals["categorySuccessRates"] = {};
  Object.keys(catScheduled).forEach(cat => {
    const sched = catScheduled[cat];
    const comp = catCompleted[cat] || 0;
    const rate = Math.round((comp / sched) * 100) / 100;
    const confidence = clamp(sched / 8, 0, 1);
    categorySuccessRates[cat] = { rate, confidence };
  });

  const weakCategories = Object.entries(categorySuccessRates)
    .filter(([, v]) => v.rate < 0.5 && v.confidence >= 0.4)
    .map(([cat]) => cat);

  // ── Procrastination Risk ───────────────────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];

  const recentTasks = tasks.filter(
    t => t.scheduled_date && t.scheduled_date >= thirtyStr
  );
  const carryOverTasks = recentTasks.filter(t => (t.carry_over_count || 0) > 0);
  const carryOverRatio = recentTasks.length > 0
    ? carryOverTasks.length / recentTasks.length
    : 0;
  const averageCarryOverCount = carryOverTasks.length > 0
    ? carryOverTasks.reduce((s, t) => s + (t.carry_over_count || 0), 0) / carryOverTasks.length
    : 0;

  const today = new Date().toISOString().split("T")[0];
  const staleTasks = tasks.filter(
    t => t.scheduled_date && t.scheduled_date < today && t.status === "scheduled"
  );
  const avgStaleAgeDays = staleTasks.length > 0
    ? staleTasks.reduce((s, t) => {
        const diffMs = Date.now() - new Date(t.scheduled_date!).getTime();
        return s + diffMs / 86400000;
      }, 0) / staleTasks.length
    : 0;

  const procrastinationRisk = clamp(
    carryOverRatio * 0.6 + Math.min(1.0, avgStaleAgeDays / 7) * 0.4,
    0, 1
  );

  // ── Burnout Risk ───────────────────────────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenStr = sevenDaysAgo.toISOString().split("T")[0];

  const last7Logs = recentLogs.filter(l => l.date >= sevenStr);
  const recentLoadMins = last7Logs.reduce((s, l) => s + l.plannedDuration, 0);
  const avgDailyLoad = recentLoadMins / 7;

  // 7-day rolling completion rate
  const last7Completed = last7Logs.filter(l => l.completed).length;
  const avgDailyCompletionRate = last7Logs.length > 0
    ? Math.round((last7Completed / last7Logs.length) * 100) / 100
    : 1.0;

  // Completion trend: last 3 days vs prior 4 days
  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeStr = threeDaysAgo.toISOString().split("T")[0];

  const last3 = last7Logs.filter(l => l.date >= threeStr);
  const prior4 = last7Logs.filter(l => l.date < threeStr);
  const last3Rate = last3.length > 0 ? last3.filter(l => l.completed).length / last3.length : 1;
  const prior4Rate = prior4.length > 0 ? prior4.filter(l => l.completed).length / prior4.length : 1;
  const completionTrend = last3Rate - prior4Rate; // negative = declining

  const burnoutRisk = clamp(
    (avgDailyLoad / 480) * 0.5 + Math.max(0, -completionTrend) * 0.5,
    0, 1
  );

  // ── Data Age ───────────────────────────────────────────────────────────────
  const totalLoggedTasks = recentLogs.length;
  const dataAge: BehaviorSignals["dataAge"] =
    totalLoggedTasks < 10 ? "insufficient"
    : totalLoggedTasks < 50 ? "early"
    : "mature";

  return {
    planningBias,
    planningBiasConfidence,
    bestHours,
    worstHours,
    hourlySuccessMap,
    categorySuccessRates,
    weakCategories,
    averageCarryOverCount: Math.round(averageCarryOverCount * 10) / 10,
    procrastinationRisk: Math.round(procrastinationRisk * 100) / 100,
    recentLoadMins,
    avgDailyCompletionRate,
    burnoutRisk: Math.round(burnoutRisk * 100) / 100,
    totalLoggedTasks,
    dataAge,
    reliability,
  };
}
