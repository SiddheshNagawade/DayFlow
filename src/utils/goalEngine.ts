import { UserGoal, FlexibleTask, Achievement, GoalStatus, GoalCategory } from "../types";
import { getTaskCategory } from "./mlEngine";

function getMilestoneIcon(category: string): string {
  const icons: Record<string, string> = {
    fitness: "💪",
    academic: "📚",
    project: "🚀",
    habit: "⚡",
    personal: "⭐",
  };
  return icons[category] || "🏅";
}

// Auto-update goal progress from completed tasks
// Called every time a task is marked done
export function updateGoalProgressFromTask(
  goals: UserGoal[],
  completedTask: FlexibleTask
): { updatedGoals: UserGoal[]; newAchievements: Achievement[] } {
  const newAchievements: Achievement[] = [];
  
  const updatedGoals = goals.map(goal => {
    if (goal.status !== "active") return goal;
    
    // Check if this task matches the goal's linked keywords
    const titleLower = completedTask.title.toLowerCase();
    const genericExclusions = ["buy", "purchase", "shop", "order", "clean", "fix", "cancel", "get"];
    const isInvalidTaskType = genericExclusions.some(word => titleLower.includes(word));
    
    const matches = goal.linkedTaskKeywords.some(kw => 
      titleLower.includes(kw.toLowerCase())
    ) && !isInvalidTaskType;
    
    if (!matches) return goal;
    
    // Increment progress
    let increment = 1;
    if (goal.metricLabel.toLowerCase() === "hours" || goal.metricLabel.toLowerCase() === "hrs") {
      increment = (completedTask.actual_duration_minutes || completedTask.duration_minutes) / 60;
    }
    const newValue = Math.round((goal.currentValue + increment) * 10) / 10;
    
    const newLog = {
      date: new Date().toLocaleDateString("sv"),
      value: newValue,
    };
    
    // Check milestones
    const updatedMilestones = goal.milestones.map(milestone => {
      if (!milestone.achievedAt && newValue >= milestone.targetValue) {
        // Milestone hit — create achievement
        newAchievements.push({
          id: `ach-${Date.now()}-${milestone.id}-${Math.floor(Math.random() * 1000)}`,
          title: milestone.label,
          description: `You reached ${milestone.targetValue} ${goal.metricLabel} for "${goal.title}"`,
          category: goal.category,
          earnedAt: new Date().toISOString(),
          icon: getMilestoneIcon(goal.category),
          goalId: goal.id,
        });
        return { ...milestone, achievedAt: new Date().toISOString() };
      }
      return milestone;
    });
    
    // Check if main goal achieved
    let status: GoalStatus = goal.status;
    let achievedAt = goal.achievedAt;
    if (newValue >= goal.targetValue && goal.status === "active") {
      status = "achieved";
      achievedAt = new Date().toISOString();
      newAchievements.push({
        id: `ach-goal-${goal.id}-${Date.now()}`,
        title: `🎯 Goal Complete: ${goal.title}`,
        description: `You hit ${goal.targetValue} ${goal.metricLabel}!`,
        category: goal.category,
        earnedAt: new Date().toISOString(),
        icon: "🏆",
        goalId: goal.id,
      });
    }
    
    return {
      ...goal,
      currentValue: newValue,
      status,
      achievedAt,
      milestones: updatedMilestones,
      progressLog: [...goal.progressLog, newLog],
    };
  });
  
  return { updatedGoals, newAchievements };
}

