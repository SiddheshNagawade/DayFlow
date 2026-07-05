import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Search,
  X,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Lock,
  Check,
  Play,
  Square,
  Flame,
  Info,
  Coffee,
  Trash2,
  Edit2,
  ArrowRight,
  CalendarDays as CalendarIcon,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  Circle,
  ArrowUpRight,
  Calendar,
  Star,
} from "lucide-react";
import {
  FlexibleTask,
  ActiveTimer,
  ScheduledItem,
  FrictionReason,
  ReflectionEvent,
  RoutineBlock,
} from "../../types";
import { AppSettings } from "../../utils/storage";
import {
  timeToMinutes,
  minutesToTime,
} from "../../utils/scheduler";
import { getTaskCategory } from "../../utils/mlEngine";

// ─── Timer Banner ────────────────────────────────────────────────────────────
const ActiveTimerBanner: React.FC<{
  activeTimer: ActiveTimer;
  onStop: () => void;
}> = ({ activeTimer, onStop }) => {
  const [secs, setSecs] = React.useState(() =>
    Math.floor((Date.now() - activeTimer.startedAt) / 1000)
  );
  React.useEffect(() => {
    const t = setInterval(
      () => setSecs(Math.floor((Date.now() - activeTimer.startedAt) / 1000)),
      1000
    );
    return () => clearInterval(t);
  }, [activeTimer]);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  const ts = `${h > 0 ? h + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return (
    <div className="mx-4 mb-3 mt-1.5 p-3.5 bg-zinc-900 dark:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 rounded-2xl flex items-center justify-between text-xs animate-fade-in shadow-xs">
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-red-500 animate-ping shrink-0" />
        <span className="font-bold text-white dark:text-zinc-900 uppercase tracking-wider text-[10px]">Recording</span>
        <span className="font-semibold text-zinc-300 dark:text-zinc-600">{activeTimer.title}</span>
        <span className="font-mono bg-zinc-800 dark:bg-zinc-200 px-2.5 py-0.5 rounded-lg text-white dark:text-zinc-900 font-extrabold text-[11px]">{ts}</span>
      </div>
      <button
        onClick={onStop}
        className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white font-extrabold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer active:scale-95 text-[10px] uppercase border border-zinc-200 dark:border-zinc-700"
      >
        Stop
      </button>
    </div>
  );
};

// ─── AI Plan Box ─────────────────────────────────────────────────────────────
const AIPlanBox: React.FC<{
  taskId: string;
  taskTitle: string;
  taskDescription?: string;
  forDate: string;
  fetchDailyPlan?: (task: FlexibleTask, forDate: string) => Promise<string | null>;
  task: FlexibleTask;
  setFlexibleTasks: React.Dispatch<React.SetStateAction<FlexibleTask[]>>;
}> = ({ taskId, taskTitle, taskDescription, forDate, fetchDailyPlan, task, setFlexibleTasks }) => {
  const [plan, setPlan] = useState<string>("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If we already have a generated plan for today, use it!
    if (task.daily_plan && task.daily_plan_generated_date === forDate) {
      setPlan(task.daily_plan);
      return;
    }
    // Else if we have a static description/plan
    if (taskDescription && taskDescription.trim()) {
      setPlan(taskDescription.trim());
      return;
    }
    if (!fetchDailyPlan) return;
    setLoading(true);
    fetchDailyPlan(task, forDate)
      .then((res) => {
        if (res) {
          const trimmed = res.trim();
          setPlan(trimmed);
          // Save to parent state so we don't query it again!
          setFlexibleTasks(prev => prev.map(t => 
            t.id === task.id 
              ? { ...t, daily_plan: trimmed, daily_plan_generated_date: forDate }
              : t
          ));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [taskId, forDate, task.daily_plan, task.daily_plan_generated_date, taskDescription]);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      const len = draft.length;
      el.focus();
      el.setSelectionRange(len, len);
      el.style.height = "auto";
      el.style.height = `${Math.max(112, el.scrollHeight + 4)}px`;
    }
  }, [editing]);

  if (!plan && !loading) return null;

  return (
    <div className="mt-3 border-t border-zinc-100 dark:border-zinc-800 pt-3">
      <div className="flex items-center gap-1.5 mb-2">
        <Sparkles className="w-3 h-3 text-zinc-400" />
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Description</span>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-xs">
          <span className="w-3 h-3 border border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
          Generating plan…
        </div>
      ) : editing ? (
        <div className="space-y-2">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              e.target.style.height = "auto";
              e.target.style.height = `${e.target.scrollHeight + 4}px`;
            }}
            className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none text-zinc-900 dark:text-zinc-100"
            style={{ minHeight: "112px" }}
          />
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-zinc-400 hover:text-zinc-600 cursor-pointer font-semibold"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                setPlan(draft);
                setEditing(false);
                setFlexibleTasks(prev => prev.map(t => 
                  t.id === task.id 
                    ? { ...t, daily_plan: draft, daily_plan_generated_date: forDate }
                    : t
                ));
              }}
              className="text-xs bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold px-3 py-1.5 rounded-lg cursor-pointer"
            >
              ✓ Save
            </button>
          </div>
        </div>
      ) : (
        <div
          className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg p-1.5 -m-1.5 transition-colors"
          onClick={() => { setDraft(plan); setEditing(true); }}
          title="Tap to edit"
        >
          {plan}
          <span className="inline-block w-[1.5px] h-[13px] bg-zinc-700 dark:bg-zinc-350 align-middle ml-1.5 animate-pulse" />
        </div>
      )}
    </div>
  );
};

// ─── Consequence Box ─────────────────────────────────────────────────────────
const ConsequenceBox: React.FC<{
  task: FlexibleTask;
  fetchConsequenceInsight: (task: FlexibleTask, intent?: any, delayMins?: number) => Promise<any>;
  consequenceCache: Record<string, any>;
}> = ({ task, fetchConsequenceInsight, consequenceCache }) => {
  const [insight, setInsight] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [intent, setIntent] = useState<"delay" | "skip">("delay");
  const [delayMins, setDelayMins] = useState<number>(30);

  const fetchInsight = useCallback(async (selectedIntent: "delay" | "skip", selectedMins: number) => {
    setLoading(true);
    try {
      const res = await fetchConsequenceInsight(task, selectedIntent, selectedMins);
      setInsight(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [task, fetchConsequenceInsight]);

  useEffect(() => {
    // If the task already has a cached consequence insight matching this intent, use it!
    if (task.consequence_insight && intent === "skip") {
      setInsight({
        immediate_effect: task.consequence_teaser || "",
        cascade_effect: task.consequence_insight,
        goal_effect: ""
      });
      return;
    }
    const cacheKey = `${task.id}_${intent}_${delayMins}`;
    if (consequenceCache && consequenceCache[cacheKey]) {
      setInsight(consequenceCache[cacheKey]);
      return;
    }
    fetchInsight(intent, delayMins);
  }, [task.id, intent, delayMins, consequenceCache, fetchInsight, task.consequence_insight, task.consequence_teaser]);

  return (
    <div className="mt-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-150 dark:border-zinc-800 rounded-xl p-3 text-xs space-y-2">
      <div className="flex items-center justify-between">
        <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-400">AI Consequence Insight</span>
        <div className="flex gap-1.5">
          <button
            onClick={() => setIntent("delay")}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
              intent === "delay"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Delay
          </button>
          <button
            onClick={() => setIntent("skip")}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
              intent === "skip"
                ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                : "text-zinc-500 hover:text-zinc-700"
            }`}
          >
            Skip
          </button>
        </div>
      </div>

      {intent === "delay" && (
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-zinc-400">Duration:</span>
          {[15, 30, 60].map((mins) => (
            <button
              key={mins}
              onClick={() => setDelayMins(mins)}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                delayMins === mins
                  ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-800 dark:text-zinc-100"
                  : "text-zinc-400 hover:text-zinc-650"
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400 text-xs">
          <span className="w-3 h-3 border border-zinc-300 border-t-zinc-600 rounded-full animate-spin" />
          Analyzing consequence…
        </div>
      ) : insight ? (
        <div className="space-y-1 text-zinc-650 dark:text-zinc-350 leading-normal">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100">{insight.impactSummary || "No direct impact on other tasks."}</p>
          {insight.conflictChain && insight.conflictChain.length > 0 && (
            <p className="text-[11px] text-zinc-400">
              Conflicts with: {insight.conflictChain.map((c: any) => c.title).join(", ")}
            </p>
          )}
        </div>
      ) : (
        <p className="text-zinc-400">No data analyzed.</p>
      )}
    </div>
  );
};

// ─── Props ───────────────────────────────────────────────────────────────────
interface TodayTabProps {
  activeTimer: ActiveTimer | null;
  handleStopTimer: () => void;
  selectedDate: string;
  TODAY: string;
  currentTimeMins: number;
  todayIncompleteTasks: FlexibleTask[];
  eodDismissed: boolean;
  handleStartEveningCheckin: () => void;
  setEodDismissed: (val: boolean) => void;
  copilotUndoState: any;
  handleUndoAIChanges: () => void;
  setCopilotUndoState: (val: any) => void;
  showDriftBanner: boolean;
  driftedTask: any;
  handleToggleTaskDone: (id: string) => void;
  driftPromptCountToday: number;
  setDriftPromptCountToday: (val: number) => void;
  setLastDriftPromptAt: (val: number) => void;
  handleDelayTask15Minutes: (id: string, startTime: string) => void;
  runAIResolution: (
    triggerType: "reflection" | "drift",
    userNotesVal?: string,
    causeVal?: string
  ) => Promise<void>;
  isProcessingAIReasoning: boolean;
  setSelectedDate: (date: string) => void;
  getLocalTodayStr: (date?: Date) => string;
  daySchedule: any;
  formatMinutes: (mins: number) => string;
  handleDeleteFlexible: (id: string) => void;
  handleOpenEditFlexible: (task: any) => void;
  handleOpenAddFlexible: (isToday: boolean, defaultDuration?: number) => void;
  showToast: (msg: string, type?: "success" | "info" | "warning") => void;
  flexibleTasks: FlexibleTask[];
  appSettings: AppSettings;
  calibrationProfile: any;
  delayPatterns: any;
  routineBlocks: RoutineBlock[];
  setRoutineBlocks: React.Dispatch<React.SetStateAction<RoutineBlock[]>>;
  getSuspendedRoutineTypesForDate: (date: string) => Set<string>;
  handleDeleteFixed: (id: string) => void;
  handleOpenAddFixed: () => void;
  handleOpenEditFixed: (block: any) => void;
  handleStartTimer: (taskId: string, title: string) => void;
  hasUnverifiedPastTasks: boolean;
  handleAlignTimeline: () => void;
  projects: any[];
  consequenceCache: Record<string, any>;
  fetchConsequenceInsight: (
    task: FlexibleTask,
    intent?: any,
    delayMins?: number
  ) => Promise<any>;
  executeNegotiationCommand: (task: FlexibleTask, command: any) => void;
  handleOpenAICopilot: () => void;
  setCopilotInput: (input: string) => void;
  completedStreak: number;
  profileName: string;
  handleUpdateFlexible: (tasks: FlexibleTask[]) => void;
  recordTaskExecutionLog: (
    taskId: string,
    isCompleted: boolean,
    isSkipped: boolean,
    durationMinutes: number,
    note?: string,
    source?: string,
    confidence?: number
  ) => void;
  checkDayComplete: (updatedFlexTasks: any[]) => void;
  triggerHaptic: (pattern: number | number[]) => void;
  dragOverPosition: "before" | "after";
  setDragOverPosition: (pos: "before" | "after") => void;
  executePostponeDirectly: (
    taskId: string,
    actionType: "delay_15" | "delay_30",
    start_time?: string
  ) => void;
  draggedTaskId: string | null;
  setDraggedTaskId: (id: string | null) => void;
  dragOverTaskId: string | null;
  setDragOverTaskId: (id: string | null) => void;
  activeNowTask: any;
  upNextTask: any;
  handleDragStart: (taskId: string) => void;
  handleDragOver: (e: React.DragEvent, taskId: string) => void;
  handleDrop: (e: React.DragEvent, targetTaskId: string) => void;
  handleDragEnd: () => void;
  handleOpenPinTime: (taskId: string, currentStart: string) => void;
  handleUnpinTime: (taskId: string) => void;
  pinTimeTaskId: string | null;
  setPinTimeTaskId?: (id: string | null) => void;
  setPinTimeValue: (val: string) => void;
  pinTimeValue?: string;
  handleConfirmPinTime: () => void;
  fixedBlocks: any[];
  executePostponeWithFrictionDetails: (
    taskId: string,
    actionType: "delay_15" | "delay_30" | "tomorrow",
    reason: FrictionReason,
    notes: string,
    start_time?: string
  ) => void;
  executePostponeWithFriction: (
    taskId: string,
    actionType: "delay_15" | "delay_30" | "tomorrow",
    reason: FrictionReason,
    start_time?: string
  ) => void;
  executeInlineDecomposition: (
    taskId: string,
    subtasks: Array<{ title: string; duration: number }>
  ) => void;
  deletingTaskId: string | null;
  loadingInsightTaskId?: string | null;
  setFlexibleTasks: React.Dispatch<React.SetStateAction<FlexibleTask[]>>;
  handleScheduleTaskToday: (task: FlexibleTask) => void;
  setDeletingTaskId: (id: string | null) => void;
  dailyCoachReflection: string | null;
  showReflectionCard: boolean;
  yesterdayCompletionRate: number;
  selectedCause: string | null;
  setSelectedCause: (cause: string | null) => void;
  reflectionNotes: string;
  setReflectionNotes: (notes: string) => void;
  runLocalResolution: (staleTasksList?: FlexibleTask[]) => void;
  reflectionEvents: ReflectionEvent[];
  setReflectionEvents: (events: ReflectionEvent[]) => void;
  saveReflectionEvents: (events: ReflectionEvent[]) => void;
  staleTasks: FlexibleTask[];
  totalPlannedDurationMins: number;
  setActiveTimer: React.Dispatch<React.SetStateAction<ActiveTimer | null>>;
  fetchDailyPlan?: (task: FlexibleTask, forDate: string) => Promise<string | null>;
  handleInterventionFeedback?: (taskId: string, interventionType: string, wasHelpful: boolean) => void;
}

// ─── Main Component ──────────────────────────────────────────────────────────
export const TodayTab: React.FC<TodayTabProps> = React.memo(({
  activeTimer,
  handleStopTimer,
  selectedDate,
  TODAY,
  currentTimeMins,
  todayIncompleteTasks,
  eodDismissed,
  handleStartEveningCheckin,
  setEodDismissed,
  copilotUndoState,
  handleUndoAIChanges,
  setCopilotUndoState,
  showDriftBanner,
  driftedTask,
  handleToggleTaskDone,
  driftPromptCountToday,
  setDriftPromptCountToday,
  setLastDriftPromptAt,
  handleDelayTask15Minutes,
  runAIResolution,
  isProcessingAIReasoning,
  setSelectedDate,
  getLocalTodayStr,
  daySchedule,
  formatMinutes,
  handleDeleteFlexible,
  handleOpenEditFlexible,
  handleOpenAddFlexible,
  showToast,
  flexibleTasks,
  appSettings,
  calibrationProfile,
  delayPatterns,
  routineBlocks,
  setRoutineBlocks,
  getSuspendedRoutineTypesForDate,
  handleDeleteFixed,
  handleOpenAddFixed,
  handleOpenEditFixed,
  handleStartTimer,
  hasUnverifiedPastTasks,
  handleAlignTimeline,
  projects,
  consequenceCache,
  fetchConsequenceInsight,
  executeNegotiationCommand,
  handleOpenAICopilot,
  setCopilotInput,
  completedStreak,
  profileName,
  handleUpdateFlexible,
  recordTaskExecutionLog,
  checkDayComplete,
  triggerHaptic,
  dragOverPosition,
  setDragOverPosition,
  executePostponeDirectly,
  draggedTaskId,
  setDraggedTaskId,
  dragOverTaskId,
  setDragOverTaskId,
  activeNowTask,
  upNextTask,
  handleDragStart,
  handleDragOver,
  handleDrop,
  handleDragEnd,
  handleOpenPinTime,
  handleUnpinTime,
  pinTimeTaskId,
  setPinTimeValue,
  handleConfirmPinTime,
  fixedBlocks,
  executePostponeWithFrictionDetails,
  executePostponeWithFriction,
  executeInlineDecomposition,
  deletingTaskId,
  setFlexibleTasks,
  handleScheduleTaskToday,
  setDeletingTaskId,
  dailyCoachReflection,
  showReflectionCard,
  yesterdayCompletionRate,
  selectedCause,
  setSelectedCause,
  reflectionNotes,
  setReflectionNotes,
  runLocalResolution,
  reflectionEvents,
  setReflectionEvents,
  saveReflectionEvents,
  staleTasks,
  totalPlannedDurationMins,
  setActiveTimer,
  fetchDailyPlan,
  handleInterventionFeedback,
}) => {
  // ── UI State ────────────────────────────────────────────────────────────────
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});
  const [swipeX, setSwipeX] = useState<Record<string, number>>({});
  const [swipeOpen, setSwipeOpen] = useState<Record<string, boolean>>({});
  const swipeTouchStart = useRef<number>(0);
  const [coachDismissed, setCoachDismissed] = useState(false);
  const [reflectionDismissed, setReflectionDismissed] = useState(false);

  // Local UI States for Baseline Onboarding Wizard
  const [showBaselineWizard, setShowBaselineWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [differentWeekends, setDifferentWeekends] = useState(false);
  const [wizardDismissed, setWizardDismissed] = useState(() => {
    return localStorage.getItem("dayflow_wizard_dismissed") === "true";
  });

  const [weekdayWake, setWeekdayWake] = useState("07:00");
  const [weekdaySleep, setWeekdaySleep] = useState("23:00");
  const [weekendWake, setWeekendWake] = useState("08:30");
  const [weekendSleep, setWeekendSleep] = useState("23:30");

  const [weekdayBreakfast, setWeekdayBreakfast] = useState("08:00");
  const [weekdayLunch, setWeekdayLunch] = useState("13:00");
  const [weekdayDinner, setWeekdayDinner] = useState("20:00");
  const [weekendBreakfast, setWeekendBreakfast] = useState("09:00");
  const [weekendLunch, setWeekendLunch] = useState("13:30");
  const [weekendDinner, setWeekendDinner] = useState("21:00");

  const handleSaveBaselineRoutines = () => {
    const newRoutines: RoutineBlock[] = [];
    
    const createSleepBlocks = (wakeStr: string, sleepStr: string, days: number[]) => {
      // 1. Morning Sleep: 00:00 to Wake Time
      newRoutines.push({
        id: "routine_sleep_morning_" + Math.random().toString(36).substring(2, 9),
        title: "💤 Sleep (Morning)",
        daysOfWeek: days,
        startTime: "00:00",
        endTime: wakeStr,
        type: "sleep",
        rigidity: "hard",
        source: "user_direct"
      });
      // 2. Night Sleep: Sleep Time to 23:59
      newRoutines.push({
        id: "routine_sleep_night_" + Math.random().toString(36).substring(2, 9),
        title: "💤 Sleep (Night)",
        daysOfWeek: days,
        startTime: sleepStr,
        endTime: "23:59",
        type: "sleep",
        rigidity: "hard",
        source: "user_direct"
      });
    };

    const createMealBlock = (title: string, startStr: string, duration: number, days: number[]) => {
      const startMins = timeToMinutes(startStr);
      const endStr = minutesToTime(startMins + duration);
      newRoutines.push({
        id: "routine_meal_" + title.toLowerCase().replace(/[^a-z]/g, "") + "_" + Math.random().toString(36).substring(2, 9),
        title: title,
        daysOfWeek: days,
        startTime: startStr,
        endTime: endStr,
        type: "meal",
        rigidity: "hard",
        source: "user_direct"
      });
    };

    if (differentWeekends) {
      // Create weekday routines
      createSleepBlocks(weekdayWake, weekdaySleep, [1, 2, 3, 4, 5]);
      createMealBlock("🍳 Breakfast", weekdayBreakfast, 30, [1, 2, 3, 4, 5]);
      createMealBlock("🥪 Lunch", weekdayLunch, 45, [1, 2, 3, 4, 5]);
      createMealBlock("🍽️ Dinner", weekdayDinner, 45, [1, 2, 3, 4, 5]);

      // Create weekend routines
      createSleepBlocks(weekendWake, weekendSleep, [0, 6]);
      createMealBlock("🍳 Breakfast", weekendBreakfast, 30, [0, 6]);
      createMealBlock("🥪 Lunch", weekendLunch, 45, [0, 6]);
      createMealBlock("🍽️ Dinner", weekendDinner, 45, [0, 6]);
    } else {
      // Create combined routines for all days
      createSleepBlocks(weekdayWake, weekdaySleep, [0, 1, 2, 3, 4, 5, 6]);
      createMealBlock("🍳 Breakfast", weekdayBreakfast, 30, [0, 1, 2, 3, 4, 5, 6]);
      createMealBlock("🥪 Lunch", weekdayLunch, 45, [0, 1, 2, 3, 4, 5, 6]);
      createMealBlock("🍽️ Dinner", weekdayDinner, 45, [0, 1, 2, 3, 4, 5, 6]);
    }

    setRoutineBlocks(newRoutines);
    showToast("Baseline routine blocks established!", "success");
    triggerHaptic(50);
  };

  // Friction / postpone sheet
  const [frictionPrompt, setFrictionPrompt] = useState<{
    taskId: string;
    start_time: string;
    isSkip?: boolean;
  } | null>(null);
  const [frictionReason, setFrictionReason] = useState<string | null>(null);
  const [frictionNotes, setFrictionNotes] = useState("");

  // Consequence state (skip/delay insight)
  const [consequenceState, setConsequenceState] = useState<{
    taskId: string;
    mode: "skip" | "delay";
    cached: any;
  } | null>(null);

  // Date nav helpers
  const isToday = selectedDate === TODAY;
  const isPastDate = selectedDate < TODAY;

  const navigateDate = (dir: -1 | 1) => {
    const d = new Date(selectedDate + "T00:00:00");
    d.setDate(d.getDate() + dir);
    const next = getLocalTodayStr(d);
    // Don't navigate to future beyond today+7
    setSelectedDate(next);
  };

  const formatDateLabel = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    if (dateStr === TODAY) return "Today";
    const diff = Math.round(
      (new Date(dateStr + "T00:00:00").getTime() - new Date(TODAY + "T00:00:00").getTime()) /
        86400000
    );
    if (diff === -1) return "Yesterday";
    if (diff === 1) return "Tomorrow";
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Swipe handlers
  const handleTouchStart = (e: React.TouchEvent, id: string) => {
    swipeTouchStart.current = e.touches[0].clientX;
  };
  const handleTouchMove = (e: React.TouchEvent, id: string) => {
    const dx = e.touches[0].clientX - swipeTouchStart.current;
    if (dx > 0 && dx < 130) {
      setSwipeX((p) => ({ ...p, [id]: dx }));
    } else if (dx < 0 && dx > -90) {
      setSwipeX((p) => ({ ...p, [id]: dx }));
    }
  };
  const handleTouchEnd = (_e: React.TouchEvent, id: string) => {
    const cur = swipeX[id] || 0;
    if (cur > 30) {
      setSwipeX((p) => ({ ...p, [id]: 108 }));
      setSwipeOpen((p) => ({ ...p, [id]: true }));
    } else if (cur < -30) {
      setSwipeX((p) => ({ ...p, [id]: -60 }));
      setSwipeOpen((p) => ({ ...p, [id]: true }));
    } else {
      setSwipeX((p) => ({ ...p, [id]: 0 }));
      setSwipeOpen((p) => ({ ...p, [id]: false }));
    }
  };
  const closeSwipe = (id: string) => {
    setSwipeX((p) => ({ ...p, [id]: 0 }));
    setSwipeOpen((p) => ({ ...p, [id]: false }));
  };

  const toggleExpand = (id: string) =>
    setExpandedIds((p) => ({ ...p, [id]: !p[id] }));

  // Close any swiped card when user scrolls or clicks/taps outside
  const handleScroll = () => {
    if (Object.values(swipeOpen).some(Boolean)) {
      setSwipeX({});
      setSwipeOpen({});
    }
  };

  React.useEffect(() => {
    const handleGlobalClick = () => {
      if (Object.values(swipeOpen).some(Boolean)) {
        setSwipeX({});
        setSwipeOpen({});
      }
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [swipeOpen]);

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden overflow-x-hidden">

      {/* Active Timer Banner */}
      {activeTimer && (
        <ActiveTimerBanner activeTimer={activeTimer} onStop={handleStopTimer} />
      )}

      {/* EOD Banner */}
      {isToday && currentTimeMins >= 19 * 60 && todayIncompleteTasks.length > 0 && !eodDismissed && (
        <div className="mx-4 mb-3 p-3 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center justify-between text-xs shrink-0 z-10">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">
              {todayIncompleteTasks.length} tasks incomplete today.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleStartEveningCheckin}
              className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold px-3 py-1.5 rounded-xl cursor-pointer text-[10px] uppercase"
            >
              Review
            </button>
            <button onClick={() => setEodDismissed(true)} className="text-zinc-400 p-1 cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* AI Copilot Undo Banner */}
      {copilotUndoState && (
        <div className="mx-4 mb-3 p-3 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl flex items-center justify-between text-xs animate-fade-in">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <span className="text-zinc-700 dark:text-zinc-300 font-medium">AI updated your schedule.</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleUndoAIChanges}
              className="text-zinc-700 dark:text-zinc-200 font-bold text-[10px] uppercase border border-zinc-300 dark:border-zinc-600 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Undo
            </button>
            <button onClick={() => setCopilotUndoState(null)} className="text-zinc-400 p-1 cursor-pointer">
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Drift Banner */}
      {showDriftBanner && driftedTask && (
        <div className="mx-4 mb-3 p-3 bg-zinc-900 dark:bg-zinc-100 border border-zinc-700 dark:border-zinc-300 rounded-2xl flex items-center justify-between text-xs animate-fade-in">
          <div className="flex-1 min-w-0">
            <p className="text-white dark:text-zinc-900 font-semibold truncate">{driftedTask.title}</p>
            <p className="text-zinc-400 dark:text-zinc-500 text-[10px] mt-0.5">drifted past scheduled time</p>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              onClick={() => {
                handleDelayTask15Minutes(driftedTask.id, driftedTask.start_time);
                setDriftPromptCountToday(driftPromptCountToday + 1);
                setLastDriftPromptAt(Date.now());
              }}
              className="text-white dark:text-zinc-900 font-bold text-[10px] uppercase border border-zinc-600 dark:border-zinc-400 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              +15m
            </button>
            <button
              onClick={() => handleToggleTaskDone(driftedTask.id)}
              className="text-white dark:text-zinc-900 font-bold text-[10px] uppercase border border-zinc-600 dark:border-zinc-400 px-2.5 py-1 rounded-lg cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Main scroll area */}
      <div className="flex-1 flex flex-col h-full overflow-y-auto pb-28 pt-2" onScroll={handleScroll}>

        {/* Baseline Onboarding Wizard Card */}
        {routineBlocks.length === 0 && !wizardDismissed && (
          <div className="mx-4 mb-4 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-3xs text-left relative">
            <button
              onClick={() => {
                setWizardDismissed(true);
                localStorage.setItem("dayflow_wizard_dismissed", "true");
              }}
              className="absolute top-4 right-4 p-1 hover:bg-zinc-150 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 cursor-pointer"
              title="Dismiss onboarding"
            >
              <X className="w-4 h-4" />
            </button>

            {!showBaselineWizard ? (
              <div className="space-y-2 pr-6">
                <div className="flex items-center gap-1.5 text-zinc-400 font-bold text-[10px] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Baseline Onboarding
                </div>
                <h3 className="font-bold text-xs text-zinc-900 dark:text-zinc-100 leading-tight">
                  Set up your baseline day
                </h3>
                <p className="text-xs text-zinc-500 leading-normal">
                  Configure your wakeup, sleep, and meals in 60 seconds to lock in focus windows.
                </p>
                <div className="pt-1">
                  <button
                    onClick={() => { setShowBaselineWizard(true); setWizardStep(1); }}
                    className="px-3.5 py-2 text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:opacity-90 transition-all cursor-pointer border-none"
                  >
                    Setup Anchors
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Header */}
                <div className="border-b border-zinc-150 dark:border-zinc-800 pb-3 pr-8">
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                    {wizardStep === 1 ? "Step 1: Sleep & Awake Anchors" : "Step 2: Meal Anchors"}
                  </h3>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Configure typical times to calculate daily focus gaps
                  </p>
                </div>

                {/* Step 1 Content */}
                {wizardStep === 1 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Wake Up Time (Weekdays)</label>
                        <input 
                          type="time" 
                          value={weekdayWake}
                          onChange={e => setWeekdayWake(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sleep Time (Weekdays)</label>
                        <input 
                          type="time" 
                          value={weekdaySleep}
                          onChange={e => setWeekdaySleep(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input 
                        type="checkbox" 
                        id="differentWeekends"
                        checked={differentWeekends}
                        onChange={e => setDifferentWeekends(e.target.checked)}
                        className="w-4 h-4 rounded text-zinc-900 focus:ring-zinc-900 border-zinc-300 dark:border-zinc-700"
                      />
                      <label htmlFor="differentWeekends" className="text-xs text-zinc-500 font-semibold select-none cursor-pointer">
                        I wake up/sleep at different times on weekends
                      </label>
                    </div>

                    {differentWeekends && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-zinc-150 dark:border-zinc-800 border-dashed">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Wake Up Time (Weekends)</label>
                          <input 
                            type="time" 
                            value={weekendWake}
                            onChange={e => setWeekendWake(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sleep Time (Weekends)</label>
                          <input 
                            type="time" 
                            value={weekendSleep}
                            onChange={e => setWeekendSleep(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {wizardStep === 2 && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">🍳 Breakfast Time {differentWeekends && "(Weekdays)"}</label>
                        <input 
                          type="time" 
                          value={weekdayBreakfast}
                          onChange={e => setWeekdayBreakfast(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">🥪 Lunch Time {differentWeekends && "(Weekdays)"}</label>
                        <input 
                          type="time" 
                          value={weekdayLunch}
                          onChange={e => setWeekdayLunch(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">🍽️ Dinner Time {differentWeekends && "(Weekdays)"}</label>
                        <input 
                          type="time" 
                          value={weekdayDinner}
                          onChange={e => setWeekdayDinner(e.target.value)}
                          className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>

                    {differentWeekends && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 border-t border-zinc-150 dark:border-zinc-800 border-dashed">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">🍳 Breakfast Time (Weekends)</label>
                          <input 
                            type="time" 
                            value={weekendBreakfast}
                            onChange={e => setWeekendBreakfast(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">🥪 Lunch Time (Weekends)</label>
                          <input 
                            type="time" 
                            value={weekendLunch}
                            onChange={e => setWeekendLunch(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">🍽️ Dinner Time (Weekends)</label>
                          <input 
                            type="time" 
                            value={weekendDinner}
                            onChange={e => setWeekendDinner(e.target.value)}
                            className="w-full text-xs p-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-zinc-400 transition-all font-mono text-zinc-900 dark:text-zinc-100"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-2 border-t border-zinc-150 dark:border-zinc-800">
                  <span className="text-[10px] font-semibold text-zinc-400 font-mono uppercase">
                    Step {wizardStep} of 2
                  </span>
                  <div className="flex items-center gap-2">
                    {wizardStep === 2 && (
                      <button
                        onClick={() => setWizardStep(1)}
                        className="px-3.5 py-2 text-xs font-bold text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl transition-colors cursor-pointer"
                      >
                        Back
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (wizardStep === 1) {
                          setWizardStep(2);
                        } else {
                          handleSaveBaselineRoutines();
                        }
                      }}
                      className="px-4 py-2 text-xs font-bold bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:opacity-90 transition-colors cursor-pointer"
                    >
                      {wizardStep === 1 ? "Next" : "Lock in Routines"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Timeline ─────────────────────────────────────────────────────── */}
        <div className="flex-1 px-4 pb-4">

          {daySchedule.adaptationLogs && daySchedule.adaptationLogs.postponedOptionalTasks.length > 0 && (
            <div className="mb-4 p-3 bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-start gap-2.5 shadow-sm text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)]">
              <span className="text-sm shrink-0">🎯</span>
              <div className="flex-1">
                <span className="font-semibold block text-[var(--text-primary)]">Schedule optimized</span>
                <span className="text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] leading-relaxed">
                  Based on your execution history, {daySchedule.adaptationLogs.postponedOptionalTasks.length} optional task{daySchedule.adaptationLogs.postponedOptionalTasks.length > 1 ? "s" : ""} have been postponed to backlog to preserve capacity.
                </span>
              </div>
              <button 
                onClick={handleOpenAICopilot}
                className="text-[10px] font-bold text-zinc-900 dark:text-zinc-100 underline hover:opacity-80 cursor-pointer shrink-0 ml-1"
              >
                Coach details
              </button>
            </div>
          )}

          {daySchedule.items.length === 0 ? (
            /* Empty state */
            <div className="py-16 flex flex-col items-center justify-center text-center space-y-4">
              <div className="p-5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-300 dark:text-zinc-600">
                <CalendarIcon className="w-8 h-8 stroke-[1.2]" />
              </div>
              <div>
                <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Day is clear</h4>
                <p className="text-xs text-zinc-400 mt-1 max-w-xs leading-relaxed">
                  {isPastDate
                    ? "Nothing was scheduled for this day."
                    : "No tasks yet. Tap \"Add task\" above or launch the AI Copilot."}
                </p>
              </div>
              {!isPastDate && (
                <button
                  onClick={handleOpenAICopilot}
                  className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600 px-4 py-2 rounded-xl cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Launch AI Copilot
                </button>
              )}
            </div>
          ) : (
            /* Task cards */
            <div className="space-y-3">
              {daySchedule.items.map((item: any, idx: number) => {
                const isFixed = item.type === "fixed";
                const isEmergency =
                  item.id.includes("emergency_block") ||
                  item.title.includes("Emergency");
                const isDone = item.status === "done";
                const isSkipped = item.status === "skipped";
                const isExpired = item.status === "expired";
                const isPinned = !!(item as any).pinned;
                const isDragging = draggedTaskId === item.id;
                const isOver = dragOverTaskId === item.id;
                const task = !isFixed
                  ? flexibleTasks.find((t) => t.id === item.id)
                  : null;
                const isActiveNow = activeNowTask?.id === item.id;
                const isUpNext =
                  !isActiveNow &&
                  upNextTask?.id === item.id &&
                  !isDone;
                const isPastUnverified =
                  !isFixed &&
                  !isDone &&
                  !isSkipped &&
                  !isExpired &&
                  (() => {
                    const endMins = timeToMinutes(item.end_time);
                    return endMins < currentTimeMins && selectedDate === TODAY;
                  })();

                const hrs = Math.floor(item.duration_minutes / 60);
                const mins = item.duration_minutes % 60;
                const durationText =
                  hrs > 0
                    ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}`
                    : `${mins}m`;
                const isDurationAdjusted = !isFixed && item.predictedDuration && Math.abs(item.predictedDuration - item.duration_minutes) >= 5;
                const displayDurationText = isDurationAdjusted
                  ? `~${item.predictedDuration}m`
                  : durationText;

                // Gap after this item
                const nextItem = daySchedule.items[idx + 1];
                let gapMins = 0;
                if (nextItem) {
                  const endM = timeToMinutes(item.end_time);
                  const nextM = timeToMinutes(nextItem.start_time);
                  gapMins = Math.max(0, nextM - endM);
                }

                const cardKey = `${item.id}-${idx}`;
                const isExpanded = expandedIds[item.id];
                const isSwipeOpen = swipeOpen[item.id];
                const translateX = swipeX[item.id] || 0;

                // Card border style — monochrome, NO colored left border
                const isImportantTask = !isFixed && (task?.importance === "important" || task?.importance === "critical");
                const isShifted = item.status === "shifted";
                const cardBg = isDone
                  ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 opacity-60"
                  : isSkipped || isExpired
                  ? "bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-850 opacity-50"
                  : isShifted
                  ? "bg-amber-50/5 dark:bg-amber-950/5 border-amber-800/60 dark:border-amber-700/60 text-neutral-600 dark:text-zinc-400 opacity-70 hover:opacity-90 shadow-sm"
                  : isImportantTask
                  ? "bg-amber-50/20 dark:bg-amber-950/10 border-amber-300 dark:border-amber-900/60 shadow-xs"
                  : isPastUnverified
                  ? "bg-white dark:bg-zinc-900 border-zinc-800 dark:border-zinc-300"
                  : isActiveNow
                  ? "bg-white dark:bg-zinc-900 border-zinc-900 dark:border-zinc-100 shadow-sm ring-1 ring-zinc-900 dark:ring-zinc-100"
                  : isUpNext
                  ? "bg-white dark:bg-zinc-900 border-zinc-350 dark:border-zinc-700 border-dashed"
                  : isDragging
                  ? "opacity-30 scale-95 bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700"
                  : isOver
                  ? "bg-white dark:bg-zinc-900 border-zinc-500 dark:border-zinc-400"
                  : "bg-white dark:bg-zinc-900 border-zinc-800 dark:border-zinc-300 hover:border-zinc-950 dark:hover:border-zinc-50";

                return (
                  <div key={cardKey} className="relative">
                    {/* Left swipe actions (reveals on swiping right, translateX > 0) */}
                    {!isFixed && !isDone && translateX > 0 && (
                      <div className="absolute left-0 top-0 bottom-0 flex items-center gap-1.5 pl-3 z-0">
                        {/* Complete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleTaskDone(item.id);
                            triggerHaptic(50);
                            closeSwipe(item.id);
                          }}
                          className="flex flex-col items-center gap-0.5 w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          title="Complete"
                        >
                          <Check className="w-4 h-4 text-zinc-500" />
                        </button>
                        {/* Edit */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (task) handleOpenEditFlexible(task);
                            closeSwipe(item.id);
                          }}
                          className="flex flex-col items-center gap-0.5 w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center justify-center cursor-pointer hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4 text-zinc-500" />
                        </button>
                      </div>
                    )}

                    {/* Right swipe actions (reveals on swiping left, translateX < 0) */}
                    {!isFixed && !isDone && translateX < 0 && (
                      <div className="absolute right-0 top-0 bottom-0 flex items-center pr-3 z-0">
                        {/* Delete */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete "${item.title}"?`)) {
                              handleDeleteFlexible(item.id);
                            }
                            closeSwipe(item.id);
                          }}
                          className="flex flex-col items-center gap-0.5 w-12 h-12 bg-zinc-100 dark:bg-zinc-800 rounded-2xl items-center justify-center cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    )}

                    {/* Main card — click to expand, drag and drop supported, swipe gesture restored */}
                    <div
                      className="relative z-10 cursor-pointer"
                      style={{
                        transform: `translateX(${translateX}px)`,
                        transition: "transform 0.15s ease",
                      }}
                      onTouchStart={(e) => { if (item.status === "shifted") return; handleTouchStart(e, item.id); }}
                      onTouchMove={(e) => { if (item.status === "shifted") return; handleTouchMove(e, item.id); }}
                      onTouchEnd={(e) => { if (item.status === "shifted") return; handleTouchEnd(e, item.id); }}
                      onClick={(e) => {
                        if (isSwipeOpen || translateX !== 0) {
                          e.stopPropagation();
                          closeSwipe(item.id);
                          return;
                        }
                        toggleExpand(item.id);
                      }}
                      draggable={!isFixed && !isDone && item.status !== "shifted"}
                      onDragStart={() => handleDragStart(item.id)}
                      onDragOver={(e) => handleDragOver(e, item.id)}
                      onDrop={(e) => handleDrop(e, item.id)}
                      onDragEnd={handleDragEnd}
                    >
                      <div
                        className={`rounded-2xl border p-4 transition-all text-left ${cardBg}`}
                      >
                        {/* Row 1: time + type + status chips + done checkbox */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {/* Status chips row */}
                            <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                              <span className="text-[10px] font-mono text-zinc-400">
                                {item.start_time} – {item.end_time}
                              </span>
                              <span className="text-zinc-300 dark:text-zinc-600">·</span>
                              <span 
                                className={`text-[10px] text-zinc-400 font-medium ${isDurationAdjusted ? "cursor-help border-b border-dotted border-zinc-300 dark:border-zinc-700" : ""}`}
                                title={isDurationAdjusted ? "Adjusted using your previous work sessions" : undefined}
                              >
                                {displayDurationText}
                              </span>

                              {isActiveNow && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 animate-pulse">
                                  Active
                                </span>
                              )}
                              {item.status === "shifted" && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-800/30 bg-amber-500/10 text-amber-800 dark:text-amber-450">
                                  Shifted Forward
                                </span>
                              )}
                              {isPastUnverified && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  Did you do this?
                                </span>
                              )}
                              {isDone && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  Done
                                </span>
                              )}
                              {isSkipped && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                                  Skipped
                                </span>
                              )}
                              {isFixed && (
                                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-700 text-zinc-400 flex items-center gap-0.5">
                                  <Lock className="w-2 h-2" /> Locked
                                </span>
                              )}
                            </div>

                            {/* Title */}
                            <h3
                              className={`text-sm font-bold leading-snug ${
                                isDone
                                  ? "line-through text-zinc-400"
                                  : "text-zinc-900 dark:text-zinc-100"
                              }`}
                            >
                              {item.title}
                            </h3>

                            {item.suggestedIntervention && !isDone && (
                              <div className="mt-2 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-lg flex items-center justify-between gap-1.5 text-[10px] text-amber-800 dark:text-amber-300 font-medium">
                                <div className="flex items-center gap-1.5">
                                  <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400">💡</span>
                                  <span>{item.suggestedIntervention.reason}</span>
                                </div>
                                {handleInterventionFeedback && (
                                  <div className="flex items-center gap-2 shrink-0 border-l border-amber-200/40 pl-2">
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInterventionFeedback(item.id, item.suggestedIntervention!.type, true);
                                      }}
                                      className="hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                                      title="This suggestion is helpful"
                                    >
                                      👍
                                    </button>
                                    <button 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleInterventionFeedback(item.id, item.suggestedIntervention!.type, false);
                                      }}
                                      className="hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                                      title="This suggestion is not helpful"
                                    >
                                      👎
                                    </button>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Project tag */}
                            {task?.projectId && (() => {
                              const proj = projects.find((p: any) => p.id === task.projectId);
                              return proj ? (
                                <p className="text-[10px] text-zinc-400 mt-0.5">{proj.name}</p>
                              ) : null;
                            })()}
                          </div>

                          {/* Done / Action buttons column */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            {/* Check / Uncheck */}
                            {item.status === "shifted" ? (
                              <span className="w-7 h-7 flex items-center justify-center text-amber-850 dark:text-amber-500 border border-dashed border-amber-800/40 dark:border-amber-700/40 rounded-full bg-amber-500/5" title="Shifted Forward">
                                <ArrowRight className="w-3.5 h-3.5" />
                              </span>
                            ) : !isFixed && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleTaskDone(item.id);
                                  triggerHaptic(50);
                                }}
                                className={`w-7 h-7 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all ${
                                  isDone
                                    ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100"
                                    : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-500"
                                }`}
                              >
                                {isDone && <Check className="w-3.5 h-3.5 text-white dark:text-zinc-900 stroke-[2.5]" />}
                              </button>
                            )}

                            {/* Expand toggle */}
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleExpand(item.id); }}
                              className="w-6 h-6 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer text-zinc-400"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded detail section */}
                        {isExpanded && (
                          <div className="mt-3 space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                            {/* AI Plan / Description box */}
                            {!isFixed && task && (
                              <AIPlanBox
                                taskId={item.id}
                                taskTitle={item.title}
                                taskDescription={task.daily_plan || task.description}
                                forDate={selectedDate}
                                fetchDailyPlan={fetchDailyPlan}
                                task={task}
                                setFlexibleTasks={setFlexibleTasks}
                              />
                            )}

                            {/* AI Consequence Box */}
                            {!isFixed && task && (
                              <ConsequenceBox
                                task={task}
                                fetchConsequenceInsight={fetchConsequenceInsight}
                                consequenceCache={consequenceCache}
                              />
                            )}

                            {/* Fixed block actions */}
                            {isFixed && (
                              <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex gap-2">
                                <button
                                  onClick={() => handleOpenEditFixed(item)}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                                >
                                  <Edit2 className="w-3 h-3" />
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDeleteFixed(item.id)}
                                  className="flex items-center gap-1 text-[11px] font-semibold text-red-500 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 px-3 py-1.5 rounded-xl cursor-pointer transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Gap indicator */}
                    {gapMins > 0 && gapMins <= 45 && (
                      <div className="flex items-center gap-2 py-1.5 px-2 ml-3">
                        <div className="w-px h-5 bg-zinc-200 dark:bg-zinc-700 ml-2" />
                        <span className="text-[10px] text-zinc-400 font-mono">{gapMins}m free</span>
                      </div>
                    )}
                    {gapMins > 45 && (
                      <button
                        onClick={() => !isPastDate && handleOpenAddFlexible(isToday, gapMins)}
                        className="w-full my-2 flex items-center gap-2 py-2 px-3 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-700 text-zinc-400 hover:border-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer text-[10px] font-semibold"
                      >
                        <Plus className="w-3 h-3" />
                        {gapMins}m open window
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Friction Sheet (skip/postpone) */}
      {frictionPrompt && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl p-6 space-y-4 shadow-2xl animate-slide-up">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                {frictionPrompt.isSkip ? "Why skip?" : "Why postpone?"}
              </h3>
              <button onClick={() => setFrictionPrompt(null)} className="p-1 text-zinc-400 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { key: "tired", label: "😴 Too tired" },
                { key: "busy", label: "🔥 Got interrupted" },
                { key: "unclear", label: "❓ Not sure how" },
                { key: "other", label: "💬 Something else" },
              ].map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFrictionReason(opt.key)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-center cursor-pointer transition-all ${
                    frictionReason === opt.key
                      ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100 text-white dark:text-zinc-900"
                      : "bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <textarea
              value={frictionNotes}
              onChange={(e) => setFrictionNotes(e.target.value)}
              placeholder="Any notes…"
              className="w-full text-xs p-3 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-400 resize-none h-14 text-zinc-900 dark:text-zinc-100"
            />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const reason = (frictionReason || "other") as FrictionReason;
                  if (frictionPrompt.isSkip) {
                    executePostponeWithFrictionDetails(
                      frictionPrompt.taskId,
                      "tomorrow",
                      reason,
                      frictionNotes,
                      frictionPrompt.start_time
                    );
                  } else {
                    executePostponeWithFrictionDetails(
                      frictionPrompt.taskId,
                      "delay_15",
                      reason,
                      frictionNotes,
                      frictionPrompt.start_time
                    );
                  }
                  setFrictionPrompt(null);
                  setFrictionReason(null);
                  setFrictionNotes("");
                }}
                className="flex-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold py-3 rounded-xl cursor-pointer text-sm"
              >
                Confirm
              </button>
              <button
                onClick={() => { setFrictionPrompt(null); setFrictionReason(null); setFrictionNotes(""); }}
                className="px-5 py-3 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-600 dark:text-zinc-300 font-semibold text-sm cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

TodayTab.displayName = "TodayTab";
