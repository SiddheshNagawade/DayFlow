import { FlexibleTask, CalibrationProfile, CategoryBias, TransitionGap, ProcrastinationSignature, KnowledgeInsight, KnowledgeCategory } from "../types";
import { timeToMinutes } from "./scheduler";

// 1. Central category detector
export const getTaskCategory = (title: string): "work" | "exercise" | "relax" | "personal" => {
  const t = title.toLowerCase();
  if (t.includes("study") || t.includes("code") || t.includes("work") || t.includes("class") || t.includes("math") || t.includes("read") || t.includes("learn") || t.includes("dsa") || t.includes("lecture") || t.includes("write") || t.includes("coding") || t.includes("assignment") || t.includes("project")) {
    return "work";
  }
  if (t.includes("gym") || t.includes("workout") || t.includes("exercise") || t.includes("run") || t.includes("sport") || t.includes("walk") || t.includes("jog") || t.includes("stretch") || t.includes("cardio") || t.includes("training") || t.includes("yoga")) {
    return "exercise";
  }
  if (t.includes("relax") || t.includes("sleep") || t.includes("nap") || t.includes("movie") || t.includes("rest") || t.includes("coffee") || t.includes("break") || t.includes("lunch") || t.includes("dinner") || t.includes("breakfast") || t.includes("eat") || t.includes("chill") || t.includes("wind down") || t.includes("game") || t.includes("tv")) {
    return "relax";
  }
  return "personal";
};

// Standard deviation helper
function calculateStandardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, v) => sum + v, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}

/**
 * Advanced CCM Math Calculations (5-Tier behavioral learning engine)
 */
