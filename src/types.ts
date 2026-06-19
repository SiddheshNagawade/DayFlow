export type RepeatType = "daily" | "weekdays" | "custom" | "none";
export type EnergyLevel = "high" | "medium" | "low";
export type TaskStatus = "backlog" | "scheduled" | "done" | "skipped" | "expired";
export type ProfileAppliesTo = "weekdays" | "weekends" | "everyday" | "manual";

export interface FixedBlock {
  id: string;
  title: string;
  start_time: string; // "HH:MM" format
  end_time: string;   // "HH:MM" format
  repeats: RepeatType;
  locked: boolean;
  date: string;       // "YYYY-MM-DD" reference date
  color?: string;     // Color theme
}

export type TaskCategory = 
  | "study" | "project" | "meeting" | "health" | "habit" 
  | "admin" | "social" | "creative" | "personal" | "misc";

export type TaskRigidity = "fixed" | "semi_flexible" | "flexible";
export type TaskRecoverability = "impossible" | "hard" | "easy";
export type TaskDependencyChain = "none" | "weak" | "strong";
export type TaskProgressType = "binary" | "compound" | "streak";
export type DeadlinePressure = "none" | "low" | "medium" | "high" | "critical";

export interface TaskMeta {
  category: TaskCategory;
  rigidity: TaskRigidity;
  importance: "critical" | "important" | "optional";
  recoverability: TaskRecoverability;
  dependency_chain: TaskDependencyChain;
  progress_type: TaskProgressType;
  deadline_pressure: DeadlinePressure;
  task_nature?: "recurring" | "one_time" | "progressive";
}

export interface ClassificationResult {
  meta: TaskMeta;
  confidence: number;
  source: "rules" | "memory" | "ai";
}

export type ConsequenceIntent = "preview" | "skip" | "delay" | "break" | "cancel";

export interface ConsequenceCore {
  time_shift_mins: number;
  backlog_mins: number;
  streak_break: boolean;
  blocked_task_ids: string[];
  deadline_risk_delta: number; // 0 to 10
}

export interface NegotiationOption {
  strategy: "reduce_scope" | "reschedule" | "restructure" | "skip";
  label: string;
  consequence_delta: string;
  command: {
    type: "shorten_duration" | "move_to_gap" | "split_into_chunks" | "mark_partial" | "swap_tasks";
    params?: Record<string, any>;
  };
}

export interface TaskConsequence {
  immediate_effect: string;
  cascade_effect: string;
  goal_effect: string;
  emotional_weight: "none" | "low" | "medium" | "high" | "critical";
  primary_message_slot: "immediate" | "cascade" | "goal";
  recommendation: {
    best_action: string;
    minimum_viable_progress: string;
  };
  negotiation_options: NegotiationOption[];
}

export interface FlexibleTask {
  meta?: TaskMeta;
  blocked_by?: string[];
  blocks?: string[];
  id: string;
  title: string;
  duration_minutes: number;
  deadline: string | null; // "YYYY-MM-DD" or null
  energy_level: EnergyLevel;
  status: TaskStatus;
  scheduled_date: string | null; // "YYYY-MM-DD" or null
  scheduled_start_time?: string; // slotted start e.g. "14:00"
  scheduled_end_time?: string;   // slotted end e.g. "16:00"

  // Carry-over metadata
  carried_over_from?: string; // YYYY-MM-DD original scheduled date
  task_nature?: "recurring" | "one_time" | "progressive";
  carry_over_count?: number;

  // Manual override: user dragged/pinned this task to a specific start time
  pinned_start_time?: string;    // "HH:MM" - overrides auto-schedule for this day
  priority?: number;             // lower = scheduled earlier (set by drag order)

  // Telemetry fields for personalization
  actual_start_time?: string;      // "HH:MM" format
  actual_duration_minutes?: number; // actual elapsed minutes
  completed_at?: string;            // ISO timestamp when user checked it done
  createdDate?: string;             // "YYYY-MM-DD" when task was created
  
  // Frictionless completion logging
  focus_quality_effort?: "good" | "okay" | "struggled"; // replaces complex mood sliders
  inferred_mood_before?: number;   // 1-10 inferred from patterns
  inferred_mood_after?: number;    // 1-10 inferred from completion stats

  // Rich detail expansion (workout exercises, class rooms, etc.)
  description?: string; // multi-line detail: one item per line

  // Advanced CCM Telemetry
  mood_before?: number;   // 1-10 scale
  mood_after?: number;    // 1-10 scale
  complexity?: number;    // 1-10 complexity
  interruptions?: number; // counter
  category?: "work" | "exercise" | "relax" | "personal";
  notification_response?: "started" | "delayed_15" | "delayed_30" | "skipped_today";
  delay_count?: number; // how many times this task was delayed today

  // Execution Engine — AI Consequence Insight
  consequence_insight?: string;          // AI-generated narrative cached after first fetch
  consequence_teaser?: string;           // AI-generated one-line teaser cached after first fetch
  consequence_generated_at?: string;     // ISO date — used to decide if regeneration is needed

