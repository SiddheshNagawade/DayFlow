/**
 * Pattern Engine — System 3 of DayFlow V3
 *
 * Pure math. No AI. No hardcoded circadian defaults.
 * Input:  FlexibleTask[] + TaskExecutionLog[] + ReflectionEvent[] + OnboardingProfile
 * Output: BehaviorSignals (compact, confidence-gated behavioral model)
 *
 * Contract: this is the ONLY source that feeds AI context.
 * AI never receives raw task arrays or raw log arrays.
 */

import {
  FlexibleTask,
  TaskExecutionLog,
  BehaviorSignals,
  DataReliability,
  Signal,
  SuggestionCandidate,
  ReflectionEvent,
  OnboardingProfile
} from "../types";
import { getTaskCategory } from "./mlEngine";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

function makeSignal<T>(value: T, confidence: number, sampleSize: number): Signal<T> {
  return { value, confidence, sampleSize };
}

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
  reflections: ReflectionEvent[] = [],
  onboardingProfile?: OnboardingProfile | null,
  windowDays = 90
): BehaviorSignals {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - windowDays);
  const cutoffStr = cutoff.toISOString().split("T")[0];

  const recentLogs = logs
    .filter(l => l.date >= cutoffStr)
    .slice(-300);

  const totalLoggedTasks = recentLogs.length;
  const reliability = computeDataReliability(tasks, 30);

  // ── Cold Start Mode Indicator ─────────────────────────────────────────────
  // First 7 days or < 20 logs
  const coldStartMode = totalLoggedTasks < 20;
  const dataAge: BehaviorSignals["dataAge"] =
    totalLoggedTasks < 10 ? "insufficient"
    : totalLoggedTasks < 50 ? "early"
    : "mature";

  // ── Planning Bias ──────────────────────────────────────────────────────────
  let biasSum = 0;
  let totalWeight = 0;
  let biasSamples = 0;
  recentLogs.forEach(l => {
    if (l.completed && l.plannedDuration > 0) {
      // Determine confidence tier and multiplier
      let tierMultiplier = 0.0;
      const source = l.estimationSource || "default";
      
      if (source === "timer") {
        tierMultiplier = 1.0; // Tier 1
      } else if (source === "timestamp" || source === "message") {
        tierMultiplier = 0.6; // Tier 2
      } else if (source === "default") {
        tierMultiplier = 0.1; // Tier 3
      } else {
        tierMultiplier = 0.0; // Tier 4
      }

      if (l.actualDuration && tierMultiplier > 0) {
        const daysOld = Math.max(0, (Date.now() - new Date(l.date).getTime()) / 86400000);
        const weight = Math.exp(-daysOld / 30) * tierMultiplier;
        biasSum += (l.actualDuration / l.plannedDuration) * weight;
        totalWeight += weight;
        biasSamples++;
      }
    }
  });

  let biasVal = 1.0;
  let biasConf = 0.0;
  if (coldStartMode) {
    // Prior planning bias based on onboarding profile
    if (onboardingProfile?.planning_style === "underestimate" || onboardingProfile?.struggles?.includes("overplanning")) {
      biasVal = 1.30; // underestimation prior
    } else if (onboardingProfile?.planning_style === "overestimate") {
      biasVal = 1.15;
    } else {
      biasVal = 1.20; // default prior
    }
    biasConf = 0.50; // soft confidence from onboarding style
  } else {
    biasVal = totalWeight > 0 ? Math.round((biasSum / totalWeight) * 100) / 100 : 1.0;
    biasConf = clamp(totalWeight / 15, 0, 1);
  }
  const planningBias = makeSignal(biasVal, biasConf, biasSamples);

  // ── Hourly Success Map ───────────────────────────────────────────────────
  const hourScheduledWeight: Record<number, number> = {};
  const hourCompletedWeight: Record<number, number> = {};

  recentLogs.forEach(l => {
    if (l.scheduledStartHour !== undefined) {
      const h = l.scheduledStartHour;
      const daysOld = Math.max(0, (Date.now() - new Date(l.date).getTime()) / 86400000);
      const weight = Math.exp(-daysOld / 30);
      
      hourScheduledWeight[h] = (hourScheduledWeight[h] || 0) + weight;
      if (l.completed) {
        hourCompletedWeight[h] = (hourCompletedWeight[h] || 0) + weight;
      }
    }
  });

  const hourlySuccessMap: BehaviorSignals["hourlySuccessMap"] = {};
  for (let h = 0; h < 24; h++) {
    const schedWeight = hourScheduledWeight[h] || 0;
    if (schedWeight === 0) continue;
    const rate = Math.round(((hourCompletedWeight[h] || 0) / schedWeight) * 100) / 100;
    const confidence = clamp(schedWeight / 8, 0, 1);
    hourlySuccessMap[h] = { rate, confidence, supportCount: Math.round(schedWeight * 100) / 100 };
  }

  // ── Best / Worst Hours ────────────────────────────────────────────────────
  let bestHrsVal: number[] = [];
  let bestHrsConf = 0.0;
  let bestHrsSamples = 0;

  let worstHrsVal: number[] = [];
  let worstHrsConf = 0.0;
  let worstHrsSamples = 0;

  if (coldStartMode && onboardingProfile) {
    const energy = onboardingProfile.energy_pattern;
    if (energy === "morning") {
      bestHrsVal = [8, 9, 10, 11];
      worstHrsVal = [14, 15, 21, 22];
    } else if (energy === "afternoon") {
      bestHrsVal = [13, 14, 15, 16];
      worstHrsVal = [8, 9, 21, 22];
    } else if (energy === "night") {
      bestHrsVal = [19, 20, 21, 22];
      worstHrsVal = [8, 9, 14, 15];
    } else {
      bestHrsVal = [9, 10, 14, 15];
      worstHrsVal = [22, 23];
    }
    bestHrsConf = 0.5;
    worstHrsConf = 0.5;
  } else {
    bestHrsVal = Object.entries(hourlySuccessMap)
      .filter(([, v]) => v.rate >= 0.75 && v.confidence >= 0.4)
      .map(([h]) => Number(h));
    bestHrsConf = bestHrsVal.length > 0 
      ? Math.round((bestHrsVal.reduce((acc, h) => acc + hourlySuccessMap[h].confidence, 0) / bestHrsVal.length) * 100) / 100
      : 0.0;
    bestHrsSamples = bestHrsVal.reduce((acc, h) => acc + Math.round(hourlySuccessMap[h].supportCount), 0);

    worstHrsVal = Object.entries(hourlySuccessMap)
      .filter(([, v]) => v.rate < 0.4 && v.confidence >= 0.4)
      .map(([h]) => Number(h));
    worstHrsConf = worstHrsVal.length > 0
      ? Math.round((worstHrsVal.reduce((acc, h) => acc + hourlySuccessMap[h].confidence, 0) / worstHrsVal.length) * 100) / 100
      : 0.0;
    worstHrsSamples = worstHrsVal.reduce((acc, h) => acc + Math.round(hourlySuccessMap[h].supportCount), 0);
  }

  const bestHours = makeSignal(bestHrsVal, bestHrsConf, bestHrsSamples);
  const worstHours = makeSignal(worstHrsVal, worstHrsConf, worstHrsSamples);

  // ── Category Success Rates ─────────────────────────────────────────────────
  const catScheduledWeight: Record<string, number> = {};
  const catCompletedWeight: Record<string, number> = {};

  recentLogs.forEach(l => {
    const task = tasks.find(t => t.id === l.taskId);
    if (!task) return;
    const cat = task.meta?.category || getTaskCategory(task.title);
    const daysOld = Math.max(0, (Date.now() - new Date(l.date).getTime()) / 86400000);
    const weight = Math.exp(-daysOld / 30);
    
    catScheduledWeight[cat] = (catScheduledWeight[cat] || 0) + weight;
    if (l.completed) {
      catCompletedWeight[cat] = (catCompletedWeight[cat] || 0) + weight;
    }
  });

  const categorySuccessRates: BehaviorSignals["categorySuccessRates"] = {};
  Object.keys(catScheduledWeight).forEach(cat => {
    const schedWeight = catScheduledWeight[cat];
    const compWeight = catCompletedWeight[cat] || 0;
    const rate = Math.round((compWeight / schedWeight) * 100) / 100;
    const confidence = clamp(schedWeight / 8, 0, 1);
    categorySuccessRates[cat] = { rate, confidence, supportCount: Math.round(schedWeight * 100) / 100 };
  });

  let weakCatsVal: string[] = [];
  let weakCatsConf = 0.0;
  let weakCatsSamples = 0;

  if (!coldStartMode) {
    weakCatsVal = Object.entries(categorySuccessRates)
      .filter(([, v]) => v.rate < 0.5 && v.confidence >= 0.4)
      .map(([cat]) => cat);
    weakCatsConf = weakCatsVal.length > 0
      ? Math.round((weakCatsVal.reduce((acc, c) => acc + categorySuccessRates[c].confidence, 0) / weakCatsVal.length) * 100) / 100
      : 0.0;
    weakCatsSamples = weakCatsVal.reduce((acc, c) => acc + Math.round(categorySuccessRates[c].supportCount), 0);
  }
  const weakCategories = makeSignal(weakCatsVal, weakCatsConf, weakCatsSamples);

  // ── Carry-over / Procrastination ───────────────────────────────────────────
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyStr = thirtyDaysAgo.toISOString().split("T")[0];

  const recentTasks = tasks.filter(
    t => t.scheduled_date && t.scheduled_date >= thirtyStr
  );
  const carryOverTasks = recentTasks.filter(t => (t.carry_over_count || 0) > 0);
  const carryOverRatio = recentTasks.length > 0 ? carryOverTasks.length / recentTasks.length : 0;
  const avgCarryVal = carryOverTasks.length > 0
    ? carryOverTasks.reduce((s, t) => s + (t.carry_over_count || 0), 0) / carryOverTasks.length
    : 0;

  const averageCarryOverCount = makeSignal(
    Math.round(avgCarryVal * 10) / 10,
    clamp(recentTasks.length / 10, 0, 1),
    recentTasks.length
  );

  const todayStr = new Date().toISOString().split("T")[0];
  const staleTasks = tasks.filter(
    t => t.scheduled_date && t.scheduled_date < todayStr && t.status === "scheduled"
  );
  const avgStaleAgeDays = staleTasks.length > 0
    ? staleTasks.reduce((s, t) => {
        const diffMs = Date.now() - new Date(t.scheduled_date!).getTime();
        return s + diffMs / 86400000;
      }, 0) / staleTasks.length
    : 0;

  let procRiskVal = clamp(carryOverRatio * 0.6 + Math.min(1.0, avgStaleAgeDays / 7) * 0.4, 0, 1);
  let procRiskConf = reliability.overallScore;
  if (coldStartMode) {
    procRiskVal = onboardingProfile?.struggles?.includes("procrastination") ? 0.60 : 0.30;
    procRiskConf = 0.50;
  }
  const procrastinationRisk = makeSignal(
    Math.round(procRiskVal * 100) / 100,
    procRiskConf,
    recentTasks.length
  );

  // ── Load / Burnout ───────────────────────────────────────────────────────────
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenStr = sevenDaysAgo.toISOString().split("T")[0];

  const last7Logs = recentLogs.filter(l => l.date >= sevenStr);
  const loadMinsVal = last7Logs.reduce((s, l) => s + l.plannedDuration, 0);

  const recentLoadMins = makeSignal(
    loadMinsVal,
    reliability.overallScore,
    last7Logs.length
  );

  const last7Completed = last7Logs.filter(l => l.completed).length;
  const compRateVal = last7Logs.length > 0 ? last7Completed / last7Logs.length : 1.0;

  const avgDailyCompletionRate = makeSignal(
    Math.round(compRateVal * 100) / 100,
    clamp(last7Logs.length / 7, 0, 1),
    last7Logs.length
  );

  const threeDaysAgo = new Date();
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  const threeStr = threeDaysAgo.toISOString().split("T")[0];

  const last3 = last7Logs.filter(l => l.date >= threeStr);
  const prior4 = last7Logs.filter(l => l.date < threeStr);
  const last3Rate = last3.length > 0 ? last3.filter(l => l.completed).length / last3.length : 1;
  const prior4Rate = prior4.length > 0 ? prior4.filter(l => l.completed).length / prior4.length : 1;
  const completionTrend = last3Rate - prior4Rate;

  let burnoutRiskVal = clamp((loadMinsVal / 7 / 240) * 0.5 + Math.max(0, -completionTrend) * 0.5, 0, 1);
  let burnoutRiskConf = reliability.overallScore;
  if (coldStartMode) {
    burnoutRiskVal = onboardingProfile?.struggles?.includes("low_energy") ? 0.50 : 0.20;
    burnoutRiskConf = 0.40;
  }
  const burnoutRisk = makeSignal(
    Math.round(burnoutRiskVal * 100) / 100,
    burnoutRiskConf,
    last7Logs.length
  );

  // ── WES Score (Weighted Execution Score) ──────────────────────────────────
  // Formula: completed_importance_weights / planned_importance_weights * 100
  // weights: critical = 10, important = 5, optional = 2
  const recent30Tasks = tasks.filter(t => t.scheduled_date && t.scheduled_date >= thirtyStr);
  let completedWeight = 0;
  let plannedWeight = 0;
  
  recent30Tasks.forEach(t => {
    const importance = t.importance || t.meta?.importance || "important";
    const weight = importance === "critical" ? 10 : importance === "important" ? 5 : 2;
    plannedWeight += weight;
    if (t.status === "done") {
      completedWeight += weight;
    }
  });

  let wesValue = plannedWeight > 0 ? Math.round((completedWeight / plannedWeight) * 100) : 80;
  let wesConf = reliability.overallScore;
  if (coldStartMode) {
    wesValue = 80;
    wesConf = 0.3;
  }
  const wesScore = makeSignal(wesValue, wesConf, recent30Tasks.length);

  // ── SSS Score (Schedule Stability Score) ──────────────────────────────────
  // Formula: (planned_blocks - moved_or_delayed_blocks) / planned_blocks * 100
  // planned_blocks: total tasks in window
  // moved_or_delayed_blocks: count of tasks with delay_count > 0 or status skipped
  let movedBlocks = 0;
  recent30Tasks.forEach(t => {
    if ((t.delay_count || 0) > 0 || t.status === "skipped" || (t.carry_over_count || 0) > 0) {
      movedBlocks += 1;
    }
  });

  let sssValue = recent30Tasks.length > 0 
    ? Math.round(clamp(((recent30Tasks.length - movedBlocks) / recent30Tasks.length) * 100, 0, 100))
    : 90;
  let sssConf = reliability.overallScore;
  if (coldStartMode) {
    sssValue = 85;
    sssConf = 0.3;
  }
  const sssScore = makeSignal(sssValue, sssConf, recent30Tasks.length);

  // ── Personal Growth Score (PGS) ──────────────────────────────────────────
  // Combines: completion rate (WES), schedule stability (SSS), planning accuracy, and carry-overs.
  const compFactor = wesValue;
  const sssFactor = sssValue;
  const planAccuracyFactor = Math.max(0, 100 - Math.min(50, Math.abs(1 - biasVal) * 100));
  const carryOverFactor = Math.max(0, 100 - Math.min(100, avgCarryVal * 25));

  const pgsValue = Math.round(
    compFactor * 0.3 +
    sssFactor * 0.25 +
    planAccuracyFactor * 0.25 +
    carryOverFactor * 0.2
  );
  
  let pgsConf = reliability.overallScore;
  if (coldStartMode) {
    pgsConf = 0.3;
  }
  const pgsScore = makeSignal(pgsValue, pgsConf, recent30Tasks.length);

  // ── Friction Reasons ──────────────────────────────────────────────────────
  const frictionCounts: Record<string, number> = {
    low_energy: 0,
    distraction: 0,
    resistance: 0,
    unclear_task: 0,
    external_interrupt: 0,
    unknown: 0
  };

  let totalFrictionCount = 0;

  if (coldStartMode && onboardingProfile && Array.isArray(onboardingProfile.struggles)) {
    // Populate priors from struggles onboarding selections
    onboardingProfile.struggles.forEach(s => {
      if (s === "procrastination" || s === "overplanning") frictionCounts.resistance = 3;
      if (s === "distractions") frictionCounts.distraction = 3;
      if (s === "low_energy") frictionCounts.low_energy = 3;
    });
    totalFrictionCount = Object.values(frictionCounts).reduce((a, b) => a + b, 0);
  } else {
    // Count from reflections failure events
    const recentReflections = reflections.filter(r => r.date >= thirtyStr && r.type === "failure");
    recentReflections.forEach(r => {
      const cause = r.cause;
      if (cause in frictionCounts) {
        frictionCounts[cause]++;
        totalFrictionCount++;
      } else if (cause === "planning") {
        frictionCounts.unclear_task++;
        totalFrictionCount++;
      } else if (cause === "energy") {
        frictionCounts.low_energy++;
        totalFrictionCount++;
      } else if (cause === "discipline") {
        frictionCounts.resistance++;
        totalFrictionCount++;
      } else if (cause === "interruption") {
        frictionCounts.external_interrupt++;
        totalFrictionCount++;
      }
    });
  }

  const frictionReasonsList = Object.entries(frictionCounts)
    .map(([cause, count]) => ({
      cause,
      count,
      percentage: totalFrictionCount > 0 ? Math.round((count / totalFrictionCount) * 100) : 0
    }))
    .sort((a, b) => b.count - a.count);

  const topFrictionReasons = makeSignal(
    frictionReasonsList,
    coldStartMode ? 0.40 : clamp(totalFrictionCount / 6, 0, 1),
    totalFrictionCount
  );

  // ── Scored Suggestion Candidates ──────────────────────────────────────────
  const candidates: SuggestionCandidate[] = [];

  // Candidate 1: move_gym
  // Try to find if gym completions at night fail
  let gymLateFailures = 0;
  let gymLateTotal = 0;
  recentLogs.forEach(l => {
    if (l.scheduledStartHour !== undefined && l.scheduledStartHour >= 19) {
      const task = tasks.find(t => t.id === l.taskId);
      if (task && (task.title.toLowerCase().includes("gym") || task.title.toLowerCase().includes("workout") || task.title.toLowerCase().includes("exercise"))) {
        gymLateTotal++;
        if (l.skipped || !l.completed) {
          gymLateFailures++;
        }
      }
    }
  });

  const gymLateFailRate = gymLateTotal > 0 ? gymLateFailures / gymLateTotal : 0;
  let gymScore = 0;
  let gymConf = 0.0;
  if (coldStartMode) {
    if (onboardingProfile?.goals?.includes("fitness") && onboardingProfile?.energy_pattern !== "night") {
      gymScore = 0.55; // prior
      gymConf = 0.40;
    }
  } else if (gymLateTotal >= 2) {
    gymScore = gymLateFailRate * 0.90;
    gymConf = clamp(gymLateTotal / 5, 0, 1);
  }

  if (gymScore > 0 && gymConf >= 0.3) {
    candidates.push({
      id: "move_gym",
      type: "move_gym",
      score: gymScore,
      message: "Gym completed rates drop after 7 PM. Move workout to your morning focus window?",
      actionLabel: "Reschedule Workout",
      whyQuery: "Why does the coach suggest rescheduling my gym sessions?"
    });
  }

  // Candidate 2: reduce_load
  let loadScore = 0;
  let loadConf = 0.0;
  if (coldStartMode) {
    if (onboardingProfile?.struggles?.includes("overplanning")) {
      loadScore = 0.60;
      loadConf = 0.40;
    }
  } else {
    loadScore = burnoutRisk.value * 0.85;
    loadConf = burnoutRisk.confidence;
  }

  if (loadScore > 0 && loadConf >= 0.3) {
    candidates.push({
      id: "reduce_load",
      type: "reduce_load",
      score: loadScore,
      message: " burn-out risk detected. Shift optional items to next week to free up cognitive budget.",
      actionLabel: "Reduce Load Budget",
      whyQuery: "Why is the coach advising to reduce load budget today?"
    });
  }

  // Candidate 3: pad_durations
  let padScore = 0;
  let padConf = 0.0;
  if (coldStartMode) {
    if (onboardingProfile?.planning_style === "underestimate" || onboardingProfile?.planning_style === "overestimate") {
      padScore = 0.65;
      padConf = 0.45;
    }
  } else {
    padScore = clamp((planningBias.value - 1.15) * 2.5, 0, 1);
    padConf = planningBias.confidence;
  }

  if (padScore > 0 && padConf >= 0.3) {
    candidates.push({
      id: "pad_durations",
      type: "pad_durations",
      score: padScore,
      message: "Planning bias indicates tasks consistently take longer. Let's pad upcoming items by 20%.",
      actionLabel: "Pad Upcoming Slots",
      whyQuery: "What is planning bias, and why should I pad my durations?"
    });
  }

  // Candidate 4: break_task (Decomposition Engine triggers)
  // Checks if any task scheduled today or recently is > 120 mins, carried over >= 3, or has unclear friction
  const todayTasks = tasks.filter(t => t.scheduled_date === todayStr && t.status === "scheduled");
  const vagueOrLongTask = todayTasks.find(t => 
    t.duration_minutes > 120 || 
    (t.carry_over_count || 0) >= 3 || 
    t.focus_quality_effort === "struggled"
  );

  let breakScore = 0;
  if (vagueOrLongTask) {
    breakScore = 0.85;
  } else if (coldStartMode && onboardingProfile?.struggles?.includes("procrastination")) {
    breakScore = 0.50; // soft prior
  }

  if (breakScore > 0) {
    candidates.push({
      id: "break_task",
      type: "break_task",
      score: breakScore,
      message: vagueOrLongTask 
        ? `"${vagueOrLongTask.title}" looks large or vague. Let's decompose it into 3 bite-sized steps.` 
        : "You tend to procrastinate starting heavy blocks. Let's decompose heavy tasks into small actions.",
      actionLabel: "Decompose Task",
      whyQuery: vagueOrLongTask 
        ? `Why should I split the task "${vagueOrLongTask.title}"?`
        : "Why does task decomposition help prevent procrastination?"
    });
  }

  // Candidate 5: focus_slump (worst hour warning)
  const taskInSlump = todayTasks.find(t => {
    const scheduled = tasks.find(x => x.id === t.id);
    if (!scheduled || !scheduled.scheduled_start_time) return false;
    const hour = parseInt(scheduled.scheduled_start_time.split(":")[0], 10);
    return worstHours.value.includes(hour);
  });

  let slumpScore = 0;
  let slumpConf = 0.0;
  if (taskInSlump) {
    slumpScore = 0.75;
    slumpConf = worstHours.confidence;
  }

  if (slumpScore > 0 && slumpConf >= 0.3) {
    candidates.push({
      id: "focus_slump",
      type: "focus_slump",
      score: slumpScore,
      message: `"${taskInSlump.title}" is slotted during your focus slump hours. Shift it to a peak time?`,
      actionLabel: "Reschedule to Peak",
      whyQuery: `Why is scheduling "${taskInSlump.title}" during my energy slump a risk?`
    });
  }

  // Sort candidates by score descending
  const sortedCandidates = candidates.sort((a, b) => b.score - a.score);

  return {
    planningBias,
    bestHours,
    worstHours,
    hourlySuccessMap,
    categorySuccessRates,
    weakCategories,
    averageCarryOverCount,
    procrastinationRisk,
    recentLoadMins,
    avgDailyCompletionRate,
    burnoutRisk,
    totalLoggedTasks,
    dataAge,
    reliability,
    coldStartMode,
    topFrictionReasons,
    wesScore,
    sssScore,
    pgsScore,
    interventionCandidates: sortedCandidates
  };
}

export function isSignalReliable(signal: { confidence: number; supportCount: number }): boolean {
  return signal.confidence >= 0.4 && signal.supportCount >= 5;
}