// Predict when a goal will be achieved based on current pace
export function predictGoalCompletion(goal: UserGoal): {
  estimatedDate: string | null;
  daysRemaining: number | null;
  weeklyPace: number;
  onTrack: boolean;
} {
  const log = goal.progressLog;
  
  // Reconstruct full progress starting from creation date for better pace calculation
  const fullLog = [...log];
  const baselineValue = goal.startValue !== undefined ? goal.startValue : 0;
  
  // Ensure log has a starting baseline
  const startDayStr = goal.createdAt.split("T")[0];
  const hasStartLog = fullLog.some(entry => entry.date === startDayStr);
  if (!hasStartLog) {
    fullLog.unshift({
      date: startDayStr,
      value: baselineValue,
    });
  }
  
  if (fullLog.length < 2) {
    return { estimatedDate: null, daysRemaining: null, weeklyPace: 0, onTrack: true };
  }
  
  // Calculate pace over last 14 days
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const twoWeeksAgoStr = twoWeeksAgo.toISOString().split("T")[0];
  
  const recentLog = fullLog.filter(entry => entry.date >= twoWeeksAgoStr);
  
  // Fall back to entire history if 14-day history is sparse
  const activeLogSet = recentLog.length >= 2 ? recentLog : fullLog;
  const sortedLog = [...activeLogSet].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const recentGain = sortedLog[sortedLog.length - 1].value - sortedLog[0].value;
  
  const startMs = new Date(sortedLog[0].date).getTime();
  const endMs = new Date(sortedLog[sortedLog.length - 1].date).getTime();
  const daysCovered = Math.max(1, (endMs - startMs) / (1000 * 60 * 60 * 24));
    
  const dailyPace = recentGain / daysCovered;
  const weeklyPace = dailyPace * 7;
  
  if (dailyPace <= 0) {
    return { estimatedDate: null, daysRemaining: null, weeklyPace: 0, onTrack: false };
  }
  
  const remaining = goal.targetValue - goal.currentValue;
  if (remaining <= 0) {
    return { estimatedDate: "Done", daysRemaining: 0, weeklyPace: Math.round(weeklyPace * 10) / 10, onTrack: true };
  }
  
  const daysRemaining = Math.ceil(remaining / dailyPace);
  
  const estimatedDate = new Date();
  estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);
  const estimatedDateStr = estimatedDate.toISOString().split("T")[0];
  
  // Are they on track relative to target date?
  let onTrack = true;
  if (goal.targetDate) {
    const targetDate = new Date(goal.targetDate);
    onTrack = estimatedDate <= targetDate;
  }
  
  return {
    estimatedDate: estimatedDateStr,
    daysRemaining,
    weeklyPace: Math.round(weeklyPace * 10) / 10,
    onTrack,
  };
}

// Generate smart check-in questions based on goal type and recent progress
export function generateCheckInPrompt(goal: UserGoal): string {
  const prediction = predictGoalCompletion(goal);
  const remaining = goal.targetValue - goal.currentValue;
  
  if (goal.category === "fitness") {
    if (goal.metricLabel.toLowerCase() === "sessions") {
      if (prediction.weeklyPace < 2 && prediction.weeklyPace > 0) {
        return `Your gym goal "${goal.title}" needs attention — you've been averaging ${prediction.weeklyPace} sessions/week. Want me to add fitness blocks to more days?`;
      }
      return `Quick check: you have completed ${goal.currentValue} sessions for "${goal.title}" (${remaining} to go). At this pace you will hit your target by ${prediction.estimatedDate ? new Date(prediction.estimatedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "soon"}. Keep going?`;
    }
  }
  
  if (goal.category === "academic") {
    return `How's "${goal.title}" going? You have ${remaining} ${goal.metricLabel} remaining. Is this still on track for ${goal.targetDate ? new Date(goal.targetDate).toLocaleDateString("en-US", { month: "long" }) : "your deadline"}?`;
  }
  
  if (goal.category === "project") {
    return `Let's check in on "${goal.title}". Still active? Let me know if you want to adjust the target or log any progress today.`;
  }
  
  return `Checking in on "${goal.title}": you are at ${goal.currentValue}/${goal.targetValue} ${goal.metricLabel}. How has progress been?`;
}