  // Execution Engine — Partial Completion ("Do 25 min" option)
  partial_completion?: boolean;          // true if user chose reduced version today
  partial_duration_minutes?: number;     // the reduced duration they committed to

  // Task Importance / Rigidity classification
  importance?: "critical" | "important" | "optional";
  task_flexibility?: "fixed" | "movable" | "optional";
}

export type GoalCategory = 
  | "fitness"      // gym streaks, weight, running distance
  | "academic"     // exam scores, semester completion, course finish
  | "project"      // app launch, portfolio piece, assignment
  | "habit"        // reading, meditation, sleep schedule
  | "personal";    // custom

export type GoalStatus = "active" | "achieved" | "abandoned" | "paused";

export interface GoalMilestone {
  id: string;
  label: string;
  targetValue: number;
  achievedAt?: string;
  celebrationShown: boolean;
}

export interface UserGoal {
  id: string;
  title: string;
  category: GoalCategory;
  description?: string;
  metricLabel: string; // "sessions", "kg", "pages", "hours"
  currentValue: number;
  targetValue: number;
  startValue?: number;
  createdAt: string;
  targetDate?: string; // YYYY-MM-DD
  status: GoalStatus;
  achievedAt?: string;
  milestones: GoalMilestone[];
  checkInFrequencyDays: number;
  lastCheckInAt?: string;
  nextCheckInAt?: string;
  linkedTaskKeywords: string[];
  progressLog: {
    date: string;
    value: number;
    note?: string;
  }[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: GoalCategory | "streak" | "completion";
  earnedAt: string;
  icon: string; // emoji
  goalId?: string;
}

export interface HourlyMetric {
  hour: number;
  completionRate: number;
  focusQuality: number; // Performance ratio: (actual - planned) / planned * -1
  consistency: number;  // Standard dev indicator
  label: "Peak" | "Peak+" | "Good" | "Declining" | "Slump" | "Lowest" | "Low" | "Recovery" | "Improving" | "Moderate" | "Dropping" | "Crashed" | "Dead" | "Awaiting Data";
}

export interface CategoryBias {
  category: "work" | "exercise" | "relax" | "personal";
  bias: number; // Multiplier e.g. 1.87x
  samples: number;
}

export interface TransitionGap {
  fromType: "work" | "exercise" | "relax" | "personal";
  toType: "work" | "exercise" | "relax" | "personal";
  optimalGap: number;     // minutes
  completionRate: number; // success rate when transitioned
}

export interface ProcrastinationSignature {
  patternId: string;
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  completionRate: number;
  recommendation: string;
}

export interface CalibrationProfile {
  totalCompletions: number;
  phase: 1 | 2; // Phase 1: Smart Defaults, Phase 2: Calibrated
  underestimateRatio: number; // e.g. 1.2x estimated duration
  optimalWorkGap: number;     // e.g. 15, 18, 20 minutes
  exerciseRecoveryGap: number;// e.g. 25, 30 minutes
  peakFocusTime: "morning" | "afternoon" | "evening";
  completionRate: number;     // e.g. 85 (percent)
  