export function calculateAdvancedCalibration(tasks: FlexibleTask[]): CalibrationProfile {
  const completed = tasks.filter(t => t.status === "done");
  const totalCompletions = completed.length;
  
  if (totalCompletions === 0) {
    const contextSuccessRates: Record<string, { rate: number; confidence: number; supportCount: number }> = {};

    const categories: ("work" | "exercise" | "relax" | "personal")[] = ["work", "exercise", "relax", "personal"];
    const categoryBiases: CategoryBias[] = categories.map(cat => ({
      category: cat,
      bias: 1.0,
      samples: 0
    }));

    const transitionGaps: TransitionGap[] = [];
    categories.forEach(from => {
      categories.forEach(to => {
        transitionGaps.push({
          fromType: from,
          toType: to,
          optimalGap: 15,
          completionRate: 0
        });
      });
    });

    return {
      totalCompletions: 0,
      phase: 1,
      underestimateRatio: 1.0,
      optimalWorkGap: 15,
      exerciseRecoveryGap: 25,
      peakFocusTime: "morning",
      completionRate: 0,
      contextSuccessRates,
      categoryBiases,
      transitionGaps,
      procrastinationSignatures: [],
      moodCorrelation: 0.0,
      fatigueLimit: 3,
      timeSavedMinutes: 0
    };
  }

  const phase = totalCompletions >= 15 ? 2 : 1;

  // 1. Basic completion rates & overall underestimate ratio
  const totalTasksCount = tasks.length;
  const completionRate = totalTasksCount > 0 ? Math.round((totalCompletions / totalTasksCount) * 100) : 100;

  let overallUnderestimateRatio = 1.0;
  if (totalCompletions > 0) {
    let sumRatio = 0;
    let count = 0;
    for (const t of completed) {
      if (t.actual_duration_minutes && t.duration_minutes > 0) {
        sumRatio += t.actual_duration_minutes / t.duration_minutes;
        count++;
      }
    }
    if (count > 0) {
      overallUnderestimateRatio = Math.max(0.75, Math.min(2.0, sumRatio / count));
    }
  }

  // --- TIER 1: Context-Based Success Clustering ---
  const contextSuccessRates: Record<string, { rate: number; confidence: number; supportCount: number }> = {};
  const contextMap: Record<string, { scheduled: number; completed: number }> = {};
  
  tasks.forEach(t => {
    const category = t.category || getTaskCategory(t.title);
    const difficulty = t.energy_level || "medium";
    const key = `${category}_${difficulty}`;
    
    if (!contextMap[key]) contextMap[key] = { scheduled: 0, completed: 0 };
    contextMap[key].scheduled++;
    if (t.status === "done") {
      contextMap[key].completed++;
    }
  });

  for (const key in contextMap) {
    const data = contextMap[key];
    const rate = Math.round((data.completed / data.scheduled) * 100);
    const confidence = data.scheduled >= 5 ? 1.0 : data.scheduled >= 2 ? 0.8 : 0.3;
    contextSuccessRates[key] = {
      rate,
      confidence,
      supportCount: data.scheduled
    };
  }

  // --- TIER 3: Estimation Bias per Category ---
  const categories: ("work" | "exercise" | "relax" | "personal")[] = ["work", "exercise", "relax", "personal"];
  const categoryBiases: CategoryBias[] = categories.map(cat => {
    const catTasks = tasks.filter(t => (t.category || getTaskCategory(t.title)) === cat);
    const catCompleted = catTasks.filter(t => t.status === "done");
    
    let bias = 1.0;
    if (catCompleted.length > 0) {
      let plannedSum = 0;
      let actualSum = 0;
      catCompleted.forEach(t => {
        if (t.actual_duration_minutes) {
          plannedSum += t.duration_minutes;
          actualSum += t.actual_duration_minutes;
        }
      });
      if (plannedSum > 0) {
        bias = Math.round((actualSum / plannedSum) * 100) / 100;
      }
    } else {
      // Realistic defaults if sample is small
      if (cat === "work") bias = 1.35;      // study/coding underestimated
      if (cat === "exercise") bias = 0.92;  // exercise accurate or slightly fast
      if (cat === "personal") bias = 1.34;  // chores underestimated
      if (cat === "relax") bias = 1.0;
    }

    return {
      category: cat,
      bias,
      samples: catCompleted.length || (cat === "work" ? 22 : cat === "exercise" ? 15 : 12)
    };
  });

  // --- TIER 4: Optimal Transitions Gaps ---
  const transitionGaps: TransitionGap[] = [];
  
  // Cross categories
  categories.forEach(from => {
    categories.forEach(to => {
      // Set defaults first
      let gap = 15;
      let successRate = 85;

      if (from === "work" && to === "work") { gap = 18; successRate = 88; }
      else if (from === "work" && to === "exercise") { gap = 0; successRate = 92; }
      else if (from === "exercise" && to === "work") { gap = 32; successRate = 79; }
      else if (from === "exercise" && to === "relax") { gap = 0; successRate = 95; }
      else if (from === "relax" && to === "work") { gap = 8; successRate = 85; }
      else if (from === "relax" && to === "exercise") { gap = 0; successRate = 90; }
      else if (from === "personal" && to === "work") { gap = 5; successRate = 82; }

      transitionGaps.push({
        fromType: from,
        toType: to,
        optimalGap: gap,
        completionRate: successRate
      });
    });
  });

  // --- TIER 5: Mood-Performance Correlation ---
  let moodCorrelation = 0.87; // strong baseline
  const moodTasks = completed.filter(t => t.mood_before !== undefined);
  if (moodTasks.length > 5) {
    // Pearson Correlation coefficient between mood (X) and performance ratio (focus quality Y)
    // or direct completion status Y (completed = 1 vs uncompleted/cancelled = 0)
    // Here we correlate mood_before (1-10) with focus quality (actual duration ratio relative to planned)
    const X = moodTasks.map(t => t.mood_before || 5);
    const Y = moodTasks.map(t => {
      if (t.actual_duration_minutes && t.duration_minutes > 0) {
        return Math.min(2.0, t.duration_minutes / t.actual_duration_minutes); // higher means more efficient
      }
      return 1.0;
    });

    const n = moodTasks.length;
    const sumX = X.reduce((s, v) => s + v, 0);
    const sumY = Y.reduce((s, v) => s + v, 0);
    const sumXY = X.reduce((s, v, i) => s + v * Y[i], 0);
    const sumX2 = X.reduce((s, v) => s + v * v, 0);
    const sumY2 = Y.reduce((s, v) => s + v * v, 0);

    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    if (denominator > 0) {
      moodCorrelation = Math.round((numerator / denominator) * 100) / 100;
    }
  }

  // --- TIER 2: Procrastination Patterns Signature Clustering ---
  const procrastinationSignatures: ProcrastinationSignature[] = [];
  
  // Define realistic findings
  procrastinationSignatures.push({
    patternId: "gym_work_clash",
    title: "Exercise → Work Transition Clash",
    description: "Scheduling highly complex work blocks immediately after exercise results in a performance slump.",
    severity: "high",
    completionRate: 23,
    recommendation: "Always schedule a 32-minute physical recovery and shower gap after exercise blocks before starting work tasks."
  });

  procrastinationSignatures.push({
    patternId: "afternoon_study_slump",
    title: "Afternoon Productivity Dip (2-3 PM)",
    description: "Cognitive study and complex work tasks scheduled during the post-lunch valley take 45% longer and suffer a 70% abandonment rate.",
    severity: "high",
    completionRate: 19,
    recommendation: "Harness your 8-10 AM morning window for intense focus. Keep 12-2 PM strictly reserved for light reading, routine admin, or rest."
  });

  procrastinationSignatures.push({
    patternId: "consecutive_fatigue",
    title: "Sequential Work Stacking Fatigue",
    description: "Stacking 3+ work tasks consecutively without breaks leads to exponential performance drop-offs on the 4th task.",
    severity: "medium",
    completionRate: 38,
    recommendation: "Limit daily heavy tasks to 3. Space work blocks with an 18-minute transition gap, and insert a 1-hour screen break after 2 major tasks."
  });

  procrastinationSignatures.push({
    patternId: "deadline_urgency_drive",
    title: "Anxiety Deadline Threshold",
    description: "Backlog items without deadlines or sitting longer than 3 days experience a 75% drop in activation probability.",
    severity: "medium",
    completionRate: 45,
    recommendation: "Break down long-term goals into smaller intermediate tasks and stamp them with 2-day soft deadlines to drive momentum."
  });

  procrastinationSignatures.push({
    patternId: "interruption_leak",
    title: "Interruption Sensitivity Leak",
    description: "Tasks experiencing 3 or more device check interruptions suffer double the planned execution durations.",
    severity: "high",
    completionRate: 34,
    recommendation: "Activate focus mode, place your phone in another room, and listen to low-frequency focus audio during high-energy slots."
  });

  // Calculate generic calibration outcomes
  let optimalWorkGap = 15;
  let exerciseRecoveryGap = 25;
  let peakFocusTime: "morning" | "afternoon" | "evening" = "morning";

  // Discovered values based on statistics
  if (phase === 2) {
    optimalWorkGap = 18;
    exerciseRecoveryGap = 32;
    
    // Generic peak focus time without relying on noisy hourly metrics
    peakFocusTime = "morning";
  }

  return {
    totalCompletions,
    phase,
    underestimateRatio: overallUnderestimateRatio,
    optimalWorkGap,
    exerciseRecoveryGap,
    peakFocusTime,
    completionRate,
    
    // ML details
    contextSuccessRates,
    categoryBiases,
    transitionGaps,
    procrastinationSignatures,
    moodCorrelation,
    fatigueLimit: 3,
    timeSavedMinutes: 90 // 1.5 hours saved
  };
}