// Which goals need a check-in today
export function getGoalsDueForCheckIn(goals: UserGoal[]): UserGoal[] {
  const today = new Date().toLocaleDateString("sv");
  
  return goals.filter(goal => {
    if (goal.status !== "active") return false;
    if (!goal.nextCheckInAt) return true; // never checked in
    return goal.nextCheckInAt <= today;
  });
}

// Auto-detect goals that should exist based on task patterns
export function suggestGoalsFromTaskHistory(
  tasks: FlexibleTask[],
  existingGoals: UserGoal[]
): { title: string; category: GoalCategory; keywords: string[]; suggestion: string; targetValue: number; metricLabel: string }[] {
  const suggestions: { title: string; category: GoalCategory; keywords: string[]; suggestion: string; targetValue: number; metricLabel: string }[] = [];
  const existingKeywords = new Set(existingGoals.flatMap(g => g.linkedTaskKeywords.map(kw => kw.toLowerCase())));
  
  // Count tasks by category over last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0];
  
  const recentCompleted = tasks.filter(t => 
    t.status === "done" && 
    t.completed_at && 
    t.completed_at >= thirtyDaysAgoStr
  );
  
  // Gym/exercise pattern
  const gymTasks = recentCompleted.filter(t => 
    getTaskCategory(t.title) === "exercise"
  );
  const hasGymGoal = Array.from(existingKeywords).some(kw => ["gym", "workout", "exercise", "run"].includes(kw));
  if (gymTasks.length >= 4 && !hasGymGoal) {
    suggestions.push({
      title: "Gym Consistency Goal",
      category: "fitness",
      keywords: ["gym", "workout", "exercise", "run"],
      suggestion: `You've done ${gymTasks.length} workout sessions in the last 30 days. Let's set a consistency goal to hit 50 sessions!`,
      targetValue: 50,
      metricLabel: "sessions"
    });
  }
  
  // Study/work pattern
  const studyTasks = recentCompleted.filter(t => 
    getTaskCategory(t.title) === "work" && 
    (t.title.toLowerCase().includes("study") || t.title.toLowerCase().includes("read") || t.title.toLowerCase().includes("code") || t.title.toLowerCase().includes("learn"))
  );
  const hasStudyGoal = Array.from(existingKeywords).some(kw => ["study", "read", "learn", "dsa"].includes(kw));
  if (studyTasks.length >= 6 && !hasStudyGoal) {
    suggestions.push({
      title: "Study Consistency",
      category: "academic",
      keywords: ["study", "read", "learn", "course"],
      suggestion: `You've completed ${studyTasks.length} study sessions this month. Want to set a streak goal of 100 study sessions?`,
      targetValue: 100,
      metricLabel: "sessions"
    });
  }
  
  return suggestions;
}

// Generate milestones dynamically based on target value sizing (avoids spammy achievements)
export function generateMilestones(targetValue: number, metricLabel: string): { id: string; label: string; targetValue: number; celebrationShown: boolean }[] {
  if (targetValue <= 5) {
    return [
      { id: "m100", label: `Complete: reach ${targetValue} ${metricLabel}`, targetValue, celebrationShown: false }
    ];
  } else if (targetValue <= 15) {
    const m50 = Math.round(targetValue * 0.5 * 10) / 10;
    return [
      { id: "m50", label: `Halfway point: reach ${m50} ${metricLabel}`, targetValue: m50, celebrationShown: false },
      { id: "m100", label: `Complete: reach ${targetValue} ${metricLabel}`, targetValue, celebrationShown: false }
    ];
  } else {
    const m25 = Math.round(targetValue * 0.25 * 10) / 10;
    const m50 = Math.round(targetValue * 0.5 * 10) / 10;
    const m75 = Math.round(targetValue * 0.75 * 10) / 10;
    return [
      { id: "m25", label: `Quarter way: reach ${m25} ${metricLabel}`, targetValue: m25, celebrationShown: false },
      { id: "m50", label: `Halfway point: reach ${m50} ${metricLabel}`, targetValue: m50, celebrationShown: false },
      { id: "m75", label: `Three-quarters: reach ${m75} ${metricLabel}`, targetValue: m75, celebrationShown: false },
      { id: "m100", label: `Complete: reach ${targetValue} ${metricLabel}`, targetValue, celebrationShown: false }
    ];
  }
}

