import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { 
  Sparkles, 
  Trash2, 
  Edit2, 
  Lock, 
  Clock, 
  Calendar as CalendarIcon, 
  Plus, 
  Wand2, 
  Check, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Circle, 
  Settings as SettingsIcon, 
  Info,
  X,
  Zap,
  HelpCircle,
  Bell,
  RefreshCw,
  Search,
  CheckCircle,
  AlertCircle,
  Mic,
  ArrowRight,
  Flame,
  Moon,
  Layers,
  CalendarDays,
  CalendarCheck,
  Coffee,
  BookMarked,
  Pencil,
  ToggleLeft,
  ToggleRight,
  GripVertical,
  ChevronDown,
  Send,
  Shield,
  Download,
  Upload,
  Database,
  User,
  Grid,
  Heart,
  Target,
  Trophy,
  Award,
  TrendingUp,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Activity,
  ArrowUpRight,
  Briefcase,
  FolderKanban
} from "lucide-react";
import { FixedBlock, FlexibleTask, ScheduledItem, EnergyLevel, RepeatType, ScheduleProfile, ProfileBlock, ProfileAppliesTo, UserGoal, Achievement, GoalCategory, GoalStatus, GoalMilestone, WeightEntry, ClassificationResult, TaskCategory, TaskRigidity, TaskRecoverability, TaskDependencyChain, TaskProgressType, DeadlinePressure, TaskConsequence, TaskMeta, ConsequenceIntent, ReflectionEvent, TaskExecutionLog, UBMInsights, AIProposal, ActiveTimer, WeeklyEvalSnapshot, PlanningStyle, FrictionReason, OnboardingProfile, RoutineBlock, PendingQuestion, ParsedCommand, CommandResolution, AIActionExplanation, CalendarEvent, Project, ProjectPhase, ProjectSubtask } from "./types";
import { generateSchedule, calculateFuturePredictions, timeToMinutes, minutesToTime, isFixedBlockActiveOnDate, calculateCalibrationProfile, simulateDelayCost, getActionRisk } from "./utils/scheduler";
import { loadFixedBlocks, saveFixedBlocks, loadFlexibleTasks, saveFlexibleTasks, loadSettings, saveSettings, isOnboardingComplete, markOnboardingComplete, loadProfiles, saveProfiles, clearAllData, loadGoals, saveGoals, loadAchievements, saveAchievements, loadWeightLog, saveWeightLog, loadReflectionEvents, saveReflectionEvents, loadTaskExecutionLogs, saveTaskExecutionLogs } from "./utils/storage";
import { generateMockMLData, getTaskCategory, detectHighDelayPatterns } from "./utils/mlEngine";
import { updateGoalProgressFromTask, predictGoalCompletion, generateCheckInPrompt, getGoalsDueForCheckIn, suggestGoalsFromTaskHistory, generateMilestones, checkForGlobalAchievements } from "./utils/goalEngine";
import { computeBehaviorSignals } from "./utils/patternEngine";
import { buildAICompactContext, buildCopilotScheduleSummary } from "./utils/aiContextBuilder";
import { checkAndGenerateWeeklySnapshot, loadEvalHistory, getImprovementSummary, logProposedSuggestions, logAcceptedSuggestions } from "./utils/evaluationEngine";

interface Toast {
  id: string;
  message: string;
  type: "success" | "info" | "warning";
}

const triggerHaptic = (pattern: number | number[]) => {
  if (typeof navigator !== "undefined" && "vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Haptic vibrate error:", e);
    }
  }
};

const getLocalTodayStr = (d = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const date = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${date}`;
};

const TODAY = getLocalTodayStr();

interface CopilotTextAreaProps {
  value: string;
  onSend: (text: string) => void;
  placeholder: string;
  disabled: boolean;
  isProcessing: boolean;
}

const CopilotTextArea: React.FC<CopilotTextAreaProps> = ({
  value,
  onSend,
  placeholder,
  disabled,
  isProcessing
}) => {
  const [localVal, setLocalVal] = React.useState(value);

  React.useEffect(() => {
    setLocalVal(value);
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && !isProcessing && localVal.trim()) {
        onSend(localVal);
        setLocalVal("");
      }
    }
  };

  return (
    <textarea 
      value={localVal}
      onChange={(e) => setLocalVal(e.target.value)}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      rows={2}
      className="w-full pl-3 pr-24 py-2.5 border border-neutral-200 rounded-2xl text-xs bg-white/45 backdrop-blur-xs focus:bg-white focus:ring-1 focus:ring-primary focus:outline-none resize-none font-sans font-medium"
      disabled={disabled}
    />
  );
};

interface ActiveTimerBannerProps {
  activeTimer: ActiveTimer;
  onStop: () => void;
}

const ActiveTimerBanner: React.FC<ActiveTimerBannerProps> = ({
  activeTimer,
  onStop
}) => {
  const [elapsedSecs, setElapsedSecs] = React.useState(() => 
    Math.floor((Date.now() - activeTimer.startedAt) / 1000)
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - activeTimer.startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimer]);

  const h = Math.floor(elapsedSecs / 3600);
  const m = Math.floor((elapsedSecs % 3600) / 60);
  const s = elapsedSecs % 60;
  const timeStr = `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

  return (
    <div className="mx-4 mb-3 mt-1.5 p-3.5 bg-rose-50 border border-rose-100 rounded-2xl flex items-center justify-between text-xs text-rose-850 animate-fade-in shadow-xs text-left">
      <div className="flex items-center gap-2.5">
        <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping shrink-0" />
        <span className="font-extrabold text-rose-700 uppercase tracking-wider text-[10px]">Recording</span>
        <span className="text-neutral-350 font-bold">|</span>
        <span className="font-semibold text-neutral-800">{activeTimer.title}</span>
        <span className="text-neutral-350 font-bold">·</span>
        <span className="font-mono bg-rose-100/80 px-2.5 py-0.5 rounded-lg text-rose-700 font-extrabold text-[11px]">
          {timeStr}
        </span>
      </div>
      <button 
        onClick={onStop}
        className="bg-rose-600 hover:bg-rose-700 text-white font-extrabold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm shadow-rose-250 active:scale-95 text-[10px] uppercase font-display"
      >
        Stop
      </button>
    </div>
  );
};

const extractUBMInsights = (
  tasks: FlexibleTask[],
  reflectionEvents: ReflectionEvent[],
  executionLogs: TaskExecutionLog[]
): UBMInsights => {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  const cutoffStr = ninetyDaysAgo.toISOString().split("T")[0];

  // Filter logs within 90 days, taking at most 300 recent logs
  const recentLogs = executionLogs
    .filter(log => log.date >= cutoffStr)
    .slice(-300);

  // Time bias rolling calculation
  let timeBias = 1.0;
  let timeBiasCount = 0;
  let completedCount = 0;

  // Hourly and Category success trackers
  const hourlyScheduled: Record<number, number> = {};
  const hourlyCompleted: Record<number, number> = {};
  const categoryScheduled: Record<string, number> = {};
  const categoryCompleted: Record<string, number> = {};

  const tasksMap = new Map<string, FlexibleTask>();
  tasks.forEach(t => tasksMap.set(t.id, t));

  recentLogs.forEach(log => {
    if (log.completed) {
      completedCount++;
      if (log.actualDuration && log.plannedDuration > 0) {
        timeBias += log.actualDuration / log.plannedDuration;
        timeBiasCount++;
      }
    }

    if (log.scheduledStartHour !== undefined) {
      const hr = log.scheduledStartHour;
      hourlyScheduled[hr] = (hourlyScheduled[hr] || 0) + 1;
      if (log.completed) {
        hourlyCompleted[hr] = (hourlyCompleted[hr] || 0) + 1;
      }
    }

    // Lookup task to find its category
    const task = tasksMap.get(log.taskId);
    if (task) {
      const cat = task.category || getTaskCategory(task.title);
      categoryScheduled[cat] = (categoryScheduled[cat] || 0) + 1;
      if (log.completed) {
        categoryCompleted[cat] = (categoryCompleted[cat] || 0) + 1;
      }
    }
  });

  if (timeBiasCount > 0) {
    timeBias = Math.round((timeBias / timeBiasCount) * 100) / 100;
  } else {
    timeBias = 1.0;
  }

  // Derive Hourly success maps
  const hourlySuccess: Record<number, number> = {};
  const hourlyConfidence: Record<number, number> = {};
  for (let hr = 0; hr < 24; hr++) {
    const sched = hourlyScheduled[hr] || 0;
    const comp = hourlyCompleted[hr] || 0;
    hourlySuccess[hr] = sched > 0 ? Math.round((comp / sched) * 100) / 100 : 0.5; // baseline default
    hourlyConfidence[hr] = Math.min(1.0, sched / 5.0);
  }

  // Derive Category success maps
  const categories = ["study", "project", "meeting", "health", "habit", "admin", "social", "creative", "personal", "misc"];
  const categorySuccess: Record<string, number> = {};
  const categoryConfidence: Record<string, number> = {};
  categories.forEach(cat => {
    const sched = categoryScheduled[cat] || 0;
    const comp = categoryCompleted[cat] || 0;
    categorySuccess[cat] = sched > 0 ? Math.round((comp / sched) * 100) / 100 : 0.7; // baseline default
    categoryConfidence[cat] = Math.min(1.0, sched / 5.0);
  });

  return {
    timeBias,
    timeBiasConfidence: Math.min(1.0, completedCount / 10.0),
    hourlySuccess,
    hourlyConfidence,
    categorySuccess,
    categoryConfidence
  };
};

const isTaskRecoverable = (task: FlexibleTask, goalsList: UserGoal[] = []): boolean => {
  const title = (task.title || "").toLowerCase();
  const desc = (task.description || "").toLowerCase();
  
  // We check recoverability from metadata if available
  if (task.meta?.recoverability) {
    return task.meta.recoverability !== "impossible";
  }

  const category = task.meta?.category || getTaskCategory(task.title);

  // Live classes, fixed lectures, fixed rigidity
  if (task.meta?.rigidity === "fixed") return false;
  if (title.includes("lecture") || title.includes("live class") || title.includes("meeting") || title.includes("appointment")) {
    return false;
  }

  // Non-recoverable titles / recreational / habits that should expire
  const nonRecoverableKeywords = [
    "time pass", "timepass", "relax", "chill", "workout", "gym", "watch tv", 
    "tv show", "netflix", "youtube", "browse", "surfing", "idle", "sleep", 
    "meditate", "play game", "gaming"
  ];
  if (nonRecoverableKeywords.some(kw => title.includes(kw) || desc.includes(kw))) {
    return false;
  }

  // Habits / health / misc categories are date-specific or recurring, so they shouldn't carry over
  if (category === "habit" || category === "health" || category === "misc") {
    return false;
  }

  return true;
};

const isTaskStale = (task: FlexibleTask): boolean => {
  if (task.status === "done") return false;
  
  const parts = task.id.split("-");
  let timestamp = 0;
  if (parts[0] === "flex" && parts[1]) {
    timestamp = parseInt(parts[1], 10);
  } else if (parts[0] === "ai" && parts[1] === "flex" && parts[2]) {
    timestamp = parseInt(parts[2], 10);
  }
  
  if (timestamp > 0) {
    const ageInMs = Date.now() - timestamp;
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    return ageInMs > threeDaysInMs;
  }
  
  return false;
};

function getStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().replace(/\s+/g, "");
  const s2 = str2.toLowerCase().replace(/\s+/g, "");
  
  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.8;
  if (s1.length < 2 || s2.length < 2) return 0.0;

  const getBigrams = (str: string) => {
    const bigrams = new Set<string>();
    for (let i = 0; i < str.length - 1; i++) {
      bigrams.add(str.substring(i, i + 2));
    }
    return bigrams;
  };

  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  let intersection = 0;
  
  b1.forEach(b => {
    if (b2.has(b)) intersection++;
  });

  return (2 * intersection) / (b1.size + b2.size);
}

const classifyTaskLocally = (
  title: string,
  description = "",
  goalsList: UserGoal[] = []
): ClassificationResult => {
  const t = title.toLowerCase().trim();
  const d = (description || "").toLowerCase().trim();

  // 1. Check custom vocabulary database mapping from localStorage
  try {
    const vocabStr = localStorage.getItem("dayflow_vocab_map");
    if (vocabStr) {
      const vocab = JSON.parse(vocabStr);
      // Exact check
      if (vocab[t]) {
        return {
          meta: vocab[t],
          confidence: 1.0,
          source: "memory"
        };
      }
      // Fuzzy check against vocabulary keys
      for (const key of Object.keys(vocab)) {
        if (getStringSimilarity(t, key) > 0.85) {
          return {
            meta: vocab[key],
            confidence: 0.9,
            source: "memory"
          };
        }
      }
    }
  } catch (e) {
    console.warn("Error checking vocabulary map:", e);
  }

  // 2. Default initial classification properties
  let category = "personal" as TaskCategory;
  let rigidity = "flexible" as TaskRigidity;
  let importance = "important" as "critical" | "important" | "optional";
  let recoverability = "easy" as TaskRecoverability;
  let dependency_chain = "none" as TaskDependencyChain;
  let progress_type = "binary" as TaskProgressType;
  let deadline_pressure = "none" as DeadlinePressure;
  let confidence = 0.5;

  // Key matching rules (Layer 1)
  const isStudy = [
    "study", "exam", "prep", "revision", "assignment", "homework", "lecture", "class", "course", "learn", "read",
    "math", "science", "history", "english", "physics", "chemistry", "biology", "coding", "uceed", "sat"
  ].some(kw => t.includes(kw));

  const isProject = [
    "project", "portfolio", "code", "design", "write", "draft", "presentation", "meeting", "interview", "review"
  ].some(kw => t.includes(kw));

  const isHealth = [
    "gym", "workout", "run", "swim", "exercise", "training", "sport", "yoga", "stretch", "cardio", "walk", "jog"
  ].some(kw => t.includes(kw));

  const isHabit = [
    "habit", "meditate", "sleep", "journal", "read", "daily", "hydrate", "water"
  ].some(kw => t.includes(kw));

  const isSocial = [
    "social", "friend", "party", "dinner", "hangout", "call mom", "family", "call dad", "date"
  ].some(kw => t.includes(kw));

  const isChore = [
    "clean", "laundry", "tidy", "wash", "organize", "vacuum", "buy", "shop", "grocer", "soap", "milk", "food", "bill", "rent"
  ].some(kw => t.includes(kw));

  // Determine Category
  if (isStudy) {
    category = "study";
    confidence = 0.95;
  } else if (isProject) {
    category = "project";
    confidence = 0.95;
  } else if (isHealth) {
    category = "health";
    confidence = 0.95;
  } else if (isHabit) {
    category = "habit";
    confidence = 0.9;
  } else if (isChore) {
    category = "admin";
    confidence = 0.9;
  } else if (isSocial) {
    category = "social";
    confidence = 0.85;
  }

  // Determine Rigidity
  if (t.includes("lecture") || t.includes("class") || t.includes("exam") || t.includes("meeting") || t.includes("appointment") || t.includes("interview")) {
    rigidity = "fixed";
    confidence = Math.max(confidence, 0.9);
  } else if (category === "study" || category === "project" || category === "health" || t.includes("revision") || t.includes("workout")) {
    rigidity = "semi_flexible";
  }

  // Determine Importance
  if (t.includes("exam") || t.includes("interview") || t.includes("deadline") || t.includes("urgent") || t.includes("critical") || t.includes("presentation")) {
    importance = "critical";
  } else if (category === "admin" || category === "misc" || isChore) {
    importance = "optional";
  }

  // Determine Recoverability
  if (rigidity === "fixed") {
    recoverability = "impossible";
  } else if (category === "study" || category === "project" || t.includes("sketch") || t.includes("code")) {
    recoverability = "hard";
  }

  // Determine Dependency Chain
  if (t.includes("research") || t.includes("draft") || t.includes("pre-") || t.includes("outline") || t.includes("setup")) {
    dependency_chain = "strong";
  } else if (category === "project" || category === "study") {
    dependency_chain = "weak";
  }

  // Determine Progress Type
  if (category === "habit" || isHabit || t.includes("streak") || t.includes("daily")) {
    progress_type = "streak";
  } else if (category === "study" || category === "project" || category === "health" || category === "creative") {
    progress_type = "compound";
  }

  // Determine Goal Context link
  const hasGoal = goalsList.some(g =>
    g.linkedTaskKeywords && g.linkedTaskKeywords.some(kw => t.includes(kw.toLowerCase()))
  );
  if (hasGoal) {
    importance = importance === "optional" ? "important" : importance;
    progress_type = "compound";
    confidence = Math.max(confidence, 0.85);
  }

  let task_nature = "one_time" as "recurring" | "one_time" | "progressive";
  const isRecurring = [
    "gym", "workout", "run", "swim", "exercise", "training", "yoga", "meditate", "journal", 
    "sleep", "hydrate", "read daily", "habit", "brush", "walk", "jog"
  ].some(kw => t.includes(kw));

  const isProgressive = [
    "study", "project", "code", "design", "write", "thesis", "research", "exam", "course", "lecture"
  ].some(kw => t.includes(kw));

  if (isRecurring) {
    task_nature = "recurring";
  } else if (isProgressive) {
    task_nature = "progressive";
  }

  return {
    meta: {
      category,
      rigidity,
      importance,
      recoverability,
      dependency_chain,
      progress_type,
      deadline_pressure,
      task_nature
    },
    confidence,
    source: "rules"
  };
};

const generateDefaultConsequence = (
  task: Partial<FlexibleTask>, 
  goalsList: UserGoal[],
  intent: string = "skip",
  delayMins: number = 0,
  consequenceCore: any = {}
): { consequence: TaskConsequence; isHighContext: boolean } => {
  const title = task.title || "";
  const meta = task.meta || classifyTaskLocally(title, task.description || "", goalsList).meta;
  const category = meta.category || "personal";
  const progressType = meta.progress_type || "binary";
  const importance = meta.importance || "important";
  
  let immediate_effect = "This task shifts today's schedule slightly.";
  let cascade_effect = "Pushes subsequent tasks downstream.";
  let goal_effect = "Slightly reduces today's consistency progress.";
  let emotional_weight: TaskConsequence["emotional_weight"] = "none";
  let primary_message_slot: TaskConsequence["primary_message_slot"] = "immediate";
  let best_action = `Complete "${title}" inside today's timeline.`;
  let minimum_viable_progress = `Do 15-20 minutes of "${title}" instead of full duration.`;
  
  if (importance === "critical") {
    emotional_weight = "critical";
  } else if (importance === "important") {
    emotional_weight = "medium";
  }

  if (intent === "skip") {
    if (category === "health") {
      immediate_effect = `Skipping "${title}" breaks your training rhythm and delays your fitness recovery cycle.`;
      best_action = "Perform a shortened, lighter workout today rather than skipping completely.";
      minimum_viable_progress = "Do a quick 10-minute active stretch to keep the habit slot warm.";
      emotional_weight = importance === "critical" ? "high" : "medium";
      primary_message_slot = "cascade";
    } else if (category === "study") {
      immediate_effect = `Skipping "${title}" leaves study material unreviewed, creating dynamic catch-up gaps.`;
      best_action = "Schedule a block tomorrow to cover these notes.";
      minimum_viable_progress = "Skim the lecture slides for 5 minutes right now.";
      emotional_weight = importance === "critical" ? "critical" : "high";
      primary_message_slot = "cascade";
    } else if (category === "project") {
      immediate_effect = `Skipping "${title}" stalls your active design and development milestones today.`;
      best_action = "Split the task into smaller sub-tasks and do the first one now.";
      minimum_viable_progress = "Set up your workspace and tools so you are ready to write code tomorrow.";
      emotional_weight = "high";
      primary_message_slot = "immediate";
    } else if (category === "habit") {
      immediate_effect = `Skipping "${title}" breaks consistency, increasing the friction to restart.`;
      best_action = "Execute a micro-session of this habit today.";
      minimum_viable_progress = "Do a 2-minute version of the habit (e.g. read 1 page).";
      emotional_weight = "medium";
      primary_message_slot = "immediate";
    } else {
      immediate_effect = `Skipping "${title}" frees up time now but adds tasks to your future queue.`;
    }
  } else if (intent === "delay") {
    immediate_effect = `Delaying "${title}" by ${delayMins} minutes shifts your active focus window later into the day.`;
    if (category === "health") {
      best_action = "Ensure your late gym session does not conflict with dinner or wind-down schedules.";
    } else if (category === "study" || category === "project") {
      best_action = "Be mindful of reduced mental focus as you push this work into the evening.";
    }
  }

  if (consequenceCore && consequenceCore.time_shift_mins > 0) {
    cascade_effect = `This creates a delay that pushes your final tasks into sleep time by ${consequenceCore.time_shift_mins} minutes.`;
  } else if (consequenceCore && consequenceCore.backlog_mins > 0) {
    cascade_effect = `This shifts "${title}" to the backlog, adding ${consequenceCore.backlog_mins} minutes of pending work.`;
  } else if (delayMins > 0) {
    cascade_effect = `This delays "${title}" and subsequent tasks by ${delayMins} minutes.`;
  } else {
    cascade_effect = "Your timeline holds sufficient buffer gaps to absorb this shift without cascading tasks.";
  }

  const linkedGoal = goalsList.find(g =>
    g.linkedTaskKeywords.some(kw => title.toLowerCase().includes(kw.toLowerCase()))
  );
  if (linkedGoal) {
    if (intent === "skip") {
      goal_effect = `This delays progress toward your goal "${linkedGoal.title}" (${linkedGoal.currentValue}/${linkedGoal.targetValue}).`;
    } else {
      goal_effect = `This preserves your progress path toward your goal "${linkedGoal.title}".`;
    }
  } else if (progressType === "streak") {
    goal_effect = `This puts your current task consistency streak at risk of resetting.`;
  } else if (progressType === "compound") {
    goal_effect = `This delays compounding progress towards your skill development goals.`;
  } else {
    goal_effect = `Consistency is key. Small choices compound over time into massive productivity shifts.`;
  }

  const isHighContext = (
    importance === "critical" ||
    importance === "important" ||
    meta.deadline_pressure !== "none" ||
    category === "study" ||
    category === "project" ||
    category === "health"
  );

  return {
    consequence: {
      immediate_effect,
      cascade_effect,
      goal_effect,
      emotional_weight,
      primary_message_slot,
      recommendation: {
        best_action,
        minimum_viable_progress
      },
      negotiation_options: [
        {
          strategy: "reduce_scope",
          label: "Do 20 mins now",
          consequence_delta: "Saves time, preserves streak",
          command: {
            type: "shorten_duration",
            params: { reduced_duration: Math.max(20, Math.round((task.duration_minutes || 45) * 0.4)) }
          }
        },
        {
          strategy: "reschedule",
          label: "Move later",
          consequence_delta: "Shifts task to next gap",
          command: {
            type: "move_to_gap"
          }
        }
      ]
    },
    isHighContext
  };
};

const getScheduleHash = (task: FlexibleTask, items: ScheduledItem[], streak: number, date: string): string => {
  const nearbyData = items.map(item => [
    item.id,
    item.start_time,
    item.end_time,
    item.status
  ]);
  
  const payload = [
    task.scheduled_start_time || "",
    task.scheduled_end_time || "",
    nearbyData,
    streak,
    date
  ];
  
  const str = JSON.stringify(payload);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash.toString(16);
};

const getConsequenceCacheKey = (
  task: FlexibleTask,
  intent: string,
  delayMins: number,
  items: ScheduledItem[],
  streak: number,
  date: string
): string => {
  const hashVal = getScheduleHash(task, items, streak, date);
  return `${task.id}_${intent}_${delayMins}_${hashVal}`;
};

export default function App() {
  // 1. Core Application State
  const [fixedBlocks, setFixedBlocks] = useState<FixedBlock[]>([]);
  const [flexibleTasks, setFlexibleTasks] = useState<FlexibleTask[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [appSettings, setAppSettings] = useState({ day_start: "07:00", day_end: "23:00" });

  // Behavioral Memory States
  const [reflectionEvents, setReflectionEvents] = useState<ReflectionEvent[]>([]);
  const [taskExecutionLogs, setTaskExecutionLogs] = useState<TaskExecutionLog[]>([]);
  const [lastReflectedDate, setLastReflectedDate] = useState(() => localStorage.getItem("dayflow_last_reflected_date") || "");

  // Drift Prompt tracking
  const [lastDriftPromptAt, setLastDriftPromptAt] = useState(() => Number(localStorage.getItem("dayflow_last_drift_prompt_at")) || 0);
  const [driftPromptCountToday, setDriftPromptCountToday] = useState(() => {
    const todayStr = getLocalTodayStr();
    const storedDate = localStorage.getItem("dayflow_drift_prompt_date");
    if (storedDate === todayStr) {
      return Number(localStorage.getItem("dayflow_drift_prompt_count")) || 0;
    }
    return 0;
  });

  // Derived UBM Insights (still used for internal calibration UI charts)
  const ubmInsights = useMemo(() => {
    return extractUBMInsights(flexibleTasks, reflectionEvents, taskExecutionLogs);
  }, [flexibleTasks, reflectionEvents, taskExecutionLogs]);

  const behaviorSignals = useMemo(() => {
    let onboardProfile = null;
    try {
      const stored = localStorage.getItem("dayflow_onboarding_profile");
      if (stored) onboardProfile = JSON.parse(stored);
    } catch (_) {}
    return computeBehaviorSignals(flexibleTasks, taskExecutionLogs, reflectionEvents, onboardProfile);
  }, [flexibleTasks, taskExecutionLogs, reflectionEvents]);

  // Weekly Performance Evaluation History
  const evalHistory = useMemo(() => {
    return loadEvalHistory();
  }, [flexibleTasks, taskExecutionLogs]);

  // Active Timer (Precise In-App Timer)
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(() => {
    try {
      const stored = localStorage.getItem("dayflow_active_timer");
      return stored ? JSON.parse(stored) : null;
    } catch (_) {
      return null;
    }
  });



  useEffect(() => {
    if (activeTimer) {
      localStorage.setItem("dayflow_active_timer", JSON.stringify(activeTimer));
    } else {
      localStorage.removeItem("dayflow_active_timer");
    }
  }, [activeTimer]);

  const handleStartTimer = (taskId: string, title: string) => {
    if (activeTimer) {
      showToast("A timer is already running! Stop it first.", "info");
      return;
    }
    const newTimer = {
      taskId,
      startedAt: Date.now(),
      title
    };
    setActiveTimer(newTimer);
    showToast(`Started timer for "${title}"!`, "success");
    triggerHaptic(30);
  };

  const handleStopTimer = () => {
    if (!activeTimer) return;
    const elapsedMins = Math.max(1, Math.round((Date.now() - activeTimer.startedAt) / 60000));
    handleLogDuration(activeTimer.taskId, elapsedMins, "timer", 1.0);
    setActiveTimer(null);
    showToast(`Stopped timer. Logged ${elapsedMins} mins for "${activeTimer.title}"!`, "success");
    triggerHaptic(40);
  };

  const handleLogDuration = (
    taskId: string, 
    durationMinutes: number, 
    source: "timer" | "message" | "timestamp" | "default" = "default", 
    confidence = 0.1
  ) => {
    const task = flexibleTasks.find(t => t.id === taskId);
    if (!task) return;

    const scheduledItem = daySchedule.items.find(i => i.id === taskId);
    const startVal = task.actual_start_time || scheduledItem?.start_time || minutesToTime(currentTimeMins);

    const updated = flexibleTasks.map(t =>
      t.id === taskId ? {
        ...t,
        status: "done" as const,
        actual_duration_minutes: durationMinutes,
        completed_at: new Date().toISOString(),
        actual_start_time: startVal,
        category: t.category || getTaskCategory(t.title),
        duration_log_confidence: confidence,
        duration_log_source: source,
      } : t
    );

    handleUpdateFlexible(updated);
    recordTaskExecutionLog(taskId, true, false, durationMinutes, undefined, source, confidence);
    checkDayComplete(updated);
    showToast(`Logged actual time via ${source} (confidence: ${confidence.toFixed(1)}) successfully!`, "success");
    triggerHaptic(40);
  };

  const formatMinutes = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return `${h}h ${m}m`;
    }
    return `${m}m`;
  };

  const isUnimportantTask = (title: string, meta?: TaskMeta): boolean => {
    const lowercaseTitle = title.toLowerCase();
    const unimportantKeywords = ["lunch", "snack", "dinner", "movie", "nap", "show", "rest", "sleep", "break", "breakfast"];
    
    if (unimportantKeywords.some(kw => lowercaseTitle.includes(kw))) {
      return true;
    }
    
    if (meta?.category === "misc" || meta?.category === "personal") {
      if (lowercaseTitle.includes("relax") || lowercaseTitle.includes("chill")) {
        return true;
      }
    }
    
    return false;
  };

  const handleStartEveningCheckin = () => {
    setActiveBottomSheet("assistant");
    
    const todayTasks = flexibleTasks.filter(t => t.scheduled_date === selectedDate);
    const openTasks = todayTasks.filter(t => t.status === "scheduled");
    
    let text = `Hey 🌙 You planned ${todayTasks.length} tasks today.`;
    if (openTasks.length > 0) {
      text += ` I see ${openTasks.length} still open:\n` + 
              openTasks.map(t => `· ${t.title}`).join("\n") + 
              `\n\nDid you finish any but forget to mark them?`;
    } else {
      text += ` All of them are completed! Awesome job today! 🎉`;
    }

    setChatHistory([
      {
        sender: "ai" as const,
        text: text,
        questionnaire: {
          type: "evening_checkin",
          title: "Evening Review",
          openTaskIds: openTasks.map(t => t.id),
          currentStep: "unmarked_completion",
          activeTaskId: openTasks.length > 0 ? openTasks[0].id : null
        }
      }
    ]);
  };

  const handleEveningCheckinSelect = (actionType: string, payload: any, messageIdx: number) => {
    const updatedHistory = [...chatHistory];
    const msg = { ...updatedHistory[messageIdx] };
    if (!msg.questionnaire) return;

    let nextStep = msg.questionnaire.currentStep;
    let activeTaskId = msg.questionnaire.activeTaskId;
    let openTaskIds = [...(msg.questionnaire.openTaskIds || [])];
    let aiTextResponse = "";
    let userTextResponse = "";

    if (actionType === "finish" && payload) {
      const taskId = payload;
      const task = flexibleTasks.find(t => t.id === taskId);
      if (task) {
        handleLogDuration(taskId, task.duration_minutes, "timestamp", 0.3);
        userTextResponse = `${task.title} done`;
        aiTextResponse = `[marks ${task.title} done] Got it! `;
      }
      openTaskIds = openTaskIds.filter(id => id !== taskId);
      msg.questionnaire.openTaskIds = openTaskIds;

      if (openTaskIds.length > 0) {
        aiTextResponse += `Any other finished tasks?`;
      } else {
        const eligibleBacklog = flexibleTasks.filter(t => t.status === "backlog" && !isUnimportantTask(t.title, t.meta));
        if (eligibleBacklog.length > 0) {
          nextStep = "backlog_suggestion";
          aiTextResponse += `\n\nTomorrow's schedule is set! Would you like to pull in anything from your backlog?`;
        } else {
          aiTextResponse += `\n\nExcellent! All of today's tasks are complete. Tomorrow is a fresh start! 🎉`;
          msg.questionnaireSubmitted = true;
        }
      }
    } else if (actionType === "none_finished") {
      userTextResponse = "None of these are finished.";
      if (openTaskIds.length > 0) {
        activeTaskId = openTaskIds[0];
        msg.questionnaire.activeTaskId = activeTaskId;
        nextStep = "task_reason";
        const firstTask = flexibleTasks.find(t => t.id === activeTaskId);
        aiTextResponse = `Why was "${firstTask?.title}" not done today?`;
      } else {
        const eligibleBacklog = flexibleTasks.filter(t => t.status === "backlog" && !isUnimportantTask(t.title, t.meta));
        if (eligibleBacklog.length > 0) {
          nextStep = "backlog_suggestion";
          aiTextResponse = `Tomorrow's schedule is set! Would you like to pull in anything from your backlog?`;
        } else {
          aiTextResponse = "Awesome! All tasks are complete. Sleep well! 🌙";
          msg.questionnaireSubmitted = true;
        }
      }
    } else if (actionType === "reason" && payload) {
      const reasonCode = payload;
      const reasonLabel = reasonCode === "energy" ? "Too tired" : reasonCode === "planning" ? "Wrong planning" : reasonCode === "discipline" ? "Got distracted" : "Avoided it";
      userTextResponse = reasonLabel;

      const task = flexibleTasks.find(t => t.id === activeTaskId);
      const newReflection: ReflectionEvent = {
        id: `ref-${Date.now()}`,
        date: selectedDate,
        completionRate: 0,
        type: "failure",
        cause: reasonCode,
        notes: `Incomplete task: ${task?.title}`
      };
      const updatedReflections = [...reflectionEvents, newReflection];
      setReflectionEvents(updatedReflections);
      saveReflectionEvents(updatedReflections);

      nextStep = "task_resolution";
      aiTextResponse = `Makes sense — long days happen. Should I move it to tomorrow, or park it in your backlog?`;
    } else if (actionType === "resolution" && payload) {
      const resolution = payload;
      userTextResponse = resolution === "tomorrow" ? "Move to Tomorrow" : resolution === "backlog" ? "Move to Backlog" : "Drop It";

      if (resolution === "tomorrow") {
        const tomorrow = new Date(selectedDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        const updated = flexibleTasks.map(t =>
          t.id === activeTaskId ? { ...t, scheduled_date: tomorrowStr, status: "scheduled" as const } : t
        );
        handleUpdateFlexible(updated);
      } else if (resolution === "backlog") {
        const updated = flexibleTasks.map(t =>
          t.id === activeTaskId ? { ...t, scheduled_date: null, status: "backlog" as const } : t
        );
        handleUpdateFlexible(updated);
      } else if (resolution === "drop") {
        const updated = flexibleTasks.map(t =>
          t.id === activeTaskId ? { ...t, status: "skipped" as const } : t
        );
        handleUpdateFlexible(updated);
      }

      openTaskIds = openTaskIds.filter(id => id !== activeTaskId);
      msg.questionnaire.openTaskIds = openTaskIds;

      if (openTaskIds.length > 0) {
        activeTaskId = openTaskIds[0];
        msg.questionnaire.activeTaskId = activeTaskId;
        nextStep = "task_reason";
        const nextTask = flexibleTasks.find(t => t.id === activeTaskId);
        aiTextResponse = `Done. Why was "${nextTask?.title}" not done today?`;
      } else {
        const eligibleBacklog = flexibleTasks.filter(t => t.status === "backlog" && !isUnimportantTask(t.title, t.meta));
        if (eligibleBacklog.length > 0) {
          nextStep = "backlog_suggestion";
          aiTextResponse = `Done. Tomorrow's schedule is set! Would you like to pull in anything from your backlog?`;
        } else {
          aiTextResponse = `Done! Tomorrow's plan is ready! 🌙`;
          msg.questionnaireSubmitted = true;
        }
      }
    } else if (actionType === "pull" && payload) {
      const taskId = payload;
      const task = flexibleTasks.find(t => t.id === taskId);
      if (task) {
        const tomorrow = new Date(selectedDate);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split("T")[0];
        const updated = flexibleTasks.map(t =>
          t.id === taskId ? { ...t, scheduled_date: tomorrowStr, status: "scheduled" as const } : t
        );
        handleUpdateFlexible(updated);
        userTextResponse = `Pull: "${task.title}"`;
        
        const eligibleBacklog = updated.filter(t => t.status === "backlog" && !isUnimportantTask(t.title, t.meta));
        if (eligibleBacklog.length > 0) {
          aiTextResponse = `Added! Anything else from backlog?`;
        } else {
          aiTextResponse = `Great. Tomorrow's schedule is all set. Sleep well! 🌙`;
          msg.questionnaireSubmitted = true;
        }
      }
    } else if (actionType === "pull_none") {
      userTextResponse = "No thanks, looks good!";
      aiTextResponse = "Awesome. You're all set. Sleep well! 🌙";
      msg.questionnaireSubmitted = true;
    }

    msg.questionnaire.currentStep = nextStep;
    msg.questionnaire.activeTaskId = activeTaskId;
    updatedHistory[messageIdx] = msg;

    setChatHistory([...updatedHistory, { sender: "user", text: userTextResponse }, { sender: "ai", text: aiTextResponse }]);
    triggerHaptic(30);
  };

  // AI Reasoning overlay and reflection states
  const [aiReasoningResult, setAiReasoningResult] = useState<{
    message: string;
    proposalRisk: "low" | "medium" | "high";
    proposals: AIProposal[];
  } | null>(null);
  const [showConfirmationOverlay, setShowConfirmationOverlay] = useState(false);
  const [isProcessingAIReasoning, setIsProcessingAIReasoning] = useState(false);
  const [selectedCause, setSelectedCause] = useState<string>("");
  const [reflectionNotes, setReflectionNotes] = useState<string>("");

  // Onboarding System 0 States
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"welcome" | "identity" | "sleep" | "fixed">("welcome");
  const [onboardingRole, setOnboardingRole] = useState<"student" | "working" | "freelancer" | "exam_prep">("working");
  const [onboardingSleep, setOnboardingSleep] = useState({ wake: "07:00", sleep: "23:00", energy: "morning" as "morning" | "afternoon" | "night" | "inconsistent" });
  const [onboardingBlocks, setOnboardingBlocks] = useState<FixedBlock[]>([]);
  const [onboardingForm, setOnboardingForm] = useState({
    title: "",
    start_time: "09:00",
    end_time: "10:00",
    repeats: "daily" as RepeatType,
    color: "#E24B4A",
    daysOfWeek: [1, 2, 3, 4, 5] as number[]
  });

  // Routine Engine & Deferral States
  const [routineBlocks, setRoutineBlocks] = useState<RoutineBlock[]>(() => {
    try {
      const stored = localStorage.getItem("dayflow_routine_blocks");
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const [editingRoutineBlockId, setEditingRoutineBlockId] = useState<string | null>(null);
  const [routineBlockForm, setRoutineBlockForm] = useState({
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    daysOfWeek: [1, 2, 3, 4, 5],
    type: "custom" as "sleep" | "class" | "meal" | "commute" | "custom",
    rigidity: "soft" as "hard" | "soft"
  });

  const [pendingQuestions, setPendingQuestions] = useState<PendingQuestion[]>(() => {
    try {
      const stored = localStorage.getItem("dayflow_pending_questions");
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  const [injectedQuestionThisSession, setInjectedQuestionThisSession] = useState(false);

  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>(() => {
    try {
      const stored = localStorage.getItem("dayflow_calendar_events");
      return stored ? JSON.parse(stored) : [];
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("dayflow_routine_blocks", JSON.stringify(routineBlocks));
  }, [routineBlocks]);

  useEffect(() => {
    localStorage.setItem("dayflow_pending_questions", JSON.stringify(pendingQuestions));
  }, [pendingQuestions]);

  useEffect(() => {
    localStorage.setItem("dayflow_calendar_events", JSON.stringify(calendarEvents));
  }, [calendarEvents]);

  // System 3.5 Friction Logging State
  const [frictionPrompt, setFrictionPrompt] = useState<{
    taskId: string;
    reason?: FrictionReason;
    actionType?: "delay_15" | "delay_30" | "tomorrow";
    start_time?: string;
    isSkip?: boolean;
  } | null>(null);

  // Phase 2 insight banner
  const [showPhase2Banner, setShowPhase2Banner] = useState(false);
  const prevPhaseRef = useRef<1 | 2>(1);

  // Friction logging state modifiers
  const [delayDurationPromptTaskId, setDelayDurationPromptTaskId] = useState<string | null>(null);

  // Anti-Annoyance quiet mode tracking
  const [suggestionDismissLogs, setSuggestionDismissLogs] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("dayflow_suggestion_dismiss_logs");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [dismissedSuggestionIds, setDismissedSuggestionIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem("dayflow_dismissed_ids");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const isQuietMode = useMemo(() => {
    try {
      const saved = localStorage.getItem("dayflow_quiet_mode_until");
      if (saved) {
        const quietUntil = parseInt(saved, 10);
        if (Date.now() < quietUntil) {
          return true;
        }
      }
    } catch {}
    return false;
  }, [suggestionDismissLogs]);

  // Routing-based Tab controllers
  const [currentPath, setCurrentPath] = useState(() => {
    const p = window.location.pathname;
    return p === "/" || p === "" ? "/today" : p;
  });

  const navigate = useCallback((path: string) => {
    window.history.pushState(null, "", path);
    setCurrentPath(path);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p === "/" || p === "" ? "/today" : p);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const activeTab = useMemo(() => {
    if (currentPath === "/settings") return "settings";
    if (currentPath === "/backlog") return "backlog";
    if (currentPath === "/calendar") return "calendar";
    if (currentPath === "/routines" || currentPath === "/routines/grid") return "routines";
    if (currentPath === "/goals" || currentPath === "/routines/goals") return "routines";
    if (currentPath === "/projects" || currentPath === "/routines/projects") return "routines";
    return "today";
  }, [currentPath]);

  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case "backlog":
        return "Backlog";
      case "calendar":
        return "Calendar";
      case "routines":
        if (currentPath === "/goals" || currentPath === "/routines/goals") return "Goals";
        if (currentPath === "/projects" || currentPath === "/routines/projects") return "Projects";
        return "Routines";
      case "settings":
        return "Settings";
      case "today":
      default:
        return "Today";
    }
  }, [activeTab, currentPath]);

  const profileViewTab = useMemo(() => {
    if (currentPath === "/goals" || currentPath === "/routines/goals") return "goals";
    if (currentPath === "/projects" || currentPath === "/routines/projects") return "projects";
    return "grid";
  }, [currentPath]);

  const changeTabWithHaptic = (tab: "today" | "backlog" | "calendar" | "routines" | "settings") => {
    if (tab === "routines") {
      navigate("/routines");
    } else {
      navigate(`/${tab}`);
    }
    triggerHaptic(12);
  };
  
  // Routine Profiles state
  const [profiles, setProfiles] = useState<ScheduleProfile[]>([]);
  const [editingProfile, setEditingProfile] = useState<ScheduleProfile | null>(null);
  const [profileForm, setProfileForm] = useState<{
    name: string; emoji: string; accentColor: string; description: string;
    appliesTo: ProfileAppliesTo; blocks: ProfileBlock[];
  }>({
    name: "", emoji: "📚", accentColor: "#7F77DD", description: "",
    appliesTo: "weekdays", blocks: []
  });
  const [profileBlockForm, setProfileBlockForm] = useState({
    title: "", start_time: "09:00", end_time: "10:00", color: "#E24B4A"
  });
  const [expandedProfileId, setExpandedProfileId] = useState<string | null>(null);
  
  // Active Date selection
  const [selectedDate, setSelectedDate] = useState(TODAY);
  
  // Toasts state
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Search/Filters in Backlog
  const [backlogFilter, setBacklogFilter] = useState<"all" | "deadline" | "anytime" | "done">("all");
  
  // Notification States
  const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const notificationTimeouts = useRef<number[]>([]);

  // Sound feedback ref
  const [speechSupported, setSpeechSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);

  // Bottom Sheets control
  const [activeBottomSheet, setRawActiveBottomSheet] = useState<"fixed" | "flexible" | "emergency" | "assistant" | "profile" | "eodreview" | "goal" | null>(null);
  const [todaySubTab, setTodaySubTab] = useState<"timeline" | "copilot">("timeline");
  
  const setActiveBottomSheet = (sheet: "fixed" | "flexible" | "emergency" | "assistant" | "profile" | "eodreview" | "goal" | null) => {
    setRawActiveBottomSheet(sheet);
    if (sheet === "assistant" && activeTab === "today") {
      setTodaySubTab("copilot");
    }
  };
  
  // Live Clock for Time indicator
  const [currentTimeMins, setCurrentTimeMins] = useState(0);

  // Inline Confirm Delete State
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Drag-and-drop state for timeline reordering
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after">("after");

  // Pin-to-time state: which task is being time-pinned
  const [pinTimeTaskId, setPinTimeTaskId] = useState<string | null>(null);
  const [pinTimeValue, setPinTimeValue] = useState<string>("");

  // Form states
  const [editingBlock, setEditingBlock] = useState<FixedBlock | null>(null);
  const [editingTask, setEditingTask] = useState<FlexibleTask | null>(null);

  const [fixedForm, setFixedForm] = useState({
    title: "",
    start_time: "09:00",
    end_time: "10:00",
    repeats: "none" as RepeatType,
    color: "#E24B4A",
    daysOfWeek: [] as number[]
  });

  const [flexibleForm, setFlexibleForm] = useState({
    title: "",
    duration_minutes: 60,
    hasDeadline: false,
    deadline: "",
    energy_level: "medium" as EnergyLevel,
    scheduled_date: "",
    importance: "important" as "critical" | "important" | "optional",
    task_flexibility: "movable" as "fixed" | "movable" | "optional",
    // New CIE metadata fields:
    category: "personal" as TaskCategory,
    rigidity: "flexible" as TaskRigidity,
    recoverability: "easy" as TaskRecoverability,
    dependency_chain: "none" as TaskDependencyChain,
    progress_type: "binary" as TaskProgressType,
    deadline_pressure: "none" as DeadlinePressure,
    blocked_by: [] as string[],
    blocks: [] as string[]
  });


  // Unified AI Copilot sheet state
  const [copilotInput, setCopilotInput] = useState("");
  const [isProcessingCopilot, setIsProcessingCopilot] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [proposedChanges, setProposedChanges] = useState<any[] | null>(null);
  const [chatHistory, setChatHistory] = useState<{ sender: "ai" | "user"; text: string; questionnaire?: any; questionnaireSubmitted?: boolean; durationConfirmation?: any; explanations?: AIActionExplanation[] }[]>([]);
  const [copilotLoadingPhase, setCopilotLoadingPhase] = useState("Analyzing task constraints...");
  const copilotLoadingIntervalRef = useRef<any>(null);
  const [copilotRetryAttempt, setCopilotRetryAttempt] = useState(0);

  // Circuit Breaker State
  const [aiServiceState, setAiServiceState] = useState<"healthy" | "degraded" | "down">("healthy");
  const consecutiveFailuresRef = useRef<number>(0);
  const circuitBreakerRecoveryTimeRef = useRef<number | null>(null);

  const recordAISuccess = () => {
    consecutiveFailuresRef.current = 0;
    setAiServiceState("healthy");
  };

  const recordAIFailure = () => {
    consecutiveFailuresRef.current += 1;
    if (consecutiveFailuresRef.current >= 8) {
      setAiServiceState("down");
      circuitBreakerRecoveryTimeRef.current = Date.now() + 180000; // 3 minutes lockout
    } else if (consecutiveFailuresRef.current >= 3) {
      setAiServiceState("degraded");
    }
  };

  const isAIServiceAvailable = () => {
    if (aiServiceState === "down" && circuitBreakerRecoveryTimeRef.current) {
      if (Date.now() > circuitBreakerRecoveryTimeRef.current) {
        consecutiveFailuresRef.current = 0;
        setAiServiceState("healthy");
        circuitBreakerRecoveryTimeRef.current = null;
        return true;
      }
      return false;
    }
    return true;
  };

  const getTimeoutForOperation = (opType: "copilot" | "project_wizard" | "consequence" | "classification"): number => {
    switch (opType) {
      case "copilot": return 20000;
      case "project_wizard": return 90000;
      case "consequence": return 25000;
      case "classification": return 8000;
    }
    return 30000;
  };

  const generateLocalConsequenceFallback = (
    task: FlexibleTask,
    intent: string,
    delayMins: number,
    consequenceCore: any,
    goals: any[]
  ) => {
    const meta = task.meta || classifyTaskLocally(task.title, task.description || "", goals).meta;
    const category = meta.category || "personal";
    const progressType = meta.progress_type || "binary";
    const importance = meta.importance || "important";
    
    let immediate_effect = "";
    let cascade_effect = "";
    let goal_effect = "";
    let emotional_weight = "low";
    let recommendation = {
      best_action: "Complete this task as soon as possible to keep momentum.",
      minimum_viable_progress: "Do 10–15 minutes of low-friction progress to stay active."
    };
    
    if (importance === "critical") {
      emotional_weight = "critical";
    } else if (importance === "important") {
      emotional_weight = "medium";
    }

    if (intent === "skip") {
      if (category === "health") {
        immediate_effect = `Skipping "${task.title}" breaks your training rhythm and delays your fitness recovery cycle.`;
        recommendation.best_action = "Perform a shortened, lighter workout today rather than skipping completely.";
        recommendation.minimum_viable_progress = "Do a quick 10-minute active stretch to keep the habit slot warm.";
      } else if (category === "study") {
        immediate_effect = `Skipping "${task.title}" leaves study material unreviewed, creating dynamic catch-up gaps.`;
        recommendation.best_action = "Schedule a block tomorrow to cover these notes.";
        recommendation.minimum_viable_progress = "Skim the lecture slides for 5 minutes right now.";
      } else if (category === "project") {
        immediate_effect = `Skipping "${task.title}" stalls your active design and development milestones today.`;
        recommendation.best_action = "Split the task into smaller sub-tasks and do the first one now.";
        recommendation.minimum_viable_progress = "Set up your workspace and tools so you are ready to write code tomorrow.";
      } else if (category === "habit") {
        immediate_effect = `Skipping "${task.title}" breaks consistency, increasing the friction to restart.`;
        recommendation.best_action = "Execute a micro-session of this habit today.";
        recommendation.minimum_viable_progress = "Do a 2-minute version of the habit (e.g. read 1 page).";
      } else {
        immediate_effect = `Skipping "${task.title}" frees up time now but adds tasks to your future queue.`;
      }
    } else if (intent === "delay") {
      immediate_effect = `Delaying "${task.title}" by ${delayMins} minutes shifts your active focus window later into the day.`;
      if (category === "health") {
        recommendation.best_action = "Ensure your late gym session does not conflict with dinner or wind-down schedules.";
      } else if (category === "study" || category === "project") {
        recommendation.best_action = "Be mindful of reduced mental focus as you push this work into the evening.";
      }
    } else {
      immediate_effect = `Reviewing "${task.title}" schedule constraints for potential conflict resolutions.`;
    }

    if (consequenceCore.total_delay_minutes > 0) {
      cascade_effect = `This creates a delay of ${consequenceCore.total_delay_minutes} minutes, compressing remaining tasks and reducing buffer times.`;
    } else if (consequenceCore.is_pushed_to_backlog) {
      cascade_effect = `This pushes "${task.title}" back to the master backlog, requiring rescheduling later.`;
    } else if (consequenceCore.is_pushed_to_tomorrow) {
      cascade_effect = `This reschedules "${task.title}" to tomorrow, increasing tomorrow's schedule load.`;
    } else {
      cascade_effect = "Your timeline holds sufficient buffer gaps to absorb this shift without cascading tasks.";
    }

    const linkedGoal = goals.find(g =>
      g.linkedTaskKeywords.some((kw: string) => task.title.toLowerCase().includes(kw.toLowerCase()))
    );
    if (linkedGoal) {
      if (intent === "skip") {
        goal_effect = `This delays progress toward your goal "${linkedGoal.title}" (${linkedGoal.currentValue}/${linkedGoal.targetValue}).`;
      } else {
        goal_effect = `This preserves your progress path toward your goal "${linkedGoal.title}".`;
      }
    } else if (progressType === "streak") {
      goal_effect = `This puts your current task consistency streak at risk of resetting.`;
    } else if (progressType === "compound") {
      goal_effect = `This delays compounding progress towards your skill development goals.`;
    } else {
      goal_effect = `Consistency is key. Small choices compound over time into massive productivity shifts.`;
    }

    return {
      immediate_effect,
      cascade_effect,
      goal_effect,
      emotional_weight,
      primary_message_slot: intent === "skip" ? "immediate" : "cascade",
      recommendation,
      negotiation_options: [
        {
          strategy: "reduce_scope",
          label: "Do 20 mins now",
          consequence_delta: "Reduces length by half, preserves momentum",
          command: { type: "shorten_duration", params: {} }
        },
        {
          strategy: "reschedule",
          label: "Move to first gap",
          consequence_delta: "Finds the first available empty slot today",
          command: { type: "move_to_gap", params: {} }
        }
      ]
    };
  };

  const classifyIntent = (inputText: string): "agent" | "coach" => {
    const text = inputText.toLowerCase().trim();
    const commandKeywords = [
      "start", "stop", "play", "pause", "timer", "done", "finish", "complete",
      "add", "create", "new", "delete", "cancel", "remove", "postpone", "delay",
      "shift", "later", "tomorrow", "move", "change"
    ];
    const words = text.split(/\s+/);
    const hasCommandWord = words.some(w => commandKeywords.includes(w));
    
    if (hasCommandWord && words.length <= 12 && text.length <= 80) {
      return "agent";
    }
    return "coach";
  };

  const injectPendingQuestionTextIfNeeded = (originalText: string): string => {
    if (pendingQuestions.length > 0 && !injectedQuestionThisSession) {
      const nextQ = pendingQuestions[0];
      const remaining = pendingQuestions.slice(1);
      setPendingQuestions(remaining);
      localStorage.setItem("dayflow_pending_questions", JSON.stringify(remaining));
      setInjectedQuestionThisSession(true);

      return `${originalText}\n\nAlso, quick question — ${nextQ.question.charAt(0).toLowerCase() + nextQ.question.slice(1)}`;
    }
    return originalText;
  };

  const executeParsedCommand = (command: ParsedCommand) => {
    let msg = "";
    if (command.action === "start_timer") {
      handleStartTimer(command.taskId!, command.taskTitle!);
      msg = `⏱️ Started timer for "${command.taskTitle}". Recording...`;
    } else if (command.action === "stop_timer") {
      const task = flexibleTasks.find(t => t.id === command.taskId);
      if (task) {
        setEffortDialogTaskId(task.id);
      } else {
        handleStopTimer();
      }
      msg = `Stopping timer...`;
    } else if (command.action === "add_task") {
      const newTask: FlexibleTask = {
        id: `flex-${Date.now()}`,
        title: command.newTaskTitle!,
        duration_minutes: command.newTaskDuration || 45,
        energy_level: "medium",
        status: "scheduled",
        scheduled_date: selectedDate,
        carry_over_count: 0,
        deadline: null
      };
      handleUpdateFlexible([newTask]);
      msg = `I've added "${command.newTaskTitle}" (${command.newTaskDuration || 45} min) to your schedule.`;
    } else if (command.action === "delete_task") {
      handleDeleteFlexible(command.taskId!);
      msg = `I've removed "${command.taskTitle}" from your schedule.`;
    } else if (command.action === "postpone_task") {
      const target = flexibleTasks.find(t => t.id === command.taskId);
      if (target && target.scheduled_start_time) {
        const startMins = timeToMinutes(target.scheduled_start_time);
        const newTime = minutesToTime(startMins + command.mins!);
        const updated = flexibleTasks.map(t => t.id === command.taskId ? { ...t, pinned_start_time: newTime } : t);
        setFlexibleTasks(updated);
        saveFlexibleTasks(updated);
        msg = `I've postponed "${command.taskTitle}" by ${command.mins} minutes to ${newTime}.`;
      }
    } else if (command.action === "move_to_tomorrow") {
      const tomorrow = new Date(selectedDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];
      const updated = flexibleTasks.map(t => t.id === command.taskId ? { ...t, scheduled_date: tomorrowStr, status: "scheduled" as const } : t);
      setFlexibleTasks(updated);
      saveFlexibleTasks(updated);
      msg = `I've moved "${command.taskTitle}" to tomorrow.`;
    } else if (command.action === "change_time") {
      const updated = flexibleTasks.map(t => t.id === command.taskId ? { ...t, pinned_start_time: command.newTime } : t);
      setFlexibleTasks(updated);
      saveFlexibleTasks(updated);
      msg = `I've scheduled "${command.taskTitle}" at ${command.newTime}.`;
    }

    if (msg) {
      const responseText = injectPendingQuestionTextIfNeeded(msg);
      setChatHistory(prev => [...prev, { sender: "ai", text: responseText }]);
      showToast(msg, "success");
    }
  };

  const parseDeterministicCommand = (
    inputText: string,
    currentSchedule: any[],
    flexibleTasks: any[],
    selectedDate: string
  ): CommandResolution => {
    const text = inputText.toLowerCase().trim();

    if (text.split(/\s+/).length > 12 || text.length > 80) {
      return { status: "none" };
    }

    const findTasksLocalAll = (keywords: string[]) => {
      const matches: { task: any; score: number }[] = [];
      const allTasks = [
        ...flexibleTasks.map(t => ({ ...t, isFlex: true })),
        ...currentSchedule.map(item => ({ ...item, isFixed: item.type === "fixed" }))
      ];

      for (const t of allTasks) {
        let score = 0;
        const title = t.title.toLowerCase();
        for (const kw of keywords) {
          if (title.includes(kw)) score++;
        }
        if (score > 0) {
          matches.push({ task: t, score });
        }
      }
      return matches.sort((a, b) => b.score - a.score).map(m => m.task);
    };

    const getCleanKeywords = (phrase: string) => {
      return phrase
        .replace(/(?:move|shift|postpone|delete|cancel|remove|pin|schedule|change|at|to|tomorrow|today|later|for|minutes|mins|hours|h|pm|am)/ig, "")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 1);
    };

    const genericWords = ["that", "it", "this", "something", "task", "job", "block"];
    const isGenericAmbiguous = genericWords.includes(text) || 
                               text === "done" || 
                               text === "finished" || 
                               text === "completed" || 
                               text === "stop" ||
                               text === "do later" ||
                               text === "postpone" ||
                               text === "delete" ||
                               text === "cancel";

    const unfinishedTodayTasks = currentSchedule.filter(item => item.type === "flexible" && item.status !== "done" && item.status !== "skipped");

    if (isGenericAmbiguous) {
      if (text === "done" || text === "finished" || text === "completed") {
        if (activeTimer) {
          return {
            status: "resolved",
            command: {
              action: "stop_timer",
              taskId: activeTimer.taskId,
              taskTitle: activeTimer.title
            }
          };
        }
        if (unfinishedTodayTasks.length === 1) {
          return {
            status: "resolved",
            command: {
              action: "stop_timer",
              taskId: unfinishedTodayTasks[0].id,
              taskTitle: unfinishedTodayTasks[0].title
            }
          };
        }
        if (unfinishedTodayTasks.length > 1) {
          return {
            status: "uncertain",
            question: "Which task did you finish?",
            options: unfinishedTodayTasks.map(t => ({ id: t.id, title: t.title })),
            action: "stop_timer"
          };
        }
      }

      if (text === "postpone" || text === "do later" || text === "later" || text.includes("later") || text.includes("postpone")) {
        if (unfinishedTodayTasks.length === 1) {
          return {
            status: "resolved",
            command: {
              action: "move_to_tomorrow",
              taskId: unfinishedTodayTasks[0].id,
              taskTitle: unfinishedTodayTasks[0].title
            }
          };
        }
        if (unfinishedTodayTasks.length > 1) {
          return {
            status: "uncertain",
            question: "Which task would you like to postpone?",
            options: unfinishedTodayTasks.map(t => ({ id: t.id, title: t.title })),
            action: "move_to_tomorrow"
          };
        }
      }

      if (text === "delete" || text === "cancel") {
        if (unfinishedTodayTasks.length === 1) {
          return {
            status: "resolved",
            command: {
              action: "delete_task",
              taskId: unfinishedTodayTasks[0].id,
              taskTitle: unfinishedTodayTasks[0].title
            }
          };
        }
        if (unfinishedTodayTasks.length > 1) {
          return {
            status: "uncertain",
            question: "Which task would you like to delete?",
            options: unfinishedTodayTasks.map(t => ({ id: t.id, title: t.title })),
            action: "delete_task"
          };
        }
      }
    }

    const startMatch = text.match(/^(?:start|started|starting|play)\s+(.+)$/i) || text.match(/^(.+?)\s+(?:started|starting)$/i);
    if (startMatch) {
      const targetQuery = startMatch[1].trim();
      const keywords = getCleanKeywords(targetQuery);
      const targets = findTasksLocalAll(keywords);
      
      if (targets.length === 1 && targets[0].isFlex) {
        return {
          status: "resolved",
          command: {
            action: "start_timer",
            taskId: targets[0].id,
            taskTitle: targets[0].title
          }
        };
      }
      if (targets.length > 1) {
        return {
          status: "uncertain",
          question: `Did you mean to start ${targets.slice(0, 3).map(t => `"${t.title}"`).join(" or ")}?`,
          options: targets.map(t => ({ id: t.id, title: t.title })),
          action: "start_timer"
        };
      }
    }

    const stopMatch = text.match(/^(?:stop|stopped|done|finished|completed|end)\s+(.+)$/i) || text.match(/^(.+?)\s+(?:done|finished|completed)$/i);
    if (stopMatch) {
      const targetQuery = stopMatch[1].trim();
      const keywords = getCleanKeywords(targetQuery);
      const targets = findTasksLocalAll(keywords);
      
      if (targets.length === 1) {
        return {
          status: "resolved",
          command: {
            action: "stop_timer",
            taskId: targets[0].id,
            taskTitle: targets[0].title
          }
        };
      }
      if (targets.length > 1) {
        return {
          status: "uncertain",
          question: `Did you mean to stop ${targets.slice(0, 3).map(t => `"${t.title}"`).join(" or ")}?`,
          options: targets.map(t => ({ id: t.id, title: t.title })),
          action: "stop_timer"
        };
      }
    }

    const addRegex = /^(?:add\s+task|add|create\s+task|create|new\s+task)\s+(.+?)(?:\s+(?:for|duration)\s+(\d+)\s*(?:min|minute|mins|hour|hours|h))?$/i;
    const addMatch = text.match(addRegex);
    if (addMatch && !text.includes("why") && !text.includes("consequence") && !text.includes("negotiate")) {
      const title = addMatch[1].trim();
      let duration = 45;
      const durValStr = addMatch[2];
      if (durValStr) {
        duration = parseInt(durValStr, 10);
        if (text.includes("hour") || text.includes(" h")) {
          duration *= 60;
        }
      }
      return {
        status: "resolved",
        command: {
          action: "add_task",
          newTaskTitle: title.charAt(0).toUpperCase() + title.slice(1),
          newTaskDuration: duration
        }
      };
    }

    const deleteMatch = text.match(/^(?:delete|cancel|remove)\s+(.+)$/i);
    if (deleteMatch) {
      const targetQuery = deleteMatch[1].trim();
      const keywords = getCleanKeywords(targetQuery);
      const targets = findTasksLocalAll(keywords);
      
      if (targets.length === 1) {
        return {
          status: "resolved",
          command: {
            action: "delete_task",
            taskId: targets[0].id,
            taskTitle: targets[0].title
          }
        };
      }
      if (targets.length > 1) {
        return {
          status: "uncertain",
          question: `Did you mean to delete ${targets.slice(0, 3).map(t => `"${t.title}"`).join(" or ")}?`,
          options: targets.map(t => ({ id: t.id, title: t.title })),
          action: "delete_task"
        };
      }
    }

    if (text.includes("tomorrow") || text.includes("postpone") || text.includes("later") || text.includes("delay")) {
      const shiftMatch = text.match(/(?:postpone|delay|shift)\s+(.+?)\s+by\s+(\d+)\s*(?:min|minute|mins)/i);
      if (shiftMatch) {
        const targetQuery = shiftMatch[1].trim();
        const mins = parseInt(shiftMatch[2], 10);
        const keywords = getCleanKeywords(targetQuery);
        const targets = findTasksLocalAll(keywords);
        
        if (targets.length === 1) {
          return {
            status: "resolved",
            command: {
              action: "postpone_task",
              taskId: targets[0].id,
              taskTitle: targets[0].title,
              mins: mins
            }
          };
        }
        if (targets.length > 1) {
          return {
            status: "uncertain",
            question: `Did you mean to postpone ${targets.slice(0, 3).map(t => `"${t.title}"`).join(" or ")}?`,
            options: targets.map(t => ({ id: t.id, title: t.title })),
            action: "postpone_task",
            mins: mins
          };
        }
      }

      const keywords = getCleanKeywords(text);
      const targets = findTasksLocalAll(keywords);
      if (targets.length === 1 && targets[0].isFlex) {
        return {
          status: "resolved",
          command: {
            action: "move_to_tomorrow",
            taskId: targets[0].id,
            taskTitle: targets[0].title
          }
        };
      }
      if (targets.length > 1) {
        return {
          status: "uncertain",
          question: `Did you mean to move ${targets.slice(0, 3).map(t => `"${t.title}"`).join(" or ")} to tomorrow?`,
          options: targets.map(t => ({ id: t.id, title: t.title })),
          action: "move_to_tomorrow"
        };
      }
    }

    const timeSlotRegex = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:to|until|-)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i;
    const timeAtRegex = /(?:at|from|to|at)\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;

    const slotMatch = text.match(timeSlotRegex);
    const atMatch = text.match(timeAtRegex);

    if (slotMatch) {
      const startHr = parseInt(slotMatch[1], 10);
      const startMinStr = slotMatch[2] || "00";
      const startAmPm = slotMatch[3] || slotMatch[6];
      const endHr = parseInt(slotMatch[4], 10);
      const endMinStr = slotMatch[5] || "00";
      const endAmPm = slotMatch[6];

      const parseHr = (hr: number, ampm?: string): number => {
        let h = hr;
        const lower = ampm ? ampm.toLowerCase() : "";
        if (lower === "pm" && h < 12) h += 12;
        if (lower === "am" && h === 12) h = 0;
        return h;
      };

      const startHour = parseHr(startHr, startAmPm);
      const endHour = parseHr(endHr, endAmPm);
      const startTimeStr = `${startHour.toString().padStart(2, "0")}:${startMinStr.padStart(2, "0")}`;
      const endTimeStr = `${endHour.toString().padStart(2, "0")}:${endMinStr.padStart(2, "0")}`;
      
      const targetQuery = text.replace(timeSlotRegex, "").trim();
      const keywords = getCleanKeywords(targetQuery);
      const targets = findTasksLocalAll(keywords);
      
      if (targets.length === 1) {
        return {
          status: "resolved",
          command: {
            action: "change_time",
            taskId: targets[0].id,
            taskTitle: targets[0].title,
            newTime: startTimeStr
          }
        };
      }
      if (targets.length > 1) {
        return {
          status: "uncertain",
          question: `Did you mean to schedule ${targets.slice(0, 3).map(t => `"${t.title}"`).join(" or ")} from ${startTimeStr} to ${endTimeStr}?`,
          options: targets.map(t => ({ id: t.id, title: t.title })),
          action: "change_time",
          newTime: startTimeStr
        };
      }
    } else if (atMatch) {
      const hr = parseInt(atMatch[1], 10);
      const minStr = atMatch[2] || "00";
      const ampm = atMatch[3];
      
      let hour = hr;
      const lower = ampm ? ampm.toLowerCase() : "";
      if (lower === "pm" && hour < 12) hour += 12;
      if (lower === "am" && hour === 12) hour = 0;
      const timeStr = `${hour.toString().padStart(2, "0")}:${minStr.padStart(2, "0")}`;

      const targetQuery = text.replace(timeAtRegex, "").trim();
      const keywords = getCleanKeywords(targetQuery);
      const targets = findTasksLocalAll(keywords);
      
      if (targets.length === 1) {
        return {
          status: "resolved",
          command: {
            action: "change_time",
            taskId: targets[0].id,
            taskTitle: targets[0].title,
            newTime: timeStr
          }
        };
      }
      if (targets.length > 1) {
        return {
          status: "uncertain",
          question: `Did you mean to schedule ${targets.slice(0, 3).map(t => `"${t.title}"`).join(" or ")} at ${timeStr}?`,
          options: targets.map(t => ({ id: t.id, title: t.title })),
          action: "change_time",
          newTime: timeStr
        };
      }
    }

    return { status: "none" };
  };

  const startCopilotLoadingSimulation = () => {
    setCopilotRetryAttempt(0);
    if (copilotLoadingIntervalRef.current) {
      clearInterval(copilotLoadingIntervalRef.current);
    }
    const LOADING_PHASES = [
      "Analyzing task constraints and buffer gaps...",
      "Checking whether your timeline balance is realistic...",
      "Trying to preserve deep focus and recovery blocks...",
      "Avoiding back-to-back burnout sessions...",
      "Simulating smart circadian slotting...",
      "Formulating strategic negotiation options...",
      "Finalizing timeline updates..."
    ];
    setCopilotLoadingPhase(LOADING_PHASES[0]);
    let phaseIdx = 0;
    copilotLoadingIntervalRef.current = setInterval(() => {
      phaseIdx = (phaseIdx + 1) % LOADING_PHASES.length;
      setCopilotLoadingPhase(LOADING_PHASES[phaseIdx]);
    }, 2500);
  };

  const stopCopilotLoadingSimulation = () => {
    setCopilotRetryAttempt(0);
    if (copilotLoadingIntervalRef.current) {
      clearInterval(copilotLoadingIntervalRef.current);
      copilotLoadingIntervalRef.current = null;
    }
  };

  const handleTriggerOfflineFallback = () => {
    setCopilotError(null);
    triggerHaptic(25);

    let questionnaireMsg: any = null;
    for (let i = chatHistory.length - 1; i >= 0; i--) {
      if (chatHistory[i].questionnaire) {
        questionnaireMsg = chatHistory[i];
        break;
      }
    }

    if (questionnaireMsg && questionnaireMsg.questionnaireSubmitted) {
      const answers = questionnaireMsg.questionnaire.questions.reduce((acc: any, q: any) => {
        acc[q.id] = q.value;
        return acc;
      }, {} as Record<string, string>);

      let data;
      if (questionnaireMsg.questionnaire.type === "workout_plan") {
        data = generateLocalFitnessPlan(
          answers["workout_type"] || "",
          answers["weight_goal"] || "",
          answers["goal_details"] || "",
          answers["frequency"] || ""
        );
      } else if (questionnaireMsg.questionnaire.type === "project_plan") {
        data = generateLocalProjectPlan(
          answers["project_type"] || "",
          answers["session_count"] || "",
          answers["session_duration"] || "",
          answers["project_goal_name"] || ""
        );
      } else {
        const lastUserMsg = [...chatHistory].reverse().find(m => m.sender === "user");
        const userText = lastUserMsg ? lastUserMsg.text : "";
        data = adjustScheduleOffline(userText, daySchedule.items, flexibleTasks, selectedDate);
      }

      if (data.changes && data.changes.length > 0) {
        setProposedChanges(data.changes);
      }
      setChatHistory(prev => [...prev, {
        sender: "ai",
        text: `${data.message} (Offline Mode Fallback)`
      }]);
      return;
    }

    const lastUserMsg = [...chatHistory].reverse().find(m => m.sender === "user");
    const userText = lastUserMsg ? lastUserMsg.text : "";
    const data = adjustScheduleOffline(userText, daySchedule.items, flexibleTasks, selectedDate);
    if (data.changes && data.changes.length > 0) {
      setProposedChanges(data.changes);
    }
    setChatHistory(prev => [...prev, { 
      sender: "ai", 
      text: `${data.message} (Offline Mode Fallback)` 
    }]);
  };

  const [greetingMessage, setGreetingMessage] = useState("");

  // Vision image attachment for copilot
  const [copilotImage, setCopilotImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const copilotImageInputRef = useRef<HTMLInputElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Inline task card expansion state
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // Frictionless completion dialog
  const [effortDialogTaskId, setEffortDialogTaskId] = useState<string | null>(null);

  // Hybrid Classifier UI feedback states
  const [classificationFeedback, setClassificationFeedback] = useState<{ category: TaskCategory; confidence: number; source: "rules" | "memory" | "ai" } | null>(null);
  const [isMetadataOpen, setIsMetadataOpen] = useState(false);
  const [consequenceCache, setConsequenceCache] = useState<Record<string, import("./types").TaskConsequence>>({});

  // Weight log
  const [weightLog, setWeightLog] = useState<WeightEntry[]>([]);
  
  // Notification states
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>("default");
  const [notificationResponseTask, setNotificationResponseTask] = useState<ScheduledItem | null>(null);
  const notifiedTasksRef = useRef<{ [key: string]: boolean }>({});

  // Profile settings states
  const [profileName, setProfileName] = useState(() => localStorage.getItem("dayflow_profile_name") || "Siddhesh Nagawade");
  const [profileAge, setProfileAge] = useState(() => localStorage.getItem("dayflow_profile_age") || "25");
  const [profileBio, setProfileBio] = useState(() => localStorage.getItem("dayflow_profile_bio") || "Productivity creator. Tracking daily flows.");
  const [profileEmoji, setProfileEmoji] = useState(() => localStorage.getItem("dayflow_profile_emoji") || "👨‍💻");


  // Goals and Achievements states
  const [goals, setGoals] = useState<UserGoal[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activeGoalCheckIn, setActiveGoalCheckIn] = useState<{ goal: UserGoal; prompt: string } | null>(null);
  const [editingGoal, setEditingGoal] = useState<UserGoal | null>(null);
  const [goalForm, setGoalForm] = useState({
    title: "",
    category: "fitness" as GoalCategory,
    description: "",
    metricLabel: "sessions",
    currentValue: 0,
    targetValue: 10,
    targetDate: "",
    linkedTaskKeywords: ""
  });
  const [checkInResponseVal, setCheckInResponseVal] = useState<string>("");

  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showDevTools, setShowDevTools] = useState(() => localStorage.getItem("dayflow_dev_tools_enabled") === "true");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const handleLogoClick = () => {
    setLogoClickCount(prev => {
      const newCount = prev + 1;
      if (newCount >= 5) {
        const nextDev = !showDevTools;
        setShowDevTools(nextDev);
        localStorage.setItem("dayflow_dev_tools_enabled", String(nextDev));
        showToast(nextDev ? "Developer options unlocked! ✨" : "Developer options locked.", "info");
        triggerHaptic(50);
        return 0;
      }
      return newCount;
    });
  };

  const handleInjectMockMLData = () => {
    // 1. Clear old evaluation history to allow clean recalculation
    localStorage.removeItem("dayflow_eval_history");
    
    const mockTasks = generateMockMLData();
    const mockLogs: TaskExecutionLog[] = [];
    mockTasks.forEach(t => {
      if (t.status === "done" && t.scheduled_date) {
        const startHour = t.scheduled_start_time ? parseInt(t.scheduled_start_time.split(":")[0], 10) : 9;
        mockLogs.push({
          taskId: t.id,
          date: t.scheduled_date,
          plannedDuration: t.duration_minutes,
          actualDuration: t.actual_duration_minutes,
          scheduledStartHour: startHour,
          completed: true,
          skipped: false
        });
      }
    });

    // 2. Inject mock suggestion events covering the last few weeks
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const suggestionEvents = [
      { timestamp: now - 25 * dayMs, proposedCount: 10, acceptedCount: 8 },
      { timestamp: now - 18 * dayMs, proposedCount: 12, acceptedCount: 10 },
      { timestamp: now - 11 * dayMs, proposedCount: 8, acceptedCount: 7 },
      { timestamp: now - 4 * dayMs, proposedCount: 15, acceptedCount: 14 },
      { timestamp: now, proposedCount: 5, acceptedCount: 4 }
    ];
    localStorage.setItem("dayflow_ai_suggestion_events", JSON.stringify(suggestionEvents));

    // 3. Update states
    setTaskExecutionLogs(mockLogs);
    saveTaskExecutionLogs(mockLogs);
    handleUpdateFlexible(mockTasks, true);
    
    showToast("Demo completion history & AI suggestions injected successfully!", "success");
    triggerHaptic(50);
  };

  // Dynamic Mobile Menu refs & items list
  const textRefs = useRef<(HTMLElement | null)[]>([]);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const menuItems = useMemo(() => [
    { label: "today", icon: CalendarCheck, value: "today" as const },
    { label: "backlog", icon: Layers, value: "backlog" as const },
    { label: "calendar", icon: CalendarDays, value: "calendar" as const },
    { label: "routines", icon: BookMarked, value: "routines" as const }
  ], []);

  // EOD Review sheet state
  const [showEodReview, setShowEodReview] = useState(false);
  const [eodDismissed, setEodDismissed] = useState(false);
  const [showDaySummaryReminder, setShowDaySummaryReminder] = useState(false);

  // Copilot control states: Abort controller, Undo changes history, and Message editing
  const copilotAbortControllerRef = useRef<AbortController | null>(null);
  const [copilotUndoState, setCopilotUndoState] = useState<{ flexibleTasks: any[]; fixedBlocks: any[]; goals: any[]; weightLog: any[]; routineBlocks?: any[]; calendarEvents?: any[]; projects?: any[] } | null>(null);
  const [editingMessageIdx, setEditingMessageIdx] = useState<number | null>(null);
  const [editingMessageText, setEditingMessageText] = useState("");
  const [copilotMinimized, setCopilotMinimized] = useState(false);

  // ── Execution Engine State ─────────────────────────────────────────────────
  // Which task has its action tray open (Done / Break / Move / Skip)
  const [actionTrayTaskId, setActionTrayTaskId] = useState<string | null>(null);
  // Active consequence card state (pre-decision gate for high-risk actions)
  const [consequenceState, setConsequenceState] = useState<{
    taskId: string;
    mode: "break" | "skip";
    breakMins?: number;         // set for break actions
    result: import("./types").DelayCostResult;
  } | null>(null);
  // Move slot picker: which task is being moved
  const [moveSheetTaskId, setMoveSheetTaskId] = useState<string | null>(null);
  // Consequence insight loading state: which task is fetching its AI narrative
  const [loadingInsightTaskId, setLoadingInsightTaskId] = useState<string | null>(null);
  // Which task has its consequence insight panel open
  const [openInsightTaskId, setOpenInsightTaskId] = useState<string | null>(null);

  // Sidebar adjustability states
  const [sidebarWidth, setSidebarWidth] = useState<number>(() => {
    const saved = localStorage.getItem("dayflow_sidebar_width");
    return saved ? parseInt(saved, 10) : 260;
  });
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem("dayflow_sidebar_collapsed") === "true";
  });
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((mouseDownEvent: React.MouseEvent) => {
    mouseDownEvent.preventDefault();
    setIsResizing(true);
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback((mouseMoveEvent: MouseEvent) => {
    const newWidth = mouseMoveEvent.clientX;
    if (newWidth >= 200 && newWidth <= 400) {
      setSidebarWidth(newWidth);
      localStorage.setItem("dayflow_sidebar_width", newWidth.toString());
    }
  }, []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  // Automatically scroll chat to bottom when history or processing state changes
  useEffect(() => {
    if (activeBottomSheet === "assistant" && chatContainerRef.current) {
      setTimeout(() => {
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: "smooth"
          });
        }
      }, 80);
    }
  }, [chatHistory, isProcessingCopilot, activeBottomSheet]);

  // System 5: Automatically check and update evaluation history snapshots
  useEffect(() => {
    if (flexibleTasks.length > 0 || taskExecutionLogs.length > 0) {
      checkAndGenerateWeeklySnapshot(flexibleTasks, taskExecutionLogs, selectedDate);
    }
  }, [flexibleTasks, taskExecutionLogs, selectedDate]);

  // System 6: Track AI suggestions proposed
  useEffect(() => {
    if (proposedChanges && proposedChanges.length > 0) {
      logProposedSuggestions(proposedChanges.length);
    }
  }, [proposedChanges]);

  // 1. Initial Storage Bootstrap
  useEffect(() => {
    const blocks = loadFixedBlocks();
    const tasks = loadFlexibleTasks();
    const appSettingsLoaded = loadSettings();
    const profilesLoaded = loadProfiles();
    const goalsLoaded = loadGoals();
    const achievementsLoaded = loadAchievements();
    const weightLogLoaded = loadWeightLog();
    const loadedReflections = loadReflectionEvents();
    const loadedLogs = loadTaskExecutionLogs();

    let loadedProjects: Project[] = [];
    try {
      const storedProj = localStorage.getItem("dayflow_projects");
      if (storedProj) loadedProjects = JSON.parse(storedProj);
    } catch (_) {}

    // Migrate/populate consequence and flexibility fields on legacy tasks
    let migrated = false;
    const migratedTasks = tasks.map(t => {
      let changed = false;
      const updatedTask = { ...t };
      if (!updatedTask.task_flexibility) {
        updatedTask.task_flexibility = "movable";
        changed = true;
      }
      if (!updatedTask.consequence_teaser || !updatedTask.consequence_insight) {
        const def = generateDefaultConsequence(updatedTask, goalsLoaded);
        updatedTask.consequence_teaser = def.consequence.immediate_effect;
        updatedTask.consequence_insight = def.consequence.immediate_effect + " " + def.consequence.cascade_effect + " " + def.consequence.goal_effect;
        if (!def.isHighContext && !updatedTask.consequence_generated_at) {
          updatedTask.consequence_generated_at = new Date().toISOString();
        }
        changed = true;
      }
      if (changed) migrated = true;
      return updatedTask;
    });

    if (migrated) {
      saveFlexibleTasks(migratedTasks);
    }

    setFixedBlocks(blocks);
    setFlexibleTasks(migratedTasks);
    setProjects(loadedProjects);
    setAppSettings(appSettingsLoaded);
    setProfiles(profilesLoaded);
    setGoals(goalsLoaded);
    setAchievements(achievementsLoaded);
    setWeightLog(weightLogLoaded);
    setReflectionEvents(loadedReflections);
    setTaskExecutionLogs(loadedLogs);

    // Show onboarding if first time
    if (!isOnboardingComplete()) {
      setShowOnboarding(true);
    }
    
    // Set active current time
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeMins(now.getHours() * 60 + now.getMinutes());
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);

    // Speech recognition support
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      setSpeechSupported(true);
    }

    // Check system permissions for notifications
    if ("Notification" in window) {
      setNotificationPermission(Notification.permission);
      if (Notification.permission === "default") {
        const dismissed = localStorage.getItem("dayflow_notif_dismissed");
        if (!dismissed) {
          setShowNotificationPrompt(true);
        }
      }
    }

    return () => clearInterval(interval);
  }, []);

  // Update profiles wrapper
  const handleUpdateProfiles = (newProfiles: ScheduleProfile[]) => {
    setProfiles(newProfiles);
    saveProfiles(newProfiles);
  };

  // Helper to check suspended routine types for a date based on active routine overrides
  const getSuspendedRoutineTypesForDate = useCallback((dateStr: string) => {
    const suspended = new Set<string>();
    calendarEvents.forEach(evt => {
      if (evt.type === "routine_override" && dateStr >= evt.startDate && dateStr <= evt.endDate) {
        evt.effects?.suspendRoutineTypes?.forEach(t => suspended.add(t));
      }
    });
    return suspended;
  }, [calendarEvents]);

  // Compute effective fixed blocks for any date (hard routine blocks + manual one-off blocks)
  const effectiveFixedBlocks = useMemo(() => {
    const [year, month, day] = selectedDate.split("-").map(Number);
    const dateDayOfWeek = new Date(Date.UTC(year, month - 1, day)).getUTCDay(); // 0-6
    
    const suspendedTypes = getSuspendedRoutineTypesForDate(selectedDate);
    const activeRoutines = routineBlocks.filter(r => !suspendedTypes.has(r.type));

    const hardRoutineFixed: FixedBlock[] = activeRoutines
      .filter(r => r.rigidity === "hard" && r.daysOfWeek.includes(dateDayOfWeek))
      .map(r => ({
        id: `routine-hard-${r.id}`,
        title: r.title,
        start_time: r.startTime,
        end_time: r.endTime,
        repeats: "none" as RepeatType,
        locked: true,
        date: selectedDate,
        color: "#8B7EFF"
      }));

    return [...hardRoutineFixed, ...fixedBlocks];
  }, [routineBlocks, fixedBlocks, selectedDate, getSuspendedRoutineTypesForDate]);

  // Active profile for display
  const currentActiveProfile = useMemo(() => {
    const dayOfWeek = new Date(selectedDate + "T12:00:00").getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    return (
      profiles.find(p => p.isActive) ||
      profiles.find(p => {
        if (p.appliesTo === "everyday") return true;
        if (p.appliesTo === "weekdays" && !isWeekend) return true;
        if (p.appliesTo === "weekends" && isWeekend) return true;
        return false;
      }) || null
    );
  }, [profiles, selectedDate]);

  // Update fixedBlocks wrapper
  const handleUpdateFixed = (newBlocks: FixedBlock[]) => {
    setFixedBlocks(newBlocks);
    saveFixedBlocks(newBlocks);
  };

  // Update projects wrapper
  const handleUpdateProjects = (newProjects: Project[]) => {
    setProjects(newProjects);
    localStorage.setItem("dayflow_projects", JSON.stringify(newProjects));
  };

  const recordTaskExecutionLog = (
    taskId: string, 
    completed: boolean, 
    skipped: boolean, 
    actualDur?: number, 
    dateVal?: string,
    source: "timer" | "message" | "timestamp" | "default" = "default", 
    confidence = 0.1
  ) => {
    const task = flexibleTasks.find(t => t.id === taskId);
    if (!task) return;

    const scheduledItem = daySchedule.items.find(i => i.id === taskId);
    const startHour = scheduledItem?.start_time ? parseInt(scheduledItem.start_time.split(":")[0], 10) : undefined;

    const newLog: TaskExecutionLog = {
      taskId,
      date: dateVal || task.scheduled_date || TODAY,
      plannedDuration: task.duration_minutes,
      actualDuration: actualDur,
      scheduledStartHour: startHour,
      completed,
      skipped,
      confidence,
      estimationSource: source
    };

    const updatedLogs = [...taskExecutionLogs, newLog];
    setTaskExecutionLogs(updatedLogs);
    saveTaskExecutionLogs(updatedLogs);
  };

  // Update flexibleTasks wrapper
  const handleUpdateFlexible = (newTasks: FlexibleTask[], isSilent = false) => {
    // Find newly completed tasks (comparing with previous state)
    const newlyCompleted = newTasks.filter(t => {
      const prev = flexibleTasks.find(p => p.id === t.id);
      return t.status === "done" && prev?.status !== "done";
    });
    
    // Update goals based on newly completed tasks
    if (newlyCompleted.length > 0) {
      let currentGoals = [...goals];
      let allNewAchievements: Achievement[] = [];
      
      if (goals.length > 0) {
        for (const task of newlyCompleted) {
          const { updatedGoals, newAchievements } = updateGoalProgressFromTask(currentGoals, task);
          currentGoals = updatedGoals;
          allNewAchievements = [...allNewAchievements, ...newAchievements];
        }
        setGoals(currentGoals);
        saveGoals(currentGoals);
      }

      // Check for global lifetime/category achievements
      const globalAchievements = checkForGlobalAchievements(newTasks, achievements);
      allNewAchievements = [...allNewAchievements, ...globalAchievements];
      
      if (allNewAchievements.length > 0) {
        const updated = [...achievements, ...allNewAchievements];
        setAchievements(updated);
        saveAchievements(updated);
        
        if (!isSilent) {
          // Show achievement toast
          allNewAchievements.forEach(ach => {
            showToast(`${ach.icon} Achievement Unlocked: ${ach.title}`, "success");
          });
        }
      }
    }
    
    // Sync with project engine if subtasks are updated
    let projectsModified = false;
    let updatedProjects = [...projects];

    newTasks.forEach(task => {
      if (task.projectId && task.subtaskId) {
        const projIdx = updatedProjects.findIndex(p => p.id === task.projectId);
        if (projIdx >= 0) {
          const proj = { ...updatedProjects[projIdx] };
          let subtaskFound = false;
          
          proj.phases = proj.phases.map(phase => {
            if (task.phaseId && phase.id !== task.phaseId) return phase;
            return {
              ...phase,
              subtasks: phase.subtasks.map(sub => {
                if (sub.id === task.subtaskId) {
                  subtaskFound = true;
                  const newStatus = task.status === "done" ? "done" as const : (task.status === "skipped" ? "skipped" as const : "pending" as const);
                  return { ...sub, status: newStatus, taskId: task.id };
                }
                return sub;
              })
            };
          });

          if (subtaskFound) {
            const allSubtasks = proj.phases.flatMap(p => p.subtasks);
            const doneSubtasks = allSubtasks.filter(s => s.status === "done").length;
            proj.progress = allSubtasks.length > 0 ? Math.round((doneSubtasks / allSubtasks.length) * 100) : 0;
            
            updatedProjects[projIdx] = proj;
            projectsModified = true;
          }
        }
      }
    });

    if (projectsModified) {
      setProjects(updatedProjects);
      localStorage.setItem("dayflow_projects", JSON.stringify(updatedProjects));
    }

    setFlexibleTasks(newTasks);
    saveFlexibleTasks(newTasks);
  };

  const executeAIProposals = (proposals: AIProposal[]) => {
    let updatedTasks = [...flexibleTasks];
    const logsToRecord: TaskExecutionLog[] = [];

    proposals.forEach(proposal => {
      if (proposal.type === "abstain") return;
      if (proposal.type === "suggest" || proposal.type === "ask") {
        return;
      }

      const taskId = (proposal as any).taskId;
      if (!taskId) return;

      const taskIndex = updatedTasks.findIndex(t => t.id === taskId);
      if (taskIndex === -1) return;

      const task = updatedTasks[taskIndex];

      // DETERMINISTIC GUARDRAILS:
      // 1. Cannot modify fixed calendar events
      if (task.meta?.rigidity === "fixed") {
        console.warn(`Guardrail: Cannot modify fixed task ${task.title}`);
        showToast(`Guardrail: Fixed event "${task.title}" cannot be changed.`, "warning");
        return;
      }

      // 2. Cannot expire critical tasks
      if (proposal.type === "expire" && (task.meta?.importance === "critical" || task.importance === "critical")) {
        console.warn(`Guardrail: Cannot expire critical task ${task.title}. Backlogging instead.`);
        showToast(`Guardrail: "${task.title}" is critical. Backlogged instead of expired.`, "info");
        updatedTasks[taskIndex] = {
          ...task,
          status: "backlog",
          scheduled_date: null
        };
        return;
      }

      if (proposal.type === "expire") {
        updatedTasks[taskIndex] = {
          ...task,
          status: "expired"
        };
        logsToRecord.push({
          taskId: task.id,
          date: task.scheduled_date || TODAY,
          plannedDuration: task.duration_minutes,
          completed: false,
          skipped: true
        });
      } else if (proposal.type === "backlog") {
        updatedTasks[taskIndex] = {
          ...task,
          status: "backlog",
          scheduled_date: null
        };
      } else if (proposal.type === "carry_over") {
        const currentCarries = task.carry_over_count || 0;
        if (currentCarries >= 3) {
          const coachingQuestion = `The task "${task.title}" has been deferred repeatedly. Is it too large, unclear, or no longer important?`;
          setChatHistory(prev => [
            ...prev,
            {
              sender: "ai",
              text: coachingQuestion,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ]);
          setActiveBottomSheet("assistant");
          showToast(`Coaching: "${task.title}" needs reflection. Chat opened.`, "info");
        }

        updatedTasks[taskIndex] = {
          ...task,
          status: "scheduled",
          scheduled_date: TODAY,
          carried_over_from: task.carried_over_from || task.scheduled_date || undefined,
          carry_over_count: currentCarries + 1
        };
      }
    });

    setFlexibleTasks(updatedTasks);
    saveFlexibleTasks(updatedTasks);

    if (logsToRecord.length > 0) {
      const newLogs = [...taskExecutionLogs, ...logsToRecord];
      setTaskExecutionLogs(newLogs);
      saveTaskExecutionLogs(newLogs);
    }
  };

  const runLocalResolution = (staleTasksList: FlexibleTask[] = staleTasks) => {
    // V3.1: Safe defaults only. No keyword heuristics, no behavioral judgment.
    // Execution Engine enforces hard constraints; AI handles intent.
    // Offline: carry_over everything unless the task is explicitly non-recoverable.
    const proposals: AIProposal[] = staleTasksList.map(task => {
      if (
        task.meta?.rigidity === "fixed" ||
        task.meta?.recoverability === "impossible"
      ) {
        return { type: "expire" as const, taskId: task.id, reason: "Offline: non-recoverable constraint — expired." };
      }
      return { type: "carry_over" as const, taskId: task.id, reason: "Offline safe default: carried forward." };
    });

    executeAIProposals(proposals);
    showToast("Offline mode: tasks safely carried forward.", "info");
    setLastReflectedDate(TODAY);
    localStorage.setItem("dayflow_last_reflected_date", TODAY);
  };

  const runAIResolution = async (triggerType: "reflection" | "drift", userNotesVal = "", causeVal = "planning") => {
    setIsProcessingAIReasoning(true);
    try {
      // V3.1: Build compact context — no raw arrays sent to AI
      const backlogTaskCount = flexibleTasks.filter(
        t => t.scheduled_date === null && t.status !== "done"
      ).length;

      const compactContext = buildAICompactContext(
        triggerType,
        behaviorSignals,
        staleTasks,
        daySchedule.items,
        goals,
        triggerType === "drift" ? driftedTask : null,
        backlogTaskCount,
        userNotesVal
      );

      const payload = {
        trigger: triggerType,
        context: compactContext
      };

      const response = await fetch("/api/ai-reasoning", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error("AI reasoning route failed");
      }

      const result = await response.json();
      setAiReasoningResult(result);

      if (result.proposalRisk === "low") {
        executeAIProposals(result.proposals);
        showToast(result.message || "Proposals applied.", "success");
        if (triggerType === "reflection") {
          setLastReflectedDate(TODAY);
          localStorage.setItem("dayflow_last_reflected_date", TODAY);
        } else if (triggerType === "drift") {
          const nextCount = driftPromptCountToday + 1;
          setDriftPromptCountToday(nextCount);
          localStorage.setItem("dayflow_drift_prompt_count", String(nextCount));
          localStorage.setItem("dayflow_drift_prompt_date", TODAY);
          setLastDriftPromptAt(Date.now());
          localStorage.setItem("dayflow_last_drift_prompt_at", String(Date.now()));
        }
      } else {
        setShowConfirmationOverlay(true);
      }
    } catch (e) {
      console.error("AI resolution failed, falling back to local resolver:", e);
      showToast("AI reasoning failed. Using local fallback.", "warning");
      if (triggerType === "reflection") {
        runLocalResolution();
      } else {
        if (driftedTask) {
          handleDelayTask15Minutes(driftedTask.id, driftedTask.start_time);
          const nextCount = driftPromptCountToday + 1;
          setDriftPromptCountToday(nextCount);
          localStorage.setItem("dayflow_drift_prompt_count", String(nextCount));
          localStorage.setItem("dayflow_drift_prompt_date", TODAY);
          setLastDriftPromptAt(Date.now());
          localStorage.setItem("dayflow_last_drift_prompt_at", String(Date.now()));
        }
      }
    } finally {
      setIsProcessingAIReasoning(false);
    }
  };

  const yesterdayCompletionRate = useMemo(() => {
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterdayStr = getLocalTodayStr(yesterdayDate);
    const yesterdayTasks = flexibleTasks.filter(t => t.scheduled_date === yesterdayStr);
    if (yesterdayTasks.length === 0) return 1.0;
    const completedCount = yesterdayTasks.filter(t => t.status === "done").length;
    return completedCount / yesterdayTasks.length;
  }, [flexibleTasks]);

  // Toast Dispatcher Helper
  const showToast = (message: string, type: "success" | "info" | "warning" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  };

  // Calculate Streak count
  const completedStreak = useMemo(() => {
    let streak = 0;
    const todayRef = new Date(selectedDate);
    
    for (let i = 0; i < 30; i++) {
      const target = new Date(todayRef);
      target.setDate(todayRef.getDate() - i);
      const targetStr = target.toISOString().split("T")[0];
      
      const dayTasks = flexibleTasks.filter(t => t.scheduled_date === targetStr);
      if (dayTasks.length > 0) {
        const allDone = dayTasks.every(t => t.status === "done");
        if (allDone) {
          streak++;
        } else {
          break; // streak broke!
        }
      } else {
        // No tasks scheduled, carries over if we already had a streak, or doesn't break
        if (streak > 0) continue;
      }
    }
    return streak;
  }, [flexibleTasks, selectedDate]);

  // Compute stats metrics
  const dashboardStats = useMemo(() => {
    const startOfWeek = new Date(selectedDate);
    const day = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - day + (day === 0 ? -6 : 1)); // Mon
    
    let thisWeekCount = 0;
    for (let i = 0; i < 7; i++) {
      const sim = new Date(startOfWeek);
      sim.setDate(startOfWeek.getDate() + i);
      const str = sim.toISOString().split("T")[0];
      thisWeekCount += flexibleTasks.filter(t => t.scheduled_date === str).length;
    }

    const backlogCount = flexibleTasks.filter(t => t.scheduled_date === null && t.status !== "done").length;

    return {
      thisWeek: thisWeekCount,
      backlog: backlogCount,
      streak: completedStreak
    };
  }, [flexibleTasks, selectedDate, completedStreak]);

  const totalCompletedTasks = useMemo(() => {
    return flexibleTasks.filter(t => t.status === "done").length;
  }, [flexibleTasks]);

  const todayIncompleteTasks = useMemo(() => {
    return flexibleTasks.filter(t => t.scheduled_date === TODAY && t.status !== "done");
  }, [flexibleTasks]);

  const staleTasks = useMemo(() => {
    return flexibleTasks.filter(t => 
      t.scheduled_date !== null && 
      t.scheduled_date < TODAY && 
      t.status !== "done" && 
      t.status !== "skipped" && 
      t.status !== "expired"
    );
  }, [flexibleTasks, TODAY]);


  const calibrationProfile = useMemo(() => {
    const base = calculateCalibrationProfile(flexibleTasks);
    return {
      ...base,
      underestimateRatio: ubmInsights.timeBias
    };
  }, [flexibleTasks, ubmInsights]);

  const calibrationPercentage = useMemo(() => {
    return Math.min(Math.round((calibrationProfile.totalCompletions / 15) * 100), 100);
  }, [calibrationProfile]);

  // Detect Phase 1 → Phase 2 transition and show banner
  useEffect(() => {
    if (prevPhaseRef.current === 1 && calibrationProfile.phase === 2) {
      setShowPhase2Banner(true);
      setTimeout(() => setShowPhase2Banner(false), 8000);
    }
    prevPhaseRef.current = calibrationProfile.phase;
  }, [calibrationProfile.phase]);

  const delayPatterns = useMemo(() => {
    return detectHighDelayPatterns(flexibleTasks);
  }, [flexibleTasks]);

  
  const daySchedule = useMemo(() => {
    const suspendedTypes = getSuspendedRoutineTypesForDate(selectedDate);
    const activeRoutines = routineBlocks.filter(r => !suspendedTypes.has(r.type));

    return generateSchedule(
      selectedDate,
      effectiveFixedBlocks,
      flexibleTasks,
      appSettings.day_start,
      appSettings.day_end,
      null,
      60,
      calibrationProfile,
      delayPatterns,
      activeRoutines
    );
  }, [selectedDate, effectiveFixedBlocks, flexibleTasks, appSettings, calibrationProfile, delayPatterns, routineBlocks, getSuspendedRoutineTypesForDate]);

  const hasMeaningfulContext = useMemo(() => {
    const hasActiveSchedule = daySchedule?.items?.length > 0;
    const hasStaleTasks = staleTasks.length > 0;
    const hasSnapshots = (evalHistory?.length || 0) > 0 || (reflectionEvents?.length || 0) > 0 || (weightLog?.length || 0) > 0;
    return hasActiveSchedule || hasStaleTasks || hasSnapshots;
  }, [daySchedule?.items, staleTasks, evalHistory, reflectionEvents, weightLog]);

  const showReflectionCard = useMemo(() => {
    if (lastReflectedDate === TODAY) return false;
    if (!hasMeaningfulContext) return false;
    const hourNow = new Date().getHours();
    const hasAnyStaleTasks = staleTasks.length > 0;
    const isEvening = hourNow >= 18;
    return hasAnyStaleTasks || isEvening;
  }, [staleTasks, lastReflectedDate, TODAY, hasMeaningfulContext]);

  // These memos depend on daySchedule — must be declared AFTER daySchedule
  const driftedTask = useMemo(() => {
    if (selectedDate !== TODAY) return null;
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    const pastUnmodified = daySchedule.items.find(item => {
      if (item.type !== "flexible") return false;
      if (item.status !== "scheduled") return false;
      
      const endMins = timeToMinutes(item.end_time);
      return nowMins > endMins;
    });

    return pastUnmodified || null;
  }, [daySchedule.items, selectedDate, currentTimeMins]);

  const copilotInviteTopic = useMemo(() => {
    const hourNow = new Date().getHours();

    // 1. Evening reflection check
    if (hourNow >= 17) {
      const incomplete = daySchedule.items.filter(item => item.type === "flexible" && item.status !== "done");
      if (incomplete.length > 0) {
        return "wrap_up" as const;
      }
      return "reflect" as const;
    }

    // 2. Drift check
    if (driftedTask) {
      return "drift" as const;
    }

    // 3. Cognitive Overload check
    const totalMins = daySchedule.items.reduce((acc, item) => {
      if (item.type === "flexible") return acc + (item.duration_minutes || 45);
      const startVal = timeToMinutes(item.start_time);
      const endVal = timeToMinutes(item.end_time);
      return acc + Math.max(30, endVal - startVal);
    }, 0);
    if (totalMins > 240) {
      return "overload" as const;
    }

    // 4. Pending questions
    if (pendingQuestions.length > 0) {
      return "chat_questions" as const;
    }

    return "general" as const;
  }, [daySchedule.items, driftedTask, pendingQuestions]);

  const copilotButtonLabel = useMemo(() => {
    const hourNow = new Date().getHours();

    switch (copilotInviteTopic) {
      case "wrap_up":
        return "Wrap up";
      case "reflect":
        return "Reflect";
      case "drift":
        return "Adjust plan";
      case "overload":
        return "Overload check";
      case "chat_questions":
        return "Let's chat";
      default:
        if (hourNow < 12) {
          return "Good morning";
        } else if (hourNow < 17) {
          return "Day Coach";
        } else {
          return "Good evening";
        }
    }
  }, [copilotInviteTopic]);

  const interventionScore = useMemo(() => {
    if (!driftedTask) return 0;
    
    // 1. Urgency: based on driftedTask importance
    const fullTask = flexibleTasks.find(t => t.id === driftedTask.id);
    const importance = fullTask?.importance || fullTask?.meta?.importance || "important";
    
    let urgency = 0.8;
    if (importance === "critical") {
      urgency = 1.0;
    } else if (importance === "important") {
      urgency = 0.8;
    } else if (importance === "optional") {
      urgency = 0.3;
    }
    
    // 2. Confidence: overall behavior data reliability score
    const confidence = behaviorSignals.reliability.overallScore;
    
    // 3. Receptiveness: 0.15 if user is in a timed session, 0.8 otherwise
    const receptiveness = activeTimer !== null ? 0.15 : 0.8;
    
    return urgency * confidence * receptiveness;
  }, [driftedTask, flexibleTasks, behaviorSignals.reliability.overallScore, activeTimer]);

  const showDriftBanner = useMemo(() => {
    if (!driftedTask) return false;
    if (interventionScore <= 0.7) return false;
    const nowMs = Date.now();
    const ninetyMinsMs = 90 * 60 * 1000;
    if (nowMs - lastDriftPromptAt <= ninetyMinsMs) return false;
    if (driftPromptCountToday >= 3) return false;
    return true;
  }, [driftedTask, interventionScore, lastDriftPromptAt, driftPromptCountToday]);

  const totalPlannedDurationMins = useMemo(() => {
    return daySchedule.items.reduce((acc, item) => {
      if (item.type === "flexible") {
        return acc + item.duration_minutes;
      }
      return acc;
    }, 0);
  }, [daySchedule.items]);

  const energyBudgets = useMemo(() => {
    let highMins = 0;
    let mediumMins = 0;
    daySchedule.items.forEach(item => {
      if (item.type === "flexible" && item.status !== "skipped") {
        if (item.energy_level === "high") {
          highMins += item.duration_minutes;
        } else if (item.energy_level === "medium") {
          mediumMins += item.duration_minutes;
        }
      }
    });
    return {
      high: highMins,
      medium: mediumMins,
      highMax: 240, // 4 hours
      mediumMax: 300, // 5 hours
      highExceeded: highMins > 240,
      mediumExceeded: mediumMins > 300
    };
  }, [daySchedule.items]);

  // Run predictions for all backlog items
  const futurePredictions = useMemo(() => {
    return calculateFuturePredictions(
      flexibleTasks,
      effectiveFixedBlocks,
      appSettings.day_start,
      appSettings.day_end,
      selectedDate,
      calibrationProfile
    );
  }, [flexibleTasks, effectiveFixedBlocks, appSettings, selectedDate, calibrationProfile]);


  // Periodic/On-mount check to remind user to summarize day (after 8 PM/20:00)
  useEffect(() => {
    const checkEveningReminder = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      if (currentHour >= 20) {
        const todayStr = now.toISOString().split("T")[0];
        const lastSummaryDate = localStorage.getItem("dayflow_last_summary_prompt_date");
        
        if (lastSummaryDate !== todayStr) {
          // Check if there are tasks scheduled for today
          const todayTasks = flexibleTasks.filter(t => t.scheduled_date === selectedDate);
          if (todayTasks.length > 0) {
            setShowDaySummaryReminder(true);
            if ("Notification" in window && Notification.permission === "granted") {
              new Notification("Wrap up your day! 🌟", {
                body: "Ready to wrap up today? Discuss your day and plan tomorrow with your AI Copilot.",
                tag: "dayflow-evening-summary"
              });
            }
          }
        }
      }
    };

    checkEveningReminder();
    const interval = setInterval(checkEveningReminder, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [flexibleTasks, selectedDate]);


  // Trigger Notifications Trigger Loop
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    // Clear old timeouts
    notificationTimeouts.current.forEach((timeout) => window.clearTimeout(timeout));
    notificationTimeouts.current = [];

    const nowMins = currentTimeMins;

    daySchedule.items.forEach((item) => {
      const startMins = timeToMinutes(item.start_time);
      const endMins = timeToMinutes(item.end_time);

      // 1. Notify design starting time
      if (startMins > nowMins) {
        const delayMs = (startMins - nowMins) * 60 * 1000;
        const sTimeout = window.setTimeout(() => {
          new Notification(`DayFlow Transition: ${item.title}`, {
            body: `Starting now until ${item.end_time} (${item.duration_minutes} min duration). Stay in flow!`,
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237F77DD' stroke-width='2.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E"
          });
        }, delayMs);
        notificationTimeouts.current.push(sTimeout);
      }

      // 2. Notify wrapping up 5 mins before schedule item ends
      if (endMins - 5 > nowMins) {
        const delayMs = (endMins - 5 - nowMins) * 60 * 1000;
        const eTimeout = window.setTimeout(() => {
          new Notification(`Wrapping Up: ${item.title}`, {
            body: `You have 5 minutes left of your slotted task window. Prepare to transition!`,
            icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23E24B4A' stroke-width='2.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E"
          });
        }, delayMs);
        notificationTimeouts.current.push(eTimeout);
      }
    });

  }, [daySchedule, currentTimeMins]);

  // Interactive Notification 10-Min Pre-alert Loop
  useEffect(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;

    const checkAndNotifyUpcoming = () => {
      const now = new Date();
      const localToday = now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, "0") + "-" + String(now.getDate()).padStart(2, "0");
      if (selectedDate !== localToday) return;

      const nowMins = now.getHours() * 60 + now.getMinutes();

      daySchedule.items.forEach((item) => {
        if (item.type !== "flexible" || item.status === "done") return;

        const startMins = timeToMinutes(item.start_time);
        const timeDiff = startMins - nowMins;

        // Trigger notifications 10 minutes before
        if (timeDiff >= 0 && timeDiff <= 10) {
          const key = `${localToday}-${item.id}`;
          if (!notifiedTasksRef.current[key]) {
            notifiedTasksRef.current[key] = true;

            const notif = new Notification(`Upcoming Task: ${item.title}`, {
              body: `Starts in ${timeDiff} minutes. Click to make adjustment or confirm.`,
              icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237F77DD' stroke-width='2.5'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E",
              requireInteraction: true
            });

            notif.onclick = () => {
              window.focus();
              setNotificationResponseTask(item);
            };
          }
        }
      });
    };

    // Check every 30 seconds
    checkAndNotifyUpcoming();
    const intervalId = setInterval(checkAndNotifyUpcoming, 30000);

    return () => clearInterval(intervalId);
  }, [daySchedule.items, selectedDate]);

  // Dynamic line width setter for bottom navigation menu
  useEffect(() => {
    const setLineWidth = () => {
      const idx = menuItems.findIndex(item => item.value === activeTab);
      if (idx === -1) return;
      const activeItemElement = itemRefs.current[idx];
      const activeTextElement = textRefs.current[idx];

      if (activeItemElement && activeTextElement) {
        const textWidth = activeTextElement.offsetWidth;
        activeItemElement.style.setProperty('--lineWidth', `${textWidth}px`);
      }
    };

    setLineWidth();

    window.addEventListener('resize', setLineWidth);
    return () => {
      window.removeEventListener('resize', setLineWidth);
    };
  }, [activeTab, menuItems]);

  // Request notifications standard flow handler
  const handleRequestNotifications = () => {
    if ("Notification" in window) {
      Notification.requestPermission().then((permission) => {
        setNotificationPermission(permission);
        if (permission === "granted") {
          showToast("You will receive notifications at task intervals!", "success");
          new Notification("DayFlow Engaged", { body: "Smart schedule notifications are now active." });
        } else {
          showToast("Notifications disabled. You won't get interval pings.", "info");
        }
        setShowNotificationPrompt(false);
      });
    } else {
      showToast("Notifications not supported in this browser.", "warning");
      setShowNotificationPrompt(false);
    }
  };

  const handleDismissNotifications = () => {
    localStorage.setItem("dayflow_notif_dismissed", "true");
    setShowNotificationPrompt(false);
  };

  // Add Fixed Block flow
  const handleOpenAddFixed = () => {
    setEditingBlock(null);
    setFixedForm({
      title: "",
      start_time: "09:00",
      end_time: "10:00",
      repeats: "none",
      color: "#E24B4A",
      daysOfWeek: [1, 2, 3, 4, 5]
    });
    setActiveBottomSheet("fixed");
  };

  const handleOpenEditFixed = (block: FixedBlock) => {
    setEditingBlock(block);
    setFixedForm({
      title: block.title,
      start_time: block.start_time,
      end_time: block.end_time,
      repeats: block.repeats,
      color: block.color || "#E24B4A",
      daysOfWeek: block.daysOfWeek || [1, 2, 3, 4, 5]
    });
    setActiveBottomSheet("fixed");
  };

  const handleSubmitFixed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedForm.title.trim()) return;

    if (editingBlock) {
      const updated = fixedBlocks.map((b) => 
        b.id === editingBlock.id 
          ? { ...b, title: fixedForm.title, start_time: fixedForm.start_time, end_time: fixedForm.end_time, repeats: fixedForm.repeats, color: fixedForm.color, daysOfWeek: fixedForm.daysOfWeek }
          : b
      );
      handleUpdateFixed(updated);
      showToast("Fixed time block updated!", "success");
    } else {
      const newBlock: FixedBlock = {
        id: `fixed-${Date.now()}`,
        title: fixedForm.title.trim(),
        start_time: fixedForm.start_time,
        end_time: fixedForm.end_time,
        repeats: fixedForm.repeats,
        locked: true,
        date: selectedDate,
        color: fixedForm.color,
        daysOfWeek: fixedForm.daysOfWeek
      };
      handleUpdateFixed([...fixedBlocks, newBlock]);
      showToast("Fixed time block locked in!", "success");
    }
    triggerHaptic(30);
    setActiveBottomSheet(null);
  };

  // Add/Edit Flexible Task flow
  const handleOpenAddFlexible = (defaultToToday = false) => {
    setEditingTask(null);
    setClassificationFeedback(null);
    setIsMetadataOpen(false);
    setFlexibleForm({
      title: "",
      duration_minutes: 45,
      hasDeadline: false,
      deadline: "",
      energy_level: "medium",
      scheduled_date: defaultToToday ? selectedDate : "",
      importance: "important",
      task_flexibility: "movable",
      category: "personal",
      rigidity: "flexible",
      recoverability: "easy",
      dependency_chain: "none",
      progress_type: "binary",
      deadline_pressure: "none",
      blocked_by: [],
      blocks: []
    });
    setActiveBottomSheet("flexible");
  };

  const handleOpenEditFlexible = (task: FlexibleTask) => {
    setEditingTask(task);
    setClassificationFeedback(null);
    setIsMetadataOpen(false);
    const result = classifyTaskLocally(task.title, task.description || "", goals);
    const meta = task.meta || result.meta;

    setFlexibleForm({
      title: task.title,
      duration_minutes: task.duration_minutes,
      hasDeadline: !!task.deadline,
      deadline: task.deadline || "",
      energy_level: task.energy_level,
      scheduled_date: task.scheduled_date || "",
      importance: meta.importance || task.importance || "important",
      task_flexibility: meta.rigidity === "fixed" ? "fixed" : meta.rigidity === "flexible" ? "optional" : "movable",
      category: meta.category,
      rigidity: meta.rigidity,
      recoverability: meta.recoverability,
      dependency_chain: meta.dependency_chain,
      progress_type: meta.progress_type,
      deadline_pressure: meta.deadline_pressure,
      blocked_by: task.blocked_by || [],
      blocks: task.blocks || []
    });
    setActiveBottomSheet("flexible");
  };

  const handleSubmitFlexible = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flexibleForm.title.trim()) return;

    const titleVal = flexibleForm.title.trim();
    const durationVal = Number(flexibleForm.duration_minutes);
    const deadlineVal = flexibleForm.hasDeadline ? flexibleForm.deadline : null;
    const energyVal = flexibleForm.energy_level;
    const scheduledDateVal = flexibleForm.scheduled_date || null;

    const localResult = classifyTaskLocally(titleVal, "", goals);
    const task_nature = localResult.meta.task_nature || "one_time";

    const meta: TaskMeta = {
      category: flexibleForm.category,
      rigidity: flexibleForm.rigidity,
      importance: flexibleForm.importance,
      recoverability: flexibleForm.recoverability,
      dependency_chain: flexibleForm.dependency_chain,
      progress_type: flexibleForm.progress_type,
      deadline_pressure: flexibleForm.deadline_pressure,
      task_nature
    };

    // Save this mapping into vocabulary memory database
    try {
      const vocabStr = localStorage.getItem("dayflow_vocab_map") || "{}";
      const vocab = JSON.parse(vocabStr);
      vocab[titleVal.toLowerCase()] = meta;
      localStorage.setItem("dayflow_vocab_map", JSON.stringify(vocab));
    } catch (err) {
      console.warn("Failed to write to vocabulary map:", err);
    }

    if (editingTask) {
      const updated = flexibleTasks.map((t) => 
        t.id === editingTask.id 
          ? { 
              ...t, 
              title: titleVal, 
              duration_minutes: durationVal, 
              deadline: deadlineVal, 
              energy_level: energyVal,
              scheduled_date: scheduledDateVal,
              importance: flexibleForm.importance,
              task_flexibility: flexibleForm.task_flexibility,
              task_nature,
              meta,
              blocked_by: flexibleForm.blocked_by,
              blocks: flexibleForm.blocks
            }
          : t
      );
      handleUpdateFlexible(updated);
      showToast("Flexible task updated!", "success");
    } else {
      const newTask: FlexibleTask = {
        id: `flex-${Date.now()}`,
        title: titleVal,
        duration_minutes: durationVal,
        deadline: deadlineVal,
        energy_level: energyVal,
        status: scheduledDateVal ? "scheduled" : "backlog",
        scheduled_date: scheduledDateVal,
        importance: flexibleForm.importance,
        task_flexibility: flexibleForm.task_flexibility,
        task_nature,
        meta,
        blocked_by: flexibleForm.blocked_by,
        blocks: flexibleForm.blocks
      };
      handleUpdateFlexible([...flexibleTasks, newTask]);
      showToast(scheduledDateVal ? `Task added to today's schedule!` : "Task added to backlog!", "success");
    }
    triggerHaptic(35);
    setActiveBottomSheet(null);
  };

  // Unified AI Copilot (Ask AI) Entry & Flow
  const handleOpenAICopilot = () => {
    // Determine context
    const todayTasks = daySchedule.items || [];
    const scheduledCount = todayTasks.length;
    const backlog = flexibleTasks.filter(t => t.status === "backlog");
    const backlogCount = backlog.length;
    
    // Check if there are tasks in the backlog pending for a while (>3 days)
    let overdueTask: FlexibleTask | null = null;
    let overdueDays = 0;
    const nowMs = Date.now();
    for (const t of flexibleTasks) {
      if (t.status === "backlog") {
        const idParts = t.id.split("-");
        if (idParts.length >= 2) {
          const timestamp = parseInt(idParts[1], 10);
          if (!isNaN(timestamp)) {
            const diffDays = Math.floor((nowMs - timestamp) / (1000 * 60 * 60 * 24));
            if (diffDays >= 3) {
              overdueTask = t;
              overdueDays = diffDays;
              break;
            }
          }
        }
      }
    }

    // Check time of day
    const hours = new Date().getHours();
    let timeOfDay = "day";
    if (hours < 12) timeOfDay = "morning";
    else if (hours < 17) timeOfDay = "afternoon";
    else timeOfDay = "evening";

    let greeting = "";
    
    switch (copilotInviteTopic) {
      case "wrap_up": {
        const incomplete = todayTasks.filter(item => item.type === "flexible" && item.status !== "done");
        const listStr = incomplete.map(t => `"${t.title}"`).join(", ");
        greeting = `Hey! 🌙\n\nI noticed you still have some unfinished tasks today: ${listStr}.\n\nWhat happened? Busy day? Let me know, and we can move them to tomorrow or reschedule them!`;
        break;
      }
      case "reflect": {
        greeting = `Good evening! 🌙\n\nYou've finished all your scheduled items for today. Great job! Ready to wind down, or is there something you want to schedule for tomorrow?`;
        break;
      }
      case "drift": {
        if (driftedTask) {
          greeting = `Hey! 👋\n\nI noticed that "${driftedTask.title}" has drifted past its scheduled time. Did you complete it, or should we adjust the schedule to push it later?`;
        } else {
          greeting = `Hey! 👋\n\nIt looks like some tasks slipped. Let's adjust your timeline to get you back on track.`;
        }
        break;
      }
      case "overload": {
        const totalMins = todayTasks.reduce((acc, item) => {
          if (item.type === "flexible") return acc + (item.duration_minutes || 45);
          const startVal = timeToMinutes(item.start_time);
          const endVal = timeToMinutes(item.end_time);
          return acc + Math.max(30, endVal - startVal);
        }, 0);
        const totalHours = (totalMins / 60).toFixed(1);
        greeting = `Good ${timeOfDay}! ⚠️\n\nYour day is looking overloaded with ~${totalHours} hours planned. Let's look at pacing your schedule or shifting optional items to keep your load sustainable.`;
        break;
      }
      case "chat_questions": {
        greeting = `Good ${timeOfDay}! 👋\n\nHow's your day going? Let me know if you want to adjust anything.`;
        break;
      }
      default: {
        if (scheduledCount === 0 && backlogCount === 0) {
          greeting = `Good ${timeOfDay}! ☀️\n\nYou're all clear today! No tasks scheduled. What would you like to do?\n\n• Schedule something new\n• Or just relax`;
        } else if (scheduledCount >= 4 && backlogCount > 0) {
          const totalMins = todayTasks.reduce((acc, item) => {
            if (item.type === "flexible") return acc + (item.duration_minutes || 45);
            const startVal = timeToMinutes(item.start_time);
            const endVal = timeToMinutes(item.end_time);
            return acc + Math.max(30, endVal - startVal);
          }, 0);
          const totalHours = (totalMins / 60).toFixed(1);
          greeting = `Good ${timeOfDay}! 👋\n\nYou have a packed day:\n• ${scheduledCount} tasks scheduled (~${totalHours} hours)\n• ${backlogCount} pending tasks in your backlog.\n\nWant to squeeze any in today, or just focus on what you already have?`;
        } else if (scheduledCount < 4 && backlogCount > 0) {
          greeting = `Good ${timeOfDay}! 💪\n\nYou have some breathing room today:\n• ${scheduledCount} tasks scheduled\n• ${backlogCount} pending tasks waiting.\n\nFeeling productive? Want to knock some of these out? Or prefer to keep it light?`;
        } else {
          greeting = `Good ${timeOfDay}! 👋\n\nHow's your day going? Let me know if you want to add a task, reschedule something, or check your timeline.`;
        }
        break;
      }
    }

    if (pendingQuestions.length > 0) {
      const nextQ = pendingQuestions[0];
      const remaining = pendingQuestions.slice(1);
      setPendingQuestions(remaining);
      localStorage.setItem("dayflow_pending_questions", JSON.stringify(remaining));
      setInjectedQuestionThisSession(true);
      greeting = `${greeting}\n\nAlso, quick question — ${nextQ.question.charAt(0).toLowerCase() + nextQ.question.slice(1)}`;
    }

    setChatHistory([{ sender: "ai", text: greeting }]);
    setCopilotInput("");
    setCopilotError(null);
    setProposedChanges(null);
    setCopilotMinimized(false);
    setActiveBottomSheet("assistant");
  };

  const handleStopCopilot = () => {
    if (copilotAbortControllerRef.current) {
      copilotAbortControllerRef.current.abort();
      copilotAbortControllerRef.current = null;
    }
    setIsProcessingCopilot(false);
    stopCopilotLoadingSimulation();
    triggerHaptic(20);
  };

  const handleResetCopilotChat = () => {
    if (copilotAbortControllerRef.current) {
      copilotAbortControllerRef.current.abort();
      copilotAbortControllerRef.current = null;
    }
    setIsProcessingCopilot(false);
    stopCopilotLoadingSimulation();
    setCopilotError(null);
    setProposedChanges(null);
    setCopilotMinimized(false);

    const hour = new Date().getHours();
    const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
    const scheduledCount = daySchedule.items.length;
    const backlogCount = flexibleTasks.filter(t => t.status !== "done" && t.scheduled_date === null).length;

    let greeting = "";
    
    // Proactive greeting mentioning stale tasks and UBM insights when category confidence is high
    const firstStale = staleTasks[0];
    if (firstStale) {
      const cat = firstStale.category || getTaskCategory(firstStale.title);
      const conf = ubmInsights.categoryConfidence[cat] || 0;
      const successRate = ubmInsights.categorySuccess[cat] || 1;
      
      if (conf > 0.6 && successRate < 0.5) {
        greeting = `Good ${timeOfDay}! 👋\n\nI noticed "${firstStale.title}" is stale. Since you've struggled with "${cat}" tasks recently (completion rate: ${Math.round(successRate * 100)}%), would you like to backlog this task or break it into smaller steps today?`;
      } else {
        greeting = `Good ${timeOfDay}! 👋\n\nWelcome back. You have some outstanding items from yesterday, including "${firstStale.title}". Should we schedule it for today or park it back in the backlog?`;
      }
    } else if (scheduledCount === 0) {
      greeting = `Good ${timeOfDay}! ☀️\n\nYou're all clear today! No tasks scheduled. What would you like to do?\n\n• Schedule something new\n• Or just relax`;
    } else if (scheduledCount > 4) {
      const totalMins = daySchedule.items.reduce((acc, item) => {
        const startVal = timeToMinutes(item.start_time);
        const endVal = timeToMinutes(item.end_time);
        return acc + Math.max(30, endVal - startVal);
      }, 0);
      const totalHours = (totalMins / 60).toFixed(1);
      greeting = `Good ${timeOfDay}! 👋\n\nYou have a packed day:\n• ${scheduledCount} tasks scheduled (~${totalHours} hours)\n• ${backlogCount} pending tasks in your backlog.\n\nWant to squeeze any in today, or just focus on what you already have?`;
    } else if (scheduledCount < 4 && backlogCount > 0) {
      greeting = `Good ${timeOfDay}! 💪\n\nYou have some breathing room today:\n• ${scheduledCount} tasks scheduled\n• ${backlogCount} pending tasks waiting.\n\nFeeling productive? Want to knock some of these out? Or prefer to keep it light?`;
    } else {
      greeting = `Good ${timeOfDay}! 👋\n\nHow's your day going? Let me know if you want to add a task, reschedule something, or clear your schedule!`;
    }

    setChatHistory([{ sender: "ai", text: greeting }]);
    setCopilotInput("");
    triggerHaptic(10);
  };

  const handleSendCopilotMessage = async (textOverride?: any, historyOverride?: { sender: "user" | "ai"; text: string; questionnaire?: any; questionnaireSubmitted?: boolean }[]) => {
    const isOverride = typeof textOverride === "string";
    const messageText = isOverride ? textOverride.trim() : copilotInput.trim();
    if (!messageText && !copilotImage) return;

    const displayText = messageText || (copilotImage ? "[Image attached]" : "");

    // Intercept gym / workout / project plan requests to show the interactive wizard offline or quick
    const lowerText = messageText.toLowerCase();
    const isWorkoutPlanRequest = 
      lowerText.includes("workout plan") || 
      lowerText.includes("gym plan") || 
      lowerText.includes("exercise plan") || 
      lowerText.includes("fitness plan") || 
      (lowerText.includes("create") && lowerText.includes("workout"));

    const isProjectPlanRequest = 
      lowerText.includes("project plan") || 
      lowerText.includes("study plan") || 
      lowerText.includes("exam plan") || 
      lowerText.includes("course plan") || 
      lowerText.includes("landing page plan") || 
      lowerText.includes("case study plan") || 
      (lowerText.includes("create") && (lowerText.includes("plan") || lowerText.includes("schedule")));

    if ((isWorkoutPlanRequest || isProjectPlanRequest) && !historyOverride) {
      if (historyOverride) {
        setChatHistory([...historyOverride, { sender: "user", text: displayText }]);
      } else {
        setChatHistory(prev => [...prev, { sender: "user", text: displayText }]);
      }
      setCopilotInput("");
      setCopilotImage(null);

      const questionnaireMsg = isWorkoutPlanRequest ? {
        sender: "ai" as const,
        text: "Sure! Let's tailor a customized fitness and scheduling plan for you. Please answer these quick questions to generate your specific workouts and goal targets:",
        questionnaire: {
          type: "workout_plan",
          title: "Personalized Fitness Plan Builder",
          questions: [
            {
              id: "workout_type",
              label: "What kind of workout plan do you want?",
              type: "select" as const,
              options: ["Strength & Muscle Gaining", "Weight Loss & Cardio", "General Fitness & Health", "Yoga & Flexibility"],
              value: "Strength & Muscle Gaining"
            },
            {
              id: "weight_goal",
              label: "What is your primary weight or body goal?",
              type: "select" as const,
              options: ["Build Muscle", "Burn Fat / Lose Weight", "Improve Endurance", "Maintain & Tone"],
              value: "Build Muscle"
            },
            {
              id: "goal_details",
              label: "What is your target goal details? (e.g. lose 10 lbs)",
              type: "text" as const,
              placeholder: "e.g. bench press 80kg, lose 5kg, run 10k",
              value: ""
            },
            {
              id: "frequency",
              label: "How many days per week do you want to workout?",
              type: "select" as const,
              options: ["2 days/week", "3 days/week", "4 days/week", "5 days/week"],
              value: "3 days/week"
            }
          ]
        }
      } : {
        sender: "ai" as const,
        text: "I can help you build a structured milestone plan for that. Let's configure your task preferences first:",
        questionnaire: {
          type: "project_plan",
          title: "Personalized Project Plan Builder",
          questions: [
            {
              id: "project_type",
              label: "What category does this project/study fall under?",
              type: "select" as const,
              options: ["Design & Figma Layout", "Coding & Frontend Dev", "Writing & Case Studies", "Exam prep & Study review"],
              value: "Design & Figma Layout"
            },
            {
              id: "session_count",
              label: "How many sub-task sessions should we break it into?",
              type: "select" as const,
              options: ["2 sub-tasks", "3 sub-tasks", "4 sub-tasks"],
              value: "3 sub-tasks"
            },
            {
              id: "session_duration",
              label: "How long should each task session be?",
              type: "select" as const,
              options: ["30 minutes", "45 minutes", "60 minutes", "90 minutes"],
              value: "45 minutes"
            },
            {
              id: "project_goal_name",
              label: "What is the primary goal metric or target?",
              type: "text" as const,
              placeholder: "e.g. Finish portfolio site, submit thesis, score 90%",
              value: ""
            }
          ]
        }
      };

      setTimeout(() => {
        setChatHistory(prev => [...prev, questionnaireMsg]);
      }, 500);
      return;
    }

    // Layer 0: Local Deterministic Parser
    const localResult = parseDeterministicCommand(messageText || "", daySchedule.items, flexibleTasks, selectedDate);
    if (localResult.status === "resolved") {
      if (historyOverride) {
        setChatHistory([...historyOverride, { sender: "user", text: displayText }]);
      } else {
        setChatHistory(prev => [...prev, { sender: "user", text: displayText }]);
      }
      if (!isOverride) {
        setCopilotInput("");
      }
      setCopilotImage(null);
      executeParsedCommand(localResult.command);
      setIsProcessingCopilot(false);
      triggerHaptic(25);
      return;
    } else if (localResult.status === "uncertain") {
      if (historyOverride) {
        setChatHistory([...historyOverride, { sender: "user", text: displayText }]);
      } else {
        setChatHistory(prev => [...prev, { sender: "user", text: displayText }]);
      }
      if (!isOverride) {
        setCopilotInput("");
      }
      setCopilotImage(null);

      const options = localResult.options || [];
      const questionnaireMsg = {
        sender: "ai" as const,
        text: localResult.question,
        questionnaire: {
          type: "disambiguate_command",
          title: "Disambiguation Questionnaire",
          action: localResult.action,
          candidates: options,
          mins: localResult.mins,
          newTime: localResult.newTime,
          questions: [
            {
              id: "selected_task",
              label: "Please specify the task:",
              type: "select" as const,
              options: options.map(o => `${o.title} [${o.id}]`),
              value: options.length > 0 ? `${options[0].title} [${options[0].id}]` : ""
            }
          ]
        }
      };

      setTimeout(() => {
        setChatHistory(prev => [...prev, questionnaireMsg]);
      }, 500);
      setIsProcessingCopilot(false);
      triggerHaptic(25);
      return;
    }

    // Layer 3: Circuit Breaker Availability check
    if (!isAIServiceAvailable()) {
      if (historyOverride) {
        setChatHistory([...historyOverride, { sender: "user", text: displayText }]);
      } else {
        setChatHistory(prev => [...prev, { sender: "user", text: displayText }]);
      }
      if (!isOverride) {
        setCopilotInput("");
      }
      setCopilotImage(null);
      
      const offlineRes = adjustScheduleOffline(messageText || "", daySchedule.items, flexibleTasks, selectedDate);
      if (offlineRes.changes && offlineRes.changes.length > 0) {
        setProposedChanges(offlineRes.changes);
      }
      setChatHistory(prev => [...prev, {
        sender: "ai",
        text: injectPendingQuestionTextIfNeeded(`${offlineRes.message} (Local Scheduler Mode — AI is temporarily offline due to high demand)`)
      }]);
      setIsProcessingCopilot(false);
      return;
    }

    if (historyOverride) {
      setChatHistory([...historyOverride, { sender: "user", text: displayText }]);
    } else {
      setChatHistory(prev => [...prev, { sender: "user", text: displayText }]);
    }

    if (!isOverride) {
      setCopilotInput("");
    }
    const imagePayload = copilotImage ? { base64: copilotImage.base64, mimeType: copilotImage.mimeType } : undefined;
    setCopilotImage(null);
    setIsProcessingCopilot(true);
    setCopilotError(null);
    setProposedChanges(null);
    startCopilotLoadingSimulation();

    let data;
    let success = false;
    let attempt = 0;
    const MAX_RETRIES = 3;

    while (attempt < MAX_RETRIES) {
      const controller = new AbortController();
      copilotAbortControllerRef.current = controller;
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, getTimeoutForOperation("copilot"));

      try {
        // V3.1: Replace raw task arrays with compact text summaries
        const { scheduleSummary, pendingSummary } = buildCopilotScheduleSummary(
          daySchedule.items,
          flexibleTasks.filter(t => t.status !== "done"),
          selectedDate
        );
        const response = await fetch("/api/adjust-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            userText: messageText || "Please analyze the attached image and extract schedule/workout/weight info.",
            scheduleSummary,
            pendingSummary,
            today: selectedDate,
            image: imagePayload,
            routineBlocksSummary: routineBlocks.map(r => `${r.title} (${r.startTime}-${r.endTime}, rigidity: ${r.rigidity}, type: ${r.type}, days: ${r.daysOfWeek.join(",")})`).join("\n"),
            calendarEventsSummary: calendarEvents.map(e => `${e.title} (${e.startDate} to ${e.endDate}, type: ${e.type})`).join("\n")
          })
        });
        clearTimeout(timeoutId);

        if (response.status === 503 || response.status === 429) {
          throw { name: "RetriableError", status: response.status, message: `Status ${response.status}` };
        }

        if (!response.ok) {
          let errMsg = "API failed";
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch (_) {}
          throw new Error(errMsg);
        }

        data = await response.json();
        success = true;
        recordAISuccess();
        break; // break retry loop
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          console.warn("AI Copilot request aborted.");
          data = {
            changes: [],
            message: "Request cancelled by user."
          };
          setCopilotError("Plan formulation request was stopped. How can I help you next?");
          break;
        } else if ((err.name === "RetriableError" || err.status === 503 || err.status === 429) && attempt < MAX_RETRIES - 1) {
          attempt++;
          setCopilotRetryAttempt(attempt);
          const backoff = 1500 * attempt + Math.random() * 800;
          console.warn(`Retrying AI Copilot request in ${Math.round(backoff)}ms (Attempt ${attempt}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        } else {
          console.warn("AI Copilot API failed:", err);
          recordAIFailure();
          const offlineRes = adjustScheduleOffline(messageText, daySchedule.items, flexibleTasks, selectedDate);
          data = offlineRes;
          setCopilotError(offlineRes.changes.length > 0 ? null : `DayFlow AI service failed: ${err.message}`);
          break;
        }
      } finally {
        copilotAbortControllerRef.current = null;
      }
    }

    setIsProcessingCopilot(false);
    stopCopilotLoadingSimulation();
    
    if (data.clarificationNeeded && data.clarificationQuestions && data.clarificationQuestions.length > 0) {
      const questionnaireMsg = {
        sender: "ai" as const,
        text: data.message || "I need a few clarifications to structure a customized plan. Please answer these quick questions:",
        questionnaire: {
          type: "general",
          title: "Plan Setup Wizard",
          questions: data.clarificationQuestions.map((q: any) => ({
            id: q.id,
            label: q.label,
            type: q.type || "text",
            options: q.options || [],
            placeholder: q.placeholder || "",
            value: q.type === "select" ? (q.options?.[0] || "") : ""
          }))
        }
      };
      setChatHistory(prev => [...prev, questionnaireMsg]);
    } else {
      const durationProposals = data.changes ? data.changes.filter((c: any) => c.action === "propose_actual_time") : [];
      const otherChanges = data.changes ? data.changes.filter((c: any) => c.action !== "propose_actual_time") : [];

      if (otherChanges.length > 0) {
        setProposedChanges(otherChanges);
      }

      if (durationProposals.length > 0) {
        const newMsgs: any[] = [];
        durationProposals.forEach((prop: any) => {
          const matchedTask = flexibleTasks.find(t => t.id === prop.taskId);
          const taskTitle = matchedTask ? matchedTask.title : "Task";
          newMsgs.push({
            sender: "ai" as const,
            text: prop.reasoning || data.message || `Should we log the actual time for ${taskTitle}?`,
            durationConfirmation: {
              taskId: prop.taskId,
              taskTitle: taskTitle,
              proposedDurationMinutes: prop.proposedDurationMinutes,
              confidence: prop.confidence,
              reasoning: prop.reasoning,
              isResolved: false,
              resolvedAction: null
            }
          });
        });
        setChatHistory(prev => [...prev, ...newMsgs]);
      } else {
        setChatHistory(prev => [...prev, { sender: "ai", text: injectPendingQuestionTextIfNeeded(data.message || "I couldn't figure out any adjustments for that request. Try saying something like 'add task gym' or 'postpone work'.") }]);
      }
    }
    triggerHaptic(25);
  };

  const generateLocalFitnessPlan = (
    workoutType: string,
    weightGoal: string,
    goalDetails: string,
    frequency: string
  ) => {
    const changes: any[] = [];
    const numDays = parseInt(frequency) || 3;
    
    // 1. Create a Goal
    const goalTitle = `Streak: ${workoutType}`;
    changes.push({
      action: "add_goal",
      goalTitle: goalTitle,
      goalCategory: "fitness",
      goalMetric: "sessions",
      goalTarget: numDays * 4, // 4 weeks
      goalKeywords: ["workout", "gym", "stretch", "run", "yoga"],
      reasoning: `Created tracking goal for your ${workoutType} plan.`
    });

    // 2. Create the workout tasks based on the type
    if (workoutType.includes("Strength")) {
      const routines = [
        { title: "🏋️ Push Day (Chest/Shoulders/Triceps)", desc: "Dumbbell Bench Press: 3x10\nOverhead Press: 3x8\nTricep Pushdowns: 3x12\nLateral Raises: 3x15" },
        { title: "🏋️ Pull Day (Back/Biceps)", desc: "Lat Pulldowns: 3x10\nBarbell Rows: 3x8\nBicep Curls: 3x12\nFace Pulls: 3x15" },
        { title: "🏋️ Leg Day (Squats/Hamstrings)", desc: "Squats: 3x10\nRomanian Deadlifts: 3x10\nLeg Extensions: 3x12\nCalf Raises: 4x15" }
      ];
      for (let i = 0; i < Math.min(numDays, routines.length); i++) {
        changes.push({
          action: "add",
          newTaskTitle: routines[i].title,
          newTaskDuration: 60,
          newTaskDescription: routines[i].desc,
          reasoning: `Strength training routine #${i+1}`
        });
      }
    } else if (workoutType.includes("Weight Loss")) {
      const routines = [
        { title: "🏃 HIIT Cardio Workout", desc: "Treadmill Sprints: 5 rounds\nJumping Jacks: 3x45s\nBurpees: 3x30s\nMountain Climbers: 3x45s" },
        { title: "🔥 Full Body Conditioning", desc: "Kettlebell Swings: 3x15\nPush-ups: 3x12\nBodyweight Squats: 3x20\nPlank: 3x60s" },
        { title: "🏃 Active Recovery Cardio", desc: "Light Jog / Incline Walk: 30 mins\nFoam Rolling & Stretching: 10 mins" }
      ];
      for (let i = 0; i < Math.min(numDays, routines.length); i++) {
        changes.push({
          action: "add",
          newTaskTitle: routines[i].title,
          newTaskDuration: 45,
          newTaskDescription: routines[i].desc,
          reasoning: `Cardio conditioning routine #${i+1}`
        });
      }
    } else if (workoutType.includes("Yoga")) {
      const routines = [
        { title: "🧘 Vinyasa Yoga Flow", desc: "Sun Salutations: 5 rounds\nWarrior poses: 10 mins\nBalance poses (Tree/Crow): 5 mins\nSavasana deep rest: 5 mins" },
        { title: "🧘 Deep Stretch & Mobility", desc: "Hamstring stretch: 2 mins per side\nHip openers (Pigeon pose): 3 mins per side\nSpinal twists: 2 mins" }
      ];
      for (let i = 0; i < Math.min(numDays, routines.length); i++) {
        changes.push({
          action: "add",
          newTaskTitle: routines[i].title,
          newTaskDuration: 30,
          newTaskDescription: routines[i].desc,
          reasoning: `Flexibility and mobility flow #${i+1}`
        });
      }
    } else {
      // General Fitness
      const routines = [
        { title: "💪 Functional Strength & Core", desc: "Goblet Squats: 3x12\nDumbbell Rows: 3x10\nPlank: 3x45s\nDeadbugs: 3x12" },
        { title: "🏃 Cardio & Agility Training", desc: "Light Jog: 20 mins\nAgility Ladder / Jump Rope: 10 mins\nStretching: 5 mins" }
      ];
      for (let i = 0; i < Math.min(numDays, routines.length); i++) {
        changes.push({
          action: "add",
          newTaskTitle: routines[i].title,
          newTaskDuration: 50,
          newTaskDescription: routines[i].desc,
          reasoning: `General fitness routine #${i+1}`
        });
      }
    }

    return {
      changes,
      message: `I've mapped out a local ${workoutType} routine targeting your ${weightGoal} goals. You will find your newly generated specific workout items in the proposed changes below, ready to be added to your schedule/backlog.`
    };
  };

  const generateLocalProjectPlan = (
    projectType: string,
    sessionCountStr: string,
    sessionDurationStr: string,
    goalName: string
  ) => {
    const changes: any[] = [];
    const numSessions = parseInt(sessionCountStr) || 3;
    const duration = parseInt(sessionDurationStr) || 45;
    const targetGoal = goalName || "Project milestones";

    // 1. Create a Goal
    changes.push({
      action: "add_goal",
      goalTitle: `Milestones: ${targetGoal}`,
      goalCategory: projectType.includes("Study") || projectType.includes("Exam") ? "academic" : "project",
      goalMetric: "sessions",
      goalTarget: numSessions,
      goalKeywords: ["design", "figma", "code", "dev", "portfolio", "write", "thesis", "study", "exam", "prep"],
      reasoning: `Goal tracker created for your ${projectType} plan.`
    });

    // 2. Add sub-task sessions
    const subTasks = projectType.includes("Design") ? [
      { title: "🎨 Layout Wireframing & Inspiration", desc: "Collect design components\nSketch layout wireframes on paper or Figma" },
      { title: "🎨 High-Fidelity UI Design Mockup", desc: "Design color palette & fonts\nCreate main components and frames" },
      { title: "🎨 Feedback & Design Hand-off", desc: "Check spacing & margins\nExport assets for development" }
    ] : projectType.includes("Coding") ? [
      { title: "💻 Setup Project & Core UI Structure", desc: "Initialize boilerplate\nBuild HTML semantic markup & basic stylesheet" },
      { title: "💻 Component Logic & Dynamic Interactions", desc: "Implement state handlers\nVerify local interactions & click paths" },
      { title: "💻 Testing & Responsive CSS Refinements", desc: "Check layout on mobile viewports\nRun build & lint checks" }
    ] : projectType.includes("Writing") ? [
      { title: "✍️ Outline Structure & Gathering Data", desc: "List key takeaways & problems solved\nOrganize drafts and raw notes" },
      { title: "✍️ Write Core Content & Case Analysis", desc: "Draft solution descriptions\nAdd screenshots or mockups" },
      { title: "✍️ Final Proofreading & Polishing", desc: "Check grammar & style\nFormat for portfolio listing" }
    ] : [
      // Exam prep / Study
      { title: "📚 Review Lecture Material & Concepts", desc: "Read notes & slides\nHighlight formulas or core keywords" },
      { title: "📚 Practice Problems & Core Drills", desc: "Attempt 3-5 practice questions\nIdentify topics needing review" },
      { title: "📚 Summary Cards & Final Recall", desc: "Create flashcards or notes summary\nSelf-test on major concepts" }
    ];

    for (let i = 0; i < Math.min(numSessions, subTasks.length); i++) {
      changes.push({
        action: "add",
        newTaskTitle: subTasks[i].title,
        newTaskDuration: duration,
        newTaskDescription: subTasks[i].desc,
        reasoning: `${projectType} phase #${i+1}`
      });
    }

    return {
      changes,
      message: `I've prepared a local ${projectType} milestone outline. The specific tasks have been structured and are presented below, ready to be scheduled.`
    };
  };

  const handleSubmitQuestionnaire = async (msgIdx: number) => {
    const msg = chatHistory[msgIdx];
    if (!msg || !msg.questionnaire) return;

    // Mark it as submitted
    const updatedHistory = [...chatHistory];
    updatedHistory[msgIdx] = { ...msg, questionnaireSubmitted: true };
    setChatHistory(updatedHistory);
    
    // Gather selections
    const answers = msg.questionnaire.questions.reduce((acc: any, q: any) => {
      acc[q.id] = q.value;
      return acc;
    }, {} as Record<string, string>);

    if (msg.questionnaire.type === "disambiguate_command") {
      const selectedStr = answers["selected_task"];
      const candidate = msg.questionnaire.candidates.find((c: any) => `${c.title} [${c.id}]` === selectedStr);
      if (candidate) {
        const resolvedCommand: ParsedCommand = {
          action: msg.questionnaire.action,
          taskId: candidate.id,
          taskTitle: candidate.title,
          mins: msg.questionnaire.mins,
          newTime: msg.questionnaire.newTime
        };
        // Print user selection bubble
        const userMsg = { sender: "user" as const, text: `I selected "${candidate.title}".` };
        setChatHistory([...updatedHistory, userMsg]);
        executeParsedCommand(resolvedCommand);
        return;
      }
    }

    let userSummary = "";
    let promptForAI = "";
    
    if (msg.questionnaire.type === "workout_plan") {
      const workoutType = answers["workout_type"];
      const weightGoal = answers["weight_goal"];
      const goalDetails = answers["goal_details"] || "General fitness";
      const frequency = answers["frequency"];
      userSummary = `Configured: ${workoutType} plan, focusing on ${weightGoal} (${goalDetails}) for ${frequency}.`;
      promptForAI = `Generate a customized fitness schedule plan. User options:
- Type: ${workoutType}
- Focus: ${weightGoal}
- Details: ${goalDetails}
- Frequency: ${frequency}

Please create 3 or 4 relevant scheduled/backlog tasks representing these specific workout sessions (e.g. Upper Body, Lower Body) with 45-60 min duration and individual workout exercises inside the description (one per line). Also add a target goal for tracking fitness progress.`;
    } else if (msg.questionnaire.type === "project_plan") {
      const projectType = answers["project_type"];
      const sessionCount = answers["session_count"];
      const sessionDuration = answers["session_duration"];
      const goalName = answers["project_goal_name"] || "General milestone";
      userSummary = `Configured: ${projectType} milestone plan, scheduling ${sessionCount} tasks at ${sessionDuration} each, targeting ${goalName}.`;
      promptForAI = `Generate a customized project plan. User options:
- Type: ${projectType}
- Sessions: ${sessionCount}
- Duration: ${sessionDuration}
- Goal: ${goalName}

Please create the specified number of backlog tasks representing the project phases with the given duration. Include descriptions detailing steps. Also create a tracking goal.`;
    } else {
      // General online AI clarification answers compilation
      const answersList = msg.questionnaire.questions.map((q: any) => `- ${q.label}: ${answers[q.id]}`).join("\n");
      userSummary = "Completed setup responses.";
      promptForAI = `Here are my answers to your clarification questions:\n${answersList}\n\nPlease formulate the detailed schedule adjustment plan now based on this context.`;
    }
    
    // Circuit Breaker check
    if (!isAIServiceAvailable()) {
      setChatHistory(prev => [...prev, { sender: "user", text: `I completed the setup: ${userSummary}` }]);
      let offlineData;
      if (msg.questionnaire.type === "workout_plan") {
        offlineData = generateLocalFitnessPlan(
          answers["workout_type"] || "",
          answers["weight_goal"] || "",
          answers["goal_details"] || "",
          answers["frequency"] || ""
        );
      } else if (msg.questionnaire.type === "project_plan") {
        offlineData = generateLocalProjectPlan(
          answers["project_type"] || "",
          answers["session_count"] || "",
          answers["session_duration"] || "",
          answers["project_goal_name"] || ""
        );
      } else {
        offlineData = {
          changes: [],
          message: "The AI service is temporarily offline. Please use the manual controls to update your schedule."
        };
      }

      if (offlineData.changes && offlineData.changes.length > 0) {
        setProposedChanges(offlineData.changes);
      }
      setChatHistory(prev => [...prev, {
        sender: "ai",
        text: injectPendingQuestionTextIfNeeded(`${offlineData.message} (Local Scheduler Mode — AI is temporarily offline due to high demand)`)
      }]);
      setIsProcessingCopilot(false);
      return;
    }

    setChatHistory(prev => [...prev, { sender: "user", text: `I completed the setup: ${userSummary}` }]);
    setIsProcessingCopilot(true);
    startCopilotLoadingSimulation();

    let data;
    let success = false;
    let attempt = 0;
    const MAX_RETRIES = 3;

    while (attempt < MAX_RETRIES) {
      const controller = new AbortController();
      copilotAbortControllerRef.current = controller;
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, getTimeoutForOperation("project_wizard"));

      try {
        // V3.1: Replace raw task arrays with compact text summaries
        const { scheduleSummary: wizardScheduleSummary, pendingSummary: wizardPendingSummary } = buildCopilotScheduleSummary(
          daySchedule.items,
          flexibleTasks.filter(t => t.status !== "done"),
          selectedDate
        );
        const response = await fetch("/api/adjust-schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            userText: promptForAI,
            scheduleSummary: wizardScheduleSummary,
            pendingSummary: wizardPendingSummary,
            today: selectedDate,
            routineBlocksSummary: routineBlocks.map(r => `${r.title} (${r.startTime}-${r.endTime}, rigidity: ${r.rigidity}, type: ${r.type}, days: ${r.daysOfWeek.join(",")})`).join("\n"),
            calendarEventsSummary: calendarEvents.map(e => `${e.title} (${e.startDate} to ${e.endDate}, type: ${e.type})`).join("\n")
          })
        });
        clearTimeout(timeoutId);

        if (response.status === 503 || response.status === 429) {
          throw { name: "RetriableError", status: response.status, message: `Status ${response.status}` };
        }

        if (!response.ok) {
          let errMsg = "API failed";
          try {
            const errData = await response.json();
            errMsg = errData.error || errMsg;
          } catch (_) {}
          throw new Error(errMsg);
        }

        data = await response.json();
        success = true;
        recordAISuccess();
        break; // break retry loop
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === "AbortError") {
          console.warn("AI Plan generator request aborted.");
          data = {
            changes: [],
            message: "Request cancelled by user."
          };
          setCopilotError("Plan formulation request was stopped. How can I help you next?");
          break;
        } else if ((err.name === "RetriableError" || err.status === 503 || err.status === 429) && attempt < MAX_RETRIES - 1) {
          attempt++;
          setCopilotRetryAttempt(attempt);
          const backoff = 1500 * attempt + Math.random() * 800;
          console.warn(`Retrying AI Plan generator request in ${Math.round(backoff)}ms (Attempt ${attempt}/${MAX_RETRIES})...`);
          await new Promise(resolve => setTimeout(resolve, backoff));
          continue;
        } else {
          console.warn("AI Plan generator failed:", err);
          recordAIFailure();
          let offlineData;
          if (msg.questionnaire.type === "workout_plan") {
            offlineData = generateLocalFitnessPlan(
              answers["workout_type"] || "",
              answers["weight_goal"] || "",
              answers["goal_details"] || "",
              answers["frequency"] || ""
            );
          } else if (msg.questionnaire.type === "project_plan") {
            offlineData = generateLocalProjectPlan(
              answers["project_type"] || "",
              answers["session_count"] || "",
              answers["session_duration"] || "",
              answers["project_goal_name"] || ""
            );
          } else {
            offlineData = adjustScheduleOffline(promptForAI, daySchedule.items, flexibleTasks, selectedDate);
          }
          data = offlineData;
          setCopilotError(offlineData.changes.length > 0 ? null : `DayFlow AI service failed: ${err.message}`);
          break;
        }
      } finally {
        copilotAbortControllerRef.current = null;
      }
    }

    setIsProcessingCopilot(false);
    stopCopilotLoadingSimulation();
    
    if (data.clarificationNeeded && data.clarificationQuestions && data.clarificationQuestions.length > 0) {
      const questionnaireMsg = {
        sender: "ai" as const,
        text: data.message || "I need a few clarifications to structure a customized plan. Please answer these quick questions:",
        questionnaire: {
          type: "general",
          title: "Plan Setup Wizard",
          questions: data.clarificationQuestions.map((q: any) => ({
            id: q.id,
            label: q.label,
            type: q.type || "text",
            options: q.options || [],
            placeholder: q.placeholder || "",
            value: q.type === "select" ? (q.options?.[0] || "") : ""
          }))
        }
      };
      setChatHistory(prev => [...prev, questionnaireMsg]);
    } else {
      if (data.changes && data.changes.length > 0) {
        setProposedChanges(data.changes);
      }
      setChatHistory(prev => [...prev, { 
        sender: "ai", 
        text: injectPendingQuestionTextIfNeeded(data.message || "I couldn't figure out any adjustments for that request. Try saying something like 'add task gym' or 'postpone work'.") 
      }]);
    }
    triggerHaptic(25);
  };

  const handleAutoScheduleProject = (proj: Project) => {
    const todayStr = getLocalTodayStr();
    const daysLeft = Math.max(1, Math.ceil((new Date(proj.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
    
    // Reserve 2 buffer days if daysLeft > 3, otherwise 1 if daysLeft > 1, else 0
    const bufferDays = daysLeft > 3 ? 2 : (daysLeft > 1 ? 1 : 0);
    const schedulingDaysCount = Math.max(1, daysLeft - bufferDays);

    const pendingSubtasks = proj.phases.flatMap(phase => 
      phase.subtasks.filter(sub => sub.status === "pending")
        .map(sub => ({ ...sub, phaseId: phase.id }))
    );

    if (pendingSubtasks.length === 0) {
      showToast("All subtasks are already completed or scheduled!", "info");
      return;
    }

    const datesList: string[] = [];
    for (let i = 0; i < schedulingDaysCount; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      datesList.push(date.toISOString().split("T")[0]);
    }

    let updatedTasks = [...flexibleTasks];
    let subtasksScheduledCount = 0;

    pendingSubtasks.forEach((sub, idx) => {
      const dateIndex = Math.min(datesList.length - 1, Math.floor((idx / pendingSubtasks.length) * datesList.length));
      const targetDate = datesList[dateIndex];

      const alreadyExists = updatedTasks.some(t => t.projectId === proj.id && t.subtaskId === sub.id && t.status !== "done" && t.status !== "skipped");
      if (!alreadyExists) {
        const newFlexTask: FlexibleTask = {
          id: `flex-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 5)}`,
          title: `${proj.title} — ${sub.title}`,
          duration_minutes: sub.duration_minutes,
          deadline: proj.deadline,
          energy_level: "high" as const,
          status: "scheduled" as const,
          scheduled_date: targetDate,
          projectId: proj.id,
          phaseId: sub.phaseId,
          subtaskId: sub.id,
          task_flexibility: "movable" as const,
          createdDate: todayStr
        };
        updatedTasks.push(newFlexTask);
        subtasksScheduledCount++;
      }
    });

    if (subtasksScheduledCount > 0) {
      handleUpdateFlexible(updatedTasks);
      showToast(`Scheduled ${subtasksScheduledCount} subtasks sequentially across next ${schedulingDaysCount} days!`, "success");
    } else {
      showToast("All subtasks are already scheduled on your calendar!", "info");
    }
  };

  const handleConfirmAIChanges = () => {
    if (!proposedChanges) return;

    // Save previous state for Undo support
    setCopilotUndoState({
      flexibleTasks: JSON.parse(JSON.stringify(flexibleTasks)),
      fixedBlocks: JSON.parse(JSON.stringify(fixedBlocks)),
      goals: JSON.parse(JSON.stringify(goals)),
      weightLog: JSON.parse(JSON.stringify(weightLog)),
      routineBlocks: JSON.parse(JSON.stringify(routineBlocks)),
      calendarEvents: JSON.parse(JSON.stringify(calendarEvents)),
      projects: JSON.parse(JSON.stringify(projects))
    });

    let updatedFlexible = [...flexibleTasks];
    let updatedFixed = [...fixedBlocks];
    let updatedGoals = [...goals];
    let updatedWeightLog = [...weightLog];
    let updatedRoutines = [...routineBlocks];
    let updatedEvents = [...calendarEvents];
    let updatedProjects = [...projects];
    let goalsModified = false;
    let weightModified = false;
    let routinesModified = false;
    let eventsModified = false;
    let projectsModified = false;
    let appliedCount = 0;

    for (const change of proposedChanges) {
      const { action, taskId, newDate, newTime, durationMultiplier, newTaskTitle, newTaskDuration, newTaskDescription, goalTitle, goalCategory, goalMetric, goalTarget, goalKeywords, insertImmediately, weightValue, projectTitle, projectGoal, projectDeadline, projectPhases } = change;

      if (action === "record_weight" && weightValue) {
        const today = new Date().toISOString().split("T")[0];
        // Replace entry for today if it already exists
        const existingIdx = updatedWeightLog.findIndex(e => e.date === today);
        const entry: WeightEntry = { date: today, weight: weightValue };
        if (existingIdx >= 0) {
          updatedWeightLog[existingIdx] = entry;
        } else {
          updatedWeightLog = [...updatedWeightLog, entry].sort((a, b) => a.date.localeCompare(b.date));
        }
        weightModified = true;
        appliedCount++;
        continue;
      }

      if (action === "add_routine") {
        const newRoutine: RoutineBlock = {
          id: `routine-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: newTaskTitle || "New Routine",
          daysOfWeek: change.daysOfWeek || [1, 2, 3, 4, 5],
          startTime: newTime || "09:00",
          endTime: change.endTime || "10:00",
          type: change.routineType || "custom",
          rigidity: change.rigidity || "soft",
          confidence: change.confidence || 1.0,
          source: change.source || "user_direct"
        };
        updatedRoutines.push(newRoutine);
        routinesModified = true;
        appliedCount++;
        continue;
      }

      if (action === "add_event") {
        const newEvent: CalendarEvent = {
          id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: newTaskTitle || "Routine Override / Event",
          startDate: change.startDate || selectedDate,
          endDate: change.endDate || selectedDate,
          type: change.eventType || "event",
          effects: change.suspendRoutineTypes ? { suspendRoutineTypes: change.suspendRoutineTypes } : undefined,
          confidence: change.confidence || 1.0,
          source: change.source || "user_direct"
        };
        updatedEvents.push(newEvent);
        eventsModified = true;
        appliedCount++;
        continue;
      }

      if (action === "add_project") {
        const titleVal = projectTitle || newTaskTitle || "New Project";
        const goalVal = projectGoal || "Decomposed goal plan";
        const deadlineVal = projectDeadline || selectedDate;

        const phasesVal: ProjectPhase[] = (projectPhases || []).map((phase: any, pIdx: number) => {
          const phaseId = `phase-${Date.now()}-${pIdx}-${Math.random().toString(36).substr(2, 5)}`;
          return {
            id: phaseId,
            title: phase.title || `Phase ${pIdx + 1}`,
            order: phase.order || pIdx + 1,
            subtasks: (phase.subtasks || []).map((sub: any, sIdx: number) => ({
              id: `subtask-${Date.now()}-${pIdx}-${sIdx}-${Math.random().toString(36).substr(2, 5)}`,
              title: sub.title || `Subtask ${sIdx + 1}`,
              duration_minutes: sub.duration_minutes || 60,
              status: "pending" as const
            }))
          };
        });

        const totalHours = Math.round(phasesVal.flatMap(p => p.subtasks).reduce((acc, s) => acc + s.duration_minutes, 0) / 60);

        const newProject: Project = {
          id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: titleVal,
          deadline: deadlineVal,
          goal: goalVal,
          phases: phasesVal,
          totalHoursEstimate: totalHours,
          progress: 0
        };

        updatedProjects.push(newProject);
        projectsModified = true;
        appliedCount++;
        continue;
      }

      if (action === "add" || action === "generate_workout_plan") {
        const newTask: FlexibleTask = {
          id: `flex-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          title: newTaskTitle || "New Task",
          duration_minutes: newTaskDuration || 45,
          deadline: null,
          energy_level: newTaskTitle?.toLowerCase().includes("gym") || newTaskTitle?.toLowerCase().includes("workout") || newTaskTitle?.toLowerCase().includes("exercise") ? "high" as EnergyLevel : "medium" as EnergyLevel,
          status: "scheduled",
          scheduled_date: selectedDate,
          pinned_start_time: insertImmediately ? minutesToTime(currentTimeMins) : undefined,
          description: newTaskDescription || undefined,
          createdDate: new Date().toISOString().split("T")[0]
        };
        updatedFlexible.push(newTask);
        appliedCount++;
        continue;
      }

      if (action === "add_goal") {
        const keywords = goalKeywords && goalKeywords.length > 0 
          ? goalKeywords 
          : [goalTitle?.toLowerCase() || ""];
          
        const targetValue = goalTarget || 10;
        const metricLabel = goalMetric || "sessions";
        const milestones = generateMilestones(targetValue, metricLabel);
        
        const nextCheckIn = new Date();
        nextCheckIn.setDate(nextCheckIn.getDate() + 7);
        
        const newGoal: UserGoal = {
          id: `goal-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          title: goalTitle || "New Goal",
          category: (goalCategory as any) || "personal",
          description: "Created automatically via AI Copilot",
          metricLabel: metricLabel,
          currentValue: 0,
          targetValue: targetValue,
          startValue: 0,
          createdAt: new Date().toISOString(),
          status: "active",
          milestones: milestones,
          checkInFrequencyDays: 7,
          nextCheckInAt: nextCheckIn.toISOString().split("T")[0],
          linkedTaskKeywords: keywords,
          progressLog: [{ date: new Date().toISOString().split("T")[0], value: 0 }]
        };
        
        updatedGoals.push(newGoal);
        appliedCount++;
        goalsModified = true;
        continue;
      }

      if (action === "update_goal") {
        updatedGoals = updatedGoals.map(g => {
          if (g.id === taskId || g.title.toLowerCase() === goalTitle?.toLowerCase()) {
            const newTarget = goalTarget || g.targetValue;
            const newMilestones = g.targetValue === newTarget ? g.milestones : generateMilestones(newTarget, g.metricLabel);
            goalsModified = true;
            return {
              ...g,
              targetValue: newTarget,
              milestones: newMilestones
            };
          }
          return g;
        });
        appliedCount++;
        continue;
      }

      const isFlex = taskId?.startsWith("flex-") || taskId?.startsWith("ai-flex-");
      const isFixed = taskId?.startsWith("fixed-") || taskId?.startsWith("ai-fixed-") || taskId?.startsWith("profile-");

      if (action === "delete") {
        if (isFlex) {
          updatedFlexible = updatedFlexible.filter(t => t.id !== taskId);
        } else if (isFixed) {
          updatedFixed = updatedFixed.filter(b => b.id !== taskId);
        }
        appliedCount++;
      } else if (action === "move_to_tomorrow" || action === "cant_do_today") {
        if (isFlex) {
          const tomorrow = new Date(selectedDate);
          tomorrow.setDate(tomorrow.getDate() + 1);
          const tomorrowStr = tomorrow.toISOString().split("T")[0];
          updatedFlexible = updatedFlexible.map(t => t.id === taskId ? {
            ...t,
            scheduled_date: tomorrowStr,
            pinned_start_time: undefined,
            status: "scheduled"
          } : t);
          appliedCount++;
        }
      } else if (action === "move_to_date") {
        if (isFlex) {
          updatedFlexible = updatedFlexible.map(t => t.id === taskId ? {
            ...t,
            scheduled_date: newDate || null,
            pinned_start_time: undefined,
            status: newDate ? "scheduled" : "backlog"
          } : t);
          appliedCount++;
        }
      } else if (action === "change_time") {
        const pinTime = insertImmediately ? minutesToTime(currentTimeMins) : newTime;
        if (isFlex) {
          updatedFlexible = updatedFlexible.map(t => t.id === taskId ? {
            ...t,
            pinned_start_time: pinTime || undefined
          } : t);
          appliedCount++;
        } else if (isFixed) {
          updatedFixed = updatedFixed.map(b => b.id === taskId ? {
            ...b,
            start_time: pinTime || b.start_time,
            end_time: pinTime
              ? minutesToTime(timeToMinutes(pinTime) + Math.max(30, timeToMinutes(b.end_time) - timeToMinutes(b.start_time)))
              : b.end_time
          } : b);
          appliedCount++;
        }
      } else if (action === "reduce_duration") {
        const mult = durationMultiplier || 0.5;
        if (isFlex) {
          updatedFlexible = updatedFlexible.map(t => t.id === taskId ? {
            ...t,
            duration_minutes: Math.max(10, Math.round(t.duration_minutes * mult))
          } : t);
          appliedCount++;
        }
      }
    }

    if (appliedCount > 0) {
      handleUpdateFlexible(updatedFlexible);
      handleUpdateFixed(updatedFixed);
      if (goalsModified) {
        setGoals(updatedGoals);
        saveGoals(updatedGoals);
      }
      if (projectsModified) {
        setProjects(updatedProjects);
        localStorage.setItem("dayflow_projects", JSON.stringify(updatedProjects));
      }
      if (weightModified) {
        setWeightLog(updatedWeightLog);
        saveWeightLog(updatedWeightLog);
        showToast(`Weight logged: ${updatedWeightLog[updatedWeightLog.length - 1]?.weight} kg`, "success");
      } else if (routinesModified || eventsModified || projectsModified) {
        if (routinesModified) {
          setRoutineBlocks(updatedRoutines);
          localStorage.setItem("dayflow_routine_blocks", JSON.stringify(updatedRoutines));
        }
        if (eventsModified) {
          setCalendarEvents(updatedEvents);
          localStorage.setItem("dayflow_calendar_events", JSON.stringify(updatedEvents));
        }
        showToast("Updates applied successfully!", "success");
      } else {
        showToast(`Applied ${appliedCount} schedule adjustments!`, "success");
      }
      logAcceptedSuggestions(appliedCount);
      triggerHaptic([40, 40]);
    }

    // Trust Layer: Generate AIActionExplanation logs
    const explanations: AIActionExplanation[] = proposedChanges.map(change => {
      let desc = "";
      if (change.action === "add") {
        desc = `Add task: "${change.newTaskTitle || "New Task"}"`;
      } else if (change.action === "delete") {
        desc = `Remove task: "${change.taskTitle || "Task"}"`;
      } else if (change.action === "move_to_tomorrow" || change.action === "cant_do_today") {
        desc = `Postpone task to tomorrow: "${change.taskTitle || "Task"}"`;
      } else if (change.action === "move_to_date") {
        desc = `Move task: "${change.taskTitle || "Task"}" to date`;
      } else if (change.action === "change_time") {
        desc = `Reschedule task: "${change.taskTitle || "Task"}" to ${change.newTime}`;
      } else if (change.action === "reduce_duration") {
        desc = `Reduce duration of task: "${change.taskTitle || "Task"}"`;
      } else if (change.action === "record_weight") {
        desc = `Log body weight: ${change.weightValue} kg`;
      } else if (change.action === "add_goal") {
        desc = `Initialize goal: "${change.goalTitle}"`;
      } else if (change.action === "add_routine") {
        desc = `Create routine: "${change.newTaskTitle || "Routine"}"`;
      } else if (change.action === "add_event") {
        desc = `Record event: "${change.newTaskTitle || "Event"}"`;
      } else if (change.action === "add_project") {
        desc = `Create project: "${change.projectTitle || "Project"}"`;
      } else {
        desc = `Adjust: ${change.action}`;
      }

      return {
        action: desc,
        reason: change.reasoning || "Optimizing schedule constraints & pacing",
        confidence: change.confidence || "high"
      };
    });

    setChatHistory(prev => [
      ...prev,
      { sender: "user" as const, text: "I accept the proposed changes." },
      { 
        sender: "ai" as const, 
        text: `Schedule successfully updated! Here is the Trust Layer action log:`,
        explanations: explanations
      }
    ]);

    setActiveBottomSheet(null);
    setCopilotInput("");
    setProposedChanges(null);
  };

  const handleUndoAIChanges = () => {
    if (!copilotUndoState) return;
    handleUpdateFlexible(copilotUndoState.flexibleTasks);
    handleUpdateFixed(copilotUndoState.fixedBlocks);
    setGoals(copilotUndoState.goals);
    saveGoals(copilotUndoState.goals);
    setWeightLog(copilotUndoState.weightLog);
    saveWeightLog(copilotUndoState.weightLog);
    if (copilotUndoState.routineBlocks) {
      setRoutineBlocks(copilotUndoState.routineBlocks);
      localStorage.setItem("dayflow_routine_blocks", JSON.stringify(copilotUndoState.routineBlocks));
    }
    if (copilotUndoState.calendarEvents) {
      setCalendarEvents(copilotUndoState.calendarEvents);
      localStorage.setItem("dayflow_calendar_events", JSON.stringify(copilotUndoState.calendarEvents));
    }
    if (copilotUndoState.projects) {
      setProjects(copilotUndoState.projects);
      localStorage.setItem("dayflow_projects", JSON.stringify(copilotUndoState.projects));
    }
    setCopilotUndoState(null);
    showToast("AI adjustments undone! ↩️", "success");
    triggerHaptic(35);
  };

  // Local offline regex-based parser fallback
  const parseScheduleOffline = (text: string): { fixed: any[]; flexible: any[] } => {
    const lines = text.split(/[,\n]+/);
    const fixed: any[] = [];
    const flexible: any[] = [];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const timeMatch = line.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)\s*(?:to|until|-)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i) || 
                        line.match(/(?:at|from)\s+(\d{1,2}(?::\d{2})?\s*(?:am|pm)?)/i);

      if (timeMatch) {
        let start = "09:00";
        let end = "10:00";
        const title = line.replace(timeMatch[0], "").replace(/(?:at|from|to|until|-|for|\d+h|\d+m|\d+\s*hour|\d+\s*min)/ig, "").trim();
        
        const parseTimeStr = (tStr: string): string => {
          tStr = tStr.toLowerCase().trim();
          const isPm = tStr.includes("pm");
          const isAm = tStr.includes("am");
          let clean = tStr.replace(/(?:am|pm)/g, "").trim();
          let hrs = 9;
          let mins = 0;
          if (clean.includes(":")) {
            [hrs, mins] = clean.split(":").map(Number);
          } else {
            hrs = Number(clean);
          }
          if (isPm && hrs < 12) hrs += 12;
          if (isAm && hrs === 12) hrs = 0;
          return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
        };

        if (timeMatch[2]) {
          start = parseTimeStr(timeMatch[1]);
          end = parseTimeStr(timeMatch[2]);
        } else {
          start = parseTimeStr(timeMatch[1]);
          const durationMatch = line.match(/for\s+(\d+(?:\.\d+)?)\s*h/i) || line.match(/for\s+(\d+)\s*m/i);
          if (durationMatch) {
            const startMins = timeToMinutes(start);
            const dur = line.includes("h") ? parseFloat(durationMatch[1]) * 60 : parseInt(durationMatch[1]);
            end = minutesToTime(startMins + dur);
          } else {
            end = minutesToTime(timeToMinutes(start) + 60);
          }
        }

        fixed.push({ title: title || "Fixed Workout", start, end });
      } else {
        const durationMatch = line.match(/(\d+(?:\.\d+)?)\s*h/i) || line.match(/(\d+)\s*m/i) || line.match(/for\s+(\d+)\s*min/i);
        let duration = 45;
        if (durationMatch) {
          duration = line.includes("h") ? parseFloat(durationMatch[1]) * 60 : parseInt(durationMatch[1]);
        }
        const title = line.replace(/(\d+(?:\.\d+)?)\s*h/g, "").replace(/(\d+)\s*m/g, "").replace(/(?:for|duration|min|hour|hours)/ig, "").trim();
        
        let energyLevel = "medium";
        const titleLower = title.toLowerCase();
        if (titleLower.includes("study") || titleLower.includes("gym") || titleLower.includes("work") || titleLower.includes("project")) {
          energyLevel = "high";
        } else if (titleLower.includes("relax") || titleLower.includes("sleep") || titleLower.includes("coffee") || titleLower.includes("call")) {
          energyLevel = "low";
        }

        flexible.push({
          title: title || "Flexible Task",
          duration,
          deadline: null,
          energyLevel
        });
      }
    }

    return { fixed, flexible };
  };

  const adjustScheduleOffline = (
    userText: string,
    currentSchedule: any[],
    flexibleTasks: any[],
    today: string
  ): { changes: any[]; message: string } => {
    const text = userText.toLowerCase().trim();
    const changes: any[] = [];
    let message = "Applied offline adjustments.";

    const findTask = (keywords: string[]) => {
      let bestMatch: any = null;
      let maxMatches = 0;
      
      for (const t of flexibleTasks) {
        let matches = 0;
        const tTitle = t.title.toLowerCase();
        for (const kw of keywords) {
          if (tTitle.includes(kw)) matches++;
        }
        if (matches > maxMatches) {
          maxMatches = matches;
          bestMatch = { ...t, isFlex: true };
        }
      }
      
      for (const item of currentSchedule) {
        if (item.type === "fixed") {
          let matches = 0;
          const iTitle = item.title.toLowerCase();
          for (const kw of keywords) {
            if (iTitle.includes(kw)) matches++;
          }
          if (matches > maxMatches) {
            maxMatches = matches;
            bestMatch = { ...item, isFixed: true };
          }
        }
      }
      
      return maxMatches > 0 ? bestMatch : null;
    };

    const addMatch = text.match(/(?:add|create)\s+(?:task\s+)?(.*?)(?:\s+(?:for|duration)\s+(\d+)\s*(?:min|minute|hour|h))?$/i);
    if (addMatch && (text.startsWith("add") || text.startsWith("create"))) {
      const title = addMatch[1].trim();
      let duration = 45;
      const durStr = addMatch[2];
      if (durStr) {
        duration = parseInt(durStr, 10);
        if (text.includes("hour") || text.includes(" h")) {
          duration *= 60;
        }
      }
      if (title) {
        changes.push({
          action: "add",
          newTaskTitle: title,
          newTaskDuration: duration,
          reasoning: "Offline rule: Add new task"
        });
        message = `Added new task "${title}" (${duration} min).`;
        return { changes, message };
      }
    }

    const cleanKeywords = (phrase: string) => {
      return phrase
        .replace(/(?:move|shift|postpone|delete|cancel|remove|pin|schedule|change|at|to|tomorrow|today|later|for|minutes|mins|hours|h)/ig, "")
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 2);
    };

    if (text.includes("tomorrow") || text.includes("postpone") || text.includes("cant do") || text.includes("later")) {
      const keywords = cleanKeywords(text);
      const target = findTask(keywords);
      if (target && target.isFlex) {
        changes.push({
          action: "move_to_tomorrow",
          taskId: target.id,
          reasoning: "Offline: Reschedule to tomorrow"
        });
        message = `Postponed "${target.title}" to tomorrow.`;
        return { changes, message };
      }
    }

    if (text.includes("delete") || text.includes("cancel") || text.includes("remove")) {
      const keywords = cleanKeywords(text);
      const target = findTask(keywords);
      if (target) {
        changes.push({
          action: "delete",
          taskId: target.id,
          reasoning: "Offline: Cancel/Delete item"
        });
        message = `Cancelled/Deleted "${target.title}".`;
        return { changes, message };
      }
    }

    const timeMatch = text.match(/(\d{1,2}):(\d{2})/);
    if (timeMatch) {
      const timeStr = `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
      const keywords = cleanKeywords(text);
      const target = findTask(keywords);
      if (target) {
        changes.push({
          action: "change_time",
          taskId: target.id,
          newTime: timeStr,
          reasoning: `Offline: Pin time to ${timeStr}`
        });
        message = `Scheduled "${target.title}" at ${timeStr}.`;
        return { changes, message };
      }
    }

    return { changes: [], message: "Sorry, I couldn't figure out that adjustment offline. Try typing 'add task [name]', 'cancel [name]', or 'postpone [name]'." };
  };


  // Web Speech API Voice Dictation
  const handleVoiceInput = () => {
    if (!speechSupported) return;
    
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setCopilotInput((prev) => (prev ? prev + " " + speechToText : speechToText));
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
      showToast("Speech recognition stalled. Try typing instead.", "warning");
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // Schedule task directly to today from backlog
  const handleScheduleTaskToday = (task: FlexibleTask) => {
    const updated = flexibleTasks.map((t) => 
      t.id === task.id ? { ...t, scheduled_date: selectedDate, status: "scheduled" as const } : t
    );
    handleUpdateFlexible(updated);
    showToast(`"${task.title}" slotted to today!`, "success");
    triggerHaptic(40);
    navigate("/today");
  };

  // --- DRAG AND DROP: reorder flexible tasks on the timeline ---
  const handleDragStart = (taskId: string) => {
    setDraggedTaskId(taskId);
    triggerHaptic(15);
  };

  const handleDragOver = (e: React.DragEvent, taskId: string) => {
    e.preventDefault();
    if (taskId === draggedTaskId) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    setDragOverTaskId(taskId);
    setDragOverPosition(e.clientY < midY ? "before" : "after");
  };

  const handleDrop = (e: React.DragEvent, targetTaskId: string) => {
    e.preventDefault();
    if (!draggedTaskId || draggedTaskId === targetTaskId) {
      setDraggedTaskId(null);
      setDragOverTaskId(null);
      return;
    }
    // Reorder: build new array where dragged task moves before/after target
    const flexIds = daySchedule.items
      .filter(i => i.type === "flexible")
      .map(i => i.id);

    const fromIdx = flexIds.indexOf(draggedTaskId);
    const toIdx = flexIds.indexOf(targetTaskId);
    if (fromIdx === -1 || toIdx === -1) { setDraggedTaskId(null); setDragOverTaskId(null); return; }

    const reordered = [...flexIds];
    reordered.splice(fromIdx, 1);
    const insertAt = dragOverPosition === "before" ? reordered.indexOf(targetTaskId) : reordered.indexOf(targetTaskId) + 1;
    reordered.splice(Math.max(0, insertAt), 0, draggedTaskId);

    // Assign priorities so scheduler respects the new order
    const updated = flexibleTasks.map(t => {
      const idx = reordered.indexOf(t.id);
      return idx !== -1 ? { ...t, priority: idx } : t;
    });
    handleUpdateFlexible(updated);
    setDraggedTaskId(null);
    setDragOverTaskId(null);
    showToast("Task order updated!", "info");
    triggerHaptic(20);
  };

  const handleDragEnd = () => {
    setDraggedTaskId(null);
    setDragOverTaskId(null);
  };

  // --- PIN TO TIME: user manually sets a specific start time for a task ---
  const handleOpenPinTime = (taskId: string, currentTime: string) => {
    setPinTimeTaskId(taskId);
    setPinTimeValue(currentTime);
  };

  const handleConfirmPinTime = () => {
    if (!pinTimeTaskId || !pinTimeValue) return;
    const updated = flexibleTasks.map(t =>
      t.id === pinTimeTaskId ? { ...t, pinned_start_time: pinTimeValue } : t
    );
    handleUpdateFlexible(updated);
    setPinTimeTaskId(null);
    setPinTimeValue("");
    showToast("Task pinned to " + pinTimeValue, "success");
    triggerHaptic(20);
  };

  const handleUnpinTime = (taskId: string) => {
    const updated = flexibleTasks.map(t =>
      t.id === taskId ? { ...t, pinned_start_time: undefined } : t
    );
    handleUpdateFlexible(updated);
    showToast("Time pin removed — task will auto-schedule.", "info");
    triggerHaptic(10);
  };

  // Return scheduled task back to backlog
  const handleUnscheduleTask = (taskId: string) => {
    const updated = flexibleTasks.map((t) => 
      t.id === taskId ? {
        ...t,
        scheduled_date: null,
        status: "backlog" as const,
        notification_response: "skipped_today" as const
      } : t
    );
    handleUpdateFlexible(updated);
    showToast("Task returned to Backlog.", "info");
    triggerHaptic(20);
  };

  const handleDelayTask15Minutes = (taskId: string, start_time: string) => {
    const startMins = timeToMinutes(start_time);
    const newStartMins = startMins + 15;
    const newTimeStr = minutesToTime(newStartMins);

    const updated = flexibleTasks.map(t =>
      t.id === taskId ? {
        ...t,
        pinned_start_time: newTimeStr,
        delay_count: (t.delay_count || 0) + 1,
        notification_response: "delayed_15" as const
      } : t
    );
    handleUpdateFlexible(updated);
    showToast("Task delayed by 15 minutes", "info");
    triggerHaptic(20);
  };

  const handleStartTaskFromNotification = (taskId: string) => {
    const updated = flexibleTasks.map(t =>
      t.id === taskId ? {
        ...t,
        notification_response: "started" as const,
        actual_start_time: minutesToTime(new Date().getHours() * 60 + new Date().getMinutes()),
      } : t
    );
    handleUpdateFlexible(updated);
    showToast("Awesome! Stay in flow.", "success");
    triggerHaptic(30);
  };

  const handleClearAllData = () => {
    const confirmation = prompt("WARNING: This will permanently delete all tasks, routine profiles, settings, goals, and achievements.\n\nTo confirm, please type 'DELETE ALL DATA' in the input box below:");
    if (confirmation === "DELETE ALL DATA") {
      performDataWipe();
    } else if (confirmation !== null) {
      showToast("Confirmation text did not match. Reset cancelled.", "warning");
    }
  };

  const performDataWipe = () => {
    clearAllData();
    setFixedBlocks([]);
    setFlexibleTasks([]);
    setProfiles([]);
    setGoals([]);
    setAchievements([]);
    setAppSettings({ day_start: "07:00", day_end: "23:00" });
    setShowOnboarding(true);
    showToast("All data wiped.", "warning");
    triggerHaptic([50, 50, 50]);
  };

  const exportMyData = () => {
    const dataToExport = {
      exported_at: new Date().toISOString(),
      version: "dayflow-telemetry-v2",
      settings: appSettings,
      summary: {
        total_flexible_tasks: flexibleTasks.length,
        completed_tasks: flexibleTasks.filter(t => t.status === "done").length,
        backlog_tasks: flexibleTasks.filter(t => t.status === "backlog").length,
        scheduled_tasks: flexibleTasks.filter(t => t.status === "scheduled").length,
        total_fixed_blocks: fixedBlocks.length,
        total_routine_profiles: profiles.length,
        total_goals: goals.length,
        achieved_goals: goals.filter(g => g.status === "achieved").length,
        total_achievements: achievements.length
      },
      flexible_tasks: flexibleTasks,
      fixed_blocks: fixedBlocks,
      routine_profiles: profiles,
      goals: goals,
      achievements: achievements
    };

    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = `dayflow_telemetry_${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    showToast("Data exported successfully!", "success");
    triggerHaptic(30);
  };

  const importMyData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== "string") throw new Error("Invalid file content");
        
        const imported = JSON.parse(text);
        if (!imported || typeof imported !== "object") {
          throw new Error("Invalid format");
        }

        // Import settings
        if (imported.settings) {
          setAppSettings(imported.settings);
          saveSettings(imported.settings);
        }

        // Import flexible tasks
        if (Array.isArray(imported.flexible_tasks)) {
          setFlexibleTasks(imported.flexible_tasks);
          saveFlexibleTasks(imported.flexible_tasks);
        }

        // Import fixed blocks
        if (Array.isArray(imported.fixed_blocks)) {
          setFixedBlocks(imported.fixed_blocks);
          saveFixedBlocks(imported.fixed_blocks);
        }

        // Import routine profiles
        if (Array.isArray(imported.routine_profiles)) {
          setProfiles(imported.routine_profiles);
          saveProfiles(imported.routine_profiles);
        }

        // Import goals
        if (Array.isArray(imported.goals)) {
          setGoals(imported.goals);
          saveGoals(imported.goals);
        }

        // Import achievements
        if (Array.isArray(imported.achievements)) {
          setAchievements(imported.achievements);
          saveAchievements(imported.achievements);
        }

        showToast("Data imported successfully!", "success");
        triggerHaptic(20);
        
        // Reload to let scheduler re-calculate schedule
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        console.error(err);
        showToast("Failed to parse or import data file.", "warning");
      }
    };
    reader.readAsText(file);
  };

  const executePostponeWithFriction = (
    taskId: string,
    actionType: "delay_15" | "delay_30" | "tomorrow",
    reason: FrictionReason,
    start_time?: string
  ) => {
    // 1. Record Reflection Event
    const newReflection: ReflectionEvent = {
      id: "refl_" + Math.random().toString(36).substr(2, 9),
      date: TODAY,
      completionRate: 0,
      type: "failure",
      cause: reason,
      notes: `Friction logged for postpone (${actionType})`
    };
    
    const updatedReflections = [...reflectionEvents, newReflection];
    setReflectionEvents(updatedReflections);
    saveReflectionEvents(updatedReflections);

    const task = flexibleTasks.find(t => t.id === taskId);

    // 2. Perform Reschedule
    if (actionType === "delay_15") {
      const st = start_time || "12:00";
      const startMins = timeToMinutes(st);
      const newStartMins = startMins + 15;
      const newTimeStr = minutesToTime(newStartMins);

      const updated = flexibleTasks.map(t =>
        t.id === taskId ? {
          ...t,
          pinned_start_time: newTimeStr,
          delay_count: (t.delay_count || 0) + 1,
          focus_quality_effort: "struggled" as const,
        } : t
      );
      handleUpdateFlexible(updated);
      showToast("Delayed by 15m. Friction logged.", "info");
    } else if (actionType === "delay_30") {
      const st = start_time || "12:00";
      const startMins = timeToMinutes(st);
      const newStartMins = startMins + 30;
      const newTimeStr = minutesToTime(newStartMins);

      const updated = flexibleTasks.map(t =>
        t.id === taskId ? {
          ...t,
          pinned_start_time: newTimeStr,
          delay_count: (t.delay_count || 0) + 1,
          focus_quality_effort: "struggled" as const,
        } : t
      );
      handleUpdateFlexible(updated);
      showToast("Delayed by 30m. Friction logged.", "info");
    } else if (actionType === "tomorrow") {
      const tomorrow = new Date(selectedDate);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split("T")[0];

      const updated = flexibleTasks.map(t => t.id === taskId ? {
        ...t,
        scheduled_date: tomorrowStr,
        pinned_start_time: undefined,
        status: "scheduled" as const,
        focus_quality_effort: "struggled" as const
      } : t);

      handleUpdateFlexible(updated);
      showToast("Task moved to tomorrow. Friction logged.", "info");
    }

    setFrictionPrompt(null);
    triggerHaptic(30);

    // Trigger Decomposition Check:
    if (task && (reason === "unclear_task" || task.duration_minutes > 120 || (task.carry_over_count || 0) >= 3)) {
      handleDecompositionPrompt(task);
    }
  };

  const handleDecompositionPrompt = (task: FlexibleTask) => {
    setActiveBottomSheet("assistant");
    setChatHistory(prev => [
      ...prev,
      {
        sender: "ai",
        text: `"${task.title}" looks too large. Break it into smaller steps?`,
        questionnaire: {
          type: "decomposition",
          taskId: task.id,
          taskTitle: task.title,
          currentStep: "prompt"
        }
      }
    ]);
  };

  const handleDecomposeTaskConfirm = async (taskId: string, msgIdx: number) => {
    const updatedHistory = [...chatHistory];
    updatedHistory[msgIdx] = { ...updatedHistory[msgIdx], questionnaireSubmitted: true };
    setChatHistory(updatedHistory);
    setIsProcessingCopilot(true);
    triggerHaptic(20);

    const task = flexibleTasks.find(t => t.id === taskId);
    if (!task) {
      setIsProcessingCopilot(false);
      return;
    }

    try {
      setChatHistory(prev => [
        ...prev,
        { sender: "user", text: `Decompose task "${task.title}"` }
      ]);

      const response = await fetch("/api/decompose-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          duration: task.duration_minutes
        })
      });

      if (!response.ok) {
        throw new Error("Decomposition API failed");
      }

      const result = await response.json();
      const subtasks = result.subtasks || [];
      
      if (subtasks.length === 0) {
        setChatHistory(prev => [
          ...prev,
          { sender: "ai", text: `I tried to decompose the task, but wasn't able to split it up automatically. Try breaking it down manually in the Backlog!` }
        ]);
        setIsProcessingCopilot(false);
        return;
      }

      const dateKey = task.scheduled_date || TODAY;
      const tasksWithoutOriginal = flexibleTasks.filter(t => t.id !== taskId);
      
      const newSubtasks: FlexibleTask[] = subtasks.map((st: any, sIdx: number) => ({
        id: `sub_${taskId}_${sIdx}_${Math.random().toString(36).substr(2, 5)}`,
        title: st.title,
        duration_minutes: st.duration || Math.round(task.duration_minutes / subtasks.length),
        deadline: task.deadline,
        energy_level: task.energy_level,
        status: "scheduled" as const,
        scheduled_date: dateKey,
        task_nature: "one_time" as const,
        carry_over_count: task.carry_over_count || 0,
        focus_quality_effort: "good",
        importance: task.importance || "important",
        task_flexibility: task.task_flexibility || "movable"
      }));

      const finalTasks = [...tasksWithoutOriginal, ...newSubtasks];
      handleUpdateFlexible(finalTasks);

      const aiResponseText = `Decomposed "${task.title}" into 3 bite-sized steps:\n` +
        newSubtasks.map(t => `- ${t.title} (${t.duration_minutes} mins)`).join("\n") +
        `\n\nThese have been scheduled in place of the original task.`;

      setChatHistory(prev => [
        ...prev,
        { sender: "ai", text: aiResponseText }
      ]);
      showToast("Task successfully decomposed!", "success");
      triggerHaptic(45);

    } catch (e) {
      console.error(e);
      setChatHistory(prev => [
        ...prev,
        { sender: "ai", text: "I hit an issue trying to split the task automatically. Let's try it again in a bit!" }
      ]);
    } finally {
      setIsProcessingCopilot(false);
    }
  };

  const handleDecomposeTaskCancel = (msgIdx: number) => {
    const updatedHistory = [...chatHistory];
    updatedHistory[msgIdx] = { ...updatedHistory[msgIdx], questionnaireSubmitted: true };
    setChatHistory(updatedHistory);
    setChatHistory(prev => [
      ...prev,
      { sender: "ai", text: "Understood. Keep pushing through the main task — you got this!" }
    ]);
    triggerHaptic(10);
  };

  const handleExecuteSuggestionAction = (type: string) => {
    handleOpenAICopilot();
    let query = "";
    if (type === "move_gym") {
      query = "Let's reschedule my gym workout to morning focus hours.";
    } else if (type === "reduce_load") {
      query = "Let's reduce my task load today to prevent burnout.";
    } else if (type === "pad_durations") {
      query = "Please pad my task durations today by 25%.";
    } else if (type === "break_task") {
      query = "Help me break down my vague tasks scheduled for today.";
    } else if (type === "focus_slump") {
      query = "Please shift my slump-hour tasks to my peak energy times.";
    } else {
      query = "Show suggestions.";
    }
    setCopilotInput(query);
    handleSendCopilotMessage(query);
  };

  const handleDismissSuggestion = (candId: string) => {
    const now = Date.now();
    const newLogs = [...suggestionDismissLogs, now];
    setSuggestionDismissLogs(newLogs);
    localStorage.setItem("dayflow_suggestion_dismiss_logs", JSON.stringify(newLogs));

    const newDismissedIds = [...dismissedSuggestionIds, candId];
    setDismissedSuggestionIds(newDismissedIds);
    localStorage.setItem("dayflow_dismissed_ids", JSON.stringify(newDismissedIds));

    // Check if 3 dismissals in 24h
    const last24h = now - 24 * 60 * 60 * 1000;
    const recentDismissals = newLogs.filter(t => t >= last24h);
    if (recentDismissals.length >= 3) {
      const quietUntil = now + 12 * 60 * 60 * 1000; // 12 hours
      localStorage.setItem("dayflow_quiet_mode_until", String(quietUntil));
      showToast("Quiet mode activated for 12 hours.", "info");
    } else {
      showToast("Suggestion dismissed.", "info");
    }
    triggerHaptic(10);
  };

  const executePostponeDirectly = (taskId: string, actionType: "delay_15" | "delay_30", start_time?: string) => {
    const st = start_time || "12:00";
    const startMins = timeToMinutes(st);
    const delayMins = actionType === "delay_15" ? 15 : 30;
    const newStartMins = startMins + delayMins;
    const newTimeStr = minutesToTime(newStartMins);

    const updated = flexibleTasks.map(t =>
      t.id === taskId ? {
        ...t,
        pinned_start_time: newTimeStr,
        delay_count: (t.delay_count || 0) + 1,
      } : t
    );
    handleUpdateFlexible(updated);
    showToast(`Delayed by ${delayMins}m.`, "success");
    setDelayDurationPromptTaskId(null);
    triggerHaptic(20);
  };

  const handleCantDoToday = (taskId: string) => {
    const tomorrow = new Date(selectedDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const updated = flexibleTasks.map(t => t.id === taskId ? {
      ...t,
      scheduled_date: tomorrowStr,
      pinned_start_time: undefined,
      status: "scheduled" as const
    } : t);

    handleUpdateFlexible(updated);
    showToast("Task moved to tomorrow!", "info");
    triggerHaptic(15);
  };

  const handleEodMoveToTomorrow = (taskId: string) => {
    const tomorrow = new Date(TODAY);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const updated = flexibleTasks.map(t => t.id === taskId ? {
      ...t,
      scheduled_date: tomorrowStr,
      pinned_start_time: undefined,
      status: "scheduled" as const
    } : t);

    handleUpdateFlexible(updated);
    showToast("Task moved to tomorrow!", "success");
    triggerHaptic(15);
  };

  const handleEodReduceAndTomorrow = (taskId: string, percentDone: number) => {
    const tomorrow = new Date(TODAY);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split("T")[0];

    const updated = flexibleTasks.map(t => {
      if (t.id === taskId) {
        const remainingFactor = 1 - percentDone / 100;
        const newDuration = Math.max(10, Math.round(t.duration_minutes * remainingFactor));
        return {
          ...t,
          duration_minutes: newDuration,
          scheduled_date: tomorrowStr,
          pinned_start_time: undefined,
          status: "scheduled" as const
        };
      }
      return t;
    });

    handleUpdateFlexible(updated);
    showToast(`Task remaining duration reduced & moved to tomorrow!`, "success");
    triggerHaptic(20);
  };

  const handleEodKeepStale = (taskId: string) => {
    const parts = taskId.split("-");
    const suffix = Math.random().toString(36).substr(2, 5);
    const newId = `flex-${Date.now()}-${suffix}`;

    const updated = flexibleTasks.map(t => t.id === taskId ? {
      ...t,
      id: newId
    } : t);

    handleUpdateFlexible(updated);
    showToast("Stale task renewed!", "success");
    triggerHaptic(15);
  };

  // ─── Profile CRUD Handlers ────────────────────────────────────────────────

  const handleOpenNewProfile = () => {
    setEditingProfile(null);
    setProfileForm({ name: "", emoji: "📚", accentColor: "#7F77DD", description: "", appliesTo: "weekdays", blocks: [] });
    setProfileBlockForm({ title: "", start_time: "09:00", end_time: "10:00", color: "#E24B4A" });
    setActiveBottomSheet("profile");
  };

  const handleOpenEditProfile = (profile: ScheduleProfile) => {
    setEditingProfile(profile);
    setProfileForm({
      name: profile.name, emoji: profile.emoji, accentColor: profile.accentColor,
      description: profile.description || "", appliesTo: profile.appliesTo, blocks: [...profile.blocks]
    });
    setProfileBlockForm({ title: "", start_time: "09:00", end_time: "10:00", color: "#E24B4A" });
    setActiveBottomSheet("profile");
  };

  const handleSaveProfile = () => {
    if (!profileForm.name.trim()) return;
    if (editingProfile) {
      const updated = profiles.map(p => p.id === editingProfile.id
        ? { ...p, ...profileForm, name: profileForm.name.trim() } : p
      );
      handleUpdateProfiles(updated);
      showToast(`"${profileForm.name}" updated!`, "success");
    } else {
      const newProfile: ScheduleProfile = {
        id: `profile-${Date.now()}`,
        name: profileForm.name.trim(),
        emoji: profileForm.emoji,
        accentColor: profileForm.accentColor,
        description: profileForm.description,
        appliesTo: profileForm.appliesTo,
        isActive: false,
        blocks: profileForm.blocks
      };
      handleUpdateProfiles([...profiles, newProfile]);
      showToast(`"${profileForm.name}" profile created!`, "success");
    }
    setActiveBottomSheet(null);
    triggerHaptic(35);
  };

  const handleDeleteProfile = (id: string) => {
    const name = profiles.find(p => p.id === id)?.name || "Profile";
    handleUpdateProfiles(profiles.filter(p => p.id !== id));
    showToast(`"${name}" deleted.`, "info");
    triggerHaptic(20);
  };

  const handleToggleProfileActive = (id: string) => {
    // Only one profile can be manually active at a time
    const updated = profiles.map(p => ({ ...p, isActive: p.id === id ? !p.isActive : false }));
    handleUpdateProfiles(updated);
    const toggled = updated.find(p => p.id === id);
    showToast(toggled?.isActive ? `"${toggled.name}" is now active!` : "Profile deactivated.", "info");
    triggerHaptic(20);
  };

  const handleAddProfileBlock = () => {
    if (!profileBlockForm.title.trim()) return;
    const newBlock: ProfileBlock = {
      id: `pb-${Date.now()}`,
      title: profileBlockForm.title.trim(),
      start_time: profileBlockForm.start_time,
      end_time: profileBlockForm.end_time,
      color: profileBlockForm.color
    };
    setProfileForm(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    setProfileBlockForm({ title: "", start_time: "09:00", end_time: "10:00", color: "#E24B4A" });
  };

  const handleRemoveProfileBlock = (blockId: string) => {
    setProfileForm(prev => ({ ...prev, blocks: prev.blocks.filter(b => b.id !== blockId) }));
  };

  // Check for goal check-ins once per day
  useEffect(() => {
    if (goals.length === 0) return;
    const checkGoalCheckIns = () => {
      const dueGoals = getGoalsDueForCheckIn(goals);
      if (dueGoals.length > 0 && !activeGoalCheckIn) {
        // Find the first goal that needs check-in
        const firstGoal = dueGoals[0];
        const prompt = generateCheckInPrompt(firstGoal);
        setActiveGoalCheckIn({ goal: firstGoal, prompt });
      }
    };

    checkGoalCheckIns();
    const interval = setInterval(checkGoalCheckIns, 3600000); // Check hourly
    return () => clearInterval(interval);
  }, [goals, activeGoalCheckIn]);

  const handleOpenCreateGoal = (initialValues?: { title: string; category: GoalCategory; keywords: string[]; targetValue: number; metricLabel: string }) => {
    setEditingGoal(null);
    setGoalForm({
      title: initialValues?.title || "",
      category: initialValues?.category || "fitness",
      description: "",
      metricLabel: initialValues?.metricLabel || "sessions",
      currentValue: 0,
      targetValue: initialValues?.targetValue || 10,
      targetDate: "",
      linkedTaskKeywords: initialValues?.keywords.join(", ") || ""
    });
    setActiveBottomSheet("goal");
    triggerHaptic(20);
  };

  const handleSaveGoal = () => {
    if (!goalForm.title.trim()) {
      showToast("Please enter a goal title", "warning");
      return;
    }
    
    const keywords = goalForm.linkedTaskKeywords
      .split(",")
      .map(k => k.trim())
      .filter(k => k !== "");
      
    const milestones = generateMilestones(goalForm.targetValue, goalForm.metricLabel);

    const today = new Date().toISOString().split("T")[0];
    const nextCheckIn = new Date();
    nextCheckIn.setDate(nextCheckIn.getDate() + 7); // Default check-in frequency: 7 days

    if (editingGoal) {
      const updated = goals.map(g => g.id === editingGoal.id ? {
        ...g,
        title: goalForm.title.trim(),
        category: goalForm.category,
        description: goalForm.description || undefined,
        metricLabel: goalForm.metricLabel,
        targetValue: goalForm.targetValue,
        targetDate: goalForm.targetDate || undefined,
        linkedTaskKeywords: keywords,
        milestones: g.targetValue === goalForm.targetValue ? g.milestones : milestones
      } : g);
      setGoals(updated);
      saveGoals(updated);
      showToast(`Goal "${goalForm.title}" updated!`, "success");
    } else {
      const newGoal: UserGoal = {
        id: `goal-${Date.now()}`,
        title: goalForm.title.trim(),
        category: goalForm.category,
        description: goalForm.description || undefined,
        metricLabel: goalForm.metricLabel,
        currentValue: goalForm.currentValue,
        targetValue: goalForm.targetValue,
        startValue: goalForm.currentValue,
        createdAt: new Date().toISOString(),
        targetDate: goalForm.targetDate || undefined,
        status: "active",
        milestones,
        checkInFrequencyDays: 7,
        nextCheckInAt: nextCheckIn.toISOString().split("T")[0],
        linkedTaskKeywords: keywords,
        progressLog: [{ date: today, value: goalForm.currentValue }]
      };
      const updated = [...goals, newGoal];
      setGoals(updated);
      saveGoals(updated);
      showToast(`Goal "${goalForm.title}" created!`, "success");
    }
    setActiveBottomSheet(null);
    triggerHaptic(30);
  };

  const handleOpenEditGoal = (goal: UserGoal) => {
    setEditingGoal(goal);
    setGoalForm({
      title: goal.title,
      category: goal.category,
      description: goal.description || "",
      metricLabel: goal.metricLabel,
      currentValue: goal.currentValue,
      targetValue: goal.targetValue,
      targetDate: goal.targetDate || "",
      linkedTaskKeywords: goal.linkedTaskKeywords.join(", ")
    });
    setActiveBottomSheet("goal");
    triggerHaptic(20);
  };

  const handleDeleteGoal = (goalId: string) => {
    const updated = goals.filter(g => g.id !== goalId);
    setGoals(updated);
    saveGoals(updated);
    showToast("Goal deleted.", "info");
    triggerHaptic(20);
  };

  const handleToggleGoalPause = (goalId: string) => {
    const updated = goals.map(g => {
      if (g.id === goalId) {
        const newStatus = g.status === "active" ? "paused" as const : "active" as const;
        showToast(newStatus === "active" ? `"${g.title}" activated!` : `"${g.title}" paused.`, "info");
        return { ...g, status: newStatus };
      }
      return g;
    });
    setGoals(updated);
    saveGoals(updated);
    triggerHaptic(20);
  };

  const handleCheckInResponse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeGoalCheckIn) return;
    
    const { goal } = activeGoalCheckIn;
    const value = parseFloat(checkInResponseVal);
    
    if (isNaN(value)) {
      showToast("Please enter a valid number", "warning");
      return;
    }
    
    // Update goal value
    const today = new Date().toISOString().split("T")[0];
    const newLog = { date: today, value };
    
    // Check milestones and achievements
    const newAchievements: Achievement[] = [];
    const updatedMilestones = goal.milestones.map(milestone => {
      if (!milestone.achievedAt && value >= milestone.targetValue) {
        newAchievements.push({
          id: `ach-${Date.now()}-${milestone.id}`,
          title: milestone.label,
          description: `You reached ${milestone.targetValue} ${goal.metricLabel} for "${goal.title}"`,
          category: goal.category,
          earnedAt: new Date().toISOString(),
          icon: "⭐",
          goalId: goal.id,
        });
        return { ...milestone, achievedAt: new Date().toISOString() };
      }
      return milestone;
    });
    
    let status = goal.status;
    let achievedAt = goal.achievedAt;
    if (value >= goal.targetValue && goal.status === "active") {
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
    
    // Set next check-in date
    const nextCheckIn = new Date();
    nextCheckIn.setDate(nextCheckIn.getDate() + goal.checkInFrequencyDays);
    
    const updatedGoals = goals.map(g => g.id === goal.id ? {
      ...g,
      currentValue: value,
      status,
      achievedAt,
      lastCheckInAt: today,
      nextCheckInAt: nextCheckIn.toISOString().split("T")[0],
      milestones: updatedMilestones,
      progressLog: [...g.progressLog, newLog]
    } : g);
    
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
    
    if (newAchievements.length > 0) {
      const updatedAch = [...achievements, ...newAchievements];
      setAchievements(updatedAch);
      saveAchievements(updatedAch);
      newAchievements.forEach(ach => showToast(`${ach.icon} ${ach.title}`, "success"));
    }
    
    setActiveGoalCheckIn(null);
    setCheckInResponseVal("");
    showToast("Goal progress logged successfully!", "success");
    triggerHaptic(35);
  };



  const checkDayComplete = (updatedFlexTasks: any[]) => {
    // Find all flexible tasks currently scheduled for today's selectedDate
    const todayTasks = updatedFlexTasks.filter(t => t.scheduled_date === selectedDate);
    if (todayTasks.length > 0 && todayTasks.every(t => t.status === "done")) {
      const todayStr = new Date().toISOString().split("T")[0];
      const lastSummaryDate = localStorage.getItem("dayflow_last_summary_prompt_date");
      if (lastSummaryDate !== todayStr) {
        setShowDaySummaryReminder(true);
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Day Complete! 🌟", {
            body: "Great job completing your schedule! Click here to discuss your day and plan tomorrow with AI.",
            tag: "dayflow-summary"
          });
        }
      }
    }
  };

  const handleToggleTaskDone = (taskId: string) => {
    const matched = flexibleTasks.find(t => t.id === taskId);
    if (!matched) return;

    if (matched.status === "done") {
      // Undo completion
      const updated = flexibleTasks.map(t =>
        t.id === taskId ? {
          ...t,
          status: "scheduled" as const,
          actual_duration_minutes: undefined,
          completed_at: undefined,
        } : t
      );
      handleUpdateFlexible(updated);
      const dateKey = matched.scheduled_date || TODAY;
      const filteredLogs = taskExecutionLogs.filter(log => log.taskId !== taskId || log.date !== dateKey);
      setTaskExecutionLogs(filteredLogs);
      saveTaskExecutionLogs(filteredLogs);
      return;
    }

    // PASSIVE inference — no modal, no timer
    const now = new Date();
    const nowMins = now.getHours() * 60 + now.getMinutes();

    // Find when this task was scheduled to start today
    const scheduledItem = daySchedule.items.find(i => i.id === taskId);
    let inferredDuration = matched.duration_minutes; // fallback = estimate

    const startVal = matched.actual_start_time || scheduledItem?.start_time;
    if (startVal) {
      const startMins = timeToMinutes(startVal);
      const elapsed = nowMins - startMins;

      // 1. Overlap Check: Ensure this passive window doesn't overlap with any already completed task today
      const todayStr = now.toISOString().split("T")[0];
      const completedToday = flexibleTasks.filter(t => 
        t.id !== taskId && 
        t.status === "done" && 
        t.completed_at && 
        t.completed_at.startsWith(todayStr) &&
        t.actual_start_time &&
        t.actual_duration_minutes
      );

      let overlaps = false;
      for (const other of completedToday) {
        const otherStartMins = timeToMinutes(other.actual_start_time!);
        const otherEndMins = otherStartMins + other.actual_duration_minutes!;
        if (startMins < otherEndMins && otherStartMins < nowMins) {
          overlaps = true;
          break;
        }
      }

      if (overlaps) {
        // Fallback to original estimate due to overlap
        inferredDuration = matched.duration_minutes;
      } else {
        // Use elapsed duration if plausible (between 50% and 250% of estimate)
        const lower = matched.duration_minutes * 0.5;
        const upper = matched.duration_minutes * 2.5;
        if (elapsed > lower && elapsed < upper) {
          inferredDuration = elapsed;
        }
      }
    }

    const updated = flexibleTasks.map(t =>
      t.id === taskId ? {
        ...t,
        status: "done" as const,
        actual_duration_minutes: inferredDuration,
        completed_at: now.toISOString(),
        actual_start_time: startVal,
        category: t.category || getTaskCategory(t.title),
      } : t
    );

    handleUpdateFlexible(updated);
    recordTaskExecutionLog(taskId, true, false, inferredDuration);
    checkDayComplete(updated);
    showToast("Done! Keep going.", "success");
    triggerHaptic(40);
  };


  const handleDeleteFixed = (id: string) => {
    handleUpdateFixed(fixedBlocks.filter((b) => b.id !== id));
    showToast("Fixed block deleted.", "info");
    triggerHaptic(25);
  };

  const handleDeleteFlexible = (id: string) => {
    handleUpdateFlexible(flexibleTasks.filter((t) => t.id !== id));
    setDeletingTaskId(null);
    showToast("Backlog task deleted.", "info");
    triggerHaptic(25);
  };

  // Navigation Calendar dates helper list
  const nextTwoWeeks = useMemo(() => {
    const days = [];
    const [year, monthVal, dayVal] = selectedDate.split("-").map(Number);
    const base = new Date(year, monthVal - 1, dayVal, 12, 0, 0);
    // Let's generate a beautiful weekly stripe (Centered around active date)
    const startOfWeek = new Date(base);
    startOfWeek.setDate(base.getDate() - 3); // 3 days back, 11 days forward

    for (let i = 0; i < 14; i++) {
      const nextDay = new Date(startOfWeek);
      nextDay.setDate(startOfWeek.getDate() + i);
      const label = nextDay.toLocaleDateString("en-US", { weekday: "short" });
      const num = nextDay.getDate();
      const isoStr = getLocalTodayStr(nextDay);
      
      const dayFixed = fixedBlocks.filter(b => isFixedBlockActiveOnDate(b, isoStr));
      const dayFlexible = flexibleTasks.filter(t => t.scheduled_date === isoStr);
      
      days.push({
        label,
        num,
        isoStr,
        isToday: isoStr === TODAY,
        hasFixed: dayFixed.length > 0,
        hasFlex: dayFlexible.length > 0,
        totalItems: dayFixed.length + dayFlexible.length
      });
    }
    return days;
  }, [selectedDate, fixedBlocks, flexibleTasks]);

  // Calendar monthly dates generator
  const currentMonthGrid = useMemo(() => {
    const [year, monthVal, dayVal] = selectedDate.split("-").map(Number);
    const cursor = new Date(year, monthVal - 1, 1, 12, 0, 0); // First of the month at noon
    const month = cursor.getMonth();

    // Start of grid (Sunday block offset)
    const dayOfWeek = cursor.getDay();
    const gridStart = new Date(cursor);
    gridStart.setDate(gridStart.getDate() - dayOfWeek);

    const cells = [];
    // Generate 35 cells for month view
    for (let i = 0; i < 35; i++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      const dStr = getLocalTodayStr(day);

      const dayFixed = fixedBlocks.filter(b => isFixedBlockActiveOnDate(b, dStr));
      const dayFlexible = flexibleTasks.filter(t => t.scheduled_date === dStr);

      cells.push({
        num: day.getDate(),
        dateStr: dStr,
        isCurrentMonth: day.getMonth() === month,
        isToday: dStr === TODAY,
        isSelected: dStr === selectedDate,
        hasFixed: dayFixed.length > 0,
        hasFlex: dayFlexible.length > 0
      });
    }
    return cells;
  }, [selectedDate, fixedBlocks, flexibleTasks]);

  // Handle month jump
  const handleMonthChange = (direction: "prev" | "next") => {
    const [year, monthVal, dayVal] = selectedDate.split("-").map(Number);
    const current = new Date(year, monthVal - 1, dayVal, 12, 0, 0);
    current.setMonth(current.getMonth() + (direction === "next" ? 1 : -1));
    setSelectedDate(getLocalTodayStr(current));
  };

  // Filter Backlog items
  const filteredBacklogTasks = useMemo(() => {
    // Only non-scheduled (or unassigned) tasks count as Backlog
    const backlog = flexibleTasks.filter((t) => t.scheduled_date === null);
    
    switch (backlogFilter) {
      case "deadline":
        return backlog.filter((t) => t.deadline !== null && t.status !== "done");
      case "anytime":
        return backlog.filter((t) => t.deadline === null && t.status !== "done");
      case "done":
        // Show backlog tasks marked done or all historical completed
        return flexibleTasks.filter((t) => t.status === "done");
      case "all":
      default:
        return backlog.filter((t) => t.status !== "done");
    }
  }, [flexibleTasks, backlogFilter]);

  // Task completes ratio
  const completedTodayPercentage = useMemo(() => {
    const scheduled = daySchedule.items.filter((item) => item.type === "flexible");
    if (scheduled.length === 0) return 0;
    const completed = scheduled.filter((s) => s.status === "done");
    return Math.round((completed.length / scheduled.length) * 100);
  }, [daySchedule]);

  const totalCompletedScheduledCount = useMemo(() => {
    const scheduled = daySchedule.items.filter((item) => item.type === "flexible");
    const completed = scheduled.filter((s) => s.status === "done");
    return `${completed.length} of ${scheduled.length} complete`;
  }, [daySchedule]);

  // ── Execution Engine Computed Values ─────────────────────────────────────────
  // Task that is happening RIGHT NOW (for the glow ring)
  const activeNowTask = useMemo(() => {
    if (selectedDate !== TODAY) return null;
    return daySchedule.items.find(item =>
      item.type === "flexible" &&
      item.status !== "done" &&
      timeToMinutes(item.start_time) <= currentTimeMins &&
      currentTimeMins < timeToMinutes(item.end_time)
    ) || null;
  }, [daySchedule.items, currentTimeMins, selectedDate]);

  // Very next upcoming task (for the "Next →" chip)
  const upNextTask = useMemo(() => {
    if (selectedDate !== TODAY) return null;
    return daySchedule.items.find(item =>
      item.type === "flexible" &&
      item.status !== "done" &&
      timeToMinutes(item.start_time) > currentTimeMins
    ) || null;
  }, [daySchedule.items, currentTimeMins, selectedDate]);

  // Named execution score (flexible tasks only)
  const executionScore = useMemo(() => {
    const todayFlex = daySchedule.items.filter(i => i.type === "flexible");
    if (todayFlex.length === 0) return null;
    const done = todayFlex.filter(i => i.status === "done").length;
    return { score: Math.round((done / todayFlex.length) * 100), done, total: todayFlex.length };
  }, [daySchedule.items]);

  // Momentum state derived from streak + today's score
  const momentumState = useMemo((): "high" | "stable" | "low" => {
    const score = executionScore?.score ?? 0;
    if (completedStreak >= 5 && score >= 75) return "high";
    if (completedStreak >= 2 && score >= 50) return "stable";
    return "low";
  }, [completedStreak, executionScore]);

  // Hybrid Classifier Funnel (Rules -> Vocabulary Map -> AI Fallback)
  const classifyTaskHybrid = useCallback(async (title: string, description = "") => {
    if (!title.trim()) return null;
    
    // 1. Run local rules + vocabulary mapping classifier
    const localResult = classifyTaskLocally(title, description, goals);
    
    // If local rules match with high confidence, return immediately
    if (localResult.confidence >= 0.75) {
      return localResult;
    }
    
    // 2. Fall back to AI classification endpoint on low confidence
    try {
      const res = await fetch("/api/classify-task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.meta && data.confidence !== undefined) {
          return {
            meta: data.meta,
            confidence: data.confidence,
            source: data.source || "ai"
          } as ClassificationResult;
        }
      }
    } catch (err) {
      console.warn("Backend classification failed, falling back to local rules:", err);
    }
    
    return localResult;
  }, [goals]);

  const handleTitleBlur = useCallback(async () => {
    const title = flexibleForm.title.trim();
    if (!title) return;
    const result = await classifyTaskHybrid(title, "");
    if (result) {
      setFlexibleForm(prev => ({
        ...prev,
        category: result.meta.category,
        rigidity: result.meta.rigidity,
        importance: result.meta.importance,
        recoverability: result.meta.recoverability,
        dependency_chain: result.meta.dependency_chain,
        progress_type: result.meta.progress_type,
        deadline_pressure: result.meta.deadline_pressure,
        task_flexibility: result.meta.rigidity === "fixed" ? "fixed" : result.meta.rigidity === "flexible" ? "optional" : "movable"
      }));
      setClassificationFeedback({
        category: result.meta.category,
        confidence: result.confidence,
        source: result.source
      });
      if (result.confidence < 0.7) {
        setIsMetadataOpen(true);
      }
    }
  }, [flexibleForm.title, classifyTaskHybrid]);

  // Fetch AI consequence insight for a task (lazy, cached in consequenceCache)
  const fetchConsequenceInsight = useCallback(async (
    task: FlexibleTask,
    intent: import("./types").ConsequenceIntent = "skip",
    delayMins = 0
  ) => {
    // Find todayFlexCount for streak break calculation
    const todayFlexCount = daySchedule.items.filter(i => i.type === "flexible").length;
    
    // Calculate consequence core locally
    const delayResult = simulateDelayCost(
      daySchedule.items,
      task.id,
      delayMins,
      appSettings.day_end,
      todayFlexCount,
      flexibleTasks,
      completedStreak
    );
    const consequenceCore = delayResult.core;
    
    // Construct cache key
    const cacheKey = getConsequenceCacheKey(task, intent, delayMins, daySchedule.items, completedStreak, selectedDate);
    
    // Check consequenceCache state
    if (consequenceCache[cacheKey]) {
      setOpenInsightTaskId(task.id);
      return consequenceCache[cacheKey];
    }
    
    setLoadingInsightTaskId(task.id);
    setOpenInsightTaskId(task.id);
    try {
      // Find linked goal context
      const linkedGoal = goals.find(g =>
        g.linkedTaskKeywords.some(kw => task.title.toLowerCase().includes(kw.toLowerCase()))
      );
      // Find recent completions of similar tasks
      const category = task.meta?.category || getTaskCategory(task.title);
      const recentSimilar = flexibleTasks
        .filter(t => t.status === "done" && (t.meta?.category || getTaskCategory(t.title)) === category && t.completed_at)
        .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
        .slice(0, 3)
        .map(t => {
          const daysAgo = Math.round((Date.now() - new Date(t.completed_at!).getTime()) / 86400000);
          return `${t.title} — ${daysAgo} day${daysAgo !== 1 ? "s" : ""} ago`;
        });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, getTimeoutForOperation("consequence"));

      try {
        const res = await fetch("/api/task-consequence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            taskTitle: task.title,
            taskDescription: task.description || "",
            taskMeta: task.meta || classifyTaskLocally(task.title, task.description || "", goals).meta,
            consequenceCore,
            streakDays: completedStreak,
            linkedGoalTitle: linkedGoal?.title,
            linkedGoalProgress: linkedGoal ? `${linkedGoal.currentValue} / ${linkedGoal.targetValue} ${linkedGoal.metricLabel}` : undefined,
            recentCompletions: recentSimilar,
            userProfileName: profileName,
            intent,
            delayMins,
          }),
        });
        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error("Consequence API status non-ok");
        }

        const data = await res.json();
        if (data && !data.error) {
          // Cache the full consequence in consequenceCache state!
          setConsequenceCache(prev => ({
            ...prev,
            [cacheKey]: data
          }));
          
          // Also update task's local consequence teaser / insight for quick display if needed
          const updated = flexibleTasks.map(t =>
            t.id === task.id
              ? {
                  ...t,
                  consequence_insight: data.immediate_effect + " " + data.cascade_effect + " " + data.goal_effect,
                  consequence_teaser: data.immediate_effect,
                  consequence_generated_at: new Date().toISOString()
                }
              : t
          );
          handleUpdateFlexible(updated);
          return data as import("./types").TaskConsequence;
        }
      } catch (innerErr) {
        clearTimeout(timeoutId);
        throw innerErr;
      }
    } catch (err) {
      console.warn("Consequence API fetch failed, generating default consequence locally:", err);
    } finally {
      setLoadingInsightTaskId(null);
    }
    
    // Fallback: Generate local consequence
    const localRes = generateDefaultConsequence(task, goals, intent, delayMins, consequenceCore);
    const updatedConsequence = {
      ...localRes.consequence,
      negotiation_options: localRes.consequence.negotiation_options.map(opt => ({
        ...opt,
        command: {
          ...opt.command,
          params: opt.command.type === "shorten_duration" ? { reduced_duration: Math.max(20, Math.round(task.duration_minutes * 0.4)) } : opt.command.params
        }
      }))
    };
    setConsequenceCache(prev => ({
      ...prev,
      [cacheKey]: updatedConsequence
    }));
    return updatedConsequence;
  }, [goals, flexibleTasks, completedStreak, profileName, selectedDate, handleUpdateFlexible, consequenceCache, daySchedule.items, appSettings.day_end]);

  const handleMarkPartial = useCallback((taskId: string, reducedDuration: number) => {
    const updated = flexibleTasks.map(t =>
      t.id === taskId
        ? {
            ...t,
            duration_minutes: reducedDuration,
            partial_completion: true,
            partial_duration_minutes: reducedDuration,
          }
        : t
    );
    handleUpdateFlexible(updated);
    showToast(`Committed to reduced ${reducedDuration} min session. Streak safe!`, "success");
    triggerHaptic(30);
    setOpenInsightTaskId(null);
  }, [flexibleTasks, handleUpdateFlexible]);

  const findFirstSuitableGap = useCallback((taskDuration: number, currentTaskId: string) => {
    const dayStartMins = timeToMinutes(appSettings.day_start);
    const dayEndMins = timeToMinutes(appSettings.day_end);
    
    // Filter out the task itself
    const otherItems = daySchedule.items.filter(item => item.id !== currentTaskId);
    const sortedItems = [...otherItems].sort((a, b) => timeToMinutes(a.start_time) - timeToMinutes(b.start_time));
    
    // 1. Check gap at start of day
    if (sortedItems.length > 0) {
      const firstStart = timeToMinutes(sortedItems[0].start_time);
      if (firstStart - dayStartMins >= taskDuration) {
        return minutesToTime(dayStartMins);
      }
    } else {
      return appSettings.day_start;
    }
    
    // 2. Check gaps between items
    for (let i = 0; i < sortedItems.length - 1; i++) {
      const endMins = timeToMinutes(sortedItems[i].end_time);
      const nextStartMins = timeToMinutes(sortedItems[i + 1].start_time);
      const gap = nextStartMins - endMins;
      if (gap >= taskDuration) {
        return minutesToTime(endMins);
      }
    }
    
    // 3. Check gap at end of day
    if (sortedItems.length > 0) {
      const lastEndMins = timeToMinutes(sortedItems[sortedItems.length - 1].end_time);
      if (dayEndMins - lastEndMins >= taskDuration) {
        return minutesToTime(lastEndMins);
      }
    }
    
    return null;
  }, [daySchedule.items, appSettings]);

  const handleSplitTask = useCallback((task: FlexibleTask) => {
    const originalDuration = task.duration_minutes;
    const chunk1 = Math.round(originalDuration / 2);
    const chunk2 = originalDuration - chunk1;
    
    const updatedTasks = flexibleTasks.map(t =>
      t.id === task.id
        ? {
            ...t,
            duration_minutes: chunk1,
            title: `${task.title} (Part 1)`
          }
        : t
    );
    
    const newTask: FlexibleTask = {
      id: `flex-${Date.now()}`,
      title: `${task.title} (Part 2)`,
      duration_minutes: chunk2,
      deadline: task.deadline,
      energy_level: task.energy_level,
      status: "backlog",
      scheduled_date: null,
      importance: task.importance,
      task_flexibility: task.task_flexibility,
      meta: task.meta
    };
    
    handleUpdateFlexible([...updatedTasks, newTask]);
    showToast(`Split into two ${chunk1}m & ${chunk2}m chunks. Part 2 sent to backlog!`, "success");
    triggerHaptic(40);
    setOpenInsightTaskId(null);
  }, [flexibleTasks, handleUpdateFlexible]);

  const executeNegotiationCommand = useCallback((task: FlexibleTask, command: any) => {
    const type = command.type;
    const params = command.params || {};
    
    if (type === "shorten_duration" || type === "mark_partial") {
      const reduced = params.reduced_duration || Math.max(20, Math.round(task.duration_minutes * 0.4));
      handleMarkPartial(task.id, reduced);
    } else if (type === "move_to_gap") {
      const targetTime = findFirstSuitableGap(task.duration_minutes, task.id);
      if (targetTime) {
        const updated = flexibleTasks.map(t =>
          t.id === task.id ? { ...t, pinned_start_time: targetTime } : t
        );
        handleUpdateFlexible(updated);
        showToast(`Moved "${task.title}" to gap at ${targetTime}`, "success");
        triggerHaptic(20);
        setOpenInsightTaskId(null);
      } else {
        showToast("No exact gap fits this duration. Opening AI Copilot for slotting.", "info");
        setMoveSheetTaskId(task.id);
        handleOpenAICopilot();
        setCopilotInput(`Find a slot or make space to move "${task.title}" to later today.`);
      }
    } else if (type === "split_into_chunks") {
      handleSplitTask(task);
    } else if (type === "swap_tasks") {
      const otherFlex = daySchedule.items.find(i => i.type === "flexible" && i.id !== task.id);
      if (otherFlex) {
        const taskA = task;
        const taskB = flexibleTasks.find(t => t.id === otherFlex.id);
        if (taskB) {
          const pinA = taskA.pinned_start_time;
          const pinB = taskB.pinned_start_time;
          const prioA = taskA.priority;
          const prioB = taskB.priority;
          
          const updated = flexibleTasks.map(t => {
            if (t.id === taskA.id) {
              return { ...t, pinned_start_time: pinB, priority: prioB };
            }
            if (t.id === taskB.id) {
              return { ...t, pinned_start_time: pinA, priority: prioA };
            }
            return t;
          });
          handleUpdateFlexible(updated);
          showToast(`Swapped slots of "${taskA.title}" and "${taskB.title}"`, "success");
          triggerHaptic(30);
          setOpenInsightTaskId(null);
        }
      } else {
        showToast("No other flexible task scheduled to swap with today.", "warning");
      }
    }
  }, [flexibleTasks, handleUpdateFlexible, findFirstSuitableGap, handleMarkPartial, handleSplitTask, daySchedule.items, handleOpenAICopilot]);

  // Onboarding handlers
  const handleAddOnboardingBlock = () => {
    if (!onboardingForm.title.trim()) return;
    const block: FixedBlock = {
      id: `onb-${Date.now()}`,
      title: onboardingForm.title.trim(),
      start_time: onboardingForm.start_time,
      end_time: onboardingForm.end_time,
      repeats: onboardingForm.repeats,
      locked: true,
      date: TODAY,
      color: onboardingForm.color,
      daysOfWeek: onboardingForm.daysOfWeek
    };
    setOnboardingBlocks(prev => [...prev, block]);
    setOnboardingForm({ title: "", start_time: "09:00", end_time: "10:00", repeats: "daily", color: "#E24B4A", daysOfWeek: [1, 2, 3, 4, 5] });
  };

  const handleRemoveOnboardingBlock = (id: string) => {
    setOnboardingBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleSaveRoutineBlock = () => {
    if (!routineBlockForm.title.trim()) return;
    if (editingRoutineBlockId) {
      setRoutineBlocks(prev => prev.map(r => r.id === editingRoutineBlockId ? {
        ...r,
        title: routineBlockForm.title.trim(),
        startTime: routineBlockForm.startTime,
        endTime: routineBlockForm.endTime,
        daysOfWeek: routineBlockForm.daysOfWeek,
        type: routineBlockForm.type,
        rigidity: routineBlockForm.rigidity
      } : r));
      setEditingRoutineBlockId(null);
      showToast("Routine block updated!", "success");
    } else {
      const newBlock: RoutineBlock = {
        id: `routine-${Date.now()}`,
        title: routineBlockForm.title.trim(),
        startTime: routineBlockForm.startTime,
        endTime: routineBlockForm.endTime,
        daysOfWeek: routineBlockForm.daysOfWeek,
        type: routineBlockForm.type,
        rigidity: routineBlockForm.rigidity
      };
      setRoutineBlocks(prev => [...prev, newBlock]);
      showToast("Routine block created!", "success");
    }
    setRoutineBlockForm({
      title: "",
      startTime: "09:00",
      endTime: "10:00",
      daysOfWeek: [1, 2, 3, 4, 5],
      type: "custom",
      rigidity: "soft"
    });
  };

  const handleStartEditRoutineBlock = (r: RoutineBlock) => {
    setEditingRoutineBlockId(r.id);
    setRoutineBlockForm({
      title: r.title,
      startTime: r.startTime,
      endTime: r.endTime,
      daysOfWeek: r.daysOfWeek,
      type: r.type,
      rigidity: r.rigidity
    });
  };

  const handleDeleteRoutineBlock = (id: string) => {
    setRoutineBlocks(prev => prev.filter(r => r.id !== id));
    showToast("Routine block deleted.", "info");
  };

  const toggleDayInRoutineBlockForm = (dayNum: number) => {
    setRoutineBlockForm(prev => {
      const exists = prev.daysOfWeek.includes(dayNum);
      const days = exists 
        ? prev.daysOfWeek.filter(d => d !== dayNum)
        : [...prev.daysOfWeek, dayNum].sort();
      return { ...prev, daysOfWeek: days };
    });
  };

  const handleCompleteOnboarding = () => {
    const profile: OnboardingProfile = {
      completed: true,
      sleep_start: onboardingSleep.wake,
      sleep_end: onboardingSleep.sleep,
      energy_pattern: onboardingSleep.energy,
      goals: [],
      struggles: [],
      planning_style: "underestimate",
      role: onboardingRole
    };
    localStorage.setItem("dayflow_onboarding_profile", JSON.stringify(profile));

    // Save sleep settings
    const newSettings = { day_start: onboardingSleep.wake, day_end: onboardingSleep.sleep };
    setAppSettings(newSettings);
    saveSettings(newSettings);

    // Save routines/fixed commitments
    handleUpdateFixed(onboardingBlocks);

    // Setup pending questions queue
    const initialPending: PendingQuestion[] = [
      {
        id: "goals",
        question: "What is your primary goal for the next 30 days? (e.g. gym streak, study hours, project launch)",
        priority: "high"
      },
      {
        id: "struggles",
        question: "What is your biggest daily struggle? (e.g. procrastination, low energy, distraction, overplanning)",
        priority: "medium"
      },
      {
        id: "habits",
        question: "Are there any daily habits you want me to help you schedule and maintain? (e.g. reading, meditation)",
        priority: "low"
      }
    ];

    // Pop the first question to inject in the welcome greeting
    const firstQ = initialPending[0];
    const remainingPending = initialPending.slice(1);
    setPendingQuestions(remainingPending);
    localStorage.setItem("dayflow_pending_questions", JSON.stringify(remainingPending));
    setInjectedQuestionThisSession(true);

    // Create the welcome greeting
    const greeting = `Welcome to DayFlow! 🚀 I'm your Day Coach.\n\nI've configured your base profile as a **${onboardingRole}** with wake hours **${onboardingSleep.wake} - ${onboardingSleep.sleep}**.\n\nTo start off, let me ask: ${firstQ.question}`;
    setChatHistory([{ sender: "ai", text: greeting }]);
    
    // Auto-open Day Coach
    setCopilotInput("");
    setCopilotError(null);
    setProposedChanges(null);
    setCopilotMinimized(false);
    setActiveBottomSheet("assistant");

    markOnboardingComplete();
    setShowOnboarding(false);
    showToast("Setup complete! Your execution coach is ready.", "success");
    triggerHaptic([30, 20, 30]);
  };

  const handleSkipOnboarding = () => {
    const profile: OnboardingProfile = {
      completed: true,
      sleep_start: "07:00",
      sleep_end: "23:00",
      energy_pattern: "morning",
      goals: [],
      struggles: [],
      planning_style: "underestimate",
      role: "working"
    };
    localStorage.setItem("dayflow_onboarding_profile", JSON.stringify(profile));
    
    const initialPending: PendingQuestion[] = [
      {
        id: "goals",
        question: "What is your primary goal for the next 30 days? (e.g. gym streak, study hours, project launch)",
        priority: "high"
      },
      {
        id: "struggles",
        question: "What is your biggest daily struggle? (e.g. procrastination, low energy, distraction, overplanning)",
        priority: "medium"
      },
      {
        id: "habits",
        question: "Are there any daily habits you want me to help you schedule and maintain? (e.g. reading, meditation)",
        priority: "low"
      }
    ];
    
    const firstQ = initialPending[0];
    const remainingPending = initialPending.slice(1);
    setPendingQuestions(remainingPending);
    localStorage.setItem("dayflow_pending_questions", JSON.stringify(remainingPending));
    setInjectedQuestionThisSession(true);

    const greeting = `Welcome to DayFlow! 🚀 I'm your Day Coach.\n\nI've configured your base profile as a **working** professional with wake hours **07:00 - 23:00**.\n\nTo start off, let me ask: ${firstQ.question}`;
    setChatHistory([{ sender: "ai", text: greeting }]);
    
    setCopilotInput("");
    setCopilotError(null);
    setProposedChanges(null);
    setCopilotMinimized(false);
    setActiveBottomSheet("assistant");

    markOnboardingComplete();
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    const steps = ["welcome", "identity", "sleep", "fixed"] as const;
    const currentStepIdx = steps.indexOf(onboardingStep);
    
    return (
      <div className="h-[100dvh] w-screen bg-gradient-to-br from-[#F0EFFE] via-[#F8F9FA] to-[#E8F5EF] flex items-center justify-center p-4 overflow-hidden z-50 relative select-none">
        {/* Ambient blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-violet-400/15 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-400/10 blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
          {/* Header Progress Indicators */}
          {onboardingStep !== "welcome" && (
            <div className="px-6 pt-5 pb-3 bg-white/50 border-b border-neutral-100 shrink-0">
              <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-widest mb-2">
                <span>Setup Progress</span>
                <span>Step {currentStepIdx} of {steps.length - 1}</span>
              </div>
              <div className="h-1.5 bg-neutral-100 rounded-full flex overflow-hidden">
                {steps.slice(1).map((s, idx) => (
                  <div 
                    key={s} 
                    className={`flex-1 h-full border-r border-white last:border-0 transition-all duration-300 ${
                      idx < currentStepIdx ? "bg-primary" : "bg-neutral-200/60"
                    }`} 
                  />
                ))}
              </div>
            </div>
          )}

          {/* Dynamic Step Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
            {onboardingStep === "welcome" && (
              <div className="flex flex-col items-center text-center gap-5 py-4">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                  <Sparkles className="w-8 h-8 text-white fill-white/10" />
                </div>
                <div className="space-y-2">
                  <h1 className="font-display font-black text-2xl text-neutral-900 tracking-tight">Meet DayFlow</h1>
                  <span className="inline-block text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">Behavioral Execution Coach</span>
                  <p className="text-xs text-neutral-500 leading-relaxed max-w-sm mx-auto">
                    Traditional planners ask you to schedule tasks. DayFlow learns how you *actually* execute them, intervening to reduce resistance and prevent slips.
                  </p>
                </div>
              </div>
            )}

            {onboardingStep === "identity" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display font-black text-lg text-neutral-900">What is your primary role?</h2>
                  <p className="text-xs text-neutral-500">Select your current profile to help tailor advice.</p>
                </div>

                <div className="grid grid-cols-1 gap-2.5">
                  {[
                    { id: "student", label: "🎓 Student", desc: "Classes, exams, assignment prep, lectures" },
                    { id: "working", label: "💼 Working Professional", desc: "Meetings, structured work, routine daily tasks" },
                    { id: "freelancer", label: "💻 Freelancer / Builder", desc: "Self-directed work, coding projects, client milestones" },
                    { id: "exam_prep", label: "📝 Exam Prep / General", desc: "Intense self-study, study streaks, structured timeline" }
                  ].map(opt => {
                    const isSelected = onboardingRole === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setOnboardingRole(opt.id as any)}
                        className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected 
                            ? "bg-primary/5 border-primary text-primary" 
                            : "bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200/80"
                        }`}
                      >
                        <div className="space-y-0.5">
                          <span className="text-xs font-bold block">{opt.label}</span>
                          <span className={`text-[10px] leading-relaxed block ${isSelected ? "text-primary/70" : "text-neutral-450"}`}>{opt.desc}</span>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isSelected ? "border-primary bg-primary" : "border-neutral-300 bg-white"
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {onboardingStep === "sleep" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display font-black text-lg text-neutral-900">Sleep & Energy Profile</h2>
                  <p className="text-xs text-neutral-500">Establishing your baseline wake hours helps place slots.</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-450 uppercase tracking-wider">Wake Up Time</label>
                    <input 
                      type="time" 
                      value={onboardingSleep.wake} 
                      onChange={e => setOnboardingSleep({ ...onboardingSleep, wake: e.target.value })} 
                      className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white font-mono focus:outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-neutral-450 uppercase tracking-wider">Sleep/Winddown</label>
                    <input 
                      type="time" 
                      value={onboardingSleep.sleep} 
                      onChange={e => setOnboardingSleep({ ...onboardingSleep, sleep: e.target.value })} 
                      className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white font-mono focus:outline-none focus:ring-1 focus:ring-primary" 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-neutral-450 uppercase tracking-wider">When do you feel best?</label>
                  <p className="text-[10px] text-neutral-400">Warm-starts the circadian rhythm focus peaks model.</p>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { key: "morning", label: "☀️ Morning Focus", desc: "Best work before lunch" },
                      { key: "afternoon", label: "🌤 Afternoon Drive", desc: "Peak from 1 PM to 5 PM" },
                      { key: "night", label: "🌙 Night Owl Focus", desc: "Productive after dinner" },
                      { key: "inconsistent", label: "🌀 Inconsistent", desc: "Varies day-to-day" }
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => setOnboardingSleep({ ...onboardingSleep, energy: opt.key as any })}
                        className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                          onboardingSleep.energy === opt.key
                            ? "bg-primary/5 border-primary text-primary"
                            : "bg-white hover:bg-neutral-50 text-neutral-700 border-neutral-200"
                        }`}
                      >
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className={`text-[10px] ${onboardingSleep.energy === opt.key ? "text-primary/70" : "text-neutral-450"}`}>{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {onboardingStep === "fixed" && (
              <div className="space-y-5">
                <div className="space-y-1">
                  <h2 className="font-display font-black text-lg text-neutral-900">Fixed Commitments</h2>
                  <p className="text-xs text-neutral-500">Lock down hours you cannot schedule tasks in (classes, office, routines).</p>
                </div>

                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3 font-sans">
                  <h4 className="text-xs font-bold text-[#5A5A7A] uppercase tracking-wider">Add Commitment Block</h4>
                  <input
                    type="text"
                    placeholder="e.g. Math Class, Office Work, Gym"
                    value={onboardingForm.title}
                    onChange={e => setOnboardingForm({ ...onboardingForm, title: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && handleAddOnboardingBlock()}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-450 uppercase tracking-wider mb-0.5">Start Time</label>
                      <input type="time" value={onboardingForm.start_time} onChange={e => setOnboardingForm({ ...onboardingForm, start_time: e.target.value })} className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-neutral-450 uppercase tracking-wider mb-0.5">End Time</label>
                      <input type="time" value={onboardingForm.end_time} onChange={e => setOnboardingForm({ ...onboardingForm, end_time: e.target.value })} className="w-full px-2 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex gap-1.5">
                      {(["none", "daily", "weekdays"] as const).map(rep => (
                        <button
                          key={rep}
                          type="button"
                          onClick={() => setOnboardingForm({ 
                            ...onboardingForm, 
                            repeats: rep,
                            daysOfWeek: rep === "weekdays" ? [1, 2, 3, 4, 5] : (rep === "daily" ? [0, 1, 2, 3, 4, 5, 6] : [])
                          })}
                          className={`flex-1 py-1 text-[10px] rounded-lg font-bold border capitalize cursor-pointer ${
                            onboardingForm.repeats === rep ? "bg-primary/10 text-primary border-primary" : "bg-white text-neutral-500 border-neutral-200"
                          }`}
                        >
                          {rep === "none" ? "Once" : rep}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-1 bg-neutral-50 p-1.5 rounded-lg border border-neutral-200/60 justify-center">
                      {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayLabel, index) => {
                        const active = onboardingForm.repeats === "custom" && onboardingForm.daysOfWeek?.includes(index);
                        return (
                          <button
                            key={dayLabel}
                            type="button"
                            onClick={() => {
                              let newDays = onboardingForm.daysOfWeek ? [...onboardingForm.daysOfWeek] : [];
                              if (onboardingForm.repeats !== "custom") {
                                newDays = [index];
                              } else {
                                if (newDays.includes(index)) {
                                  newDays = newDays.filter(d => d !== index);
                                } else {
                                  newDays = [...newDays, index].sort();
                                }
                              }
                              setOnboardingForm({
                                ...onboardingForm,
                                repeats: "custom",
                                daysOfWeek: newDays
                              });
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${
                              active 
                                ? "bg-primary text-white border-primary" 
                                : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50"
                            }`}
                          >
                            {dayLabel.slice(0, 1)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddOnboardingBlock}
                    disabled={!onboardingForm.title.trim()}
                    className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-primary-dark transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Block
                  </button>
                </div>

                {onboardingBlocks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-[#5A5A7A] uppercase tracking-wider">Commitments Added</h4>
                    {onboardingBlocks.map(block => (
                      <div key={block.id} className="flex items-center justify-between bg-white border border-neutral-100 rounded-xl px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: block.color }} />
                          <span className="text-xs font-bold text-neutral-800">{block.title}</span>
                          <span className="text-[10px] text-neutral-450 font-mono">({block.start_time}–{block.end_time})</span>
                        </div>
                        <button onClick={() => handleRemoveOnboardingBlock(block.id)} className="text-neutral-400 hover:text-red-500 p-0.5 rounded cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-6 bg-neutral-50/50 border-t border-neutral-100 flex items-center justify-between shrink-0 font-sans">
            {onboardingStep === "welcome" ? (
              <>
                <button
                  type="button"
                  onClick={handleSkipOnboarding}
                  className="px-4 py-3 text-xs font-bold border border-neutral-250 rounded-xl text-neutral-500 hover:bg-neutral-50 cursor-pointer transition-colors"
                >
                  Skip Onboarding
                </button>
                <button
                  type="button"
                  onClick={() => setOnboardingStep("sleep")}
                  className="px-5 py-3 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                  Set up Profile <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const idx = currentStepIdx;
                    if (idx > 0) setOnboardingStep(steps[idx - 1]);
                  }}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-500 hover:text-neutral-800 transition-colors cursor-pointer"
                >
                  Back
                </button>
                
                {currentStepIdx === steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleCompleteOnboarding}
                    className="px-5 py-3 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/10 transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3px]" /> Finish Setup
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingStep(steps[currentStepIdx + 1]);
                    }}
                    className="px-5 py-3 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                  >
                    Next <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  const renderCopilotContent = (isInline: boolean) => {
    const userPromptsCount = chatHistory.filter(m => m.sender === "user").length;
    const isCopilotFullScreen = !isInline && userPromptsCount >= 3 && !copilotMinimized;

    return (
      <div className="flex flex-col h-full overflow-hidden text-left bg-white p-0">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 gap-2 border-b border-neutral-200/40 pb-3 flex-shrink-0">
          <h3 className="font-display font-semibold text-sm md:text-base text-[#0F172A] flex items-center gap-1.5 shrink-0">
            <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-primary fill-primary/10 shrink-0" />
            <span>Day Coach</span>
            {!isInline && isCopilotFullScreen && (
              <span className="text-[10px] bg-indigo-50 text-primary font-bold px-2 py-0.5 rounded-full ml-1 font-display">
                Expanded
              </span>
            )}
          </h3>
          
          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            {/* Minimize / Expand Toggle */}
            {!isInline && userPromptsCount >= 3 && (
              <button
                type="button"
                onClick={() => setCopilotMinimized(prev => !prev)}
                className="px-2 py-1 text-[10px] font-bold border border-neutral-200 text-neutral-550 hover:text-neutral-700 hover:bg-neutral-50 rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200"
                title={copilotMinimized ? "Expand chat view" : "Minimize chat view"}
              >
                {copilotMinimized ? (
                  <>
                    <Maximize2 className="w-3 h-3 text-neutral-400" />
                    <span className="hidden sm:inline">Expand</span>
                  </>
                ) : (
                  <>
                    <Minimize2 className="w-3 h-3 text-neutral-400" />
                    <span className="hidden sm:inline">Minimize</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleResetCopilotChat}
              className="px-2 py-1 text-[10px] font-bold border border-neutral-200 text-neutral-550 hover:text-neutral-700 hover:bg-neutral-50 rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200 disabled:opacity-50"
              title="Reset chat context"
            >
              <RefreshCw className="w-3 h-3 text-neutral-400 group-hover:rotate-180 transition-transform" />
              <span>Reset</span>
            </button>
            
            <button
              type="button"
              onClick={() => handleSendCopilotMessage("Summarize my day and plan tomorrow")}
              disabled={isProcessingCopilot}
              className="px-2.5 py-1 text-[10px] md:text-xs font-bold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-dark hover:to-indigo-700 text-white rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-primary/10"
              title="Summarize my day and plan tomorrow"
            >
              <Sparkles className="w-3 h-3 fill-white/10 animate-pulse" />
              <span>Summarize & Plan</span>
            </button>

            {/* Exit/Close Chat button */}
            {!isInline && (
              <button
                type="button"
                onClick={() => {
                  setActiveBottomSheet(null);
                  setCopilotInput("");
                  setProposedChanges(null);
                  setChatHistory([]);
                }}
                className="p-1.5 rounded-full border border-neutral-200 hover:bg-neutral-50 text-neutral-555 hover:text-neutral-700 cursor-pointer active:scale-95 duration-200 shrink-0 ml-1"
                title="Close Copilot"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            )}
          </div>
        </div>

        {/* Content Container */}
        <div className="space-y-5 flex-1 flex flex-col min-h-0">
          
          {/* Copilot Chat Message Area */}
          <div ref={chatContainerRef} className="space-y-3 flex-1 overflow-y-auto pr-1 flex flex-col min-h-0 scrollbar-thin">
            {copilotError && (
              <div className="p-3.5 bg-amber-50/90 border border-amber-200/60 rounded-2xl text-xs text-amber-900 flex flex-col gap-2 animate-fade-in text-left shadow-xs">
                <div className="flex items-center gap-2 font-bold text-amber-800">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Troubleshooting Assistant</span>
                </div>
                <p className="text-[#5A5A7A] leading-relaxed text-[11px]">{copilotError}</p>
                <div className="flex items-center gap-3 mt-1 pt-1.5 border-t border-amber-200/50">
                  <button
                    type="button"
                    onClick={() => setCopilotError(null)}
                    className="text-[10px] font-bold text-amber-600 hover:text-amber-800 cursor-pointer"
                  >
                    Dismiss Notice
                  </button>
                  <span className="text-amber-300 text-[10px]">•</span>
                  <button
                    type="button"
                    onClick={handleResetCopilotChat}
                    className="text-[10px] font-bold text-primary hover:text-primary-dark cursor-pointer flex items-center gap-1"
                  >
                    <RefreshCw className="w-2.5 h-2.5" /> Reset AI Chat
                  </button>
                  {copilotError.indexOf("stopped") === -1 && copilotError.indexOf("cancelled") === -1 && (
                    <>
                      <span className="text-amber-300 text-[10px]">•</span>
                      <button
                        type="button"
                        onClick={handleTriggerOfflineFallback}
                        className="text-[10px] font-bold text-[#D97706] hover:text-amber-800 cursor-pointer flex items-center gap-1"
                      >
                        Use Offline Fallback
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            {chatHistory.map((msg, idx) => {
              const isAI = msg.sender === "ai";
              const isEditingThis = editingMessageIdx === idx;
              
              return (
                <div 
                  key={idx} 
                  className={`flex flex-col max-w-[85%] group/msg relative ${isAI ? "self-start" : "self-end ml-auto"}`}
                >
                  {isEditingThis ? (
                    <div className="p-3 bg-white border border-[#E0D9FF] rounded-2xl shadow-sm space-y-2 w-full text-left">
                      <textarea
                        value={editingMessageText}
                        onChange={(e) => setEditingMessageText(e.target.value)}
                        className="w-full p-2 border border-neutral-200 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary font-sans resize-none text-slate-800"
                        rows={2}
                      />
                      <div className="flex justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingMessageIdx(null)}
                          className="px-2 py-1 text-[10px] font-bold border border-neutral-200 text-neutral-550 rounded-lg hover:bg-neutral-50 cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHistory = chatHistory.slice(0, idx);
                            setEditingMessageIdx(null);
                            handleSendCopilotMessage(editingMessageText, updatedHistory);
                          }}
                          className="px-2.5 py-1 text-[10px] font-bold bg-primary text-white rounded-lg hover:bg-primary-dark cursor-pointer"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative">
                      <div 
                        className={`p-3.5 text-xs leading-relaxed ${
                          isAI 
                            ? "bg-[#F6F5FF] border border-[#E0D9FF] text-[#1F2937] rounded-xl font-medium shadow-none text-left" 
                            : "bg-primary text-white rounded-xl font-semibold shadow-[0_2px_4px_rgba(79,70,229,0.2)] text-left"
                        }`}
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {msg.text}
                      </div>
                      
                      {!isAI && !isProcessingCopilot && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMessageIdx(idx);
                            setEditingMessageText(msg.text);
                          }}
                          className="absolute -left-9 top-1/2 -translate-y-1/2 p-1.5 rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 text-neutral-450 hover:text-neutral-650 opacity-70 md:opacity-0 group-hover/msg:opacity-100 transition-opacity cursor-pointer shadow-3xs z-10"
                          title="Edit message"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      
                      {/* Duration confirmation inline chip */}
                      {msg.durationConfirmation && (
                        <div className="mt-3 bg-white border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3 text-left text-slate-800 w-full min-w-[260px] animate-fade-in">
                          {!msg.durationConfirmation.isResolved ? (
                            <>
                              <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5 fill-primary/10 text-primary" />
                                <span>Time Track Proposal</span>
                              </div>
                              <h5 className="text-xs font-semibold text-neutral-805 leading-tight">
                                Log <strong className="text-primary font-bold">{formatMinutes(msg.durationConfirmation.proposedDurationMinutes)}</strong> for <strong className="text-slate-905">{msg.durationConfirmation.taskTitle}</strong>?
                              </h5>

                              {msg.durationConfirmation.isEditing ? (
                                <div className="space-y-3 pt-1">
                                  <div className="flex gap-2 items-center">
                                    <input
                                      type="number"
                                      value={msg.durationConfirmation.tempDuration ?? msg.durationConfirmation.proposedDurationMinutes}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        const updated = [...chatHistory];
                                        updated[idx].durationConfirmation.tempDuration = val;
                                        setChatHistory(updated);
                                      }}
                                      className="w-20 p-2 border border-neutral-200 rounded-xl text-xs bg-white text-neutral-705 text-center font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                                      placeholder="Mins"
                                    />
                                    <span className="text-xs text-neutral-550 font-medium">minutes</span>
                                  </div>
                                  <div className="flex gap-2 pt-2 border-t border-neutral-100">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const updated = [...chatHistory];
                                        updated[idx].durationConfirmation.isEditing = false;
                                        setChatHistory(updated);
                                      }}
                                      className="flex-1 py-1.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 font-bold border border-neutral-200 rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
                                    >
                                      Back
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const mins = msg.durationConfirmation.tempDuration ?? msg.durationConfirmation.proposedDurationMinutes;
                                        handleLogDuration(msg.durationConfirmation.taskId, mins, "message", 0.8);
                                        const updated = [...chatHistory];
                                        updated[idx].durationConfirmation.isResolved = true;
                                        updated[idx].durationConfirmation.resolvedAction = "edit";
                                        updated[idx].durationConfirmation.resolvedMins = mins;
                                        setChatHistory(updated);
                                      }}
                                      className="flex-1 py-1.5 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-[11px] font-display transition-all shadow-sm shadow-primary/20 cursor-pointer text-center"
                                    >
                                      Save
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex gap-2 pt-2 border-t border-neutral-100">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      handleLogDuration(
                                        msg.durationConfirmation.taskId,
                                        msg.durationConfirmation.proposedDurationMinutes,
                                        "message",
                                        msg.durationConfirmation.confidence || 0.8
                                      );
                                      const updated = [...chatHistory];
                                      updated[idx].durationConfirmation.isResolved = true;
                                      updated[idx].durationConfirmation.resolvedAction = "confirm";
                                      setChatHistory(updated);
                                    }}
                                    className="flex-1 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200/60 rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
                                  >
                                    ✓ Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...chatHistory];
                                      updated[idx].durationConfirmation.isEditing = true;
                                      setChatHistory(updated);
                                    }}
                                    className="flex-1 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold border border-blue-200/60 rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
                                  >
                                    ✏ Edit
                                  </button>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-[11px] text-emerald-600 font-extrabold flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl">
                              <Check className="w-3.5 h-3.5 text-emerald-505 shrink-0" />
                              <span>Logged {msg.durationConfirmation.resolvedAction === "edit" ? `${msg.durationConfirmation.resolvedMins} mins` : `${formatMinutes(msg.durationConfirmation.proposedDurationMinutes)}`} for {msg.durationConfirmation.taskTitle}!</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Trust Layer AIActionExplanation log list */}
                      {msg.explanations && msg.explanations.length > 0 && (
                        <div className="mt-3 bg-white border border-neutral-200 rounded-2xl p-4 shadow-xs space-y-3 text-left w-full min-w-[260px] animate-fade-in">
                          <div className="flex items-center gap-1.5 font-bold text-xs text-neutral-500 uppercase tracking-wider font-display">
                            <Sparkles className="w-3.5 h-3.5 text-primary" />
                            <span>Action Log & Explanations</span>
                          </div>
                          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                            {msg.explanations.map((exp, expIdx) => (
                              <div key={expIdx} className="p-2.5 bg-neutral-50 border border-neutral-150 rounded-xl space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-bold text-neutral-800 leading-tight">
                                    {exp.action}
                                  </span>
                                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono inline-block shrink-0 ${
                                    exp.confidence === "low"
                                      ? "bg-rose-50 text-rose-600 border border-rose-105"
                                      : exp.confidence === "medium"
                                      ? "bg-amber-50 text-amber-600 border border-amber-105"
                                      : "bg-emerald-50 text-emerald-600 border border-emerald-105"
                                  }`}>
                                    {exp.confidence} confidence
                                  </span>
                                </div>
                                <p className="text-[11px] text-neutral-500 leading-normal font-medium">{exp.reason}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Evening Check-in conversational chips */}
                      {msg.questionnaire && msg.questionnaire.type === "evening_checkin" && !msg.questionnaireSubmitted && (
                        <div className="mt-3 bg-white border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3 text-left text-slate-800 w-full min-w-[260px] animate-fade-in">
                          <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
                            <Moon className="w-3.5 h-3.5 fill-primary/10 text-primary animate-pulse" />
                            <span>Evening Review</span>
                          </div>
                          
                          {msg.questionnaire.currentStep === "unmarked_completion" && (
                            <div className="space-y-2">
                              <p className="text-xs text-neutral-600 font-medium">Did you finish any of these tasks but forget to mark them done?</p>
                              <div className="flex flex-wrap gap-2 pt-1">
                                {msg.questionnaire.openTaskIds.map((taskId: string) => {
                                  const task = flexibleTasks.find(t => t.id === taskId);
                                  if (!task) return null;
                                  return (
                                    <button
                                      key={taskId}
                                      type="button"
                                      onClick={() => handleEveningCheckinSelect("finish", taskId, idx)}
                                      className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold border border-emerald-200/60 rounded-xl text-[10px] cursor-pointer transition-colors"
                                    >
                                      ✓ Finished "{task.title}"
                                    </button>
                                  );
                                })}
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("none_finished", null, idx)}
                                  className="py-1.5 px-3 bg-neutral-50 hover:bg-neutral-100 text-neutral-600 font-bold border border-neutral-250 rounded-xl text-[10px] cursor-pointer transition-colors"
                                >
                                  No, none of these
                                </button>
                              </div>
                            </div>
                          )}

                          {msg.questionnaire.currentStep === "task_reason" && (
                            <div className="space-y-2">
                              <p className="text-xs text-neutral-600 font-medium">
                                Why was <strong>"{flexibleTasks.find(t => t.id === msg.questionnaire.activeTaskId)?.title}"</strong> not completed today?
                              </p>
                              <div className="grid grid-cols-2 gap-2 pt-1">
                                {[
                                  { label: "Too Tired", value: "energy" },
                                  { label: "Wrong Planning", value: "planning" },
                                  { label: "Got Distracted", value: "discipline" },
                                  { label: "Avoided It", value: "interruption" }
                                ].map((r) => (
                                  <button
                                    key={r.value}
                                    type="button"
                                    onClick={() => handleEveningCheckinSelect("reason", r.value, idx)}
                                    className="py-2 px-2 bg-amber-50/70 hover:bg-amber-100 text-amber-800 font-bold border border-amber-200/50 rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                  >
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {msg.questionnaire.currentStep === "task_resolution" && (
                            <div className="space-y-2">
                              <p className="text-xs text-neutral-600 font-medium">
                                What should we do with <strong>"{flexibleTasks.find(t => t.id === msg.questionnaire.activeTaskId)?.title}"</strong>?
                              </p>
                              <div className="flex flex-col gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("resolution", "tomorrow", idx)}
                                  className="py-2 px-3 bg-primary text-white hover:bg-primary-dark font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                >
                                  Move to Tomorrow
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("resolution", "backlog", idx)}
                                  className="py-2 px-3 bg-blue-50 text-blue-750 hover:bg-blue-100 border border-blue-150 font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                >
                                  Move to Backlog
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("resolution", "drop", idx)}
                                  className="py-2 px-3 bg-rose-50 text-rose-750 hover:bg-rose-100 border border-rose-150 font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                >
                                  Drop It (Skip)
                                </button>
                              </div>
                            </div>
                          )}

                          {msg.questionnaire.currentStep === "backlog_suggestion" && (
                            <div className="space-y-2">
                              <p className="text-xs text-neutral-650 font-medium">Tomorrow's schedule is set! Should we pull in any of these from backlog?</p>
                              <div className="flex flex-col gap-1.5 pt-1">
                                {flexibleTasks
                                  .filter(t => t.status === "backlog" && !isUnimportantTask(t.title, t.meta))
                                  .slice(0, 3)
                                  .map((task) => (
                                    <button
                                      key={task.id}
                                      type="button"
                                      onClick={() => handleEveningCheckinSelect("pull", task.id, idx)}
                                      className="py-2 px-3 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-750 font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-left"
                                    >
                                      + Pull: "{task.title}" ({task.duration_minutes}m)
                                    </button>
                                  ))}
                                <button
                                  type="button"
                                  onClick={() => handleEveningCheckinSelect("pull_none", null, idx)}
                                  className="py-2 px-3 bg-neutral-105 hover:bg-neutral-200 text-neutral-550 font-extrabold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
                                >
                                  No thanks, looks good!
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Decomposition conversational prompt (System 3.6) */}
                      {msg.questionnaire && msg.questionnaire.type === "decomposition" && !msg.questionnaireSubmitted && (
                        <div className="mt-3 bg-white border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3.5 text-left text-slate-800 w-full min-w-[260px] animate-fade-in font-sans">
                          <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 fill-primary/10 text-primary animate-pulse" />
                            <span>Task Decomposition</span>
                          </div>
                          <p className="text-xs text-neutral-650 font-medium leading-relaxed">
                            <strong>"{msg.questionnaire.taskTitle}"</strong> is large or has high friction. Vague/large tasks are a major source of procrastination. Would you like AI to break it into exactly 3 concrete sub-tasks?
                          </p>
                          <div className="flex gap-2.5 pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                handleDecomposeTaskConfirm(msg.questionnaire.taskId, idx);
                              }}
                              className="flex-1 py-2 bg-primary text-white hover:bg-primary-dark font-bold rounded-xl text-[11px] cursor-pointer transition-all text-center shadow-xs"
                            >
                              ⚡ Decompose with AI
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleDecomposeTaskCancel(idx);
                              }}
                              className="flex-1 py-2 bg-neutral-50 hover:bg-neutral-100 border border-neutral-250 text-neutral-550 font-bold rounded-xl text-[11px] cursor-pointer transition-colors text-center"
                            >
                              Keep As Is
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Questionnaire setup wizard card */}
                      {msg.questionnaire && !msg.questionnaireSubmitted && (
                        <div className="mt-3 bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-xs space-y-3.5 text-left text-slate-800 w-full min-w-[260px] animate-fade-in">
                          <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
                            <Sparkles className="w-3.5 h-3.5 fill-primary/10 text-primary" />
                            <span>Plan Setup Wizard</span>
                          </div>
                          <h5 className="text-xs font-extrabold text-neutral-850 leading-tight">
                            {msg.questionnaire.title}
                          </h5>
                          
                          <div className="space-y-3">
                            {msg.questionnaire.questions.map((q: any, qIdx: number) => (
                              <div key={q.id} className="space-y-1">
                                <label className="text-[11px] font-bold text-neutral-550 block">
                                  {q.label}
                                </label>
                                {q.type === "select" ? (
                                  <select
                                    value={q.value}
                                    onChange={(e) => {
                                      const updated = [...chatHistory];
                                      const msgCopy = { ...updated[idx] };
                                      if (msgCopy.questionnaire) {
                                        const qCopy = { ...msgCopy.questionnaire };
                                        qCopy.questions = qCopy.questions.map((item: any, i: number) =>
                                          i === qIdx ? { ...item, value: e.target.value } : item
                                        );
                                        msgCopy.questionnaire = qCopy;
                                        updated[idx] = msgCopy;
                                        setChatHistory(updated);
                                      }
                                    }}
                                    className="w-full p-2 border border-neutral-200 rounded-xl text-xs bg-white text-neutral-705 focus:outline-none focus:ring-1 focus:ring-primary font-sans cursor-pointer"
                                  >
                                    {q.options?.map((opt: string) => (
                                      <option key={opt} value={opt}>
                                        {opt}
                                      </option>
                                    ))}
                                  </select>
                                ) : (
                                  <input
                                    type="text"
                                    value={q.value}
                                    onChange={(e) => {
                                      const updated = [...chatHistory];
                                      const msgCopy = { ...updated[idx] };
                                      if (msgCopy.questionnaire) {
                                        const qCopy = { ...msgCopy.questionnaire };
                                        qCopy.questions = qCopy.questions.map((item: any, i: number) =>
                                          i === qIdx ? { ...item, value: e.target.value } : item
                                        );
                                        msgCopy.questionnaire = qCopy;
                                        updated[idx] = msgCopy;
                                        setChatHistory(updated);
                                      }
                                    }}
                                    placeholder={q.placeholder}
                                    className="w-full p-2 border border-neutral-200 rounded-xl text-xs bg-white text-neutral-705 focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                                  />
                                )}
                              </div>
                            ))}
                          </div>

                          <div className="flex gap-2 pt-2.5 border-t border-neutral-100">
                            <button
                              type="button"
                              onClick={() => {
                                const updated = [...chatHistory];
                                updated[idx] = { ...updated[idx], questionnaireSubmitted: true };
                                setChatHistory(updated);
                              }}
                              className="flex-1 py-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 font-bold rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
                            >
                              Dismiss
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                handleSubmitQuestionnaire(idx);
                              }}
                              className="flex-1 py-2 bg-primary hover:bg-primary-dark text-white font-bold rounded-xl text-[11px] font-display transition-all shadow-sm shadow-primary/20 cursor-pointer text-center"
                            >
                              Generate Plan
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {isProcessingCopilot && (
              <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8] font-bold p-3 bg-neutral-50 rounded-2xl border border-neutral-100 animate-pulse">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                  <span className="text-neutral-650 font-medium transition-all duration-300">
                    {copilotRetryAttempt === 1 ? (
                      <span className="text-amber-600 font-semibold flex items-center gap-1.5">
                        ⚡ AI servers are crowded. Holding your schedule safely...
                      </span>
                    ) : copilotRetryAttempt >= 2 ? (
                      <span className="text-rose-500 font-semibold flex items-center gap-1.5">
                        ⚡ Still retrying. Your data is safe — no changes lost...
                      </span>
                    ) : (
                      copilotLoadingPhase
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleStopCopilot}
                  className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-xl text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1 active:scale-95 shrink-0"
                >
                  <X className="w-3 h-3" /> Stop
                </button>
              </div>
            )}
          </div>

          {/* Suggestions shortcuts — personalized */}
          {!proposedChanges && !isProcessingCopilot && chatHistory.filter(m => m.sender === "user").length === 0 && (() => {
            const firstName = profileName.split(" ")[0] || "there";
            const todayPending = daySchedule.items
              .filter(i => i.type === "flexible" && i.status !== "done")
              .slice(0, 1);
            const backlogTop = flexibleTasks
              .filter(t => t.status !== "done" && t.scheduled_date === null)
              .slice(0, 1);
            const hour = new Date().getHours();
            const timeGreeting = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

            const personalized: string[] = [];

            if (hour < 10) {
              personalized.push(`Good morning ${firstName}! Start with my highest priority task`);
            } else if (hour >= 21) {
              personalized.push(`Wrap up my day and summarize what I got done`);
            } else {
              personalized.push(`I'm feeling productive this ${timeGreeting}`);
            }

            if (todayPending.length > 0) {
              personalized.push(`I can't do "${todayPending[0].title}" today, move it`);
            } else {
              personalized.push(`I'm lazy/tired. Keep it light today`);
            }

            if (backlogTop.length > 0) {
              personalized.push(`Schedule "${backlogTop[0].title}" for me today`);
            } else {
              personalized.push(`Add study session for 2 hours`);
            }

            personalized.push(`Postpone my gym/workout to tomorrow`);
            personalized.push(`Create a personalized workout plan for me`);
            personalized.push(`Summarize my day and plan tomorrow`);

            return (
              <div className="space-y-1.5 flex-shrink-0">
                <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Quick prompts for you, {firstName}:</span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-none">
                  {personalized.map((sStr) => (
                    <button
                      key={sStr}
                      type="button"
                      onClick={() => setCopilotInput(sStr)}
                      className="text-left py-1.5 px-3 bg-white hover:bg-primary/5 hover:border-primary/30 border border-neutral-200 rounded-xl text-xs font-semibold text-[#475569] cursor-pointer transition-all shadow-xs"
                    >
                      {sStr}
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Proposed Changes Decisions Card */}
          {proposedChanges && proposedChanges.length > 0 && (
            <div className="p-4 bg-white border border-[#E0D9FF] rounded-xl space-y-3 shadow-xs animate-fade-in text-left flex-shrink-0">
              <div className="flex items-center gap-1.5 text-neutral-400 font-bold text-[11px] uppercase tracking-wider font-display">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Proposed Changes</span>
              </div>
              <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                {proposedChanges.map((change, idx) => (
                  <div key={idx} className="p-2.5 bg-neutral-55 border border-neutral-150 rounded-xl flex items-start gap-2">
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-light text-primary shrink-0 font-mono inline-block">
                            {change.action}
                          </span>
                          <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono inline-block shrink-0 ${
                            change.confidence === "low"
                              ? "bg-rose-50 text-rose-600 border border-rose-100"
                              : change.confidence === "medium"
                              ? "bg-amber-50 text-amber-600 border border-amber-100"
                              : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                          }`}>
                            {change.confidence || "high"} confidence
                          </span>
                        </div>
                        {change.newTime && (
                          <span className="text-[10px] font-bold text-neutral-600 font-mono">{change.newTime}</span>
                        )}
                      </div>
                      <p className="text-[12px] font-medium text-neutral-700 leading-relaxed">{change.reasoning}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input & Mic & Attach Area */}
          <div className="border-t border-neutral-100 pt-4 space-y-2 flex-shrink-0">
            {copilotImage && (
              <div className="flex items-center gap-2 p-2 bg-indigo-50 border border-indigo-100 rounded-xl">
                {copilotImage.mimeType === "application/pdf" ? (
                  <div className="w-12 h-10 rounded-lg border border-indigo-200 bg-indigo-100 flex items-center justify-center shrink-0">
                    <span className="text-indigo-600 text-[10px] font-black">PDF</span>
                  </div>
                ) : (
                  <img src={copilotImage.previewUrl} alt="Attached" className="w-12 h-10 object-cover rounded-lg border border-white shadow-sm shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-indigo-700 truncate">
                    {copilotImage.mimeType === "application/pdf" ? "PDF ready to send" : "Image ready to send"}
                  </p>
                  <p className="text-[10px] text-indigo-400">AI will extract schedule / workout data</p>
                </div>
                <button onClick={() => setCopilotImage(null)} className="text-indigo-305 hover:text-indigo-600 cursor-pointer shrink-0">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <div className="relative flex items-center">
              <CopilotTextArea 
                value={copilotInput}
                onSend={(text) => {
                  handleSendCopilotMessage(text);
                }}
                placeholder={
                  proposedChanges
                    ? "Changes ready..."
                    : copilotImage
                    ? "Describe file..."
                    : `Tell AI...`
                }
                disabled={!!proposedChanges}
                isProcessing={isProcessingCopilot}
              />
              
              <div className="absolute right-2.5 flex items-center gap-1.5">
                {!proposedChanges && (
                  <button
                    type="button"
                    onClick={() => copilotImageInputRef.current?.click()}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      copilotImage ? "bg-indigo-100 text-indigo-600" : "bg-neutral-55 hover:bg-neutral-100 text-[#475569]"
                    }`}
                    title="Attach image or PDF"
                    disabled={isProcessingCopilot}
                  >
                    <Upload className="w-3.5 h-3.5" />
                  </button>
                )}

                {speechSupported && !proposedChanges && (
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isListening ? "bg-red-500 text-white animate-pulse" : "bg-neutral-55 hover:bg-neutral-100 text-[#475569]"
                    }`}
                    title="Voice dictate"
                    disabled={isProcessingCopilot}
                  >
                    <Mic className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
          {/* Bottom Actions Area */}
          {proposedChanges && proposedChanges.length > 0 && (
            <div className="flex gap-2.5 flex-shrink-0">
              <button 
                type="button"
                onClick={() => {
                  setProposedChanges(null);
                  setChatHistory(prev => [...prev, { sender: "ai", text: "Got it, let's adjust. What would you like to change?" }]);
                }}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 transition-colors cursor-pointer text-center font-display animate-fade-in"
              >
                Revise
              </button>
              <button 
                type="button"
                onClick={handleConfirmAIChanges}
                className="flex-1 py-3 text-xs font-bold rounded-xl bg-primary hover:bg-primary-dark text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20 text-center font-display animate-fade-in"
              >
                <Check className="w-4 h-4" />
                <span>Confirm</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div id="dayflow_app_container" className="h-[100dvh] w-screen text-slate-850 bg-[#F9FAFB] flex items-stretch justify-stretch overflow-hidden select-none select-text relative">
      
      {/* Background ambient light blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] left-[-15%] w-[60%] h-[60%] rounded-full bg-violet-400/12 blur-[130px] animate-pulse-slow"></div>
        <div className="absolute bottom-[-15%] right-[-15%] w-[65%] h-[65%] rounded-full bg-emerald-400/8 blur-[160px] animate-pulse-slow" style={{ animationDelay: "2.5s" }}></div>
        <div className="absolute top-[35%] right-[15%] w-[40%] h-[40%] rounded-full bg-indigo-400/8 blur-[110px] animate-pulse-slow" style={{ animationDelay: "5s" }}></div>
      </div>

      {/* Phase 2 Calibration Upgrade Banner */}
      {showPhase2Banner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 pointer-events-none">
          <div className="bg-gradient-to-r from-violet-600 to-emerald-600 text-white rounded-2xl shadow-2xl px-5 py-4 flex items-start gap-3 animate-slide-up border border-white/20">
            <Sparkles className="w-5 h-5 shrink-0 mt-0.5 fill-white/20" />
            <div>
              <p className="text-sm font-bold">DayFlow just got smarter ✨</p>
              <p className="text-xs opacity-90 leading-relaxed mt-0.5">
                15 tasks completed! Your schedule now uses <strong>your personal patterns</strong> — peak focus time, real durations, and optimal gaps.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Dynamic Toast Container wrapper inside device mockup */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold text-white animate-slide-up flex items-center gap-2 ${
              t.type === "warning"
                ? "bg-amber-600 border-amber-500"
                : t.type === "info"
                ? "bg-indigo-600 border-indigo-500"
                : "bg-emerald-600 border-emerald-500"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span>{t.message}</span>
          </div>
        ))}
      </div>

      {notificationResponseTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-scale-up">
            {/* Header / Accent indicator */}
            <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-8 text-white relative">
              <button 
                onClick={() => setNotificationResponseTask(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <Bell className="w-5 h-5 animate-bounce" />
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">Upcoming Transition</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight">{notificationResponseTask.title}</h3>
              <p className="text-xs opacity-90 mt-1">
                Scheduled for {notificationResponseTask.start_time} - {notificationResponseTask.end_time} ({notificationResponseTask.duration_minutes} mins)
              </p>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed">
                This task is scheduled to start soon. Staying in flow keeps you productive. How would you like to handle this transition?
              </p>

              {/* Actions list */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  onClick={() => {
                    handleStartTaskFromNotification(notificationResponseTask.id);
                    setNotificationResponseTask(null);
                  }}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>✓ Yes, I'm ready</span>
                </button>

                <button
                  onClick={() => {
                    handleDelayTask15Minutes(notificationResponseTask.id, notificationResponseTask.start_time);
                    setNotificationResponseTask(null);
                  }}
                  className="w-full py-3.5 px-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl font-bold text-sm transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Clock className="w-4 h-4" />
                  <span>🕐 Need 15 more min</span>
                </button>

                <button
                  onClick={() => {
                    handleUnscheduleTask(notificationResponseTask.id);
                    setNotificationResponseTask(null);
                  }}
                  className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  <span>❌ Skip for today</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeGoalCheckIn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-8 text-white relative">
              <button 
                onClick={() => setActiveGoalCheckIn(null)}
                className="absolute top-4 right-4 p-1.5 rounded-full bg-white/20 hover:bg-white/30 transition-colors text-white cursor-pointer"
                title="Dismiss"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 mb-2">
                <Target className="w-5 h-5 animate-bounce" />
                <span className="text-xs font-bold uppercase tracking-wider opacity-90">Goal Progress Check-in</span>
              </div>
              <h3 className="text-xl font-bold tracking-tight">{activeGoalCheckIn.goal.title}</h3>
            </div>

            {/* Form */}
            <form onSubmit={handleCheckInResponse} className="p-6 space-y-4 text-left">
              <p className="text-sm text-slate-600 leading-relaxed font-sans">
                {activeGoalCheckIn.prompt}
              </p>

              <div>
                <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider mb-1">
                  Current Value ({activeGoalCheckIn.goal.metricLabel})
                </label>
                <input 
                  type="number" 
                  step="any"
                  value={checkInResponseVal}
                  onChange={(e) => setCheckInResponseVal(e.target.value)}
                  placeholder={`e.g. ${activeGoalCheckIn.goal.currentValue + 1}`}
                  className="w-full px-3.5 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveGoalCheckIn(null)}
                  className="flex-1 py-3 border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-xl font-bold text-sm transition-colors cursor-pointer"
                >
                  Skip Check-in
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-primary/10 cursor-pointer"
                >
                  Log Progress
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* PARENT BODY CONTAINER GIVING RESPONSIVE LAYOUT */}
      <div id="app_responsive_layout" className="w-full h-full flex items-stretch bg-transparent overflow-hidden">
        
        {/* SIDE BAR DESKTOP NAVIGATION & CONTROL PANEL (Adaptive desktop menu view) */}
        <aside 
          id="desktop_diagnostic_rail" 
          className={`hidden md:flex relative flex-col justify-between shrink-0 font-sans border-r border-white/25 glass-panel transition-all duration-300 z-30 ${
            isSidebarCollapsed ? "w-[76px] p-4" : "p-5"
          }`}
          style={{ width: isSidebarCollapsed ? "76px" : `${sidebarWidth}px` }}
        >
          {/* Resize handle */}
          {!isSidebarCollapsed && (
            <div 
              className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/20 active:bg-primary/45 transition-colors z-40"
              onMouseDown={startResizing}
              title="Drag to resize sidebar"
            />
          )}

          <div className="space-y-6 overflow-y-auto pr-0.5 scrollbar-none flex-1">
            {/* Header / Brand */}
            <div className={`flex items-center ${isSidebarCollapsed ? "justify-center" : "justify-between"}`}>
              <div 
                onClick={handleLogoClick}
                className="flex items-center gap-2 cursor-pointer select-none"
                title="Tap 5 times for developer mode"
              >
                <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 shrink-0">
                  <Check className="w-5 h-5 text-white stroke-[3.5px]" />
                </div>
                {!isSidebarCollapsed && (
                  <div>
                    <h1 className="font-display font-bold text-base tracking-tight text-neutral-800 leading-none">DayFlow</h1>
                    <p className="text-[11px] text-neutral-400 uppercase tracking-wider font-semibold mt-0.5">Active Studio</p>
                  </div>
                )}
              </div>
              
              {!isSidebarCollapsed && (
                <button 
                  onClick={() => {
                    setIsSidebarCollapsed(true);
                    localStorage.setItem("dayflow_sidebar_collapsed", "true");
                    showToast("Sidebar collapsed", "info");
                  }}
                  className="p-1 hover:bg-neutral-200/50 rounded-lg text-neutral-400 hover:text-neutral-600 cursor-pointer transition-colors"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {isSidebarCollapsed && (
              <div className="flex justify-center">
                <button 
                  onClick={() => {
                    setIsSidebarCollapsed(false);
                    localStorage.setItem("dayflow_sidebar_collapsed", "false");
                    showToast("Sidebar expanded", "info");
                  }}
                  className="p-1.5 bg-white/60 hover:bg-white rounded-lg text-neutral-500 hover:text-primary border border-neutral-200/40 shadow-xs cursor-pointer transition-all"
                  title="Expand Sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="h-px bg-neutral-200/20"></div>

            {/* Premium Desktop Navigation Sidebar Menu */}
            <div className="space-y-2">
              {!isSidebarCollapsed && (
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-widest block mb-2 px-1">Menu Navigation</span>
              )}
              
              <button
                onClick={() => changeTabWithHaptic("today")}
                className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${
                  activeTab === "today"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-[#5A5A7A] hover:bg-white/50 hover:text-[#1A1A2E]"
                }`}
                title={isSidebarCollapsed ? "Daily Timeline" : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarCheck className="w-4.5 h-4.5" />
                  {!isSidebarCollapsed && <span>Daily Timeline</span>}
                </div>
                {!isSidebarCollapsed && daySchedule.items.length > 0 && (
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${activeTab === "today" ? "bg-white/20 text-white" : "bg-neutral-200/70 text-neutral-600"}`}>
                    {daySchedule.items.filter(i => i.status === "done").length}/{daySchedule.items.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => changeTabWithHaptic("backlog")}
                className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${
                  activeTab === "backlog"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-[#5A5A7A] hover:bg-white/50 hover:text-[#1A1A2E]"
                }`}
                title={isSidebarCollapsed ? "Backlog Queue" : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4.5 h-4.5" />
                  {!isSidebarCollapsed && <span>Backlog Queue</span>}
                </div>
                {!isSidebarCollapsed && dashboardStats.backlog > 0 && (
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${activeTab === "backlog" ? "bg-white/20 text-white" : "bg-primary-light text-primary"}`}>
                    {dashboardStats.backlog}
                  </span>
                )}
              </button>

              <button
                onClick={() => changeTabWithHaptic("calendar")}
                className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${
                  activeTab === "calendar"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-[#5A5A7A] hover:bg-white/50 hover:text-[#1A1A2E]"
                }`}
                title={isSidebarCollapsed ? "Future Calendar" : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <CalendarDays className="w-4.5 h-4.5" />
                  {!isSidebarCollapsed && <span>Future Calendar</span>}
                </div>
              </button>

              <button
                onClick={() => changeTabWithHaptic("routines")}
                className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${
                  activeTab === "routines"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-[#5A5A7A] hover:bg-white/50 hover:text-[#1A1A2E]"
                }`}
                title={isSidebarCollapsed ? "Routines" : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <BookMarked className="w-4.5 h-4.5" />
                  {!isSidebarCollapsed && <span>Routines</span>}
                </div>
                {!isSidebarCollapsed && profiles.length > 0 && (
                  <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${activeTab === "routines" ? "bg-white/20 text-white" : "bg-primary-light text-primary"}`}>
                    {profiles.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => changeTabWithHaptic("settings")}
                className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5"
                } ${
                  activeTab === "settings"
                    ? "bg-primary text-white shadow-lg shadow-primary/25"
                    : "text-[#5A5A7A] hover:bg-white/50 hover:text-[#1A1A2E]"
                }`}
                title={isSidebarCollapsed ? "Settings" : undefined}
              >
                <div className="flex items-center gap-2.5">
                  <SettingsIcon className="w-4.5 h-4.5" />
                  {!isSidebarCollapsed && <span>Settings</span>}
                </div>
              </button>
            </div>

          </div>

          <div className={`pt-3 border-t border-neutral-200/30 text-xs text-neutral-400 leading-relaxed font-medium ${isSidebarCollapsed ? "text-center" : ""}`}>
            {isSidebarCollapsed ? (
              <span title="Fully sandboxed client data. Changes persist directly inside your private browser space.">🔒</span>
            ) : (
              <span>🔒 Fully sandboxed client data.</span>
            )}
          </div>
        </aside>

        {/* FLUID WORKSPACE PORTAL (Expands globally on desktop, centers elegantly on mobile) */}
        <div id="phone_mockup_container" className="flex-1 h-full bg-transparent flex flex-col overflow-hidden relative">
          
          {/* TOP APP HEADER BAR (Fixed boundary, does not move) */}
          <header id="mobile_sticky_header" className="h-16 border-b border-neutral-200/50 px-4 flex items-center justify-between bg-white/40 backdrop-blur-md z-30 flex-shrink-0 relative text-slate-800">
            <div 
              onClick={handleLogoClick}
              className="flex items-center gap-1.5 cursor-pointer select-none"
              title="Tap 5 times for developer mode"
            >
              <span className="font-display font-black text-lg md:text-xl text-[#0F172A] tracking-tight">{pageTitle}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {activeTab === "today" && daySchedule.items.length > 0 && (
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full ml-1">
                  {totalCompletedScheduledCount}
                </span>
              )}
            </div>

            {/* Header Right Area: Quick manual add + date navigation */}
            <div className="flex items-center gap-3">
              {(activeTab === "today" || activeTab === "backlog") && (
                <button
                  onClick={() => handleOpenAddFlexible(activeTab === "today")}
                  className="px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-dark text-white active:scale-95 transition-all duration-150 flex items-center justify-center gap-1.5 cursor-pointer font-display font-bold text-xs shadow-xs"
                  title="Add Task Manually"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Add Task</span>
                </button>
              )}

              {/* Selected Date Jump Widget and Arrow Controls shifted to the Right (Minimalistic style) */}
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() - 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-[#475569] cursor-pointer active:scale-90 transition-all duration-150"
                  title="Previous Day"
                >
                  <ChevronLeft className="w-4.5 h-4.5" />
                </button>
                
                <span className="text-xs font-bold text-[#475569] font-mono select-none px-1">
                  {new Date(selectedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>

                <button 
                  onClick={() => {
                    const d = new Date(selectedDate);
                    d.setDate(d.getDate() + 1);
                    setSelectedDate(d.toISOString().split("T")[0]);
                  }}
                  className="p-1.5 rounded-full hover:bg-neutral-100 text-[#475569] cursor-pointer active:scale-90 transition-all duration-150"
                  title="Next Day"
                >
                  <ChevronRight className="w-4.5 h-4.5" />
                </button>
              </div>
            </div>

            {/* Navbar Integrated Subtle Progress Line */}
            {activeTab === "today" && daySchedule.items.length > 0 && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-neutral-200/40 overflow-hidden">
                <div 
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${completedTodayPercentage}%` }}
                />
              </div>
            )}
          </header>

          {/* MAIN DYNAMIC CONTENT RAIL (Independently scrolling tab viewports) */}
          <main id="mobile_viewport_content" className="flex-1 overflow-y-auto md:overflow-hidden overflow-x-hidden flex flex-col relative bg-[#F9FAFB]">
            
            {/* Floating Notification Permission Request Modal */}
            {showNotificationPrompt && (
              <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 bg-white/95 backdrop-blur-md border border-indigo-100 rounded-2xl shadow-xl z-40 animate-slide-up flex flex-col gap-2.5">
                <div className="flex items-start justify-between">
                  <div className="flex gap-2">
                    <span className="text-lg">🚀</span>
                    <div className="space-y-0.5 text-left">
                      <h5 className="text-xs font-bold text-neutral-800">Enable reminders</h5>
                      <p className="text-[11px] text-neutral-500 leading-relaxed">
                        Get notified when it is time to transition tasks.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={handleDismissNotifications}
                    className="text-neutral-400 hover:text-neutral-600 p-0.5 rounded-lg hover:bg-neutral-50 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center justify-end gap-2 mt-1">
                  <button 
                    onClick={handleDismissNotifications}
                    className="text-xs text-neutral-500 font-bold px-3 py-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors cursor-pointer"
                  >
                    Not now
                  </button>
                  <button 
                    onClick={handleRequestNotifications}
                    className="text-xs bg-primary text-white font-bold px-3.5 py-1.5 rounded-lg hover:bg-primary-dark shadow-sm transition-colors cursor-pointer"
                  >
                    Enable
                  </button>
                </div>
              </div>
            )}

            {/* TAB VIEW 1: TODAY TIMEPORT */}
            {activeTab === "today" && (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                
                {/* Active Timer Pulse Banner */}
                {activeTimer && (
                  <ActiveTimerBanner 
                    activeTimer={activeTimer}
                    onStop={handleStopTimer}
                  />
                )}
                
                {/* EOD Pending Review Banner */}
                {selectedDate === TODAY && currentTimeMins >= 19 * 60 && todayIncompleteTasks.length > 0 && !eodDismissed && (
                  <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between text-xs text-amber-800 shrink-0 font-medium z-10">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>You have {todayIncompleteTasks.length} uncompleted tasks remaining today.</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={handleStartEveningCheckin}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-sm shadow-amber-250 active:scale-95 text-[10px] uppercase font-display"
                      >
                        Review with AI
                      </button>
                      <button 
                        onClick={() => setEodDismissed(true)}
                        className="text-amber-500 hover:text-amber-700 font-bold p-1 cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* AI Adjustments Undo Banner */}
                {copilotUndoState && (
                  <div className="mx-4 mb-3 p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-between text-xs text-indigo-850 animate-fade-in shadow-xs text-left">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary fill-primary/10 shrink-0" />
                      <span>AI Copilot updated your schedule. Mismatched?</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={handleUndoAIChanges}
                        className="bg-primary hover:bg-primary-dark text-white font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer shadow-xs active:scale-95 text-[11px] font-display"
                      >
                        Undo Changes
                      </button>
                      <button 
                        onClick={() => setCopilotUndoState(null)}
                        className="text-indigo-400 hover:text-indigo-650 font-bold p-1 cursor-pointer"
                        title="Dismiss"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                
                {/* Drift Detection Soft Banner */}
                {showDriftBanner && driftedTask && (
                  <div className="mx-4 mb-3 p-3 bg-amber-50/70 border border-amber-100 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-amber-800 animate-fade-in shadow-xs text-left">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                      <div>
                        <span className="font-semibold text-amber-900">Did the schedule drift?</span>
                        <p className="text-[11px] text-amber-700 mt-0.5">
                          "{driftedTask.title}" was scheduled to end at {driftedTask.end_time}.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                      <button 
                        onClick={() => {
                          handleToggleTaskDone(driftedTask.id);
                          const nextCount = driftPromptCountToday + 1;
                          setDriftPromptCountToday(nextCount);
                          localStorage.setItem("dayflow_drift_prompt_count", String(nextCount));
                          localStorage.setItem("dayflow_drift_prompt_date", TODAY);
                          setLastDriftPromptAt(Date.now());
                          localStorage.setItem("dayflow_last_drift_prompt_at", String(Date.now()));
                        }}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-[11px]"
                      >
                        Complete
                      </button>
                      <button 
                        onClick={() => {
                          handleDelayTask15Minutes(driftedTask.id, driftedTask.start_time);
                          const nextCount = driftPromptCountToday + 1;
                          setDriftPromptCountToday(nextCount);
                          localStorage.setItem("dayflow_drift_prompt_count", String(nextCount));
                          localStorage.setItem("dayflow_drift_prompt_date", TODAY);
                          setLastDriftPromptAt(Date.now());
                          localStorage.setItem("dayflow_last_drift_prompt_at", String(Date.now()));
                        }}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-[11px]"
                      >
                        Delay 15m
                      </button>
                      <button 
                        onClick={() => runAIResolution("drift")}
                        className="bg-primary hover:bg-primary-dark text-white font-bold px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-[11px] flex items-center gap-1"
                        disabled={isProcessingAIReasoning}
                      >
                        {isProcessingAIReasoning && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />}
                        <Sparkles className="w-3 h-3" /> Adjust via AI
                      </button>
                    </div>
                  </div>
                )}
                

                {/* Segmented Control for Mobile */}
                <div className="md:hidden flex border-b border-neutral-200/60 bg-white p-2 shrink-0 gap-1">
                  {(["timeline", "copilot"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setTodaySubTab(tab)}
                      className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all capitalize cursor-pointer flex items-center justify-center gap-1.5 ${
                        todaySubTab === tab
                          ? "bg-primary text-white shadow-xs"
                          : "text-neutral-500 hover:text-neutral-700 hover:bg-neutral-50"
                      }`}
                    >
                      {tab === "timeline" && <Clock className="w-3.5 h-3.5" />}
                      {tab === "copilot" && <Sparkles className="w-3.5 h-3.5" />}
                      <span>{tab === "copilot" ? "Day Coach" : tab}</span>
                    </button>
                  ))}
                </div>

                {/* 3-Column Layout Container */}
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden h-full">
                  
                  {/* Column 1: Daily Timeline */}
                  <div className={`${todaySubTab === "timeline" ? "flex" : "hidden"} md:flex flex-col flex-1 h-full overflow-y-auto pb-24 md:pb-6 md:pr-3`}>
                    
                    {/* Daily Reflection Card */}
                    {showReflectionCard && (
                      <div className="mx-3.5 mb-5 p-5 bg-white border border-indigo-100 rounded-3xl shadow-md text-left space-y-4 animate-slide-up">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2 bg-[#EEEDFE] rounded-xl text-primary shrink-0">
                            <Sparkles className="w-5 h-5 fill-primary/10" />
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-neutral-800">
                              {yesterdayCompletionRate >= 0.7 ? "🎉 Celebrate Yesterday" : "💡 Adjust & Align"}
                            </h4>
                            <p className="text-xs text-neutral-500">
                              {yesterdayCompletionRate >= 0.7 
                                ? `Excellent work! You completed ${Math.round(yesterdayCompletionRate * 100)}% of yesterday's tasks. What helped you win?` 
                                : `Yesterday you completed ${Math.round(yesterdayCompletionRate * 100)}% of tasks. What caused the slip?`}
                            </p>
                          </div>
                        </div>

                        {/* Cause selection grid */}
                        <div className="grid grid-cols-2 gap-2">
                          {yesterdayCompletionRate >= 0.7 ? (
                            <>
                              {[
                                { key: "success_planning", label: "📋 Good Planning" },
                                { key: "success_sleep", label: "💤 Restful Sleep" },
                                { key: "success_focus", label: "🎯 Deep Focus" },
                                { key: "success_load", label: "⚖️ Calm Workload" }
                              ].map(opt => (
                                <button
                                  key={opt.key}
                                  onClick={() => setSelectedCause(opt.key)}
                                  className={`p-2.5 rounded-2xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                                    selectedCause === opt.key
                                      ? "bg-primary border-primary text-white shadow-sm shadow-primary/25"
                                      : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </>
                          ) : (
                            <>
                              {[
                                { key: "planning", label: "📋 Over-planning" },
                                { key: "energy", label: "⚡ Low Energy" },
                                { key: "discipline", label: "⏳ Procrastinating" },
                                { key: "interruption", label: "🔊 Interruptions" }
                              ].map(opt => (
                                <button
                                  key={opt.key}
                                  onClick={() => setSelectedCause(opt.key)}
                                  className={`p-2.5 rounded-2xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                                    selectedCause === opt.key
                                      ? "bg-primary border-primary text-white shadow-sm shadow-primary/25"
                                      : "bg-neutral-50 hover:bg-neutral-100 text-neutral-700 border-neutral-200"
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </>
                          )}
                        </div>

                        {/* Quick Notes Text Area */}
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Quick Notes</label>
                          <textarea
                            value={reflectionNotes}
                            onChange={(e) => setReflectionNotes(e.target.value)}
                            placeholder="Optional. Write down what happened or how you feel..."
                            className="w-full text-xs p-3 rounded-2xl border border-neutral-200 bg-neutral-50/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-all resize-none h-16"
                          />
                        </div>

                        {/* Submit Actions */}
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => {
                              runLocalResolution();
                            }}
                            className="text-xs text-neutral-400 hover:text-neutral-600 font-bold px-3 py-2 cursor-pointer transition-colors"
                          >
                            Skip
                          </button>
                          <button
                            onClick={async () => {
                              const finalCause = selectedCause || (yesterdayCompletionRate >= 0.7 ? "success_planning" : "planning");
                              
                              const newEvent: ReflectionEvent = {
                                id: Math.random().toString(36).substring(2, 9),
                                date: TODAY,
                                completionRate: yesterdayCompletionRate,
                                type: yesterdayCompletionRate >= 0.7 ? "success" : "failure",
                                cause: finalCause as any,
                                notes: reflectionNotes
                              };
                              const updatedEvents = [...reflectionEvents, newEvent];
                              setReflectionEvents(updatedEvents);
                              saveReflectionEvents(updatedEvents);

                              const hasHighPressure = staleTasks.some(t => 
                                t.meta?.deadline_pressure === "high" || 
                                t.meta?.deadline_pressure === "critical"
                              );

                              if (staleTasks.length <= 2 && !hasHighPressure) {
                                runLocalResolution();
                              } else {
                                await runAIResolution("reflection", reflectionNotes, finalCause);
                              }
                            }}
                            className="text-xs bg-primary text-white font-bold px-4 py-2.5 rounded-xl hover:bg-primary-dark shadow-md cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                            disabled={isProcessingAIReasoning}
                          >
                            {isProcessingAIReasoning && <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />}
                            Reflect & Resolve
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Passive Overload Annotation */}
                    {totalPlannedDurationMins > 240 && (
                      <div className="mx-3.5 mb-3 p-3 bg-indigo-50/40 border border-indigo-100/30 rounded-2xl text-[11px] text-indigo-700/80 font-medium text-left flex items-center gap-1.5 animate-fade-in animate-pulse">
                        <Info className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                        <span>Calm note: {(totalPlannedDurationMins / 60).toFixed(1)} hours planned today. High overload probability. Pace yourself.</span>
                      </div>
                    )}
                    


                {/* Cognitive Load Budget Indicator (System 1) */}
                {daySchedule.items.length > 0 && (
                  <div className="mx-3 mb-4 p-4 bg-white border border-neutral-200/60 rounded-2xl text-xs space-y-2.5 shadow-3xs font-sans text-left">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-neutral-800 flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-primary" /> Cognitive Load Budget
                      </span>
                      {behaviorSignals.coldStartMode ? (
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                          Cold Start Mode
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-neutral-450 uppercase tracking-wider font-mono">
                          Daily Limits
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {/* High Energy Budget */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          <span>⚡ High-Energy</span>
                          <span className={`${energyBudgets.highExceeded ? "text-red-500 font-extrabold" : "text-neutral-700"}`}>
                            {energyBudgets.high}/{energyBudgets.highMax}m
                          </span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              energyBudgets.highExceeded ? "bg-red-550" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(100, (energyBudgets.high / energyBudgets.highMax) * 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Medium Energy Budget */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-neutral-500 uppercase tracking-wider">
                          <span>⚡ Medium-Energy</span>
                          <span className={`${energyBudgets.mediumExceeded ? "text-red-550 font-extrabold" : "text-neutral-700"}`}>
                            {energyBudgets.medium}/{energyBudgets.mediumMax}m
                          </span>
                        </div>
                        <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden flex">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              energyBudgets.mediumExceeded ? "bg-red-550" : "bg-emerald-500"
                            }`}
                            style={{ width: `${Math.min(100, (energyBudgets.medium / energyBudgets.mediumMax) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {(energyBudgets.highExceeded || energyBudgets.mediumExceeded) && (
                      <div className="flex items-start gap-1.5 text-[11px] text-red-750 bg-red-50 border border-red-100/60 p-2.5 rounded-xl font-medium animate-pulse">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-500 mt-0.5" />
                        <span>
                          {energyBudgets.highExceeded && energyBudgets.mediumExceeded
                            ? "Cognitive load exceeded! Offload High and Medium energy tasks to backlog to stay consistent."
                            : energyBudgets.highExceeded
                            ? "High-energy task limit exceeded. Consider scaling back or moving items to prevent burnout."
                            : "Medium-energy task limit exceeded. Cognitive load is high for today."}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Overbooked conflicts warning banner */}
                {daySchedule.conflicts.length > 0 && (
                  <div className="mx-3 mb-3 p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-xs space-y-1">
                    <div className="flex items-center gap-1 text-amber-700 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{daySchedule.conflicts.length} Overbooked Pipelines</span>
                    </div>
                    <p className="text-[#5A5A7A] text-xs leading-relaxed">
                      Tasks don't fit active free gaps today. Automatically pushing remaining to tomorrow.
                    </p>
                  </div>
                )}

                {/* Timeline display cards section */}
                <div className="flex-1 px-3.5 pb-24">
                  
                  {daySchedule.items.length === 0 ? (
                    <div className="py-20 flex flex-col items-center justify-center text-center space-y-3.5">
                      <div className="p-4 bg-white border border-neutral-200 rounded-full text-neutral-400 shadow-sm">
                        <CalendarIcon className="w-7 h-7 stroke-[1.5]" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-800 text-sm">Your day is crystal clear</h4>
                        <p className="text-xs text-[#9999B3] max-w-xs px-6 mt-1 leading-relaxed">
                          No tasks slotted for today. Tap the morning sync banner or click backlog to schedule item queues immediately.
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <button
                          onClick={handleOpenAICopilot}
                          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 font-display"
                        >
                          <Sparkles className="w-3.5 h-3.5" /> Launch AI Copilot
                        </button>
                        <button
                          onClick={() => handleOpenAddFlexible(true)}
                          className="px-4 py-2 bg-[#FFFFFF] border border-neutral-250 hover:bg-neutral-50 text-neutral-700 text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5 font-display"
                        >
                          <Plus className="w-3.5 h-3.5 text-neutral-500" /> Create Manually
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative border-l border-neutral-200/40 pl-4 py-1 ml-2.5">
                      
                      {daySchedule.items.map((item, idx) => {
                        const isFixedType = item.type === "fixed";
                        const isEmergencyItem = item.id.includes("emergency_block") || item.title.includes("Emergency");
                        const isCompleted = item.status === "done";
                        const isSkipped = item.status === "skipped";
                        const isExpired = item.status === "expired";
                        const isPinned = !!(item as any).pinned;
                        const isDragging = draggedTaskId === item.id;
                        const isDragOver = dragOverTaskId === item.id;
                        const task = !isFixedType ? flexibleTasks.find(t => t.id === item.id) : null;
                        
                        // Parse duration display
                        const hrs = Math.floor(item.duration_minutes / 60);
                        const mins = item.duration_minutes % 60;
                        const durationText = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ""}` : `${mins}m`;

                        // Calculate gaps between this item and the next
                        const nextItem = daySchedule.items[idx + 1];
                        let gapMins = 0;
                        if (nextItem) {
                          const endMins = timeToMinutes(item.end_time);
                          const nextStartMins = timeToMinutes(nextItem.start_time);
                          gapMins = Math.max(0, nextStartMins - endMins);
                        }

                        // Execution Engine: active / upcoming states
                        const isActiveNow = activeNowTask?.id === item.id;
                        const isUpNext = !isActiveNow && upNextTask?.id === item.id && !isCompleted;
                        const todayFlexCount = daySchedule.items.filter(i => i.type === "flexible").length;

                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className="relative mb-5 last:mb-3 group"
                            draggable={!isFixedType && !isEmergencyItem && !isCompleted && !isSkipped && !isExpired}
                            onDragStart={() => !isFixedType && handleDragStart(item.id)}
                            onDragOver={(e) => !isFixedType && handleDragOver(e, item.id)}
                            onDrop={(e) => !isFixedType && handleDrop(e, item.id)}
                            onDragEnd={handleDragEnd}
                          >
                            {/* Drop indicator line */}
                            {isDragOver && dragOverPosition === "before" && (
                              <div className="absolute -top-2 left-0 right-0 h-0.5 bg-primary rounded-full z-10 shadow-sm shadow-primary/30" />
                            )}
                            
                            {/* Marker line point dot */}
                            <span 
                              className={`absolute -left-[22px] top-4.5 w-3 h-3 rounded-full border bg-white transition-transform duration-200 ${
                                isActiveNow
                                  ? "bg-primary border-primary/50 animate-pulse"
                                  : isEmergencyItem
                                  ? "bg-amber-500 border-amber-600"
                                  : isFixedType
                                  ? "bg-[#E24B4A] border-red-200"
                                  : isCompleted
                                  ? "bg-emerald-500 border-emerald-600"
                                  : isSkipped || isExpired
                                  ? "bg-neutral-400 border-neutral-500"
                                  : "bg-[#1D9E75] border-emerald-100"
                              }`} 
                            />

                            {/* TIMELINE CARD */}
                            <div 
                              className={`rounded-2xl border p-4.5 relative transition-all text-left shadow-xs ${
                                isDragging ? "opacity-40 scale-95 ring-2 ring-primary/30" :
                                isDragOver ? "ring-2 ring-primary/20" :
                                isActiveNow ? "bg-white border-primary/30 ring-2 ring-primary/15 shadow-md shadow-primary/10" :
                                isUpNext ? "bg-white border-neutral-200 border-dashed" :
                                isCompleted ? "opacity-60 bg-[#F0FDF4] border-neutral-150" :
                                isSkipped || isExpired ? "opacity-50 bg-neutral-100/70 border-neutral-200" :
                                "bg-white border-neutral-150 hover:scale-[1.005] hover:shadow-sm hover:border-neutral-200/80"
                              }`}
                              style={{
                                borderLeft: `3px solid ${
                                  isCompleted
                                    ? "#16A34A"
                                    : isSkipped || isExpired
                                    ? "#9CA3AF"
                                    : isEmergencyItem
                                    ? "var(--color-emergency-color)"
                                    : isFixedType
                                    ? (item.color || "#8B7EFF")
                                    : (() => {
                                        const cat = getTaskCategory(item.title);
                                        if (cat === "work") return "#8B7EFF";
                                        if (cat === "exercise") return "#14B8A6";
                                        if (cat === "relax") return "#22C55E";
                                        return "#F59E0B";
                                      })()
                                }`
                              }}
                            >
                              <div className="flex items-start gap-2">
                                {/* Drag handle — only for flex tasks */}
                                {!isFixedType && !isEmergencyItem && !isCompleted && (
                                  <div
                                    className="shrink-0 mt-3 cursor-grab active:cursor-grabbing text-neutral-300 hover:text-neutral-400 transition-colors opacity-0 group-hover:opacity-100"
                                    title="Drag to reorder"
                                  >
                                    <svg width="10" height="16" viewBox="0 0 10 16" fill="currentColor">
                                      <circle cx="2" cy="2" r="1.5"/><circle cx="8" cy="2" r="1.5"/>
                                      <circle cx="2" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
                                      <circle cx="2" cy="14" r="1.5"/><circle cx="8" cy="14" r="1.5"/>
                                    </svg>
                                  </div>
                                )}

                                <div className="flex items-start justify-between gap-1 flex-1 min-w-0">
                                  <div className="space-y-1 flex-1 min-w-0 pr-1">
                                    {/* Top meta tags */}
                                    <div className="flex items-center gap-1.5 text-xs text-[#5A5A7A] leading-none shrink-0 font-semibold uppercase tracking-wider flex-wrap">
                                      {isActiveNow && (
                                        <span className="text-primary bg-primary/10 px-1.5 py-0.5 rounded-md text-[9px] font-bold animate-pulse normal-case shrink-0">
                                          ⚡ Active
                                        </span>
                                      )}
                                      {isUpNext && (
                                        <span className="text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded-md text-[9px] font-bold normal-case shrink-0">
                                          Next →
                                        </span>
                                      )}
                                      {isSkipped && (
                                        <span className="text-neutral-500 bg-neutral-200/80 px-1.5 py-0.5 rounded-md text-[9px] font-bold normal-case shrink-0">
                                          🚫 Skipped
                                        </span>
                                      )}
                                      {isExpired && (
                                        <span className="text-neutral-500 bg-neutral-200/80 px-1.5 py-0.5 rounded-md text-[9px] font-bold normal-case shrink-0">
                                          ⏳ Expired
                                        </span>
                                      )}
                                      {isEmergencyItem ? (
                                        <span className="text-amber-600">🚨 Interruption</span>
                                      ) : isFixedType ? (
                                        <span className="text-[#E24B4A] flex items-center gap-0.5">
                                          <Lock className="w-2.5 h-2.5 shrink-0" /> Locked Block
                                        </span>
                                      ) : (
                                        <span className="text-[#1D9E75]">Flexible Slotted</span>
                                      )}

                                      {item.energy_level && (
                                        <><span>•</span><span className="capitalize">{item.energy_level} energy</span></>
                                      )}
                                      {isPinned && (
                                        <span className="flex items-center gap-0.5 text-primary bg-primary/10 px-1 rounded">
                                          📌 Pinned
                                        </span>
                                      )}
                                      {task?.importance && (
                                        <>
                                          <span>•</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold normal-case ${
                                            task.importance === "critical"
                                              ? "bg-red-50 text-red-600 border border-red-100"
                                              : task.importance === "important"
                                              ? "bg-primary/5 text-primary border border-primary/10"
                                              : "bg-[#ECFDF5] text-emerald-700 border border-emerald-200"
                                          }`}>
                                            {task.importance === "critical" ? "🚨 Critical" : task.importance === "important" ? "⚡ Important" : "🌱 Optional"}
                                          </span>
                                        </>
                                      )}
                                      {task?.task_flexibility && (
                                        <>
                                          <span>•</span>
                                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold normal-case ${
                                            task.task_flexibility === "fixed"
                                              ? "bg-purple-50 text-purple-650 border border-purple-200/50"
                                              : task.task_flexibility === "optional"
                                              ? "bg-[#ECFDF5] text-emerald-700 border border-emerald-200"
                                              : "bg-blue-50 text-blue-650 border border-blue-200/50"
                                          }`}>
                                            {task.task_flexibility === "fixed" ? "🔒 Rigid" : task.task_flexibility === "optional" ? "🌱 Optional" : "↔ Movable"}
                                          </span>
                                        </>
                                      )}
                                    </div>

                                    <h4 className={`text-sm font-semibold tracking-tight leading-snug font-display mt-1 ${isCompleted || isSkipped || isExpired ? "line-through text-neutral-400/70 opacity-50" : "text-neutral-800"}`}>
                                      {item.title}
                                    </h4>

                                    {/* Time row — click to pin time for flex tasks */}
                                    <div className={`flex items-center gap-1.5 text-xs mt-1.5 font-mono flex-wrap ${isCompleted ? "text-neutral-400/60 opacity-50" : "text-neutral-500"}`}>
                                      <Clock className="w-3.5 h-3.5 text-neutral-400 font-sans" />
                                      {!isFixedType && !isCompleted ? (
                                        <button
                                          onClick={() => handleOpenPinTime(item.id, item.start_time)}
                                          className="hover:text-primary hover:underline cursor-pointer transition-colors font-mono text-xs"
                                          title="Click to pin this task to a specific time"
                                        >
                                          {item.start_time} – {item.end_time}
                                        </button>
                                      ) : (
                                        <span>{item.start_time} – {item.end_time}</span>
                                      )}
                                      <span className="px-1.5 py-0.5 text-xs bg-neutral-100 rounded text-neutral-500 font-semibold">{durationText}</span>
                                      {isPinned && task && (
                                        <button
                                          onClick={() => handleUnpinTime(item.id)}
                                          className="text-primary/60 hover:text-red-500 text-[10px] font-bold ml-1 cursor-pointer transition-colors"
                                          title="Remove time pin — let app auto-schedule"
                                        >
                                          ✕ unpin
                                        </button>
                                      )}
                                    </div>

                                    {/* Task Graph links on timeline card */}
                                    {((task?.blocked_by && task.blocked_by.length > 0) || (task?.blocks && task.blocks.length > 0)) && (
                                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                                        {task.blocked_by && task.blocked_by.map(blockedId => {
                                          const blockedTask = flexibleTasks.find(t => t.id === blockedId);
                                          if (!blockedTask) return null;
                                          return (
                                            <span key={blockedId} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200/50 text-orange-700 text-[9px] font-semibold">
                                              ↳ blocked by: {blockedTask.title}
                                            </span>
                                          );
                                        })}
                                        {task.blocks && task.blocks.map(blocksId => {
                                          const blocksTask = flexibleTasks.find(t => t.id === blocksId);
                                          if (!blocksTask) return null;
                                          return (
                                            <span key={blocksId} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-200/50 text-blue-700 text-[9px] font-semibold">
                                              ↳ blocks: {blocksTask.title}
                                            </span>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {/* Subtle one-line consequence teaser */}
                                    {!isFixedType && !isCompleted && task?.consequence_teaser && (
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (openInsightTaskId === item.id) {
                                            setOpenInsightTaskId(null);
                                          } else {
                                            fetchConsequenceInsight(task);
                                          }
                                        }}
                                        className="text-[10px] text-amber-700/90 font-bold hover:bg-amber-100/30 border border-amber-200/50 bg-amber-50/20 px-2 py-0.5 rounded-lg w-max flex items-center gap-1 mt-1.5 transition-all select-none cursor-pointer"
                                        title="Tap to view full coach narrative"
                                      >
                                        <Zap className="w-2.5 h-2.5 text-amber-500 fill-amber-500/10 shrink-0" />
                                        <span>{task.consequence_teaser}</span>
                                        <span className="text-[8px] text-amber-400 font-bold ml-1 font-mono">{(openInsightTaskId === item.id) ? "▴ HIDE" : "▸ READ"}</span>
                                      </div>
                                    )}

                                    {/* Pin time editor inline */}
                                    {pinTimeTaskId === item.id && (
                                      <div className="mt-2 flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="text-xs font-bold text-primary">Pin to:</span>
                                        <input
                                          type="time"
                                          value={pinTimeValue}
                                          onChange={e => setPinTimeValue(e.target.value)}
                                          className="flex-1 text-xs bg-white border border-primary/30 rounded-lg px-2 py-1 font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                                          autoFocus
                                        />
                                        <button
                                          onClick={handleConfirmPinTime}
                                          className="text-xs font-bold text-white bg-primary rounded-lg px-2 py-1 cursor-pointer hover:bg-primary-dark transition-colors"
                                        >
                                          Set
                                        </button>
                                        <button
                                          onClick={() => setPinTimeTaskId(null)}
                                          className="text-xs text-neutral-400 hover:text-neutral-600 cursor-pointer"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    )}
                                  </div>

                                  {/* Controls: only for fixed/emergency items, or minimal undo for completed tasks */}
                                  <div className="flex items-center gap-1 shrink-0 self-start mt-1">
                                    {isFixedType && !isEmergencyItem && (
                                      <>
                                        <button 
                                          onClick={() => handleOpenEditFixed(fixedBlocks.find(b => b.id === item.id)!)}
                                          className="p-1 text-[#9999B3] hover:text-primary hover:bg-neutral-50 rounded transition-colors cursor-pointer"
                                          title="Edit Block"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => handleDeleteFixed(item.id)}
                                          className="p-1 text-[#9999B3] hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                          title="Delete Block"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </>
                                    )}

                                    {isCompleted && !isFixedType && (
                                      <button
                                        onClick={() => handleToggleTaskDone(item.id)}
                                        className="px-2 py-1 text-[10px] font-bold text-neutral-450 hover:text-neutral-700 bg-neutral-100 hover:bg-neutral-150 border border-neutral-200/50 rounded-lg cursor-pointer transition-all"
                                        title="Undo Completion"
                                      >
                                        Undo
                                      </button>
                                    )}
                                  </div>
                              </div>

                              {/* Prominent Action Button Bar (System 1) */}
                              {!isFixedType && !isCompleted && !isSkipped && !isExpired && (
                                <div className="mt-3.5 flex flex-wrap items-center gap-2 pt-3 border-t border-neutral-100/70 font-sans">
                                  {/* ✓ Done */}
                                  <button
                                    onClick={() => setEffortDialogTaskId(item.id)}
                                    className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-250 text-emerald-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    <span>Done</span>
                                  </button>

                                  {/* Timer button */}
                                  {activeTimer && activeTimer.taskId === item.id ? (
                                    <button
                                      onClick={handleStopTimer}
                                      className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-3xs animate-pulse"
                                    >
                                      <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping shrink-0" />
                                      <span>Stop</span>
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleStartTimer(item.id, item.title)}
                                      className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-250 text-blue-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
                                    >
                                      <Play className="w-3 h-3 fill-blue-550/20" />
                                      <span>Start</span>
                                    </button>
                                  )}

                                  {/* ↗ Delay */}
                                  <button
                                    onClick={() => {
                                      const task = flexibleTasks.find(t => t.id === item.id);
                                      const delayCount = task?.delay_count || 0;
                                      if (delayCount >= 2) {
                                        setFrictionPrompt({
                                          taskId: item.id,
                                          start_time: item.start_time
                                        });
                                      } else {
                                        setDelayDurationPromptTaskId(item.id);
                                      }
                                    }}
                                    className="flex-1 min-w-[70px] flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 border border-amber-250 text-amber-700 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-3xs"
                                  >
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                    <span>Delay</span>
                                  </button>

                                  {/* ⋮ More options */}
                                  <button
                                    onClick={() => setActionTrayTaskId(prev => prev === item.id ? null : item.id)}
                                    className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                                      actionTrayTaskId === item.id
                                        ? "bg-neutral-100 border-neutral-300 text-neutral-800"
                                        : "bg-neutral-50 border-neutral-200 hover:bg-neutral-100 text-neutral-600"
                                    }`}
                                  >
                                    <span>⋮ More</span>
                                  </button>
                                </div>
                              )}

                              {/* Friction prompt overlay (System 3.5 Friction Logging) */}
                              {frictionPrompt?.taskId === item.id && (
                                <div className="mt-3 p-4 bg-gradient-to-br from-[#FFFDF9] to-white border border-amber-200 rounded-2xl space-y-3.5 animate-fade-in shadow-xs text-left">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1 font-mono">
                                      <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" /> Postponing: What is the friction?
                                    </span>
                                    <button 
                                      onClick={() => setFrictionPrompt(null)} 
                                      className="text-neutral-350 hover:text-neutral-500 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>

                                  <div className="grid grid-cols-2 gap-1.5">
                                    {[
                                      { key: "low_energy", label: "⚡ Low Energy", desc: "Mentally drained" },
                                      { key: "distraction", label: "🔊 Distraction", desc: "Doomscrolling/phone" },
                                      { key: "resistance", label: "🐢 Resistance", desc: "Starting is hard" },
                                      { key: "unclear_task", label: "❓ Unclear Task", desc: "Too large or vague" },
                                      { key: "external_interrupt", label: "🚨 Interruption", desc: "External meeting/event" },
                                      { key: "unknown", label: "🤷 Other", desc: "Unknown/misc" }
                                    ].map((opt) => (
                                      <button
                                        key={opt.key}
                                        onClick={() => {
                                          setFrictionPrompt(prev => prev ? { ...prev, reason: opt.key as FrictionReason } : null);
                                        }}
                                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                                          frictionPrompt.reason === opt.key
                                            ? "bg-amber-50 border-amber-450 text-amber-850 ring-1 ring-amber-450/20"
                                            : "bg-white hover:bg-neutral-55 text-neutral-700 border-neutral-200"
                                        }`}
                                      >
                                        <span className="text-xs font-bold leading-none">{opt.label}</span>
                                        <span className="text-[9px] text-neutral-450 leading-none">{opt.desc}</span>
                                      </button>
                                    ))}
                                  </div>

                                  {frictionPrompt.reason && (
                                    <div className="space-y-2 pt-2 border-t border-neutral-100">
                                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">
                                        {frictionPrompt.isSkip || frictionPrompt.actionType === "tomorrow" ? "Confirm action" : "Select postponement type"}
                                      </span>
                                      <div className="flex gap-1.5">
                                        {frictionPrompt.isSkip || frictionPrompt.actionType === "tomorrow" ? (
                                          <button
                                            onClick={() => {
                                              const oldPrompt = frictionPrompt;
                                              if (oldPrompt && oldPrompt.reason) {
                                                executePostponeWithFriction(oldPrompt.taskId, "tomorrow", oldPrompt.reason, oldPrompt.start_time);
                                              }
                                            }}
                                            className="flex-1 py-2 text-xs font-bold rounded-xl text-white bg-red-550 hover:bg-red-655 active:bg-red-700 cursor-pointer shadow-sm transition-colors text-center font-display"
                                          >
                                            Confirm Move to Tomorrow
                                          </button>
                                        ) : (
                                          [
                                            { type: "delay_15", label: "⏱ Delay 15m" },
                                            { type: "delay_30", label: "☕ Delay 30m" },
                                            { type: "tomorrow", label: "📅 Tomorrow" }
                                          ].map(act => (
                                            <button
                                              key={act.type}
                                              onClick={() => {
                                                const oldPrompt = frictionPrompt;
                                                if (oldPrompt && oldPrompt.reason) {
                                                  executePostponeWithFriction(oldPrompt.taskId, act.type as any, oldPrompt.reason, oldPrompt.start_time);
                                                }
                                              }}
                                              className="flex-1 py-2 text-xs font-bold rounded-xl text-white bg-amber-550 hover:bg-amber-600 active:bg-amber-700 cursor-pointer shadow-sm transition-colors text-center"
                                            >
                                              {act.label}
                                            </button>
                                          ))
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Direct Delay Duration Picker Overlay */}
                              {delayDurationPromptTaskId === item.id && (
                                <div className="mt-3 p-4 bg-white border border-neutral-200 rounded-2xl space-y-3.5 animate-fade-in shadow-xs text-left">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider flex items-center gap-1 font-mono">
                                      ⏱ Choose Delay Duration
                                    </span>
                                    <button 
                                      onClick={() => setDelayDurationPromptTaskId(null)} 
                                      className="text-neutral-350 hover:text-neutral-500 cursor-pointer"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => executePostponeDirectly(item.id, "delay_15", item.start_time)}
                                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors text-center font-display"
                                    >
                                      ⏱ 15m
                                    </button>
                                    <button
                                      onClick={() => executePostponeDirectly(item.id, "delay_30", item.start_time)}
                                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-neutral-50 border border-neutral-200 text-neutral-700 hover:bg-neutral-100 cursor-pointer transition-colors text-center font-display"
                                    >
                                      ☕ 30m
                                    </button>
                                    <button
                                      onClick={() => {
                                        setDelayDurationPromptTaskId(null);
                                        setFrictionPrompt({
                                          taskId: item.id,
                                          start_time: item.start_time,
                                          actionType: "tomorrow"
                                        });
                                      }}
                                      className="flex-1 py-2 text-xs font-bold rounded-xl bg-amber-500 hover:bg-amber-600 text-white cursor-pointer shadow-sm transition-colors text-center font-display"
                                    >
                                      📅 Tomorrow
                                    </button>
                                  </div>
                                </div>
                              )}
                              </div>

                              {/* Inline Effort Dialog (frictionless completion) */}
                              {effortDialogTaskId === item.id && (
                                <div className="mt-3 p-3.5 bg-gradient-to-br from-[#F6F5FF] to-white border border-[#E0D9FF] rounded-2xl space-y-3 animate-fade-in shadow-sm">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-wider">How did it go?</span>
                                    <button onClick={() => setEffortDialogTaskId(null)} className="text-neutral-300 hover:text-neutral-500 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    {(["good", "okay", "struggled"] as const).map((effort) => (
                                      <button
                                        key={effort}
                                        onClick={() => {
                                          const now = new Date();
                                          let estimatedDuration = item.duration_minutes;
                                          let source: "timer" | "message" | "timestamp" | "default" = "default";
                                          let confidence = 0.1;

                                          if (activeTimer && activeTimer.taskId === item.id) {
                                            estimatedDuration = Math.max(1, Math.round((Date.now() - activeTimer.startedAt) / 60000));
                                            source = "timer";
                                            confidence = 1.0;
                                            setActiveTimer(null);
                                          } else {
                                            const scheduledItem = daySchedule.items.find(i => i.id === item.id);
                                            if (scheduledItem?.start_time) {
                                              const scheduledStartMins = timeToMinutes(scheduledItem.start_time);
                                              const currentMins = now.getHours() * 60 + now.getMinutes();
                                              if (currentMins > scheduledStartMins) {
                                                estimatedDuration = Math.max(10, Math.min(300, currentMins - scheduledStartMins));
                                                source = "timestamp";
                                                confidence = 0.3;
                                              }
                                            }
                                          }

                                          const updated = flexibleTasks.map(t =>
                                            t.id === item.id ? {
                                              ...t,
                                              status: "done" as const,
                                              focus_quality_effort: effort,
                                              completed_at: now.toISOString(),
                                              actual_duration_minutes: estimatedDuration,
                                              category: t.category || getTaskCategory(t.title),
                                              duration_log_confidence: confidence,
                                              duration_log_source: source,
                                            } : t
                                          );
                                          handleUpdateFlexible(updated);
                                          recordTaskExecutionLog(item.id, true, false, estimatedDuration, undefined, source, confidence);
                                          checkDayComplete(updated);
                                          setEffortDialogTaskId(null);
                                          showToast(effort === "good" ? "Great work! 💪" : effort === "okay" ? "Done! Keep going." : "Noted. We'll adjust tomorrow.", "success");
                                          triggerHaptic(40);
                                        }}
                                        className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all cursor-pointer capitalize ${
                                          effort === "good" ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100" :
                                          effort === "okay" ? "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100" :
                                          "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100"
                                        }`}
                                      >
                                        {effort === "good" ? "✅ Good" : effort === "okay" ? "👌 Okay" : "😤 Struggled"}
                                      </button>
                                    ))}
                                  </div>
                                  <p className="text-[10px] text-neutral-400 leading-relaxed font-sans">Your effort rating helps DayFlow learn your real capacity over time — no timers needed.</p>
                                </div>
                              )}

                              {/* Inline Task Expansion (workout exercises / class details / project engine details) */}
                              {((task && (task.description || task.projectId)) || (item as any).description) && (() => {
                                const linkedProj = task?.projectId ? projects.find(p => p.id === task.projectId) : null;
                                return (
                                  <div className="mt-2">
                                    <button
                                      onClick={() => setExpandedTaskIds(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                      className="flex items-center gap-1 text-[10px] font-bold text-primary/70 hover:text-primary cursor-pointer transition-colors"
                                    >
                                      <ChevronDown className={`w-3 h-3 transition-transform ${expandedTaskIds[item.id] ? "rotate-180" : ""}`} />
                                      {expandedTaskIds[item.id] ? "Hide details" : (linkedProj ? "See project progress" : "See details")}
                                    </button>
                                    {expandedTaskIds[item.id] && (
                                      <div className="mt-2">
                                        {linkedProj ? (() => {
                                          const daysLeft = Math.max(1, Math.ceil((new Date(linkedProj.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                                          const totalSubtasks = linkedProj.phases.flatMap(p => p.subtasks);
                                          const pendingSubtasks = totalSubtasks.filter(s => s.status === "pending");
                                          const remainingHours = Math.round(pendingSubtasks.reduce((acc, s) => acc + s.duration_minutes, 0) / 60 * 10) / 10;
                                          const urgency = Math.round((remainingHours / daysLeft) * 10) / 10;
                                          
                                          return (
                                            <div className="p-4.5 bg-neutral-50 border border-neutral-200/60 rounded-2xl space-y-3.5 animate-fade-in shadow-xs">
                                              <div className="flex justify-between items-start gap-4">
                                                <div className="space-y-0.5">
                                                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">Project Container</span>
                                                  <h4 className="text-xs font-bold text-neutral-800 leading-snug">{linkedProj.title}</h4>
                                                  {linkedProj.goal && <p className="text-[10px] text-neutral-500 leading-normal">{linkedProj.goal}</p>}
                                                </div>
                                                <div className="text-right shrink-0">
                                                  <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest leading-none">Deadline</span>
                                                  <p className="text-xs font-black text-primary leading-snug">{linkedProj.deadline}</p>
                                                </div>
                                              </div>
                                              
                                              {/* Progress bar */}
                                              <div className="space-y-1">
                                                <div className="flex justify-between text-[10px] font-bold text-neutral-600">
                                                  <span>Overall Progress</span>
                                                  <span>{linkedProj.progress}%</span>
                                                </div>
                                                <div className="w-full bg-neutral-200/50 rounded-full h-1.5 overflow-hidden">
                                                  <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${linkedProj.progress}%` }} />
                                                </div>
                                              </div>

                                              {/* Urgency & Load Engine info */}
                                              <div className="grid grid-cols-2 gap-2.5 bg-white border border-neutral-100 p-2.5 rounded-xl text-center shadow-xs">
                                                <div>
                                                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Urgency Score</span>
                                                  <span className={`text-xs font-black ${urgency > 2 ? 'text-amber-500' : 'text-neutral-700'}`}>
                                                    {urgency}h/day
                                                  </span>
                                                </div>
                                                <div>
                                                  <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-wider block">Est. Left</span>
                                                  <span className="text-xs font-black text-neutral-700">
                                                    {remainingHours} hours
                                                  </span>
                                                </div>
                                              </div>

                                              {/* Hierarchical subtasks view */}
                                              <div className="space-y-2">
                                                <span className="text-[9px] font-extrabold text-neutral-400 uppercase tracking-wider block">Timeline Steps</span>
                                                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                                                  {linkedProj.phases.map(phase => (
                                                    <div key={phase.id} className="space-y-1">
                                                      <span className="text-[9px] font-black text-primary/80 uppercase block">{phase.title}</span>
                                                      <div className="space-y-1.5 pl-1.5 border-l border-neutral-200/50">
                                                        {phase.subtasks.map(sub => {
                                                          const isCurrent = sub.id === task?.subtaskId;
                                                          const isDone = sub.status === "done";
                                                          const isSkipped = sub.status === "skipped";
                                                          return (
                                                            <div key={sub.id} className="flex items-center justify-between text-[11px] gap-4">
                                                              <div className="flex items-center gap-2 min-w-0">
                                                                {isDone ? (
                                                                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                                                ) : isSkipped ? (
                                                                  <X className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                                                                ) : isCurrent ? (
                                                                  <ArrowRight className="w-3.5 h-3.5 text-primary animate-pulse shrink-0 font-black" />
                                                                ) : (
                                                                  <Circle className="w-2.5 h-2.5 text-neutral-300 shrink-0" />
                                                                )}
                                                                <span className={`truncate font-medium ${isDone ? 'line-through text-neutral-450' : isCurrent ? 'text-primary font-bold' : 'text-neutral-600'}`}>
                                                                  {sub.title}
                                                                </span>
                                                              </div>
                                                              <span className="text-[9px] text-neutral-400 font-mono shrink-0">{sub.duration_minutes}m</span>
                                                            </div>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            </div>
                                          );
                                        })() : (
                                          <div className="p-3 bg-[#FAFAFA] border border-neutral-100 rounded-xl space-y-1.5 animate-fade-in">
                                            {((task?.description || (item as any).description) || "").split("\n").filter(Boolean).map((line: string, i: number) => (
                                              <div key={i} className="flex items-start gap-2 text-xs">
                                                <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5">{i + 1}</span>
                                                <span className="text-neutral-600 font-medium leading-relaxed">{line.replace(/^[-•*]\s*/, "")}</span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                );
                              })()}

                              {/* Deadline badge */}
                              {item.deadline && (
                                <div className="mt-2 text-xs bg-amber-50 text-amber-700/80 border border-amber-100 rounded-lg px-2 py-0.5 w-max font-semibold ml-6">
                                  Due {new Date(item.deadline).toLocaleDateString("en", { weekday: "short", day: "numeric" })}
                                </div>
                              )}

                              {/* ⚡ AI Consequence Insight & Action Tray */}
                              {!isFixedType && !isCompleted && (
                                <div className="mt-3 border-t border-neutral-100 pt-2.5">
                                  <div className="flex items-center gap-2">
                                    {!task?.consequence_teaser && (
                                      <button
                                        onClick={() => {
                                          if (openInsightTaskId === item.id) {
                                            setOpenInsightTaskId(null);
                                          } else if (task) {
                                            fetchConsequenceInsight(task);
                                          }
                                        }}
                                        className={`flex items-center gap-1.5 text-xs font-bold cursor-pointer transition-all ${openInsightTaskId === item.id ? "text-amber-600" : "text-amber-500 hover:text-amber-600"}`}
                                      >
                                        <Zap className={`w-3.5 h-3.5 ${loadingInsightTaskId === item.id ? "animate-pulse text-amber-500" : "text-amber-500"}`} />
                                        {openInsightTaskId === item.id ? "Hide consequence description" : "If skipped →"}
                                      </button>
                                    )}

                                    {!isEmergencyItem && (
                                      <>
                                        {!task?.consequence_teaser && <span className="text-neutral-300 text-xs">•</span>}
                                        <button
                                          onClick={() => setActionTrayTaskId(prev => prev === item.id ? null : item.id)}
                                          className="text-xs font-bold text-neutral-400 hover:text-neutral-600 transition-colors cursor-pointer flex items-center gap-1"
                                        >
                                          <span className={`transition-transform inline-block text-[8px] ${actionTrayTaskId === item.id ? "rotate-180" : ""}`}>▾</span>
                                          {actionTrayTaskId === item.id ? "Close options" : "Can't do this now?"}
                                        </button>
                                      </>
                                    )}
                                  </div>

                                  {openInsightTaskId === item.id && (
                                    <div className="mt-2.5 space-y-3 animate-fade-in text-left">
                                      {loadingInsightTaskId === item.id ? (
                                        <div className="p-3.5 bg-amber-50/70 border border-amber-200/50 rounded-2xl flex items-center gap-2 text-xs text-amber-600">
                                          <div className="w-3.5 h-3.5 rounded-full border-2 border-amber-400 border-t-transparent animate-spin shrink-0" />
                                          <span className="font-semibold">Analyzing real-world impact…</span>
                                        </div>
                                      ) : (() => {
                                        const consequenceKey = task ? getConsequenceCacheKey(task, "skip", 0, daySchedule.items, completedStreak, selectedDate) : "";
                                        const cached = consequenceCache[consequenceKey];
                                        if (!cached) {
                                          return (
                                            <div className="p-3.5 bg-amber-50/70 border border-amber-200/50 rounded-2xl">
                                              <p className="text-xs text-amber-800 leading-relaxed font-semibold">{task?.consequence_insight || "Tap again to analyze."}</p>
                                            </div>
                                          );
                                        }

                                        // Map emotional weight to premium styles
                                        const weightStyles = {
                                          critical: "border-red-200 bg-red-50 text-red-800",
                                          high: "border-orange-200 bg-orange-50 text-orange-800",
                                          medium: "border-amber-200 bg-amber-50/70 text-amber-800",
                                          low: "border-blue-100 bg-blue-50/50 text-blue-800",
                                          none: "border-neutral-200 bg-neutral-50 text-neutral-800"
                                        };
                                        const style = weightStyles[cached.emotional_weight] || weightStyles.none;

                                        // Get headline based on primary_message_slot
                                        const headline = cached.primary_message_slot === "immediate" 
                                          ? cached.immediate_effect 
                                          : cached.primary_message_slot === "cascade"
                                          ? cached.cascade_effect
                                          : cached.goal_effect;

                                        return (
                                          <div className={`p-4 border rounded-2xl space-y-3 ${style}`}>
                                            {/* Severity Warn Banner */}
                                            {cached.emotional_weight === "critical" && (
                                              <div className="p-2.5 bg-red-650 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 animate-pulse">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                <span>CRITICAL CASCADE: Skipping breaks your project dependencies!</span>
                                              </div>
                                            )}
                                            {cached.emotional_weight === "high" && (
                                              <div className="p-2.5 bg-orange-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                                <span>HIGH IMPACT TRADE-OFF: Consider taking a partial compromise.</span>
                                              </div>
                                            )}

                                            {/* Headline */}
                                            <div className="space-y-0.5">
                                              <span className="text-[9px] font-bold tracking-wider uppercase opacity-60">Primary Impact</span>
                                              <h5 className="text-xs font-bold leading-snug">{headline}</h5>
                                            </div>

                                            {/* Expanded details */}
                                            <div className="pt-2 border-t border-current/10 space-y-1.5 text-xs opacity-90 leading-relaxed font-sans">
                                              <p><strong>Immediate:</strong> {cached.immediate_effect}</p>
                                              <p><strong>Downstream:</strong> {cached.cascade_effect}</p>
                                              <p><strong>Goal Momentum:</strong> {cached.goal_effect}</p>
                                            </div>

                                            {/* Recommendations */}
                                            <div className="p-3 bg-white/70 rounded-xl space-y-2 border border-current/5">
                                              <div className="text-[11px] text-neutral-800">
                                                <span className="font-bold block text-primary text-[9px] uppercase tracking-wider mb-0.5">💡 Best Action Path</span>
                                                <p className="leading-relaxed font-medium">{cached.recommendation.best_action}</p>
                                              </div>
                                              <div className="text-[11px] text-neutral-800 pt-1.5 border-t border-neutral-100">
                                                <span className="font-bold block text-emerald-700 text-[9px] uppercase tracking-wider mb-0.5">🌱 Minimum Viable Progress (MVP)</span>
                                                <p className="leading-relaxed font-semibold">{cached.recommendation.minimum_viable_progress}</p>
                                              </div>
                                            </div>

                                            {/* Negotiation Options */}
                                            {cached.negotiation_options && cached.negotiation_options.length > 0 && (
                                              <div className="space-y-2 pt-1">
                                                <span className="text-[9px] font-bold tracking-wider uppercase opacity-60 block">Empathy-driven Negotiations</span>
                                                <div className="flex flex-col gap-1.5">
                                                  {cached.negotiation_options.map((opt, oIdx) => (
                                                    <button
                                                      key={oIdx}
                                                      type="button"
                                                      onClick={() => task && executeNegotiationCommand(task, opt.command)}
                                                      className="flex items-center justify-between p-2.5 bg-white hover:bg-neutral-50 border border-neutral-150 rounded-xl text-left transition-all cursor-pointer shadow-sm group w-full"
                                                    >
                                                      <div className="space-y-0.5 pr-2">
                                                        <span className="text-xs font-bold text-neutral-800 group-hover:text-primary transition-colors">{opt.label}</span>
                                                        <span className="text-[10px] text-neutral-400 block leading-tight">{opt.consequence_delta}</span>
                                                      </div>
                                                      <span className="text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded bg-neutral-100 text-neutral-500 border group-hover:bg-primary/10 group-hover:text-primary group-hover:border-primary/20 transition-all font-mono">
                                                        {opt.strategy.replace("_", " ")}
                                                      </span>
                                                    </button>
                                                  ))}
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })()}
                                    </div>
                                  )}

                                  {actionTrayTaskId === item.id && (
                                    <div className="mt-2.5 flex flex-wrap gap-1.5 animate-fade-in">
                                      <button onClick={() => { showToast("10 min break added.", "info"); setActionTrayTaskId(null); }} className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer">☕ 10 min break</button>
                                      <button onClick={() => { const result = simulateDelayCost(daySchedule.items, item.id, 30, appSettings.day_end, todayFlexCount, flexibleTasks, completedStreak); setConsequenceState({ taskId: item.id, mode: "break", breakMins: 30, result }); setActionTrayTaskId(null); }} className="px-3 py-2 rounded-xl text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-colors cursor-pointer">☕ 30 min break</button>
                                      <button onClick={() => { setMoveSheetTaskId(item.id); setActionTrayTaskId(null); handleOpenAICopilot(); setCopilotInput(`I want to move "${item.title}" to later today. What slots are available?`); }} className="px-3 py-2 rounded-xl text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 transition-colors cursor-pointer">↔ Move later</button>
                                      <button onClick={() => { const result = simulateDelayCost(daySchedule.items, item.id, 0, appSettings.day_end, todayFlexCount, flexibleTasks, completedStreak); setConsequenceState({ taskId: item.id, mode: "skip", result }); setActionTrayTaskId(null); }} className="px-3 py-2 rounded-xl text-xs font-bold bg-red-50 text-red-500 border border-red-100 hover:bg-red-100 transition-colors cursor-pointer">✕ Skip today</button>
                                    </div>
                                  )}

                                  {consequenceState?.taskId === item.id && (
                                    <div className="mt-3 p-4 bg-white border border-neutral-200 rounded-2xl shadow-sm space-y-3 animate-fade-in text-left">
                                      <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">
                                        {consequenceState.mode === "skip" ? `Skipping "${item.title}" today` : `Taking a ${consequenceState.breakMins} min break`}
                                      </p>
                                      <div className="space-y-1">
                                        {consequenceState.result.shiftedTasks.slice(0, 3).map(st => (
                                          <div key={st.id} className="flex items-center gap-1.5 text-xs text-neutral-600">
                                            <span className="text-neutral-300">·</span>
                                            <span className="font-medium truncate max-w-[120px]">{st.title}</span>
                                            <span className="text-neutral-400 shrink-0 font-mono text-[10px]">→ {st.newStart} (was {st.oldStart})</span>
                                          </div>
                                        ))}
                                        {consequenceState.result.sleepShiftMins > 0 && (
                                          <div className="flex items-center gap-1.5 text-xs text-red-600 font-semibold">
                                            <Moon className="w-3.5 h-3.5" /><span>Sleep shifts +{consequenceState.result.sleepShiftMins} min later</span>
                                          </div>
                                        )}
                                        {consequenceState.result.streakBreaks && completedStreak > 0 && (
                                          <div className="flex items-center gap-1.5 text-xs text-orange-600 font-semibold">
                                            <Flame className="w-3.5 h-3.5" /><span>{completedStreak}-day streak breaks</span>
                                          </div>
                                        )}
                                        {consequenceState.mode === "skip" && consequenceState.result.freeTimeLostMins > 0 && (
                                          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium pt-1 mt-1 border-t border-neutral-100">
                                            <span className="text-neutral-300">·</span><span>Tonight: +{consequenceState.result.freeTimeLostMins} min free time</span>
                                          </div>
                                        )}
                                      </div>
                                      {consequenceState.mode === "skip" && (
                                        <div className="p-2.5 bg-primary/5 border border-primary/15 rounded-xl">
                                          <p className="text-xs text-primary font-semibold">💡 Do {Math.max(20, Math.round(item.duration_minutes * 0.4))} min now → preserves momentum & streak</p>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-2 pt-1">
                                        {consequenceState.mode === "skip" && (
                                          <button onClick={() => { const r = Math.max(20, Math.round(item.duration_minutes * 0.4)); handleUpdateFlexible(flexibleTasks.map(t => t.id === item.id ? { ...t, duration_minutes: r, partial_completion: true, partial_duration_minutes: r } : t)); setConsequenceState(null); showToast(`Reduced to ${r} min. Momentum preserved. ✓`, "success"); triggerHaptic(30); }} className="px-3.5 py-2 text-xs font-bold bg-primary text-white rounded-xl hover:bg-primary-dark transition-colors cursor-pointer shadow-sm">Do {Math.max(20, Math.round(item.duration_minutes * 0.4))} min</button>
                                        )}
                                        {consequenceState.mode === "break" && (
                                          <button onClick={() => { showToast(`${consequenceState.breakMins} min break added.`, "info"); setConsequenceState(null); triggerHaptic(20); }} className="px-3.5 py-2 text-xs font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors cursor-pointer">Take {consequenceState.breakMins} min</button>
                                        )}
                                        <button onClick={() => setConsequenceState(null)} className="px-3.5 py-2 text-xs font-bold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors cursor-pointer">Do full task</button>
                                        {consequenceState.mode === "skip" && (
                                          <button onClick={() => { setFrictionPrompt({ taskId: item.id, start_time: item.start_time, isSkip: true }); setConsequenceState(null); triggerHaptic(50); }} className="px-3.5 py-2 text-xs font-bold bg-neutral-100 text-neutral-500 rounded-xl hover:bg-neutral-200 transition-colors cursor-pointer">Skip anyway</button>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Drop indicator after */}
                            {isDragOver && dragOverPosition === "after" && (
                              <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full z-10 shadow-sm shadow-primary/30" />
                            )}

                            {/* Gap buffer display */}
                            {gapMins > 0 && (
                              <div className="relative my-4 ml-1.5 pl-6 py-2.5 border-l-2 border-dashed border-neutral-200/90 flex items-center gap-2 select-none">
                                <span className="absolute -left-[7.5px] top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full border border-neutral-200 bg-white flex items-center justify-center text-xs font-bold text-neutral-400">
                                  +
                                </span>
                                <Coffee className="w-3.5 h-3.5 text-[#A06C10] shrink-0" />
                                <div className="space-y-0.5 text-left">
                                  <span className="text-xs font-medium text-neutral-600 font-sans block leading-none">
                                    {gapMins}m transition buffer
                                  </span>
                                  <span className="text-[11px] text-[#A06C10] font-mono block leading-none font-semibold">
                                    Adaptive break · Smart Circadian default
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                    </div>
                  )}

                  </div>
                  </div>

                  {/* Column 2: Day Coach Chat (only on mobile when tab active; desktop uses slide-over) */}
                  <div className={`${todaySubTab === "copilot" ? "flex" : "hidden"} md:hidden flex-col w-full bg-white h-full overflow-hidden p-4 text-left`}>
                    {renderCopilotContent(true)}
                  </div>



                </div>
              </div>
            )}

            {/* TAB VIEW 2: MASTER BACKLOG */}
            {activeTab === "backlog" && (
              <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 h-full overflow-y-auto">
                
                {/* Search / Filter Pills header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#9999B3]">Backlog Filter</span>
                    <button
                      onClick={() => handleOpenAddFlexible(false)}
                      className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/15 text-primary text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 border border-primary/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Task
                    </button>
                  </div>
                  <div className="flex gap-1.5 overflow-x-auto py-0.5 shrink-0 scrollbar-none">
                    {(["all", "deadline", "anytime", "done"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setBacklogFilter(filter)}
                        className={`px-4 py-2 text-xs rounded-full cursor-pointer font-bold capitalize transition-all border whitespace-nowrap ${
                          backlogFilter === filter
                            ? "bg-primary text-white border-primary shadow-sm shadow-primary/10"
                            : "bg-transparent text-neutral-600 border-neutral-200 hover:bg-neutral-100/30"
                        }`}
                      >
                        {filter === "all" ? "Active" : filter === "deadline" ? "Has Deadline" : filter}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Backlog Grid list container */}
                <div className="flex-1 space-y-3 pb-24">
                  {filteredBacklogTasks.length === 0 ? (
                    <div className="py-20 text-center flex flex-col items-center justify-center space-y-3.5">
                      <div className="p-4 bg-white border border-neutral-200 rounded-full text-neutral-400 shadow-sm">
                        <Zap className="w-7 h-7 stroke-[1.5]" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-neutral-800">Backlog queue is empty</p>
                        <p className="text-xs text-[#9999B3] max-w-sm px-10 mt-1 leading-relaxed">
                          No deadlines required; predictions map them automatically. Add tasks to fill up the backlog.
                        </p>
                      </div>
                      <button
                        onClick={() => handleOpenAddFlexible(false)}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 font-display"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Backlog Task
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {filteredBacklogTasks.map((task) => {
                        const estimateStr = futurePredictions[task.id]?.reason || "Checking gaps...";
                        const isHighEnergy = task.energy_level === "high";
                        const isLowEnergy = task.energy_level === "low";

                        return (
                          <div 
                            key={task.id} 
                            className="glass-card rounded-2xl p-5 flex flex-col justify-between relative transition-all duration-200 hover:border-primary/30"
                            style={{
                              borderLeft: `4px solid ${
                                isHighEnergy
                                  ? "var(--color-emergency-color)"
                                  : isLowEnergy
                                  ? "var(--color-flex-color)"
                                  : "var(--color-primary)"
                              }`
                            }}
                          >
                            {/* Inline confirmation delete trigger */}
                            {deletingTaskId === task.id ? (
                              <div className="absolute inset-0 bg-white/95 rounded-xl flex items-center justify-between p-4 z-10">
                                <span className="text-xs font-semibold text-neutral-700">Remove this task permanently?</span>
                                <div className="flex gap-2">
                                  <button 
                                    onClick={() => setDeletingTaskId(null)}
                                    className="px-2.5 py-1 text-xs font-bold border rounded bg-neutral-100 hover:bg-neutral-200 text-neutral-600 transition-colors cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteFlexible(task.id)}
                                    className="px-2.5 py-1 text-xs font-bold text-white rounded bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </div>
                            ) : null}

                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="w-1.5 h-1.5 rounded-full"
                                  style={{
                                    backgroundColor: isHighEnergy
                                      ? "var(--color-emergency-color)"
                                      : isLowEnergy
                                      ? "var(--color-flex-color)"
                                      : "var(--color-primary)"
                                  }}
                                />
                                <span className="text-xs font-bold uppercase tracking-wider text-[#9999B3] font-mono leading-none">
                                  {task.energy_level} energy
                                </span>
                                {isTaskStale(task) && (
                                  <span className="text-[10px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-0.5" title="Task is pending for 3+ days">
                                    <AlertTriangle className="w-2.5 h-2.5 shrink-0" /> Stale
                                  </span>
                                )}
                              </div>

                              {/* Small details control */}
                              <div className="flex gap-1">
                                <button 
                                  onClick={() => handleOpenEditFlexible(task)}
                                  className="p-1 hover:bg-neutral-100 text-[#9999B3] hover:text-neutral-700 rounded transition-colors"
                                  title="Edit detailed attributes"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button 
                                  onClick={() => setDeletingTaskId(task.id)}
                                  className="p-1 hover:bg-red-50 text-[#9999B3] hover:text-red-500 rounded transition-colors"
                                  title="Delete item"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>

                            <h5 className="font-semibold text-neutral-800 text-xs tracking-tight leading-snug line-clamp-2 select-all mb-2 font-display">
                              {task.title}
                            </h5>

                            <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-neutral-100 gap-1 font-mono">
                              <span className="text-neutral-500 font-sans">
                                Duration: <strong className="text-neutral-700">{task.duration_minutes} min</strong>
                              </span>
                              
                              {task.deadline && (
                                <span className="text-red-600 font-sans text-xs font-semibold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-0.5">
                                  Due {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center justify-between mt-3 pt-2">
                              {/* Prediction stamps */}
                              <span className="text-xs font-medium text-neutral-400 italic font-mono truncate">
                                {estimateStr}
                              </span>

                              {task.status !== "done" && (
                                <button 
                                  onClick={() => handleScheduleTaskToday(task)}
                                  className="px-2.5 py-1 text-xs bg-primary hover:bg-primary-dark font-bold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-0.5 text-right shrink-0"
                                >
                                  Schedule today →
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB VIEW 3: FUTURE CALENDAR + PREDICTIONS */}
            {activeTab === "calendar" && (
              <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 h-full overflow-y-auto lg:overflow-hidden">
                
                {/* Widescreen Responsive Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start h-full lg:overflow-hidden">
                  
                  {/* Left Column (Stats + Month grid) */}
                  <div className="lg:col-span-8 space-y-4 lg:overflow-y-auto h-full pb-24 lg:pb-6 lg:pr-3">
                    
                    {/* SECTION A: Monthly Calendar Grid (top block) */}
                    <div className="glass-card rounded-2xl p-5">
                      <div className="flex items-center justify-between mb-3 border-b border-neutral-100 pb-2">
                        <h4 className="text-sm font-bold font-display tracking-tight text-neutral-800">
                          {new Date(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                        </h4>
                        <div className="flex gap-1.5 font-sans">
                          <button 
                            onClick={() => handleMonthChange("prev")}
                            className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer text-neutral-600"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleMonthChange("next")}
                            className="p-1 rounded bg-neutral-100 hover:bg-neutral-200 transition-colors cursor-pointer text-neutral-600"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Calendar 7 col headers */}
                      <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-2 font-display">
                        <span>Su</span>
                        <span>Mo</span>
                        <span>Tu</span>
                        <span>We</span>
                        <span>Th</span>
                        <span>Fr</span>
                        <span>Sa</span>
                      </div>

                      {/* Month grid days representation */}
                      <div className="grid grid-cols-7 gap-1">
                        {currentMonthGrid.map((cell, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedDate(cell.dateStr)}
                            className={`h-9 flex flex-col items-center justify-center p-1 rounded-lg transition-all relative cursor-pointer ${
                              cell.isSelected
                                ? "bg-primary text-white font-bold"
                                : cell.isToday
                                ? "bg-primary-light text-primary font-bold border border-primary/20"
                                : cell.isCurrentMonth
                                ? "text-neutral-800 hover:bg-neutral-50"
                                : "text-neutral-300"
                            }`}
                          >
                            <span className="text-sm">{cell.num}</span>
                            {/* Dot marks */}
                            <div className="flex gap-0.5 mt-0.5">
                              {cell.hasFixed && (
                                <span className={`w-1 h-1 rounded-full ${cell.isSelected ? "bg-white" : "bg-[#E24B4A]"}`} />
                              )}
                              {cell.hasFlex && (
                                <span className={`w-1 h-1 rounded-full ${cell.isSelected ? "bg-white" : "bg-[#1D9E75]"}`} />
                              )}
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* STATS ROW (between Section A and B) */}
                      <div className="grid grid-cols-3 gap-3 shrink-0 font-sans mt-4">
                        <div className="bg-white/40 border border-white/20 p-3 rounded-xl text-center shadow-2xs hover:bg-white/60 transition-colors">
                          <strong className="block text-xl font-medium text-neutral-800 leading-none">{dashboardStats.thisWeek}</strong>
                          <span className="text-xs text-[#9999B3] mt-1.5 block">This week</span>
                        </div>
                        <div className="bg-white/40 border border-white/20 p-3 rounded-xl text-center shadow-2xs hover:bg-white/60 transition-colors">
                          <strong className="block text-xl font-medium text-neutral-800 leading-none">{dashboardStats.backlog}</strong>
                          <span className="text-xs text-[#9999B3] mt-1.5 block">In backlog</span>
                        </div>
                        <div className="bg-white/40 border border-white/20 p-3 rounded-xl text-center shadow-2xs hover:bg-white/60 transition-colors">
                          <strong className="block text-xl font-medium text-emerald-600 leading-none">{dashboardStats.streak}d</strong>
                          <span className="text-xs text-[#9999B3] mt-1.5 block">Streak</span>
                        </div>
                      </div>
                    </div>

                    {/* Execution Score + Momentum Badge Card */}
                    {executionScore !== null && (
                      <div className="glass-card rounded-2xl p-5 space-y-3.5 font-sans text-left mt-4">
                        <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/10" /> Daily Execution & Momentum
                        </h4>

                        <div className="flex items-center justify-between">
                          <div className="space-y-0.5">
                            <span className="text-2xl font-bold text-neutral-800">{executionScore.score}%</span>
                            <span className="block text-xs text-neutral-500">Tasks: {executionScore.done} / {executionScore.total} completed</span>
                          </div>
                          
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              momentumState === "high" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" :
                              momentumState === "stable" ? "bg-amber-50 text-amber-700 border border-amber-100" :
                              "bg-red-50 text-red-700 border border-red-100"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                momentumState === "high" ? "bg-emerald-500" :
                                momentumState === "stable" ? "bg-amber-500" :
                                "bg-red-500"
                              }`} />
                              {momentumState === "high" ? "High Momentum" :
                               momentumState === "stable" ? "Steady" :
                               "Behind"}
                            </span>
                            {completedStreak > 0 && (
                              <span className="block text-[10px] text-neutral-400 mt-1 font-medium font-mono">
                                🔥 {completedStreak}-DAY STREAK
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="w-full h-1.5 bg-neutral-100/60 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              momentumState === "high" ? "bg-emerald-500" :
                              momentumState === "stable" ? "bg-amber-500" :
                              "bg-red-500"
                            }`}
                            style={{ width: `${executionScore.score}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Circadian Calibration Matrix Card */}
                    <div className="glass-card rounded-2xl p-5 space-y-3 font-sans text-left mt-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10 animate-pulse" /> Circadian Calibration Matrix
                        </h4>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${
                          calibrationProfile.phase === 2 
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50 animate-pulse" 
                            : "bg-amber-50 text-amber-700 border border-amber-200/50"
                        }`}>
                          {calibrationProfile.phase === 2 ? "Phase 2: Calibrated" : "Phase 1: Smart Defaults"}
                        </span>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs text-neutral-500">
                          <span>Calibration Status ({calibrationProfile.totalCompletions} / 15 tasks):</span>
                          <span className="font-bold text-neutral-700">{calibrationPercentage}%</span>
                        </div>
                        <div className="w-full h-2 bg-neutral-100/60 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary rounded-full transition-all duration-700 ease-out" 
                            style={{ width: `${calibrationPercentage}%` }}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div className="bg-white/40 border border-white/20 p-2.5 rounded-xl hover:bg-white/60 transition-colors">
                          <span className="block text-xs uppercase tracking-wider text-neutral-400 font-bold">Peak Focus Time</span>
                          <span className="text-xs font-semibold text-neutral-700 capitalize flex items-center gap-1 mt-0.5">
                            {calibrationProfile.peakFocusTime === "morning" && <Clock className="w-3.5 h-3.5 text-primary" />}
                            {calibrationProfile.peakFocusTime === "afternoon" && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                            {calibrationProfile.peakFocusTime === "evening" && <Moon className="w-3.5 h-3.5 text-indigo-700" />}
                            {calibrationProfile.peakFocusTime} focus
                          </span>
                        </div>
                        <div className="bg-white/40 border border-white/20 p-2.5 rounded-xl hover:bg-white/60 transition-colors">
                          <span className="block text-xs uppercase tracking-wider text-neutral-400 font-bold">Underestimate Multiplier</span>
                          <span className="text-xs font-semibold text-neutral-700 font-mono mt-0.5 block">
                            {calibrationProfile.underestimateRatio.toFixed(2)}x duration
                          </span>
                        </div>
                        <div className="bg-white/40 border border-white/20 p-2.5 rounded-xl hover:bg-white/60 transition-colors">
                          <span className="block text-xs uppercase tracking-wider text-neutral-400 font-bold">Adaptive Work Gap</span>
                          <span className="text-xs font-semibold text-neutral-700 font-mono mt-0.5 block">
                            {calibrationProfile.optimalWorkGap} minutes
                          </span>
                        </div>
                        <div className="bg-white/40 border border-white/20 p-2.5 rounded-xl hover:bg-white/60 transition-colors">
                          <span className="block text-xs uppercase tracking-wider text-neutral-400 font-bold">Post-Exercise Gap</span>
                          <span className="text-xs font-semibold text-neutral-700 font-mono mt-0.5 block">
                            {calibrationProfile.exerciseRecoveryGap} minutes
                          </span>
                        </div>
                      </div>

                      <div className="text-xs text-neutral-500 bg-white/40 border border-white/20 p-2.5 rounded-xl leading-relaxed text-left">
                        {calibrationProfile.phase === 2 ? (
                          <span>🚀 <strong>Personalization Active!</strong> DayFlow has adapted your buffers, recovery gaps, and slot duration multipliers to match your completed execution history.</span>
                        ) : (
                          <span>💡 <strong>Onboarding active:</strong> Using generic smart defaults (15m work breaks, 25m workout recovery) until 15 tasks are completed.</span>
                        )}
                      </div>
                    </div>

                  </div>

                  {/* Right Column (SECTION B: Day Detail Panel - Only visible beside calendar on desktop) */}
                  <div className="lg:col-span-4 glass-card rounded-2xl p-5 space-y-3 shrink-0 w-full lg:overflow-y-auto lg:h-full pb-24 lg:pb-6">
                    <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-display border-b border-neutral-100 pb-2 flex items-center justify-between">
                      <span>Day Frame: {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="text-xs font-mono text-neutral-400 font-normal">{daySchedule.items.length} slotted</span>
                    </h4>

                    <div className="space-y-2 lg:overflow-visible">
                      {daySchedule.items.length === 0 ? (
                        <p className="text-xs text-[#9999B3] italic py-3 select-none text-center">Nothing scheduled · Backlog tasks will be predicted here</p>
                      ) : (
                        daySchedule.items.map((item) => {
                          const isFixedType = item.type === "fixed";
                          return (
                            <div 
                              key={item.id} 
                              className="bg-white/40 border border-white/20 px-3 py-3 rounded-xl flex items-center justify-between text-xs animate-fade-in hover:bg-white/60 transition-colors"
                            >
                              <div className="truncate pr-2 select-text text-left">
                                <span className="font-semibold text-neutral-800 truncate block text-left">{item.title}</span>
                                <span className="text-xs text-[#5A5A7A] font-mono">{item.start_time} – {item.end_time}</span>
                              </div>
                              <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider font-mono ${
                                isFixedType ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"
                              }`}>
                                {isFixedType ? "Fixed" : "Flexible"}
                              </span>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Coming from backlog prediction display */}
                    <div className="mt-4 pt-4 border-t border-neutral-100 space-y-2">
                      <h5 className="text-xs font-bold text-[#9999B3] uppercase tracking-wider text-left">
                        Coming from backlog
                      </h5>
                      <div className="space-y-2">
                        {(() => {
                          const predicted = flexibleTasks.filter(
                            (t) => t.scheduled_date === null && t.status !== "done" && futurePredictions[t.id]?.estDate === selectedDate
                          );
                          if (predicted.length === 0) {
                            return (
                              <p className="text-xs text-[#9999B3] italic py-2 text-center select-none">
                                No predicted tasks for this date
                              </p>
                            );
                          }
                          return predicted.map((task) => {
                            const hrs = Math.floor(task.duration_minutes / 60);
                            const mins = task.duration_minutes % 60;
                            const durStr = hrs > 0 ? `${hrs}h ${mins > 0 ? `${mins}m` : ""}` : `${mins}m`;
                            return (
                              <div
                                key={task.id}
                                onClick={() => handleOpenEditFlexible(task)}
                                className="bg-white px-3 py-3 rounded-xl border border-dashed border-neutral-300 hover:border-[#8B7EFF]/45 hover:bg-neutral-50 flex items-center justify-between text-xs cursor-pointer transition-all text-left text-neutral-800 shadow-xs animate-fade-in"
                              >
                                <div className="truncate pr-2 select-text">
                                  <span className="font-semibold text-neutral-800 truncate block">{task.title}</span>
                                  <span className="text-[11px] text-neutral-500 font-mono">Estimated prediction slot</span>
                                </div>
                                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded shrink-0 uppercase tracking-wider font-mono bg-primary-light text-primary">
                                  Est. {durStr} · Predicted
                                </span>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB VIEW 4: ROUTINES & SCHEDULE PROFILES */}
            {activeTab === "routines" && (
              <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 h-full overflow-y-auto bg-[#F9FAFB] text-slate-800">
                <div className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto w-full">
                  
                  {/* Instagram-style Profile Header (Compact on mobile, horizontal row) */}
                  <div className="flex flex-row items-start gap-4 md:gap-6 pb-6 border-b border-neutral-200 text-left">
                    {/* Left: Avatar Circle */}
                    <div className="relative group shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-[#7F77DD] via-[#A894FF] to-[#14B8A6] p-[2.5px] md:p-[3px] flex items-center justify-center shadow-md transition-transform duration-300 hover:rotate-6">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-2xl sm:text-3xl md:text-4xl select-none">
                          {profileEmoji || "👨‍💻"}
                        </div>
                      </div>
                    </div>
                    
                    {/* Right: Bio & Details */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                        <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-neutral-800 font-display truncate">{profileName}</h2>
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 text-[10px] sm:text-xs bg-neutral-100 border border-neutral-200 text-neutral-550 rounded-full font-semibold shrink-0">
                            {profileAge} yrs old
                          </span>
                          <button 
                            onClick={() => {
                              navigate("/settings");
                              triggerHaptic(15);
                            }}
                            className="px-2 py-0.5 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-[#475569] hover:text-[#1e293b] text-[10px] sm:text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0"
                          >
                            Settings
                          </button>
                        </div>
                      </div>
                      
                      {/* Stats row */}
                      <div className="flex items-center gap-4 md:gap-6 text-[11px] sm:text-xs md:text-sm font-semibold text-neutral-600 py-0.5">
                        <div>
                          <span className="font-extrabold text-neutral-900">{totalCompletedTasks}</span> <span className="text-neutral-500 font-normal">done</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-neutral-900">{profiles.length}</span> <span className="text-neutral-500 font-normal">routines</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-neutral-900">{completedStreak}d</span> <span className="text-neutral-500 font-normal">streak</span>
                        </div>
                      </div>

                      {/* Bio text */}
                      <div className="text-[11px] sm:text-xs text-neutral-600 leading-relaxed font-sans max-w-md">
                        <p className="font-medium text-neutral-800">{profileBio || "Productivity enthusiast."}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tab switcher: Routines vs Goals vs Insights */}
                  <div className="flex justify-center border-b border-neutral-250/60 pb-px">
                    <div className="flex gap-8">
                      <button 
                        onClick={() => {
                          navigate("/routines");
                          triggerHaptic(12);
                        }}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                          profileViewTab === "grid" 
                            ? "border-primary text-primary" 
                            : "border-transparent text-neutral-400 hover:text-neutral-650"
                        }`}
                      >
                        <Grid className="w-3.5 h-3.5" />
                        <span>Routines</span>
                      </button>
                      <button 
                        onClick={() => {
                          navigate("/projects");
                          triggerHaptic(12);
                        }}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                          profileViewTab === "projects" 
                            ? "border-primary text-primary" 
                            : "border-transparent text-neutral-400 hover:text-neutral-650"
                        }`}
                      >
                        <FolderKanban className="w-3.5 h-3.5" />
                        <span>Projects</span>
                      </button>
                      <button 
                        onClick={() => {
                          navigate("/goals");
                          triggerHaptic(12);
                        }}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                          profileViewTab === "goals" 
                            ? "border-primary text-primary" 
                            : "border-transparent text-neutral-400 hover:text-neutral-650"
                        }`}
                      >
                        <Target className="w-3.5 h-3.5" />
                        <span>Goals</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  {profileViewTab === "grid" && (
                    <div className="space-y-6 text-left">
                      {/* Routine Blocks Manager Header */}
                      <div className="flex flex-col md:flex-row gap-6 bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm">
                        {/* Form Column */}
                        <div className="flex-1 space-y-4">
                          <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                            <BookMarked className="w-4 h-4 text-primary" /> 
                            <span>{editingRoutineBlockId ? "Edit Routine Block" : "Add Routine Block"}</span>
                          </h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Routine Title</label>
                              <input 
                                type="text"
                                placeholder="e.g. Lunch Break, Gym Prep"
                                value={routineBlockForm.title}
                                onChange={e => setRoutineBlockForm({ ...routineBlockForm, title: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider font-sans">Routine Type</label>
                              <select
                                value={routineBlockForm.type}
                                onChange={e => setRoutineBlockForm({ ...routineBlockForm, type: e.target.value as any })}
                                className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                              >
                                <option value="sleep">💤 Sleep</option>
                                <option value="class">🎓 Class / Work</option>
                                <option value="meal">🍽️ Meal</option>
                                <option value="commute">🚗 Commute</option>
                                <option value="custom">⚙️ Custom</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider font-sans">Start Time</label>
                              <input 
                                type="time"
                                value={routineBlockForm.startTime}
                                onChange={e => setRoutineBlockForm({ ...routineBlockForm, startTime: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider font-sans">End Time</label>
                              <input 
                                type="time"
                                value={routineBlockForm.endTime}
                                onChange={e => setRoutineBlockForm({ ...routineBlockForm, endTime: e.target.value })}
                                className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider font-sans">Rigidity (Hard/Soft)</label>
                              <select
                                value={routineBlockForm.rigidity}
                                onChange={e => setRoutineBlockForm({ ...routineBlockForm, rigidity: e.target.value as any })}
                                className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary font-sans"
                              >
                                <option value="soft">Soft (Flexible, shifts if blocked)</option>
                                <option value="hard">Hard (Strict, locks time slot)</option>
                              </select>
                            </div>
                          </div>

                          {/* Days of week pills select */}
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1">Days Active</label>
                            <div className="flex flex-wrap gap-1.5">
                              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((dayName, index) => {
                                const active = routineBlockForm.daysOfWeek.includes(index);
                                return (
                                  <button
                                    key={dayName}
                                    type="button"
                                    onClick={() => toggleDayInRoutineBlockForm(index)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-colors cursor-pointer ${
                                      active 
                                        ? "bg-primary text-white border-primary" 
                                        : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50"
                                    }`}
                                  >
                                    {dayName.slice(0, 3)}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2 shrink-0">
                            <button
                              onClick={handleSaveRoutineBlock}
                              disabled={!routineBlockForm.title.trim()}
                              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-40 flex items-center gap-1 cursor-pointer font-display"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{editingRoutineBlockId ? "Update Block" : "Create Block"}</span>
                            </button>
                            {editingRoutineBlockId && (
                              <button
                                onClick={() => {
                                  setEditingRoutineBlockId(null);
                                  setRoutineBlockForm({
                                    title: "",
                                    startTime: "09:00",
                                    endTime: "10:00",
                                    daysOfWeek: [1, 2, 3, 4, 5],
                                    type: "custom",
                                    rigidity: "soft"
                                  });
                                }}
                                className="px-4 py-2 bg-white border border-neutral-250 hover:bg-neutral-50 text-neutral-600 rounded-xl text-xs font-semibold cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Guide card right */}
                        <div className="hidden md:block w-72 bg-neutral-50 border border-neutral-100 rounded-2xl p-5 space-y-3 font-sans">
                          <h4 className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                            <HelpCircle className="w-3.5 h-3.5 text-neutral-505 shrink-0" /> Routine Rules
                          </h4>
                          <div className="text-[11px] text-neutral-550 space-y-2 leading-relaxed">
                            <p>
                              <strong>🔒 Hard rigidity:</strong> Acts as an absolute commitment block (like a lecture or job hours). Flexible tasks are scheduled around it.
                            </p>
                            <p>
                              <strong>📋 Soft rigidity:</strong> preferred window (e.g. Lunch or Gym). Flexible tasks can take precedence, shifting this routine dynamically.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* List Grid */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-widest">Active Routine Blocks</h4>
                        
                        {routineBlocks.length === 0 ? (
                          <div className="py-16 text-center flex flex-col items-center justify-center bg-white border border-dashed border-neutral-200 rounded-3xl">
                            <BookMarked className="w-8 h-8 text-neutral-400 stroke-[1.5] mb-2" />
                            <p className="text-sm font-semibold text-neutral-600">No routines defined yet</p>
                            <p className="text-xs text-neutral-400 max-w-xs px-6 mt-1 leading-relaxed text-center font-sans">
                              Add wake hours, class timings, commute routes, or recurring break templates to automate daily schedule generation.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {routineBlocks.map(block => {
                              const daysStr = block.daysOfWeek.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(", ");
                              return (
                                <div 
                                  key={block.id}
                                  className="bg-white border border-neutral-200/60 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md relative text-left"
                                >
                                  <div className="space-y-3.5">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase tracking-wide border ${
                                        block.rigidity === "hard" 
                                          ? "bg-red-50 text-red-600 border-red-100" 
                                          : "bg-indigo-50 text-indigo-600 border-indigo-100"
                                      }`}>
                                        {block.rigidity === "hard" ? "Hard Fixed" : "Soft Dynamic"}
                                      </span>
                                      
                                      <span className="text-[10px] font-bold text-neutral-400 font-mono">
                                        {block.type.toUpperCase()}
                                      </span>
                                    </div>

                                    <div>
                                      <h4 className="font-bold text-neutral-850 text-sm font-display tracking-tight mb-0.5">{block.title}</h4>
                                      <div className="flex items-center gap-1 text-xs text-neutral-500 font-mono mt-1">
                                        <Clock className="w-3.5 h-3.5 font-sans text-neutral-400" />
                                        <span>{block.startTime} – {block.endTime}</span>
                                      </div>
                                      <p className="text-[10px] text-neutral-400 mt-1.5 leading-snug font-sans">
                                        <strong>Days:</strong> {daysStr}
                                      </p>
                                    </div>

                                    <div className="flex items-center gap-3 pt-2.5 border-t border-neutral-100 shrink-0 font-sans">
                                      <button
                                        onClick={() => handleStartEditRoutineBlock(block)}
                                        className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer transition-colors flex items-center gap-1 font-display"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                        <span>Edit</span>
                                      </button>
                                      <button
                                        onClick={() => handleDeleteRoutineBlock(block.id)}
                                        className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer transition-colors flex items-center gap-1"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                        <span>Delete</span>
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {profileViewTab === "projects" && (
                    <div className="space-y-6 text-left animate-fade-in">
                      {/* Create Manual Project card */}
                      <div className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm space-y-4">
                        <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-widest flex items-center gap-1.5 font-display">
                          <FolderKanban className="w-4 h-4 text-primary" />
                          <span>Create Project Container</span>
                        </h3>
                        <form onSubmit={(e) => {
                          e.preventDefault();
                          const title = (e.currentTarget.elements.namedItem("projectTitle") as HTMLInputElement).value.trim();
                          const goal = (e.currentTarget.elements.namedItem("projectGoal") as HTMLInputElement).value.trim();
                          const deadline = (e.currentTarget.elements.namedItem("projectDeadline") as HTMLInputElement).value;
                          if (!title || !deadline) {
                            showToast("Please enter title and deadline!", "warning");
                            return;
                          }
                          const newProj: Project = {
                            id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                            title,
                            goal: goal || "Study / build goals",
                            deadline,
                            phases: [{
                              id: `phase-${Date.now()}-0`,
                              title: "Phase 1 / Preparation",
                              order: 1,
                              subtasks: []
                            }],
                            totalHoursEstimate: 0,
                            progress: 0
                          };
                          handleUpdateProjects([...projects, newProj]);
                          e.currentTarget.reset();
                          showToast(`Project "${title}" created!`, "success");
                        }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Project Title</label>
                            <input name="projectTitle" type="text" placeholder="e.g. Portfolio Website, Midterm Prep" className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary font-sans" required />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider">High-Level Goal</label>
                            <input name="projectGoal" type="text" placeholder="e.g. Complete Units 1-5 & mock exams" className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary font-sans" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-neutral-450 uppercase tracking-wider">Deadline Date</label>
                            <input name="projectDeadline" type="date" className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary font-sans" required />
                          </div>
                          <div className="md:col-span-3 flex justify-end">
                            <button type="submit" className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer font-display">
                              Create Project
                            </button>
                          </div>
                        </form>
                      </div>

                      {/* Projects List */}
                      {projects.length === 0 ? (
                        <div className="py-16 text-center flex flex-col items-center justify-center bg-white border border-dashed border-neutral-200 rounded-3xl p-6 shadow-xs">
                          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                            <FolderKanban className="w-6 h-6 stroke-[1.5]" />
                          </div>
                          <p className="text-sm font-semibold text-neutral-700">No active projects yet</p>
                          <p className="text-xs text-neutral-455 mt-1 max-w-xs text-center font-sans">
                            Let your AI Coach plan a dynamic midterm study schedule or portfolio breakdown by typing in the copilot chat box!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {projects.map((proj) => {
                            const daysLeft = Math.max(1, Math.ceil((new Date(proj.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)));
                            const totalSubtasks = proj.phases.flatMap(p => p.subtasks);
                            const pendingSubtasks = totalSubtasks.filter(s => s.status === "pending");
                            const doneSubtasksCount = totalSubtasks.filter(s => s.status === "done").length;
                            const remainingHours = Math.round(pendingSubtasks.reduce((acc, s) => acc + s.duration_minutes, 0) / 60 * 10) / 10;
                            const urgency = Math.round((remainingHours / daysLeft) * 10) / 10;
                            
                            // Check buffer status
                            const safeDeadlineDate = new Date(proj.deadline);
                            safeDeadlineDate.setDate(safeDeadlineDate.getDate() - 2);
                            const safeDeadlineStr = safeDeadlineDate.toISOString().split("T")[0];

                            return (
                              <div key={proj.id} className="bg-white border border-neutral-200/60 rounded-3xl p-6 shadow-sm space-y-4">
                                <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                                  <div className="space-y-1 text-left">
                                    <h4 className="text-base font-bold text-neutral-800 flex items-center gap-1.5">
                                      <Briefcase className="w-5 h-5 text-primary" />
                                      {proj.title}
                                    </h4>
                                    <p className="text-xs text-neutral-500 font-medium">{proj.goal}</p>
                                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                      <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Deadline: {proj.deadline}
                                      </span>
                                      <span className="text-[10px] bg-emerald-50 text-emerald-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        Target Buffer Date: {safeDeadlineStr} (2 Days Buffer)
                                      </span>
                                    </div>
                                  </div>
                                  <div className="flex gap-2 w-full sm:w-auto justify-end">
                                    <button 
                                      onClick={() => handleAutoScheduleProject(proj)}
                                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer font-display"
                                      title="Sequentially schedules all pending subtasks across subsequent days up to deadline minus buffer"
                                    >
                                      <Sparkles className="w-3.5 h-3.5" />
                                      <span>Auto-Schedule Plan</span>
                                    </button>
                                    <button 
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to delete the project "${proj.title}"?`)) {
                                          handleUpdateProjects(projects.filter(p => p.id !== proj.id));
                                          showToast(`Deleted project "${proj.title}"`, "success");
                                        }
                                      }}
                                      className="bg-neutral-50 hover:bg-neutral-100 text-neutral-500 border border-neutral-200 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer font-display"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Delete</span>
                                    </button>
                                  </div>
                                </div>

                                {/* Progress bar & urgent metric block */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-2">
                                  <div className="space-y-1">
                                    <div className="flex justify-between text-xs font-bold text-neutral-600">
                                      <span>Overall Progress</span>
                                      <span>{proj.progress}% ({doneSubtasksCount}/{totalSubtasks.length} subtasks)</span>
                                    </div>
                                    <div className="w-full bg-neutral-200/50 rounded-full h-2 overflow-hidden">
                                      <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${proj.progress}%` }} />
                                    </div>
                                  </div>
                                  
                                  {/* Metrics columns */}
                                  <div className="bg-neutral-50/70 border border-neutral-100 rounded-2xl p-3 text-center grid grid-cols-2 gap-4 col-span-2">
                                    <div>
                                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Urgency Score</span>
                                      <span className={`text-sm font-black ${urgency > 2 ? 'text-amber-500' : 'text-neutral-700'}`}>
                                        {urgency} hours/day
                                      </span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest block">Estimated Time Remaining</span>
                                      <span className="text-sm font-black text-neutral-700">
                                        {remainingHours} hours ({totalSubtasks.filter(s => s.status === "pending").length} tasks)
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Phases list */}
                                <div className="mt-4 border-t border-neutral-100 pt-4 space-y-4 text-left">
                                  <h5 className="text-xs font-black text-neutral-400 uppercase tracking-widest">Phases & Subtasks Checklist</h5>
                                  {proj.phases.map((phase) => (
                                    <div key={phase.id} className="bg-neutral-50/30 border border-neutral-200/40 p-4.5 rounded-2xl space-y-3">
                                      <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-neutral-700">{phase.title}</span>
                                      </div>

                                      {/* Subtasks checklist */}
                                      <div className="space-y-2">
                                        {phase.subtasks.map((sub, sIdx) => {
                                          const isDone = sub.status === "done";
                                          return (
                                            <div key={sub.id} className="flex items-center justify-between gap-3 text-xs bg-white border border-neutral-150 p-2.5 rounded-xl">
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                <button 
                                                  onClick={() => {
                                                    const updated = projects.map(p => {
                                                      if (p.id !== proj.id) return p;
                                                      return {
                                                        ...p,
                                                        phases: p.phases.map(ph => {
                                                          if (ph.id !== phase.id) return ph;
                                                          return {
                                                            ...ph,
                                                            subtasks: ph.subtasks.map(s => s.id === sub.id ? { ...s, status: (isDone ? "pending" : "done") as "pending" | "done" | "skipped" } : s)
                                                          };
                                                        })
                                                      };
                                                    });
                                                    
                                                    // Sync progress
                                                    const currentProj = updated.find(p => p.id === proj.id)!;
                                                    const allSub = currentProj.phases.flatMap(p => p.subtasks);
                                                    const doneSub = allSub.filter(s => s.status === "done").length;
                                                    currentProj.progress = allSub.length > 0 ? Math.round((doneSub / allSub.length) * 100) : 0;
                                                    
                                                    handleUpdateProjects(updated);
                                                    triggerHaptic(15);
                                                  }}
                                                  className="cursor-pointer text-neutral-450 hover:text-primary transition-colors shrink-0"
                                                >
                                                  {isDone ? (
                                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                  ) : (
                                                    <Circle className="w-4 h-4 text-neutral-300" />
                                                  )}
                                                </button>
                                                <span className={`font-semibold truncate ${isDone ? 'line-through text-neutral-400' : 'text-neutral-700'}`}>
                                                  {sub.title}
                                                </span>
                                              </div>
                                              <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-neutral-400 font-mono">{sub.duration_minutes}m</span>
                                                
                                                {/* Reorder subtasks */}
                                                <button 
                                                  disabled={sIdx === 0}
                                                  onClick={() => {
                                                    const updated = projects.map(p => {
                                                      if (p.id !== proj.id) return p;
                                                      return {
                                                        ...p,
                                                        phases: p.phases.map(ph => {
                                                          if (ph.id !== phase.id) return ph;
                                                          const subtasksCopy = [...ph.subtasks];
                                                          const temp = subtasksCopy[sIdx];
                                                          subtasksCopy[sIdx] = subtasksCopy[sIdx - 1];
                                                          subtasksCopy[sIdx - 1] = temp;
                                                          return { ...ph, subtasks: subtasksCopy };
                                                        })
                                                      };
                                                    });
                                                    handleUpdateProjects(updated);
                                                    triggerHaptic(10);
                                                  }}
                                                  className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 cursor-pointer"
                                                  title="Move Up"
                                                >
                                                  <ChevronLeft className="w-3.5 h-3.5 rotate-90" />
                                                </button>
                                                <button 
                                                  disabled={sIdx === phase.subtasks.length - 1}
                                                  onClick={() => {
                                                    const updated = projects.map(p => {
                                                      if (p.id !== proj.id) return p;
                                                      return {
                                                        ...p,
                                                        phases: p.phases.map(ph => {
                                                          if (ph.id !== phase.id) return ph;
                                                          const subtasksCopy = [...ph.subtasks];
                                                          const temp = subtasksCopy[sIdx];
                                                          subtasksCopy[sIdx] = subtasksCopy[sIdx + 1];
                                                          subtasksCopy[sIdx + 1] = temp;
                                                          return { ...ph, subtasks: subtasksCopy };
                                                        })
                                                      };
                                                    });
                                                    handleUpdateProjects(updated);
                                                    triggerHaptic(10);
                                                  }}
                                                  className="text-neutral-400 hover:text-neutral-600 disabled:opacity-30 cursor-pointer"
                                                  title="Move Down"
                                                >
                                                  <ChevronRight className="w-3.5 h-3.5 rotate-90" />
                                                </button>
                                                
                                                <button 
                                                  onClick={() => {
                                                    const updated = projects.map(p => {
                                                      if (p.id !== proj.id) return p;
                                                      return {
                                                        ...p,
                                                        phases: p.phases.map(ph => {
                                                          if (ph.id !== phase.id) return ph;
                                                          return { ...ph, subtasks: ph.subtasks.filter(s => s.id !== sub.id) };
                                                        })
                                                      };
                                                    });
                                                    // Sync progress
                                                    const currentProj = updated.find(p => p.id === proj.id)!;
                                                    const allSub = currentProj.phases.flatMap(p => p.subtasks);
                                                    const doneSub = allSub.filter(s => s.status === "done").length;
                                                    currentProj.progress = allSub.length > 0 ? Math.round((doneSub / allSub.length) * 100) : 0;
                                                    
                                                    handleUpdateProjects(updated);
                                                    showToast("Subtask deleted", "info");
                                                  }}
                                                  className="text-neutral-305 hover:text-red-500 transition-colors cursor-pointer"
                                                  title="Delete Subtask"
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}

                                        {/* Add subtask to phase inline form */}
                                        <form onSubmit={(e) => {
                                          e.preventDefault();
                                          const formEl = e.currentTarget;
                                          const title = (formEl.elements.namedItem("subtaskTitle") as HTMLInputElement).value.trim();
                                          const duration = parseInt((formEl.elements.namedItem("subtaskDuration") as HTMLInputElement).value) || 60;
                                          if (!title) return;
                                          const updated = projects.map(p => {
                                            if (p.id !== proj.id) return p;
                                            return {
                                              ...p,
                                              phases: p.phases.map(ph => {
                                                if (ph.id !== phase.id) return ph;
                                                return {
                                                  ...ph,
                                                  subtasks: [...ph.subtasks, {
                                                    id: `subtask-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                                                    title,
                                                    duration_minutes: duration,
                                                    status: "pending" as const
                                                  }]
                                                };
                                              })
                                            };
                                          });

                                          // Sync progress
                                          const currentProj = updated.find(p => p.id === proj.id)!;
                                          const allSub = currentProj.phases.flatMap(p => p.subtasks);
                                          const doneSub = allSub.filter(s => s.status === "done").length;
                                          currentProj.progress = allSub.length > 0 ? Math.round((doneSub / allSub.length) * 100) : 0;

                                          handleUpdateProjects(updated);
                                          formEl.reset();
                                          showToast("Subtask added to phase!", "success");
                                        }} className="flex items-center gap-2 mt-3 pt-2 border-t border-dashed border-neutral-200">
                                          <input name="subtaskTitle" type="text" placeholder="Add subtask title..." className="flex-1 px-3 py-1.5 border border-[#D5D5E2] rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary font-sans" required />
                                          <input name="subtaskDuration" type="number" placeholder="60" className="w-20 px-3 py-1.5 border border-[#D5D5E2] rounded-xl text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary font-sans" />
                                          <button type="submit" className="bg-primary/10 text-primary hover:bg-primary/20 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer">
                                            Add Step
                                          </button>
                                        </form>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}




                  {profileViewTab === "goals" && (
                    <div className="space-y-8 text-left animate-fade-in">
                      {/* Active Goals Section */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                              <Target className="w-4 h-4 text-primary" /> Active Milestones
                            </h3>
                            <p className="text-xs text-neutral-450 mt-0.5 font-sans">Track your progress toward long-term life objectives.</p>
                          </div>
                          <button
                            onClick={() => handleOpenCreateGoal()}
                            className="bg-primary hover:bg-primary-dark text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer font-display"
                          >
                            <Plus className="w-4 h-4" />
                            <span>New Goal</span>
                          </button>
                        </div>

                        {goals.length === 0 ? (
                          <div className="py-16 text-center flex flex-col items-center justify-center bg-white border border-dashed border-neutral-200 rounded-3xl p-6 shadow-xs">
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
                              <Target className="w-6 h-6 stroke-[1.5]" />
                            </div>
                            <p className="text-sm font-semibold text-neutral-700">No active goals yet</p>
                            <p className="text-xs text-neutral-400 max-w-xs px-6 mt-1 leading-relaxed text-center font-sans">
                              Define targets like weight logs, gym consistency, or study hours. DayFlow will track them automatically based on your Timeline tasks.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {goals.map(goal => {
                              const prediction = predictGoalCompletion(goal);
                              const pct = Math.min(100, Math.round((goal.currentValue / goal.targetValue) * 100));
                              
                              // Sparkline helper inline rendering
                              const renderSparkline = (log: { date: string; value: number }[]) => {
                                if (log.length < 2) return null;
                                const values = log.map(l => l.value);
                                const min = Math.min(...values);
                                const max = Math.max(...values);
                                const range = max - min || 1;
                                const width = 90;
                                const height = 24;
                                const points = log.map((entry, index) => {
                                  const x = (index / (log.length - 1)) * width;
                                  const y = height - ((entry.value - min) / range) * height;
                                  return `${x},${y}`;
                                }).join(" ");

                                return (
                                  <svg className="w-24 h-6 text-emerald-500 stroke-current fill-none stroke-[2] overflow-visible">
                                    <polyline points={points} />
                                  </svg>
                                );
                              };

                              return (
                                <div key={goal.id} className={`bg-white border rounded-3xl p-5 shadow-xs transition-all flex flex-col gap-4 relative overflow-hidden group ${
                                  goal.status === "paused" ? "opacity-65 border-neutral-200" : "border-neutral-200/80 hover:border-neutral-300"
                                }`}>
                                  {/* Top Row */}
                                  <div className="flex items-start justify-between gap-3 text-left">
                                    <div className="space-y-1 text-left">
                                      <div className="flex items-center gap-1.5">
                                        <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                                          goal.category === "fitness" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                                          goal.category === "academic" ? "bg-violet-50 text-violet-750 border-violet-100" :
                                          goal.category === "project" ? "bg-cyan-50 text-cyan-750 border-cyan-100" :
                                          goal.category === "habit" ? "bg-amber-50 text-amber-700 border-amber-100" :
                                          "bg-neutral-50 text-neutral-600 border-neutral-200"
                                        }`}>
                                          {goal.category}
                                        </span>
                                        {goal.status === "paused" && (
                                          <span className="text-[10px] font-bold text-neutral-450 uppercase tracking-wider bg-neutral-100 px-1.5 py-0.5 rounded">Paused</span>
                                        )}
                                        {goal.status === "achieved" && (
                                          <span className="text-[10px] font-extrabold text-emerald-650 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                            <Trophy className="w-2.5 h-2.5 animate-bounce" /> Complete
                                          </span>
                                        )}
                                      </div>
                                      <h4 className="font-display font-bold text-sm text-neutral-800 tracking-tight group-hover:text-primary transition-colors">{goal.title}</h4>
                                      {goal.description && <p className="text-xs text-neutral-450 leading-relaxed font-sans">{goal.description}</p>}
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button 
                                        onClick={() => handleToggleGoalPause(goal.id)}
                                        className="p-1.5 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 rounded-lg cursor-pointer transition-colors"
                                        title={goal.status === "active" ? "Pause tracking" : "Activate"}
                                      >
                                        {goal.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                      </button>
                                      <button 
                                        onClick={() => handleOpenEditGoal(goal)}
                                        className="p-1.5 hover:bg-neutral-100 text-neutral-500 hover:text-neutral-800 rounded-lg cursor-pointer transition-colors"
                                        title="Edit goal"
                                      >
                                        <Edit2 className="w-3.5 h-3.5" />
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteGoal(goal.id)}
                                        className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-650 rounded-lg cursor-pointer transition-colors"
                                        title="Delete goal"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>

                                  {/* Progress values & sparkline */}
                                  <div className="flex items-end justify-between border-t border-neutral-100 pt-3">
                                    <div className="text-left">
                                      <span className="text-2xl font-black text-neutral-900 font-mono tracking-tight">{goal.currentValue}</span>
                                      <span className="text-xs text-neutral-450 font-medium ml-1">/ {goal.targetValue} {goal.metricLabel}</span>
                                    </div>
                                    {renderSparkline(goal.progressLog)}
                                  </div>

                                  {/* Progress bar */}
                                  <div className="space-y-1.5">
                                    <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                                      <div 
                                        className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500 rounded-full" 
                                        style={{ width: `${pct}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] text-neutral-400 font-medium font-sans">
                                      <span>{pct}% complete</span>
                                      {goal.status === "active" && (
                                        <span>
                                          {prediction.estimatedDate ? (
                                            prediction.estimatedDate === "Done" ? "Goal target reached!" : `Est. completion: ${new Date(prediction.estimatedDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                                          ) : (
                                            "Calibrating pace..."
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* AI Goal Suggestions */}
                      {suggestGoalsFromTaskHistory(flexibleTasks, goals).length > 0 && (
                        <div className="space-y-4">
                          <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 font-display">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10" /> AI Suggestions
                          </h4>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                            {suggestGoalsFromTaskHistory(flexibleTasks, goals).map((sug, i) => (
                              <div 
                                key={i} 
                                onClick={() => handleOpenCreateGoal({
                                  title: sug.title,
                                  category: sug.category,
                                  keywords: sug.keywords,
                                  targetValue: sug.targetValue,
                                  metricLabel: sug.metricLabel
                                })}
                                className="bg-gradient-to-br from-violet-50 to-indigo-50/40 border border-violet-100 hover:border-violet-200 p-4.5 rounded-2xl cursor-pointer transition-all hover:-translate-y-0.5 duration-200 text-left flex gap-3 items-start group shadow-2xs"
                              >
                                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-0.5">
                                  <Sparkles className="w-4 h-4 fill-primary/10" />
                                </div>
                                <div className="space-y-1">
                                  <h5 className="font-bold text-xs text-neutral-800 group-hover:text-primary transition-colors font-display">{sug.title}</h5>
                                  <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">{sug.suggestion}</p>
                                  <span className="inline-block text-[9px] font-extrabold text-primary uppercase tracking-widest mt-1">Tap to pre-fill</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Achievements Timeline */}
                      <div className="space-y-5">
                        <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-widest flex items-center gap-1.5 font-display">
                          <Award className="w-4 h-4 text-emerald-600" /> Unlocked Achievements
                        </h4>

                        {achievements.length === 0 ? (
                          <div className="py-10 text-center text-xs text-neutral-400 italic bg-white border border-neutral-200 rounded-3xl shadow-3xs p-6 font-sans">
                            Complete task routines and reach goal milestones to unlock your first achievement badge.
                          </div>
                        ) : (
                          <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-xs relative">
                            {/* Vertical timeline line */}
                            <div className="absolute left-10 top-8 bottom-8 w-0.5 bg-neutral-100" />
                            
                            <div className="space-y-6">
                              {[...achievements].sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()).map(ach => (
                                <div key={ach.id} className="flex gap-4 items-start relative z-10 text-left group">
                                  {/* Left earned Date */}
                                  <div className="w-14 text-right shrink-0 mt-1">
                                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block font-mono">
                                      {new Date(ach.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </span>
                                  </div>

                                  {/* Center badge */}
                                  <div className="w-8 h-8 rounded-full bg-[#F5F4FF] border border-neutral-100 flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform duration-200 text-lg select-none">
                                    {ach.icon}
                                  </div>

                                  {/* Right text info */}
                                  <div className="space-y-0.5">
                                    <h5 className="font-bold text-xs text-neutral-800 group-hover:text-primary transition-colors font-display">{ach.title}</h5>
                                    <p className="text-[11px] text-neutral-500 font-sans">{ach.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}



                </div>
              </div>
            )}

            {activeTab === "settings" && (
              <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 h-full overflow-y-auto bg-[#F9FAFB] text-slate-800 animate-fade-in">
                <div className="flex flex-col gap-6 md:gap-8 max-w-2xl mx-auto w-full">
                  
                  {/* Settings Header */}
                  <div className="flex items-center gap-3 pb-6 border-b border-neutral-250/60">
                    <button
                      onClick={() => navigate("/routines")}
                      className="p-2 rounded-xl hover:bg-neutral-100 text-neutral-500 hover:text-neutral-700 transition-colors cursor-pointer md:hidden"
                      title="Back to Profile"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h1 className="text-2xl font-bold tracking-tight text-neutral-900 font-display">App Settings</h1>
                      <p className="text-xs text-neutral-500 font-sans mt-0.5">Customize your profile, active scheduling hours, notifications, and data storage.</p>
                    </div>
                  </div>

                  {/* Form Container */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      localStorage.setItem("dayflow_profile_name", profileName);
                      localStorage.setItem("dayflow_profile_age", profileAge);
                      localStorage.setItem("dayflow_profile_bio", profileBio);
                      localStorage.setItem("dayflow_profile_emoji", profileEmoji);
                      showToast("Profile settings saved!", "success");
                      triggerHaptic(20);
                    }} 
                    className="space-y-6 text-left"
                  >
                    {/* Section 1: User Profile */}
                    <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-3xs space-y-4">
                      <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2 font-display">
                        <User className="w-4 h-4 text-primary" /> Profile Details
                      </h3>
                      
                      <div className="grid grid-cols-4 gap-4">
                        <div className="col-span-3">
                          <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5 font-sans">Your Name</label>
                          <input 
                            type="text" 
                            value={profileName}
                            onChange={(e) => setProfileName(e.target.value)}
                            placeholder="e.g. Alex Mercer"
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none font-sans font-medium"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5 text-center font-sans">Emoji</label>
                          <input 
                            type="text" 
                            value={profileEmoji}
                            onChange={(e) => setProfileEmoji(e.target.value)}
                            placeholder="👨‍💻"
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none text-center"
                            maxLength={2}
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5 text-center font-sans">Age</label>
                          <input 
                            type="number" 
                            value={profileAge}
                            onChange={(e) => setProfileAge(e.target.value)}
                            placeholder="25"
                            min="0"
                            max="120"
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none text-center"
                            required
                          />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5 font-sans">Biography / Bio</label>
                          <input 
                            type="text" 
                            value={profileBio}
                            onChange={(e) => setProfileBio(e.target.value)}
                            placeholder="Productivity creator. Tracking daily flows."
                            className="w-full px-3 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none font-sans font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="submit"
                          className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer"
                        >
                          Save Profile Changes
                        </button>
                      </div>
                    </div>
                  </form>

                  {/* Section 2: Active Hours */}
                  <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-3xs space-y-4 text-left">
                    <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2 font-display">
                      <Clock className="w-4 h-4 text-primary" /> Active Scheduling Hours
                    </h3>
                    <p className="text-neutral-550 text-[11px] leading-relaxed">
                      Tasks sequence and slots are automatically computed within this time framework.
                    </p>
                    <div className="flex items-center gap-3 max-w-xs">
                      <input 
                        type="time" 
                        value={appSettings.day_start} 
                        onChange={(e) => {
                          const settings = { ...appSettings, day_start: e.target.value };
                          setAppSettings(settings);
                          saveSettings(settings);
                          showToast("Active hours start updated!", "info");
                        }}
                        className="bg-neutral-50 border border-neutral-200 text-center rounded-xl px-3 py-2 text-xs font-mono text-neutral-700 w-full focus:outline-none focus:border-primary"
                      />
                      <span className="text-xs text-neutral-400 font-mono font-bold">to</span>
                      <input 
                        type="time" 
                        value={appSettings.day_end} 
                        onChange={(e) => {
                          const settings = { ...appSettings, day_end: e.target.value };
                          setAppSettings(settings);
                          saveSettings(settings);
                          showToast("Active hours end updated!", "info");
                        }}
                        className="bg-neutral-50 border border-neutral-200 text-center rounded-xl px-3 py-2 text-xs font-mono text-neutral-700 w-full focus:outline-none focus:border-primary"
                      />
                    </div>
                  </div>

                  {/* Section 3: Data & Privacy */}
                  <div className="bg-white border border-neutral-200 rounded-3xl p-6 shadow-3xs space-y-4 text-left">
                    <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2 font-display">
                      <Shield className="w-4 h-4 text-primary" /> Data, Privacy & Notifications
                    </h3>
                    <p className="text-neutral-550 text-[11px] leading-relaxed font-sans">
                      Control offline local storage and browser notification states. All task flow computation runs strictly inside your private browser space.
                    </p>

                    <div className="space-y-3 max-w-md">
                      {notificationPermission === "granted" ? (
                        <div className="flex items-center justify-between text-[11px] bg-emerald-50 border border-emerald-250/20 px-3 py-2.5 rounded-xl text-emerald-700 font-semibold">
                          <span className="flex items-center gap-1 font-sans">
                            <Check className="w-3.5 h-3.5" /> Notifications Active
                          </span>
                        </div>
                      ) : notificationPermission === "denied" ? (
                        <div className="flex items-center justify-between text-[11px] bg-rose-50 border border-rose-250/20 px-3 py-2.5 rounded-xl text-rose-700 font-semibold">
                          <span className="flex items-center gap-1 font-sans">
                            <AlertCircle className="w-3.5 h-3.5" /> Notifications Blocked by Browser
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleRequestNotifications}
                          className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 font-display"
                        >
                          <Bell className="w-3.5 h-3.5" /> Enable Notifications
                        </button>
                      )}

                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={exportMyData}
                          className="flex-1 py-2.5 px-3 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-750 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 font-display"
                        >
                          <Download className="w-3.5 h-3.5 text-neutral-500" /> Export Data (JSON)
                        </button>

                        <label
                          className="flex-1 py-2.5 px-3 bg-neutral-50 border border-neutral-200 hover:bg-neutral-100 text-neutral-750 text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 font-display"
                        >
                          <Upload className="w-3.5 h-3.5 text-neutral-500" /> Import Data
                          <input
                            type="file"
                            accept=".json"
                            onChange={importMyData}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Section: Weekly Evaluation History & AI Adherence */}
                  <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-3xs space-y-4 text-left">
                    <h3 className="text-sm font-bold text-neutral-700 uppercase tracking-wider flex items-center gap-2 font-display">
                      <TrendingUp className="w-4 h-4 text-primary" /> Weekly Performance & AI Adherence
                    </h3>
                    <p className="text-neutral-550 text-[11px] leading-relaxed font-sans">
                      Performance snapshots computed automatically at the close of each calendar week. Track carry-overs, accuracy, and Copilot adjustment adherence.
                    </p>

                    {evalHistory.length === 0 ? (
                      <div className="text-center py-6 border border-dashed border-slate-250/70 rounded-2xl bg-neutral-50/50">
                        <Award className="w-8 h-8 text-neutral-350 mx-auto mb-2" />
                        <span className="text-xs text-neutral-600 block font-semibold">No performance snapshots available yet</span>
                        <span className="text-[10px] text-neutral-400 block mt-1">Complete tasks to automatically generate weekly snapshots.</span>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {evalHistory.map((snap) => {
                          const formattedDate = new Date(snap.weekStart).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          });
                          const adherence = snap.aiSuggestionAcceptanceRate;
                          return (
                            <div key={snap.weekStart} className="border border-neutral-100 bg-neutral-50/30 rounded-2xl p-4 space-y-3 hover:bg-neutral-50/60 transition-colors">
                              <div className="flex items-center justify-between border-b border-neutral-100 pb-2">
                                <span className="text-xs font-bold text-neutral-800 font-display">Week of {formattedDate}</span>
                                <span className="text-[10px] font-mono font-bold bg-primary-light text-primary px-2 py-0.5 rounded-full">
                                  🔥 {snap.streakDays}d Streak
                                </span>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div>
                                  <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Completion</span>
                                  <span className="font-bold text-neutral-800 font-mono">{Math.round(snap.completionRate * 100)}%</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Carry Overs</span>
                                  <span className="font-bold text-neutral-800 font-mono">{snap.carryOverRate.toFixed(2)} / task</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">Accuracy Ratio</span>
                                  <span className="font-bold text-neutral-800 font-mono">{snap.planningAccuracy.toFixed(2)}x</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-neutral-400 font-bold uppercase tracking-wider mb-0.5">AI Adherence</span>
                                  <span className="font-bold text-indigo-600 font-mono">
                                    {adherence === 1.0 && !localStorage.getItem("dayflow_ai_suggestion_events") 
                                      ? "N/A" 
                                      : `${Math.round(adherence * 100)}%`}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Section 4: Developer Options */}
                  {showDevTools && (
                    <div className="bg-white border border-[#E0D9FF]/40 rounded-3xl p-6 shadow-3xs space-y-4 text-left animate-fade-in">
                      <h3 className="text-sm font-bold text-[#5A4DC2] uppercase tracking-wider flex items-center gap-2 font-display">
                        <Database className="w-4 h-4 text-[#8B7EFF]" /> Developer Sandbox
                      </h3>
                      <p className="text-neutral-550 text-[11px] leading-relaxed font-sans">
                        Populate temporary demonstration datasets for schedule calibration and metrics testing.
                      </p>
                      <button
                        type="button"
                        onClick={handleInjectMockMLData}
                        className="w-full py-2.5 px-3 bg-[#F6F5FF] border border-[#E0D9FF] hover:bg-[#EFEBFF] text-[#5A4DC2] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm font-display max-w-xs"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-[#8B7EFF] fill-[#8B7EFF]/10" /> Populate Demo History
                      </button>
                    </div>
                  )}

                  {/* Section 5: Danger Zone */}
                  <div className="bg-rose-50/20 border border-rose-150 rounded-3xl p-6 space-y-4 text-left">
                    <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider flex items-center gap-2 font-display">
                      <Trash2 className="w-4 h-4 text-rose-550" /> Danger Zone
                    </h3>
                    <p className="text-neutral-550 text-[11px] leading-relaxed font-sans">
                      Permanently erase all custom fixed blocks, completed tasks telemetry history, habits, milestones, and settings. This cannot be undone.
                    </p>
                    
                    {/* Data Deletion safety confirmation panel (friction) */}
                    <div className="space-y-3 max-w-md">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(true);
                          triggerHaptic(15);
                        }}
                        className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                        <span>Clear All Data</span>
                      </button>

                      {showDeleteConfirm && (
                        <div className="bg-white border border-rose-200 rounded-2xl p-4.5 space-y-3.5 shadow-sm animate-scale-up">
                          <div className="flex gap-2.5 items-start">
                            <AlertTriangle className="w-4.5 h-4.5 text-rose-550 shrink-0 mt-0.5 animate-pulse" />
                            <div className="space-y-1">
                              <h4 className="text-xs font-bold text-rose-800 font-display">Are you absolutely sure?</h4>
                              <p className="text-[10px] text-neutral-500 font-sans leading-relaxed">
                                Please type <span className="font-extrabold text-neutral-800 font-mono">DELETE ALL DATA</span> in the input below to confirm the wipeout.
                              </p>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={deleteConfirmText}
                            onChange={(e) => setDeleteConfirmText(e.target.value)}
                            placeholder="Type confirmation here..."
                            className="w-full px-3 py-2 bg-rose-50/30 border border-rose-200 rounded-xl text-xs font-mono focus:outline-none focus:border-rose-500 text-rose-800 animate-fade-in"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowDeleteConfirm(false);
                                setDeleteConfirmText("");
                              }}
                              className="flex-1 py-2 text-xs font-bold border border-neutral-200 hover:bg-neutral-50 text-neutral-600 rounded-xl transition-all cursor-pointer text-center"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              disabled={deleteConfirmText !== "DELETE ALL DATA"}
                              onClick={() => {
                                performDataWipe();
                                setShowDeleteConfirm(false);
                                setDeleteConfirmText("");
                              }}
                              className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center cursor-pointer ${
                                deleteConfirmText === "DELETE ALL DATA"
                                  ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
                                  : "bg-neutral-100 text-neutral-400 border border-neutral-200/50 cursor-not-allowed"
                              }`}
                            >
                              Wipe All Data
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </main>

          {/* UNIFIED FLOATING ACTION AREA */}
          {activeTab !== "routines" && (
            <div className="absolute md:bottom-6 bottom-24 right-4 z-45 flex flex-col gap-2.5 items-end">
              <button
                onClick={handleOpenAICopilot}
                className="bg-primary hover:bg-primary-dark text-white pl-6 pr-7 py-4 md:pl-4 md:pr-5 md:py-3 rounded-full text-base md:text-sm font-bold transition-all shadow-xl shadow-primary/20 flex items-center gap-2 cursor-pointer transform hover:scale-105 active:scale-95 font-display"
                title="Ask DayFlow AI Copilot"
              >
                <Sparkles className="w-6 h-6 md:w-5 md:h-5 fill-white stroke-[2px]" />
                <span>{copilotButtonLabel}</span>
              </button>
            </div>
          )}

          {/* BOTTOM NAVIGATION TAB BAR (Fixed boundary, does not move) */}
          <nav id="mobile_sticky_bottom_nav" className="menu h-20 border-t border-neutral-200/30 bg-white/40 backdrop-blur-md grid grid-cols-4 items-center z-45 flex-shrink-0 md:!hidden pb-1" role="navigation" style={{ '--component-active-color': '#7C3AED' } as React.CSSProperties}>
            {menuItems.map((item, index) => {
              const isActive = item.value === activeTab;
              const IconComponent = item.icon;

              return (
                <button
                  key={item.label}
                  className={`menu__item ${isActive ? 'active' : ''}`}
                  onClick={() => changeTabWithHaptic(item.value)}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  style={{ '--lineWidth': '0px' } as React.CSSProperties}
                >
                  <div className="menu__icon">
                    <IconComponent className="icon" />
                  </div>
                  <strong
                    className={`menu__text ${isActive ? 'active' : ''}`}
                    ref={(el) => { textRefs.current[index] = el; }}
                  >
                    {item.label}
                  </strong>
                  {item.value === "backlog" && dashboardStats.backlog > 0 && (
                    <span className="absolute top-2 right-4 w-4.5 h-4.5 bg-primary text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono z-10">
                      {dashboardStats.backlog}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>


          {/* DYNAMIC BACKDROP SHADE FOR BOTTOM SHEETS */}
          {activeBottomSheet && (
            <div 
              onClick={() => setActiveBottomSheet(null)}
              className="absolute inset-0 bg-black/40 backdrop-blur-3xs z-48 pointer-events-auto transition-opacity animate-fade-in cursor-pointer"
            />
          )}

          {/* SHEET 1 — Add/Edit Fixed Block */}
          <div 
            className={`absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl p-6 z-49 overflow-y-auto transform transition-all duration-300 ease-out flex flex-col ${
              activeBottomSheet === "fixed" 
                ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" 
                : "translate-y-full md:translate-y-10 md:scale-95 opacity-0 pointer-events-none invisible"
            }`}
          >
            {/* Top drag handle indicator bar */}
            <div className="flex justify-center pb-3">
              <span className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-neutral-800">
                {editingBlock ? "🔒 Edit Fixed block" : "🔒 Add Fixed block"}
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveBottomSheet(null)}
                className="p-1 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#5A5A7A] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFixed} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Block Title</label>
                <input 
                  type="text" 
                  placeholder="e.g. Gym workout, Lunch with team, Class context"
                  required
                  value={fixedForm.title}
                  onChange={(e) => setFixedForm({ ...fixedForm, title: e.target.value })}
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Start Time (HH:MM)</label>
                  <input 
                    type="time" 
                    required
                    value={fixedForm.start_time}
                    onChange={(e) => setFixedForm({ ...fixedForm, start_time: e.target.value })}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">End Time (HH:MM)</label>
                  <input 
                    type="time" 
                    required
                    value={fixedForm.end_time}
                    onChange={(e) => setFixedForm({ ...fixedForm, end_time: e.target.value })}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Repeats Selector</label>
                <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                  {(["none", "daily", "weekdays"] as const).map((rep) => (
                    <button
                      key={rep}
                      type="button"
                      onClick={() => setFixedForm({ 
                        ...fixedForm, 
                        repeats: rep,
                        daysOfWeek: rep === "weekdays" ? [1, 2, 3, 4, 5] : (rep === "daily" ? [0, 1, 2, 3, 4, 5, 6] : [])
                      })}
                      className={`py-2 px-1 text-xs rounded-lg font-semibold border capitalize cursor-pointer transition-colors ${
                        fixedForm.repeats === rep
                          ? "bg-primary/10 text-primary border-primary"
                          : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50"
                      }`}
                    >
                      {rep === "none" ? "Once" : rep}
                    </button>
                  ))}
                </div>

                <div className="space-y-1 bg-neutral-50 p-2.5 rounded-xl border border-neutral-150">
                  <label className="block text-[9px] font-black text-neutral-400 uppercase tracking-widest">Select Specific Days (Custom)</label>
                  <div className="flex flex-wrap gap-1">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayLabel, index) => {
                      const active = fixedForm.repeats === "custom" && fixedForm.daysOfWeek?.includes(index);
                      return (
                        <button
                          key={dayLabel}
                          type="button"
                          onClick={() => {
                            let newDays = fixedForm.daysOfWeek ? [...fixedForm.daysOfWeek] : [];
                            if (fixedForm.repeats !== "custom") {
                              newDays = [index];
                            } else {
                              if (newDays.includes(index)) {
                                newDays = newDays.filter(d => d !== index);
                              } else {
                                newDays = [...newDays, index].sort();
                              }
                            }
                            setFixedForm({
                              ...fixedForm,
                              repeats: "custom",
                              daysOfWeek: newDays
                            });
                          }}
                          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                            active 
                              ? "bg-primary text-white border-primary" 
                              : "bg-white text-neutral-500 border-neutral-200 hover:bg-neutral-50"
                          }`}
                        >
                          {dayLabel}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Color theme</label>
                <div className="flex gap-2">
                  {["#E24B4A", "#7F77DD", "#1D9E75", "#EF9F27", "#3C3489"].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFixedForm({ ...fixedForm, color: col })}
                      className="w-6 h-6 rounded-full border border-neutral-300 relative cursor-pointer"
                      style={{ backgroundColor: col }}
                    >
                      {fixedForm.color === col && (
                        <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setActiveBottomSheet(null)}
                  className="flex-1 py-3 text-sm font-bold rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold rounded-xl bg-[#E24B4A] text-white hover:bg-red-700 transition-colors cursor-pointer"
                >
                  {editingBlock ? "Save changes" : "Lock to schedule"}
                </button>
              </div>
            </form>
          </div>

          {/* SHEET 2 — Add/Edit Flexible Task */}
          <div 
            className={`absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl p-6 z-49 overflow-y-auto transform transition-all duration-300 ease-out flex flex-col ${
              activeBottomSheet === "flexible" 
                ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" 
                : "translate-y-full md:translate-y-10 md:scale-95 opacity-0 pointer-events-none invisible"
            }`}
          >
            <div className="flex justify-center pb-3">
              <span className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-lg text-neutral-800">
                {editingTask ? "⚡ Edit task" : flexibleForm.scheduled_date ? "⚡ Add task to today" : "⚡ Add to backlog"}
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveBottomSheet(null)}
                className="p-1 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#5A5A7A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitFlexible} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Task Title / Mission</label>
                <input 
                  type="text" 
                  placeholder="e.g. Study DSA recursion, Read chapter 2, Laundry load"
                  required
                  value={flexibleForm.title}
                  onChange={(e) => setFlexibleForm({ ...flexibleForm, title: e.target.value })}
                  onBlur={handleTitleBlur}
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
                {classificationFeedback && (
                  <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-neutral-50 border border-neutral-100 text-xs">
                    <div className="flex items-center gap-1.5 font-medium">
                      {classificationFeedback.confidence >= 0.75 ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                          ✓ Classified: {classificationFeedback.category}
                        </span>
                      ) : classificationFeedback.confidence >= 0.5 ? (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold">
                          ⚡ Guess: {classificationFeedback.category}
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold">
                          ⚠️ Low confidence: {classificationFeedback.category}
                        </span>
                      )}
                      <span className="text-[10px] text-neutral-400">
                        via {classificationFeedback.source} ({Math.round(classificationFeedback.confidence * 100)}%)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMetadataOpen(!isMetadataOpen)}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      {isMetadataOpen ? "Hide Options" : "Adjust"}
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Duration (mins)</label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFlexibleForm({ ...flexibleForm, duration_minutes: Math.max(15, flexibleForm.duration_minutes - 15) })}
                      className="px-2 py-1.5 bg-neutral-100 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      -15
                    </button>
                    <span className="flex-1 text-center font-mono text-sm font-bold bg-neutral-50 py-1.5 rounded-lg border">
                      {flexibleForm.duration_minutes >= 60 
                        ? `${Math.floor(flexibleForm.duration_minutes / 60)}h ${flexibleForm.duration_minutes % 60}m` 
                        : `${flexibleForm.duration_minutes}m`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setFlexibleForm({ ...flexibleForm, duration_minutes: Math.min(480, flexibleForm.duration_minutes + 15) })}
                      className="px-2 py-1.5 bg-neutral-100 rounded-lg text-xs font-bold cursor-pointer"
                    >
                      +15
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Energy Required</label>
                  <div className="flex gap-1">
                    {(["high", "medium", "low"] as const).map((energy) => (
                      <button
                        key={energy}
                        type="button"
                        onClick={() => setFlexibleForm({ ...flexibleForm, energy_level: energy })}
                        className={`flex-1 py-1.5 text-xs rounded-lg font-bold border capitalize cursor-pointer ${
                          flexibleForm.energy_level === energy
                            ? "bg-primary/10 text-primary border-primary"
                            : "bg-white text-neutral-500 border-neutral-200"
                        }`}
                      >
                        {energy === "high" ? "🔥 High" : energy === "low" ? "🌙 Low" : "⚡ Med"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Task Importance</label>
                <div className="flex gap-1.5">
                  {(["critical", "important", "optional"] as const).map((imp) => (
                    <button
                      key={imp}
                      type="button"
                      onClick={() => setFlexibleForm({ ...flexibleForm, importance: imp })}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-bold border capitalize cursor-pointer transition-all ${
                        flexibleForm.importance === imp
                          ? imp === "critical"
                            ? "bg-red-50 text-red-700 border-red-200"
                            : imp === "important"
                            ? "bg-primary/10 text-primary border-primary"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-white text-neutral-500 border-neutral-200"
                      }`}
                    >
                      {imp === "critical" ? "🚨 Critical" : imp === "optional" ? "🌱 Optional" : "⚡ Important"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Task Rigidity (Flexibility)</label>
                <div className="flex gap-1.5">
                  {(["fixed", "movable", "optional"] as const).map((flex) => (
                    <button
                      key={flex}
                      type="button"
                      onClick={() => setFlexibleForm({ ...flexibleForm, task_flexibility: flex })}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-bold border capitalize cursor-pointer transition-all ${
                        flexibleForm.task_flexibility === flex
                          ? flex === "fixed"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : flex === "optional"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                          : "bg-white text-neutral-500 border-neutral-200"
                      }`}
                    >
                      {flex === "fixed" ? "🔒 Rigid (Fixed)" : flex === "optional" ? "🌱 Optional" : "↔ Movable"}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-neutral-700 select-none cursor-pointer">
                  <input 
                    type="checkbox"
                    checked={flexibleForm.hasDeadline}
                    onChange={(e) => setFlexibleForm({ ...flexibleForm, hasDeadline: e.target.checked })}
                    className="w-4 h-4 text-primary shrink-0 transition-colors cursor-pointer"
                  />
                  <span>Has relative Deadline or Pinned Date?</span>
                </label>
                
                {flexibleForm.hasDeadline && (
                  <input 
                    type="date"
                    required={flexibleForm.hasDeadline}
                    value={flexibleForm.deadline}
                    onChange={(e) => setFlexibleForm({ ...flexibleForm, deadline: e.target.value })}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white mt-1.5"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Schedule for date (optional)</label>
                <input 
                  type="date" 
                  value={flexibleForm.scheduled_date}
                  onChange={(e) => setFlexibleForm({ ...flexibleForm, scheduled_date: e.target.value })}
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white"
                />
                <p className="text-xs text-[#9999B3] mt-1">
                  {flexibleForm.scheduled_date ? `Slotted to ${flexibleForm.scheduled_date}` : "Leave blank to save to backlog."}
                </p>
              </div>

              {/* Advanced Metadata collapsible details block */}
              <div className="pt-2">
                <details 
                  open={isMetadataOpen} 
                  onToggle={(e) => setIsMetadataOpen((e.target as HTMLDetailsElement).open)}
                  className="border border-neutral-200 rounded-xl p-3 bg-neutral-50/50 space-y-3"
                >
                  <summary className="text-xs font-bold text-neutral-500 cursor-pointer select-none outline-none hover:text-neutral-700 flex items-center justify-between">
                    <span>ADVANCED COGNITIVE METADATA</span>
                    <span className="text-[10px] text-neutral-400 font-mono">{isMetadataOpen ? "▼ COLLAPSE" : "▶ EXPAND"}</span>
                  </summary>
                  
                  <div className="pt-3 space-y-3 border-t border-neutral-100">
                    {/* Category */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Category</label>
                      <select
                        value={flexibleForm.category}
                        onChange={(e) => setFlexibleForm({ ...flexibleForm, category: e.target.value as any })}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="study">🎓 Study</option>
                        <option value="project">💻 Project</option>
                        <option value="meeting">👥 Meeting</option>
                        <option value="health">🏋️ Health</option>
                        <option value="habit">🔄 Habit</option>
                        <option value="admin">⚙️ Admin</option>
                        <option value="social">🍻 Social</option>
                        <option value="creative">🎨 Creative</option>
                        <option value="personal">👤 Personal</option>
                        <option value="misc">📦 Misc</option>
                      </select>
                    </div>

                    {/* Rigidity */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Rigidity</label>
                      <select
                        value={flexibleForm.rigidity}
                        onChange={(e) => setFlexibleForm({ ...flexibleForm, rigidity: e.target.value as any })}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="flexible">Flexible</option>
                        <option value="semi_flexible">Semi-flexible</option>
                        <option value="fixed">Fixed</option>
                      </select>
                    </div>

                    {/* Recoverability */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Recoverability</label>
                      <select
                        value={flexibleForm.recoverability}
                        onChange={(e) => setFlexibleForm({ ...flexibleForm, recoverability: e.target.value as any })}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="easy">Easy to recover</option>
                        <option value="hard">Hard to recover</option>
                        <option value="impossible">Impossible to recover</option>
                      </select>
                    </div>

                    {/* Dependency Chain */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Dependency Strength</label>
                      <select
                        value={flexibleForm.dependency_chain}
                        onChange={(e) => setFlexibleForm({ ...flexibleForm, dependency_chain: e.target.value as any })}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="none">No dependencies</option>
                        <option value="weak">Weak dependence</option>
                        <option value="strong">Strong dependence</option>
                      </select>
                    </div>

                    {/* Progress Type */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Progress Model</label>
                      <select
                        value={flexibleForm.progress_type}
                        onChange={(e) => setFlexibleForm({ ...flexibleForm, progress_type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="binary">Binary (Done/Not Done)</option>
                        <option value="compound">Compound (Accumulates progress)</option>
                        <option value="streak">Streak (Maintains daily momentum)</option>
                      </select>
                    </div>

                    {/* Deadline Pressure */}
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Deadline Pressure</label>
                      <select
                        value={flexibleForm.deadline_pressure}
                        onChange={(e) => setFlexibleForm({ ...flexibleForm, deadline_pressure: e.target.value as any })}
                        className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                      >
                        <option value="none">None</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="critical">Critical</option>
                      </select>
                    </div>

                    {/* Dependency links */}
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Blocked By</label>
                        <select
                          multiple
                          value={flexibleForm.blocked_by}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            setFlexibleForm(prev => ({ ...prev, blocked_by: selected }));
                          }}
                          className="w-full h-24 px-2 py-1 border border-neutral-200 rounded-xl text-[11px] bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          {flexibleTasks
                            .filter(t => !editingTask || t.id !== editingTask.id)
                            .map(t => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Blocks Tasks</label>
                        <select
                          multiple
                          value={flexibleForm.blocks}
                          onChange={(e) => {
                            const selected = Array.from(e.target.selectedOptions, option => option.value);
                            setFlexibleForm(prev => ({ ...prev, blocks: selected }));
                          }}
                          className="w-full h-24 px-2 py-1 border border-neutral-200 rounded-xl text-[11px] bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                        >
                          {flexibleTasks
                            .filter(t => !editingTask || t.id !== editingTask.id)
                            .map(t => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[9px] text-neutral-400 mt-1 leading-tight">Cmd/Ctrl-click to select multiple tasks.</p>
                  </div>
                </details>
              </div>

              <div className="pt-3 border-t border-neutral-100 flex gap-2">
                <button 
                  type="button"
                  onClick={() => setActiveBottomSheet(null)}
                  className="flex-1 py-3 text-sm font-bold rounded-xl border border-neutral-200 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold rounded-xl bg-primary text-white hover:bg-primary-dark transition-colors cursor-pointer"
                >
                  {editingTask ? "Confirm Save" : flexibleForm.scheduled_date ? "Add to Today" : "Save to Backlog"}
                </button>
              </div>
            </form>
          </div>

          {/* SHEET 3 — AI Copilot */}
          {(() => {
            const userPromptsCount = chatHistory.filter(m => m.sender === "user").length;
            const isCopilotFullScreen = userPromptsCount >= 3 && !copilotMinimized;
            return (
              <div 
                className={`fixed z-49 bg-white transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${
                  activeBottomSheet === "assistant" 
                    ? "opacity-100 pointer-events-auto translate-x-0 md:translate-x-0" 
                    : "opacity-0 pointer-events-none invisible translate-y-10 md:translate-y-0 md:translate-x-full"
                } ${
                  isCopilotFullScreen
                    ? "top-0 bottom-0 left-0 right-0 w-full h-full max-h-screen md:max-w-3xl md:left-auto md:right-0 md:top-0 md:bottom-0 md:h-screen md:rounded-l-3xl md:rounded-r-none border border-neutral-200/80 shadow-2xl p-6"
                    : "bottom-0 left-0 right-0 max-h-[90vh] md:max-h-screen md:h-screen md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-[380px] md:max-w-md md:rounded-l-3xl md:rounded-r-none border border-neutral-200/80 shadow-2xl p-6 transform " + 
                      (activeBottomSheet === "assistant" ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full")
                }`}
              >
                {!isCopilotFullScreen && (
                  <div className="flex justify-center pb-3">
                    <span className="w-10 h-1 bg-neutral-200 rounded-full" />
                  </div>
                )}
                <div className="flex-1 overflow-y-auto">
                  {renderCopilotContent(false)}
                </div>
              </div>
            );
          })()}

          {/* SHEET 5 — End of Day Review */}
          <div 
            className={`absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl p-6 z-49 overflow-y-auto transform transition-all duration-300 ease-out flex flex-col ${
              activeBottomSheet === "eodreview" 
                ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" 
                : "translate-y-full md:translate-y-10 md:scale-95 opacity-0 pointer-events-none invisible"
            }`}
          >
            <div className="flex justify-center pb-3">
              <span className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-1.5">
                <CalendarCheck className="w-5 h-5 text-amber-500 shrink-0" />
                <span>End of Day Review</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveBottomSheet(null)}
                className="p-1 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#5A5A7A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5A5A7A] leading-relaxed mb-4">
              Review incomplete items from today and stale tasks from your backlog to keep your workspace fresh.
            </p>

            <div className="space-y-5 flex-1 overflow-y-auto pr-1">
              {/* SECTION 1: INCOMPLETE TASKS TODAY */}
              <div className="space-y-3">
                <h4 className="text-xs uppercase font-bold text-[#9999B3] tracking-wider block">Today's Incomplete Tasks</h4>
                {todayIncompleteTasks.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No incomplete tasks scheduled for today.</p>
                ) : (
                  <div className="space-y-3">
                    {todayIncompleteTasks.map(task => (
                      <div key={task.id} className="p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-semibold text-neutral-800 font-display block leading-tight">{task.title}</span>
                          <span className="text-[10px] font-mono font-bold bg-neutral-200/60 px-1.5 py-0.5 rounded text-neutral-600 shrink-0">{task.duration_minutes}m</span>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => handleEodMoveToTomorrow(task.id)}
                            className="text-[10px] font-bold bg-primary hover:bg-primary-dark text-white px-2 py-1 rounded cursor-pointer transition-colors"
                          >
                            Do Tomorrow
                          </button>
                          <div className="flex items-center bg-neutral-200/50 rounded p-0.5 gap-0.5">
                            <button
                              onClick={() => handleEodReduceAndTomorrow(task.id, 50)}
                              className="text-[10px] font-bold text-neutral-700 hover:bg-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              title="Mark 50% done today, schedule remaining half tomorrow"
                            >
                              50% Done
                            </button>
                            <button
                              onClick={() => handleEodReduceAndTomorrow(task.id, 75)}
                              className="text-[10px] font-bold text-neutral-700 hover:bg-white px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                              title="Mark 75% done today, schedule remaining 25% tomorrow"
                            >
                              75% Done
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteFlexible(task.id)}
                            className="text-[10px] font-bold text-red-600 hover:bg-red-50 hover:text-red-700 px-2 py-1 rounded cursor-pointer transition-colors ml-auto"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION 2: STALE BACKLOG ITEMS */}
              <div className="space-y-3 pt-3 border-t border-neutral-100">
                <h4 className="text-xs uppercase font-bold text-[#9999B3] tracking-wider block">Stale Tasks (Pending 3+ Days)</h4>
                {staleTasks.length === 0 ? (
                  <p className="text-xs text-neutral-400 italic">No stale backlog tasks. Nice job!</p>
                ) : (
                  <div className="space-y-3">
                    {staleTasks.slice(0, 3).map(task => {
                      // Calculate age
                      const parts = task.id.split("-");
                      let ageDays = 3;
                      const timestamp = parts[0] === "flex" ? parseInt(parts[1], 10) : parts[0] === "ai" && parts[1] === "flex" ? parseInt(parts[2], 10) : 0;
                      if (timestamp > 0) {
                        ageDays = Math.max(3, Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000)));
                      }
                      
                      return (
                        <div key={task.id} className="p-3 bg-amber-50/50 border border-amber-100 rounded-xl space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-xs font-semibold text-neutral-800 font-display block leading-tight">{task.title}</span>
                              <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">⚠️ Pending for {ageDays} days</span>
                            </div>
                            <span className="text-[10px] font-mono font-bold bg-neutral-200/60 px-1.5 py-0.5 rounded text-neutral-600 shrink-0">{task.duration_minutes}m</span>
                          </div>
                          
                          <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-amber-100/60">
                            <span className="text-[10px] text-neutral-500 font-semibold">Still relevant?</span>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleEodKeepStale(task.id)}
                                className="text-[10px] font-bold bg-white text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                Yes, Keep
                              </button>
                              <button
                                onClick={() => handleDeleteFlexible(task.id)}
                                className="text-[10px] font-bold bg-white text-red-500 border border-red-200 hover:bg-red-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                              >
                                No, Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    {staleTasks.length > 3 && (
                      <p className="text-[10px] text-neutral-400 italic text-right">+ {staleTasks.length - 3} more stale tasks in backlog</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => setActiveBottomSheet(null)}
                className="w-full py-3 text-sm font-bold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer text-center"
              >
                Close Review
              </button>
            </div>
          </div>

          {/* SHEET 6 — Profile Creator / Editor */}
          <div 
            className={`absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl p-6 z-49 overflow-y-auto transform transition-all duration-300 ease-out flex flex-col ${
              activeBottomSheet === "profile" 
                ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" 
                : "translate-y-full md:translate-y-10 md:scale-95 opacity-0 pointer-events-none invisible"
            }`}
          >
            <div className="flex justify-center pb-3">
              <span className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-1.5">
                <BookMarked className="w-5 h-5 text-primary shrink-0" />
                <span>{editingProfile ? "Edit Profile" : "Create Profile"}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveBottomSheet(null)}
                className="p-1 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#5A5A7A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5A5A7A] leading-relaxed mb-4">
              Define repeating commitments for specific circumstances (e.g. university lectures on weekdays, gym workouts daily).
            </p>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4">
              {/* PROFILE META */}
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Profile Name</label>
                  <input 
                    type="text" 
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="e.g. College Days, Holidays"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Emoji</label>
                  <input 
                    type="text" 
                    value={profileForm.emoji}
                    onChange={(e) => setProfileForm({ ...profileForm, emoji: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none text-center"
                    maxLength={2}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Accent Color</label>
                  <input 
                    type="color" 
                    value={profileForm.accentColor}
                    onChange={(e) => setProfileForm({ ...profileForm, accentColor: e.target.value })}
                    className="w-full h-8 p-1 bg-white border border-neutral-200 rounded-xl cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Automatic Schedule Rules</label>
                  <select
                    value={profileForm.appliesTo}
                    onChange={(e) => setProfileForm({ ...profileForm, appliesTo: e.target.value as ProfileAppliesTo })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="weekdays">Weekdays (Mon-Fri)</option>
                    <option value="weekends">Weekends (Sat-Sun)</option>
                    <option value="everyday">Everyday</option>
                    <option value="manual">Manual Activation Only</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Description</label>
                <input 
                  type="text" 
                  value={profileForm.description}
                  onChange={(e) => setProfileForm({ ...profileForm, description: e.target.value })}
                  placeholder="Describe when this profile activates..."
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              {/* INLINE BLOCKS MANAGEMENT */}
              <div className="border-t border-neutral-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider">Profile Commitment Blocks</h4>
                
                {/* Blocks List */}
                {profileForm.blocks.length === 0 ? (
                  <p className="text-[11px] text-neutral-400 italic">No blocks configured yet. Add some below.</p>
                ) : (
                  <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                    {profileForm.blocks.map(block => (
                      <div key={block.id} className="p-2 bg-neutral-50 border border-neutral-200/60 rounded-xl flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: block.color || "#E24B4A" }} />
                          <span className="font-semibold text-neutral-700">{block.title}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-neutral-500 font-semibold">{block.start_time} - {block.end_time}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveProfileBlock(block.id)}
                            className="p-1 hover:bg-red-50 text-red-500 rounded transition-colors cursor-pointer"
                            title="Remove Block"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add block sub-form */}
                <div className="p-3 bg-neutral-50/50 border border-neutral-200/60 rounded-2xl space-y-2.5">
                  <span className="text-[10px] font-bold text-[#9999B3] uppercase tracking-wider block font-sans">Add Commitment Block</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <input 
                        type="text" 
                        placeholder="Block Title (e.g. Gym, Classes)" 
                        value={profileBlockForm.title}
                        onChange={(e) => setProfileBlockForm({ ...profileBlockForm, title: e.target.value })}
                        className="w-full px-2.5 py-1.5 border border-neutral-200 rounded-lg text-xs bg-white focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#9999B3] font-bold mb-0.5">Start Time</label>
                      <input 
                        type="time" 
                        value={profileBlockForm.start_time}
                        onChange={(e) => setProfileBlockForm({ ...profileBlockForm, start_time: e.target.value })}
                        className="w-full px-2 py-1 border border-neutral-200 rounded-lg text-xs bg-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] text-[#9999B3] font-bold mb-0.5">End Time</label>
                      <input 
                        type="time" 
                        value={profileBlockForm.end_time}
                        onChange={(e) => setProfileBlockForm({ ...profileBlockForm, end_time: e.target.value })}
                        className="w-full px-2 py-1 border border-neutral-200 rounded-lg text-xs bg-white font-mono"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddProfileBlock}
                    className="w-full py-1.5 text-xs font-bold bg-neutral-900 text-white hover:bg-neutral-800 rounded-xl cursor-pointer transition-colors text-center font-display"
                  >
                    ＋ Insert Block into Profile
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => setActiveBottomSheet(null)}
                className="flex-1 py-3 text-sm font-bold rounded-xl border border-neutral-200 transition-colors cursor-pointer text-[#5A5A7A] hover:bg-neutral-50 text-center"
              >
                Discard
              </button>
              <button 
                type="button"
                onClick={handleSaveProfile}
                className="flex-1 py-3 text-sm font-bold rounded-xl bg-primary hover:bg-primary-dark text-white transition-colors cursor-pointer text-center font-display"
              >
                Save Profile
              </button>
            </div>
          </div>

          {/* SHEET 7 — Goal Creator / Editor */}
          <div 
            className={`absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-white/95 backdrop-blur-xl border border-white/20 shadow-2xl p-6 z-49 overflow-y-auto transform transition-all duration-300 ease-out flex flex-col text-slate-800 ${
              activeBottomSheet === "goal" 
                ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" 
                : "translate-y-full md:translate-y-10 md:scale-95 opacity-0 pointer-events-none invisible"
            }`}
          >
            <div className="flex justify-center pb-3">
              <span className="w-10 h-1 bg-neutral-200 rounded-full" />
            </div>

            <div className="flex items-center justify-between mb-2">
              <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-1.5">
                <Target className="w-5 h-5 text-primary shrink-0" />
                <span>{editingGoal ? "Edit Goal" : "Create Goal"}</span>
              </h3>
              <button 
                type="button" 
                onClick={() => setActiveBottomSheet(null)}
                className="p-1 rounded-full bg-neutral-50 hover:bg-neutral-100 text-[#5A5A7A]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#5A5A7A] leading-relaxed mb-4 font-sans">
              Define quantifiable milestones and link them to timeline keywords to track your progress automatically.
            </p>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1 pb-4">
              <div>
                <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Goal Title</label>
                <input 
                  type="text" 
                  value={goalForm.title}
                  onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                  placeholder="e.g. Gym Consistency, Finish Chemistry"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Category</label>
                  <select
                    value={goalForm.category}
                    onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value as GoalCategory })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    <option value="fitness">💪 Fitness</option>
                    <option value="academic">📚 Academic</option>
                    <option value="project">🚀 Project</option>
                    <option value="habit">⚡ Habit</option>
                    <option value="personal">⭐ Personal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Metric Label</label>
                  <input 
                    type="text" 
                    value={goalForm.metricLabel}
                    onChange={(e) => setGoalForm({ ...goalForm, metricLabel: e.target.value })}
                    placeholder="e.g. sessions, pages, kg"
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Current Value</label>
                  <input 
                    type="number" 
                    step="any"
                    value={goalForm.currentValue}
                    onChange={(e) => setGoalForm({ ...goalForm, currentValue: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Target Value</label>
                  <input 
                    type="number" 
                    step="any"
                    value={goalForm.targetValue}
                    onChange={(e) => setGoalForm({ ...goalForm, targetValue: parseFloat(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Target Date (Optional)</label>
                  <input 
                    type="date" 
                    value={goalForm.targetDate}
                    onChange={(e) => setGoalForm({ ...goalForm, targetDate: e.target.value })}
                    className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Auto-Link Keywords (Comma Separated)</label>
                <input 
                  type="text" 
                  value={goalForm.linkedTaskKeywords}
                  onChange={(e) => setGoalForm({ ...goalForm, linkedTaskKeywords: e.target.value })}
                  placeholder="e.g. gym, workout, run (auto-updates progress)"
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Description (Optional)</label>
                <textarea 
                  value={goalForm.description}
                  onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                  placeholder="Describe your motivation or specifics..."
                  rows={2}
                  className="w-full px-3 py-2 border border-neutral-200 rounded-xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none font-sans"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-neutral-100 flex gap-2 shrink-0">
              <button 
                type="button"
                onClick={() => setActiveBottomSheet(null)}
                className="flex-1 py-3 text-sm font-bold rounded-xl border border-neutral-200 transition-colors cursor-pointer text-[#5A5A7A] hover:bg-neutral-50 text-center"
              >
                Discard
              </button>
              <button 
                type="button"
                onClick={handleSaveGoal}
                className="flex-1 py-3 text-sm font-bold rounded-xl bg-primary hover:bg-primary-dark text-white transition-colors cursor-pointer text-center font-display"
              >
                {editingGoal ? "Save Changes" : "Create Goal"}
              </button>
            </div>
          </div>

          {/* AI PROPOSAL CONFIRMATION OVERLAY */}
          {showConfirmationOverlay && aiReasoningResult && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-neutral-150 shadow-2xl text-left space-y-4 animate-scale-up">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-indigo-50 rounded-2xl text-primary shrink-0">
                    <Sparkles className="w-5 h-5 fill-primary/10" />
                  </div>
                  <div>
                    <h3 className="font-display font-black text-md text-[#1A1A2E]">AI Schedule Proposals</h3>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        aiReasoningResult.proposalRisk === "high" 
                          ? "bg-rose-500/10 text-rose-500" 
                          : "bg-amber-500/10 text-amber-500"
                      }`}>
                        {aiReasoningResult.proposalRisk} Risk
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-xs text-neutral-600 leading-relaxed bg-neutral-50 p-3.5 rounded-2xl border border-neutral-100">
                  {aiReasoningResult.message}
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Proposed Actions</label>
                  <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                    {aiReasoningResult.proposals.map((p, idx) => {
                      if (p.type === "abstain") {
                        return (
                          <div key={idx} className="p-2.5 bg-neutral-50 rounded-xl text-xs text-neutral-500 italic border border-neutral-100">
                            Abstain: {p.reason}
                          </div>
                        );
                      }
                      if (p.type === "suggest" || p.type === "ask") {
                        return (
                          <div key={idx} className="p-2.5 bg-indigo-50/50 rounded-xl text-xs text-indigo-700 border border-indigo-100/50">
                            💡 Coaching Suggestion: {p.type === "ask" ? (p as any).question : (p as any).message}
                          </div>
                        );
                      }
                      
                      const targetTask = flexibleTasks.find(t => t.id === (p as any).taskId);
                      return (
                        <div key={idx} className="flex items-start gap-2.5 p-3 bg-white border border-neutral-150 rounded-2xl text-xs">
                          <div className="mt-0.5 font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-neutral-100 text-neutral-600 shrink-0">
                            {p.type.replace("_", " ")}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-neutral-800 truncate">
                              {targetTask ? targetTask.title : "Unknown task"}
                            </div>
                            <div className="text-[11px] text-neutral-500 mt-0.5">
                              {(p as any).reason}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowConfirmationOverlay(false);
                      setAiReasoningResult(null);
                    }}
                    className="flex-1 py-3 text-xs font-bold rounded-2xl border border-neutral-200 text-neutral-500 hover:bg-neutral-50 transition-colors cursor-pointer text-center"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      executeAIProposals(aiReasoningResult.proposals);
                      setShowConfirmationOverlay(false);
                      setAiReasoningResult(null);
                      setLastReflectedDate(TODAY);
                      localStorage.setItem("dayflow_last_reflected_date", TODAY);
                    }}
                    className="flex-1 py-3 text-xs font-bold rounded-2xl bg-primary hover:bg-primary-dark text-white transition-colors cursor-pointer text-center font-display"
                  >
                    Apply proposals
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DAY SUMMARY POPUP REMINDER */}
          {showDaySummaryReminder && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-neutral-150 shadow-2xl text-center space-y-4.5 animate-scale-up">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-650 text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
                  <Sparkles className="w-6 h-6 fill-white/10" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="font-display font-black text-lg text-[#1A1A2E]">Wrap up your day! 🌟</h3>
                  <p className="text-xs text-[#5A5A7A] leading-relaxed font-medium">
                    Ready to summarize today's achievements and discuss tomorrow's plan with your AI Copilot? It keeps your schedule aligned and minimizes friction.
                  </p>
                </div>
                <div className="flex flex-col gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDaySummaryReminder(false);
                      const todayStr = new Date().toISOString().split("T")[0];
                      localStorage.setItem("dayflow_last_summary_prompt_date", todayStr);
                      handleOpenAICopilot();
                      handleSendCopilotMessage("Summarize my day and plan tomorrow");
                    }}
                    className="w-full py-3 bg-gradient-to-r from-primary to-indigo-650 hover:from-primary-dark hover:to-indigo-750 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-primary/10 active:scale-97 cursor-pointer"
                  >
                    Summarize & Plan with AI
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowDaySummaryReminder(false);
                      const todayStr = new Date().toISOString().split("T")[0];
                      localStorage.setItem("dayflow_last_summary_prompt_date", todayStr);
                    }}
                    className="w-full py-2.5 bg-neutral-50 hover:bg-neutral-100 border border-neutral-200 text-neutral-500 hover:text-neutral-700 rounded-2xl text-xs font-semibold transition-all active:scale-97 cursor-pointer"
                  >
                    I'll do it later
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