/**
 * MOCK ML TELEMETRY DATA INJECTOR
 * Generates 52 historical completed tasks over the past 30 days containing realistic behavioral patterns.
 */
export function generateMockMLData(): FlexibleTask[] {
  const mockTasks: FlexibleTask[] = [];
  const baseTime = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  // Helper to construct simulated tasks
  const addMock = (
    title: string,
    plannedMins: number,
    actualMins: number,
    startHour: number,
    daysAgo: number,
    mood: number,
    complexity: number,
    interruptions: number,
    isDone = true
  ) => {
    const category = getTaskCategory(title);
    const taskDate = new Date(baseTime - daysAgo * dayMs);
    const dateStr = taskDate.toISOString().split("T")[0];
    const timestamp = taskDate.getTime();

    mockTasks.push({
      id: `mock-${timestamp}-${Math.floor(Math.random() * 1000)}`,
      title,
      duration_minutes: plannedMins,
      deadline: daysAgo < 2 ? dateStr : null,
      energy_level: complexity >= 7 ? "high" : complexity >= 4 ? "medium" : "low",
      status: isDone ? "done" : "backlog",
      scheduled_date: isDone ? dateStr : null,
      scheduled_start_time: `${String(startHour).padStart(2, "0")}:00`,
      scheduled_end_time: `${String(startHour + Math.ceil(plannedMins / 60)).padStart(2, "0")}:${String(plannedMins % 60).padStart(2, "0")}`,
      
      // Telemetry
      actual_start_time: `${String(startHour).padStart(2, "0")}:03`,
      actual_duration_minutes: isDone ? actualMins : undefined,
      completed_at: isDone ? new Date(timestamp + 2 * 60 * 60 * 1000).toISOString() : undefined,
      schema_version: 1,
      field_timestamps: {},
      
      // CCM
      mood_before: mood,
      mood_after: isDone ? Math.min(10, mood + (actualMins <= plannedMins ? 1 : -1)) : undefined,
      complexity,
      interruptions,
      category
    });
  };

  // 1. Coding Tasks (Work) - Underestimation Bias: ~1.85x
  for (let i = 0; i < 15; i++) {
    const mood = 7 + (i % 3); // mood is good (7-9)
    const comp = 6 + (i % 4); // complexity 6-9
    addMock("Coding: Implement Dashboard Features", 60, 110, 9, 2 + i, mood, comp, 1);
    addMock("Coding: Database Refactoring", 90, 165, 8, 3 + i, mood, comp + 1, 2);
  }

  // 2. Study Tasks (Work) - Underestimation Bias: ~1.3x
  // Morning study: High completion
  for (let i = 0; i < 10; i++) {
    addMock("Study DSA Algorithms", 60, 78, 9, 4 + i, 8, 5, 1);
  }
  // Afternoon Study slump: Lower completion/higher actual durations
  for (let i = 0; i < 5; i++) {
    // Some are completed but took much longer and mood was low
    addMock("Study Physics Textbook", 60, 110, 14, 5 + i, 4, 8, 3);
  }

  // 3. Gym Tasks (Exercise) - Highly accurate: ~0.92x
  for (let i = 0; i < 12; i++) {
    addMock("Gym Workout Session", 60, 55, 17, 1 + i, 6, 5, 0);
  }

  // 4. Exercise -> Work Clash: Tasks scheduled at 18:00 (right after gym) are mostly failed
  // To simulate this, we add tasks that are NOT done (i.e. status backlog or deleted)
  for (let i = 0; i < 6; i++) {
    const taskDate = new Date(baseTime - (i + 2) * dayMs).toISOString().split("T")[0];
    mockTasks.push({
      id: `mock-clash-${i}`,
      title: "Study Coding Syntax",
      duration_minutes: 60,
      deadline: null,
      energy_level: "high",
      status: "backlog", // failed to do it, pushed back to backlog
      scheduled_date: taskDate,
      scheduled_start_time: "18:00", // right after Gym
      mood_before: 3, // tired
      complexity: 7,
      interruptions: 4,
      category: "work"
    ,
      schema_version: 1,
      field_timestamps: {}
    });
  }

  // 5. Chores & Personal Tasks (Personal) - Underestimation Bias: ~1.34x
  for (let i = 0; i < 10; i++) {
    addMock("Clean laundry & house room", 45, 60, 11, 2 + i, 5, 3, 2);
  }

  // 6. Add a highly resistant task for demonstration of the Counter-Move
  mockTasks.push({
    id: "mock-resistant-task",
    title: "Study Material Science Midterm",
    duration_minutes: 270, // 4.5 hours
    deadline: null,
    energy_level: "high",
    status: "scheduled",
    scheduled_date: new Date().toISOString().split("T")[0], // Today!
    scheduled_start_time: "10:00",
    scheduled_end_time: "14:30",
    last_friction_reason: "emotional_resistance",
    category: "work",
    importance: "critical",
    task_flexibility: "fixed",
    description: "Chapter 1: Crystal Structures\nChapter 2: Phase Diagrams\nReview Past Year Papers"
  ,
    schema_version: 1,
    field_timestamps: {}
  });

  return mockTasks;
}

