/**
 * AI Context Builder — V3.1 Payload Minimization
 *
 * Responsible for compressing all local app state into a lean AICompactContext.
 * This is the ONLY thing that gets sent to /api/ai-reasoning.
 *
 * Rule: no raw FlexibleTask[], no raw ScheduledItem[], no raw logs.
 * AI receives only what it needs to reason and coach.
 */

import { FlexibleTask, ScheduledItem, UserGoal, BehaviorSignals, AICompactContext } from "../types";
import { predictGoalCompletion } from "./goalEngine";
import { getTaskCategory } from "./mlEngine";

/**
 * Build the compact context envelope for AI calls.
 *
 * @param trigger       - what triggered the AI call
 * @param behaviorSignals - pre-computed Pattern Engine output
 * @param staleTasks    - tasks that are overdue (not done/skipped/expired)
 * @param todayItems    - today's scheduled items (used for summary only)
 * @param goals         - user goals (for goal impact math)
 * @param driftedTask   - the specific missed task if trigger === "drift"
 * @param backlogCount  - number of tasks sitting in backlog
 * @param userMessage   - optional user message for copilot trigger
 */
export function buildAICompactContext(
  trigger: AICompactContext["trigger"],
  behaviorSignals: BehaviorSignals,
  staleTasks: FlexibleTask[],
  todayItems: ScheduledItem[],
  goals: UserGoal[],
  driftedTask: ScheduledItem | null,
  backlogCount: number,
  userMessage?: string
): AICompactContext {
  // Today's load in minutes (flexible tasks only)
  const todayLoadMins = todayItems
    .filter(i => i.type === "flexible")
    .reduce((s, i) => s + i.duration_minutes, 0);

  // Overload risk: ratio of planned time vs sustainable 8-hour day
  const overloadRisk = Math.min(1.0, todayLoadMins / 480);

  // Upcoming tasks: next 3 unfinished scheduled items (titles only)
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  const upcomingTaskTitles = todayItems
    .filter(i => {
      if (i.status === "done" || i.type !== "flexible") return false;
      const [h, m] = i.start_time.split(":").map(Number);
      return (h * 60 + m) >= nowMins;
    })
    .slice(0, 3)
    .map(i => i.title);

  // Goal impact: math-computed delay for stale/missed tasks linked to goals
  const goalImpact: AICompactContext["goalImpact"] = [];

  const tasksToEvaluate = driftedTask
    ? [{ id: driftedTask.id, title: driftedTask.title } as FlexibleTask]
    : staleTasks;

  tasksToEvaluate.forEach(task => {
    // Match goals via keywords or goalIds
    const linkedGoal = goals.find(g =>
      g.status === "active" && g.linkedTaskKeywords.some(kw =>
        task.title.toLowerCase().includes(kw.toLowerCase())
      )
    );
    if (!linkedGoal) return;

    const prediction = predictGoalCompletion(linkedGoal);
    if (!prediction.weeklyPace || prediction.weeklyPace <= 0) return;

    // Delay = 1 missed session / weekly pace * 7 days
    const delayDays = Math.round((1 / prediction.weeklyPace) * 7 * 10) / 10;
    if (delayDays > 0) {
      goalImpact.push({
        goalTitle: linkedGoal.title,
        delayDays,
      });
    }
  });

  return {
    trigger,
    behaviorSignals,
    currentState: {
      staleTasksCount: staleTasks.length,
      todayLoadMins,
      missedTask: driftedTask?.title,
      overloadRisk: Math.round(overloadRisk * 100) / 100,
      backlogCount,
      upcomingTaskTitles,
    },
    goalImpact: goalImpact.length > 0 ? goalImpact : undefined,
    userMessage,
  };
}

/**
 * Build a compact schedule summary string for the copilot (/api/adjust-schedule).
 * Replaces the full pendingTasks array with a lean text block.
 *
 * Returns a short string describing today's state, not an array of raw objects.
 */
export function buildCopilotScheduleSummary(
  todayItems: ScheduledItem[],
  pendingTasks: FlexibleTask[],
  today: string
): { scheduleSummary: string; pendingSummary: string } {
  // Today's schedule: title + time range + status (not full objects)
  const scheduleSummary = todayItems
    .map(i => {
      const status = i.status === "done" ? "✓" : i.status === "fixed" ? "🔒" : "○";
      return `${status} "${i.title}" ${i.start_time}–${i.end_time}`;
    })
    .join("\n") || "(no schedule today)";

  // Pending tasks: limit to 10 most relevant (prioritize those with deadlines or high importance)
  const sorted = [...pendingTasks]
    .sort((a, b) => {
      // Prioritize: has deadline > scheduled today > backlog
      const aScore = (a.deadline ? 2 : 0) + (a.scheduled_date === today ? 1 : 0);
      const bScore = (b.deadline ? 2 : 0) + (b.scheduled_date === today ? 1 : 0);
      return bScore - aScore;
    })
    .slice(0, 10);

  const pendingSummary = sorted
    .map(t => {
      const deadline = t.deadline ? ` [due: ${t.deadline}]` : "";
      const status = t.scheduled_date === today ? "today" : t.scheduled_date || "backlog";
      const cat = t.meta?.category || getTaskCategory(t.title);
      return `- "${t.title}" (${t.duration_minutes}min, ${cat}, ${status})${deadline}`;
    })
    .join("\n") || "(no pending tasks)";

  return { scheduleSummary, pendingSummary };
}