// Evaluate overall task completions to unlock unique category badges safely without duplicate awards
export function checkForGlobalAchievements(
  tasks: FlexibleTask[],
  currentAchievements: Achievement[]
): Achievement[] {
  const newAchievements: Achievement[] = [];
  const completedTasks = tasks.filter(t => t.status === "done");
  
  const checkAndAward = (badgeId: string, title: string, description: string, category: string, icon: string) => {
    const globalId = `global-${badgeId}`;
    const alreadyEarned = currentAchievements.some(a => a.id === globalId) || 
                          newAchievements.some(a => a.id === globalId);
    
    if (!alreadyEarned) {
      newAchievements.push({
        id: globalId,
        title,
        description,
        category: category as any,
        earnedAt: new Date().toISOString(),
        icon
      });
    }
  };
  
  // Count by task categories
  let fitnessCount = 0;
  let focusCount = 0;
  let relaxCount = 0;
  let personalCount = 0;
  
  for (const task of completedTasks) {
    const cat = getTaskCategory(task.title);
    if (cat === "exercise") fitnessCount++;
    else if (cat === "work") focusCount++;
    else if (cat === "relax") relaxCount++;
    else personalCount++;
  }
  
  // Fitness achievements
  if (fitnessCount >= 10) checkAndAward("fitness-bronze", "💪 Fitness Bronze", "Completed 10 fitness sessions!", "fitness", "💪");
  if (fitnessCount >= 25) checkAndAward("fitness-silver", "🏃 Fitness Silver", "Completed 25 fitness sessions!", "fitness", "🏃");
  if (fitnessCount >= 50) checkAndAward("fitness-gold", "🏆 Fitness Gold", "Completed 50 fitness sessions!", "fitness", "🏆");
  
  // Focus (Academic / Work) achievements
  if (focusCount >= 10) checkAndAward("focus-apprentice", "📚 Focus Apprentice", "Completed 10 study/work sessions!", "academic", "📚");
  if (focusCount >= 30) checkAndAward("focus-scholar", "🎓 Focus Scholar", "Completed 30 study/work sessions!", "academic", "🎓");
  if (focusCount >= 75) checkAndAward("focus-master", "🧠 Focus Master", "Completed 75 study/work sessions!", "academic", "🧠");
  
  // Mindfulness (Relax) achievements
  if (relaxCount >= 10) checkAndAward("relax-starter", "🍃 Mindful Starter", "Completed 10 relaxation sessions!", "habit", "🍃");
  if (relaxCount >= 30) checkAndAward("relax-zen", "🧘 Zen Master", "Completed 30 relaxation sessions!", "habit", "🧘");
  
  // Self Care (Personal) achievements
  if (personalCount >= 10) checkAndAward("personal-beginner", "⭐ Self Care Beginner", "Completed 10 personal care sessions!", "personal", "⭐");
  if (personalCount >= 30) checkAndAward("personal-champion", "💫 Self Care Champion", "Completed 30 personal care sessions!", "personal", "💫");
  
  // Overall completions achievements
  const totalCount = completedTasks.length;
  if (totalCount >= 25) checkAndAward("total-catalyst", "🎯 Productivity Catalyst", "Completed 25 tasks overall in DayFlow!", "completion", "🎯");
  if (totalCount >= 50) checkAndAward("total-flowrider", "⚡ Flow Rider", "Completed 50 tasks overall in DayFlow!", "completion", "⚡");
  if (totalCount >= 100) checkAndAward("total-legend", "👑 Legend of Flow", "Completed 100 tasks overall in DayFlow!", "completion", "👑");
  
  return newAchievements;
}