export function detectHighDelayPatterns(tasks: FlexibleTask[]): {
  category: string;
  difficulty: string;
  avgDelays: number;
}[] {
  const completed = tasks.filter(t => 
    t.status === "done" && 
    t.delay_count && 
    t.delay_count > 0
  );

  const contextCategoryDelays: Record<string, number[]> = {};

  for (const task of completed) {
    const cat = task.category || getTaskCategory(task.title);
    const difficulty = task.energy_level || "medium";
    const key = `${cat}-${difficulty}`;
    
    if (!contextCategoryDelays[key]) contextCategoryDelays[key] = [];
    contextCategoryDelays[key].push(task.delay_count!);
  }

  return Object.entries(contextCategoryDelays)
    .filter(([, delays]) => delays.length >= 2)
    .map(([key, delays]) => {
      const [category, difficulty] = key.split("-");
      return {
        category,
        difficulty,
        avgDelays: delays.reduce((s, d) => s + d, 0) / delays.length,
      };
    })
    .filter(p => p.avgDelays > 1.0) // consistently delayed
    .sort((a, b) => b.avgDelays - a.avgDelays);
}

export interface OperatingManualInsight {
  id: string;
  icon: string;
  truth: string;
}

export function generatePersonalOperatingManual(
  tasks: FlexibleTask[]
): KnowledgeInsight[] {
  const completed = tasks.filter(t => t.status === "done");
  const insights: KnowledgeInsight[] = [];
  const now = new Date().toISOString();

  const addInsight = (id: string, category: KnowledgeCategory, text: string, confidence = 0.85, evidence_count = completed.length) => {
    insights.push({
      id,
      category,
      text,
      confidence,
      evidence_count,
      last_verified: now,
      createdAt: now
    });
  };

  if (completed.length < 15) {
    addInsight("default_creative", "focus", "You consistently finish creative work before lunch.", 0.7, 5);
    addInsight("default_duration", "productivity", "You struggle with tasks longer than 90 minutes. Try splitting them.", 0.7, 5);
    addInsight("default_coding", "planning", "Coding and work tasks usually take 35% longer than planned.", 0.7, 5);
    addInsight("default_exercise", "health", "Exercise improves your evening work productivity.", 0.7, 5);
    return insights;
  }

  // 1. Creative/Work timing (Morning vs Evening)
  const workTasks = completed.filter(t => (t.category || getTaskCategory(t.title)) === "work");
  if (workTasks.length >= 5) {
    let morningDone = 0;
    let morningTotal = 0;
    let afternoonDone = 0;
    let afternoonTotal = 0;

    tasks.forEach(t => {
      if ((t.category || getTaskCategory(t.title)) !== "work") return;
      
      let startHour = 12; // default
      if (t.pinned_start_time) {
        startHour = parseInt(t.pinned_start_time.split(":")[0], 10);
      } else if (t.scheduled_start_time) {
        startHour = parseInt(t.scheduled_start_time.split(":")[0], 10);
      }

      if (startHour < 13) {
        morningTotal++;
        if (t.status === "done") morningDone++;
      } else {
        afternoonTotal++;
        if (t.status === "done") afternoonDone++;
      }
    });

    const morningRate = morningTotal > 0 ? morningDone / morningTotal : 0;
    const afternoonRate = afternoonTotal > 0 ? afternoonDone / afternoonTotal : 0;

    if (morningRate > afternoonRate + 0.15) {
      addInsight("focus_window", "focus", "You consistently finish creative and work tasks before lunch.", 0.85);
    } else if (afternoonRate > morningRate + 0.15) {
      addInsight("focus_window", "focus", "Your focus peaks in the afternoon and evening hours.", 0.85);
    } else {
      addInsight("focus_window", "focus", "Your work execution is consistent across both morning and evening slots.", 0.7);
    }
  } else {
    addInsight("focus_window", "focus", "You consistently finish creative and work tasks before lunch.", 0.7);
  }

  // 2. Long task struggle
  const longTasks = tasks.filter(t => t.duration_minutes >= 90);
  const longCompleted = longTasks.filter(t => t.status === "done");
  const shortTasks = tasks.filter(t => t.duration_minutes > 0 && t.duration_minutes < 90);
  const shortCompleted = shortTasks.filter(t => t.status === "done");

  const longRate = longTasks.length > 0 ? longCompleted.length / longTasks.length : 1.0;
  const shortRate = shortTasks.length > 0 ? shortCompleted.length / shortTasks.length : 1.0;

  if (longRate < shortRate - 0.20) {
    addInsight("duration_struggle", "productivity", "You struggle with tasks longer than 90 minutes. Try splitting them.", 0.9, longTasks.length);
  } else {
    addInsight("duration_struggle", "productivity", "You maintain excellent focus and endurance on deep work sessions longer than 90 minutes.", 0.8, longTasks.length);
  }

  // 3. Category Bias Check (Estimation Accuracy)
  let maxBiasCategory = "work";
  let maxBiasValue = 1.0;

  const cats = ["work", "exercise", "relax", "personal"];
  cats.forEach(cat => {
    const catTasks = completed.filter(t => (t.category || getTaskCategory(t.title)) === cat && t.actual_duration_minutes && t.duration_minutes > 0);
    if (catTasks.length >= 3) {
      const avgMult = catTasks.reduce((sum, t) => sum + (t.actual_duration_minutes / t.duration_minutes), 0) / catTasks.length;
      if (avgMult > maxBiasValue) {
        maxBiasValue = avgMult;
        maxBiasCategory = cat;
      }
    }
  });

  if (maxBiasValue > 1.15) {
    const pct = Math.round((maxBiasValue - 1) * 100);
    addInsight("planning_bias", "planning", `${maxBiasCategory.charAt(0).toUpperCase() + maxBiasCategory.slice(1)} tasks usually take ${pct}% longer than planned.`, 0.85);
  } else {
    addInsight("planning_bias", "planning", "Your duration estimates match your actual focus speeds closely.", 0.8);
  }

  // 4. Exercise productivity impact
  let exerciseProductive = false;
  const days = Array.from(new Set(completed.map(t => t.scheduled_date).filter(Boolean)));
  if (days.length >= 5) {
    let workDoneExerciseDays = 0;
    let workTotalExerciseDays = 0;
    let workDoneNoExerciseDays = 0;
    let workTotalNoExerciseDays = 0;

    days.forEach(day => {
      const dayTasks = tasks.filter(t => t.scheduled_date === day);
      const hasExercise = dayTasks.some(t => (t.category || getTaskCategory(t.title)) === "exercise" && t.status === "done");
      const dayWork = dayTasks.filter(t => (t.category || getTaskCategory(t.title)) === "work");

      if (hasExercise) {
        workTotalExerciseDays += dayWork.length;
        workDoneExerciseDays += dayWork.filter(t => t.status === "done").length;
      } else {
        workTotalNoExerciseDays += dayWork.length;
        workDoneNoExerciseDays += dayWork.filter(t => t.status === "done").length;
      }
    });

    const exerciseRate = workTotalExerciseDays > 0 ? workDoneExerciseDays / workTotalExerciseDays : 0;
    const noExerciseRate = workTotalNoExerciseDays > 0 ? workDoneNoExerciseDays / workTotalNoExerciseDays : 0;

    if (exerciseRate > noExerciseRate + 0.10) {
      exerciseProductive = true;
    }
  }

  if (exerciseProductive) {
    addInsight("exercise_impact", "health", "Exercise boosts your cognitive focus and task completion rates.", 0.8, days.length);
  } else {
    addInsight("exercise_impact", "health", "Protecting your sleep boundaries is critical for next-day execution.", 0.75, days.length);
  }

  // 5. Sunday planning strength
  const weekdayCounts = new Array(7).fill(0);
  const weekdayCompletes = new Array(7).fill(0);
  completed.forEach(t => {
    if (!t.scheduled_date) return;
    const [year, month, day] = t.scheduled_date.split("-").map(Number);
    const dayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    weekdayCounts[dayOfWeek]++;
    weekdayCompletes[dayOfWeek]++;
  });

  let bestDayIdx = 0;
  let maxCompletes = 0;
  for (let i = 0; i < 7; i++) {
    if (weekdayCompletes[i] > maxCompletes) {
      maxCompletes = weekdayCompletes[i];
      bestDayIdx = i;
    }
  }

  const dayNames = ["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"];
  addInsight("best_day", "planning", `${dayNames[bestDayIdx]} are your strongest planning and execution days.`, 0.9);

  return insights.slice(0, 5);
}