  // Advanced CCM Data Metrics
  hourlyMetrics?: HourlyMetric[];
  categoryBiases?: CategoryBias[];
  transitionGaps?: TransitionGap[];
  procrastinationSignatures?: ProcrastinationSignature[];
  moodCorrelation?: number; // Pearson r value (-1 to +1)
  fatigueLimit?: number;    // max tasks before performance crash
  timeSavedMinutes?: number;// estimated daily hours saved
}

export interface TimeGap {
  start: string; // "HH:MM"
  end: string;   // "HH:MM"
  duration_minutes: number;
}

// Result of simulating a delay or skip cascade
export interface DelayCostResult {
  shiftedTasks: { id: string; title: string; newStart: string; oldStart: string }[];
  sleepShiftMins: number;     // > 0 if last task overflows day end
  freeTimeLostMins: number;   // total minutes of gap reduction
  streakBreaks: boolean;      // true if this is the only flex task today
  backlogIncrease: number;    // 1 if skip, 0 otherwise
  core: ConsequenceCore;
}

export interface ScheduledItem {
  id: string;
  type: "fixed" | "flexible";
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  energy_level?: EnergyLevel;
  locked: boolean;
  status: "done" | "scheduled" | "fixed" | "skipped" | "expired";
  deadline?: string | null;
  pinned?: boolean;       // true when user manually pinned the start time
  color?: string;         // custom color theme for fixed block
  description?: string;   // multi-line detail for inline expansion
  task_nature?: "recurring" | "one_time" | "progressive";
  carried_over_from?: string;
  carry_over_count?: number;
}

// ─── Behavioral memory logs ───────────────────────────────────────────────────

export interface TaskExecutionLog {
  taskId: string;
  date: string; // YYYY-MM-DD
  plannedDuration: number;
  actualDuration?: number;
  scheduledStartHour?: number;
  completed: boolean;
  skipped: boolean;
}

export interface ReflectionEvent {
  id: string;
  date: string; // YYYY-MM-DD
  completionRate: number;
  type: "success" | "failure";
  cause: "planning" | "energy" | "discipline" | "interruption" | "success_sleep" | "success_planning" | "success_focus" | "success_load";
  notes?: string;
}

export interface UBMInsights {
  timeBias: number;
  timeBiasConfidence: number;
  hourlySuccess: Record<number, number>; // Hour (0-23) -> Completion rate (0.0 to 1.0)
  hourlyConfidence: Record<number, number>; // Hour (0-23) -> Confidence (0.0 to 1.0)
  categorySuccess: Record<string, number>; // Category name -> Completion rate (0.0 to 1.0)
  categoryConfidence: Record<string, number>; // Category name -> Confidence (0.0 to 1.0)
}

export type AIProposal =
  | { type: "carry_over"; taskId: string }
  | { type: "backlog"; taskId: string }
  | { type: "expire"; taskId: string }
  | { type: "suggest"; message: string }
  | { type: "ask"; question: string }
  | { type: "abstain"; reason: string };

// ─── V3.1 Pattern Engine / AI Payload Minimization ───────────────────────────

/**
 * DataReliability: computed trust score for the user's behavioral data.
 * Low scores indicate the Pattern Engine output should be treated with skepticism.
 */
export interface DataReliability {
  /** 0–1: ratio of tasks explicitly resolved (done|skipped|expired) vs total scheduled last 30d */
  loggingConsistency: number;
  /** 0–1: how trustworthy completion data is; drops if loggingConsistency is low */
  completionConfidence: number;
  /** 0–1: ratio of completed tasks that have actual_start_time recorded */
  scheduleAccuracy: number;
  /** Weighted composite of the three above */
  overallScore: number;
  /** Human-readable verdict for AI prompt injection */
  verdict: "trusted" | "partial" | "unreliable";
}

/**
 * BehaviorSignals: compressed behavioral model output from the Pattern Engine.
 * This — and ONLY this — is what gets sent to the AI Brain.
 * No raw task arrays, no raw log arrays.
 */
export interface BehaviorSignals {
  // Planning accuracy
  planningBias: number;            // 1.34 = tasks take 34% longer than estimated on average
  planningBiasConfidence: number;  // 0–1; based on number of completed logs with actualDuration

  // Time-of-day patterns (only hours with real data — no circadian defaults)
  bestHours: number[];             // hours where success >= 0.75 AND confidence >= 0.4
  worstHours: number[];            // hours where success < 0.4 AND confidence >= 0.4
  hourlySuccessMap: Record<number, { rate: number; confidence: number }>;

  // Category performance
  categorySuccessRates: Record<string, { rate: number; confidence: number }>;
  weakCategories: string[];        // categories where rate < 0.5 and confidence >= 0.4

  // Carry-over / procrastination
  averageCarryOverCount: number;   // rolling avg carries per task in last 30 days
  procrastinationRisk: number;     // 0–1 derived from carry-over rate + stale task age

  // Load / burnout
  recentLoadMins: number;          // total planned minutes over last 7 days
  avgDailyCompletionRate: number;  // 7-day rolling, 0–1
  burnoutRisk: number;             // 0–1 derived from load + completion drop trend

  // Data confidence
  totalLoggedTasks: number;
  dataAge: "insufficient" | "early" | "mature"; // <10 | 10-50 | >50 logs
  reliability: DataReliability;
}

/**
 * AICompactContext: the lean envelope sent to /api/ai-reasoning and /api/adjust-schedule.
 * Rule: no raw FlexibleTask[], no raw ScheduledItem[], no raw log arrays.
 */
export interface AICompactContext {
  trigger: "drift" | "reflection" | "copilot";
  behaviorSignals: BehaviorSignals;
  currentState: {
    staleTasksCount: number;
    todayLoadMins: number;
    missedTask?: string;        // title of the drifted task, if any
    overloadRisk: number;       // 0–1; ratio of todayLoadMins / sustainable capacity (480 min)
    backlogCount: number;
    upcomingTaskTitles: string[]; // next 3 scheduled task titles only
  };
  goalImpact?: Array<{
    goalTitle: string;
    delayDays: number;           // math-computed locally, AI explains it
  }>;
  userMessage?: string;
}

export interface DaySchedule {
  items: ScheduledItem[];
  conflicts: FlexibleTask[];
}

// ─── Routine Profiles ────────────────────────────────────────────────────────

export interface ProfileBlock {
  id: string;
  title: string;
  start_time: string; // "HH:MM"
  end_time: string;   // "HH:MM"
  color?: string;
}

export interface ScheduleProfile {
  id: string;
  name: string;
  emoji: string;
  accentColor: string;
  description?: string;
  appliesTo: ProfileAppliesTo;
  isActive?: boolean; // manual override — force-activate regardless of day type
  blocks: ProfileBlock[];
}

// ─── Health & Fitness ─────────────────────────────────────────────────────────

export interface WeightEntry {
  date: string;   // "YYYY-MM-DD"
  weight: number; // in kg
  note?: string;
}
