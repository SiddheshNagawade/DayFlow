export type RepeatType = "daily" | "weekdays" | "custom" | "none";
export type EnergyLevel = "high" | "medium" | "low";
export type TaskStatus = "backlog" | "scheduled" | "done" | "skipped" | "expired" | "shifted";
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
  daysOfWeek?: number[]; // custom repeat days 0-6 (0=Sunday)
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
  subtasks?: string;     // point-wise subtasks string
  subtask_list?: { title: string; duration: number }[]; // parsed subtasks list

  // Daily Execution Plan — AI-generated per-day actionable steps (separate from static description)
  daily_plan?: string;               // newline-separated steps for today's occurrence
  daily_plan_generated_date?: string; // "YYYY-MM-DD" — which date this plan was generated for
  daily_plan_edited?: boolean;        // true if user manually edited it from AI default


  // Advanced CCM Telemetry
  mood_before?: number;   // 1-10 scale
  mood_after?: number;    // 1-10 scale
  complexity?: number;    // 1-10 complexity
  interruptions?: number; // counter
  category?: "work" | "exercise" | "relax" | "personal";
  notification_response?: "started" | "delayed_15" | "delayed_30" | "skipped_today";
  delay_count?: number; // how many times this task was delayed today
  last_friction_reason?: FrictionReason;

  // Machine Learning telemetry & suggestions
  predictedDuration?: number;
  predictedCompletionProb?: number;
  suggestedIntervention?: { type: "DECOMPOSE" | "SHIFT_TO_PEAK" | "SHRINK"; reason: string };

  // Execution Engine — AI Consequence Insight
  consequence_insight?: string;          // AI-generated narrative cached after first fetch
  consequence_teaser?: string;           // AI-generated one-line teaser cached after first fetch
  consequence_generated_at?: string;     // ISO date — used to decide if regeneration is needed
  original_scheduled_date?: string;       // YYYY-MM-DD original scheduled date
  backlog_shifted_at?: string;            // ISO timestamp when shifted to backlog

  // Execution Engine — Partial Completion ("Do 25 min" option)
  partial_completion?: boolean;          // true if user chose reduced version today
  partial_duration_minutes?: number;     // the reduced duration they committed to

  // Task Importance / Rigidity classification
  importance?: "critical" | "important" | "optional";
  task_flexibility?: "fixed" | "movable" | "optional";

  // Multi-source duration log tracking metadata
  duration_log_confidence?: number;
  duration_log_source?: "timer" | "message" | "timestamp" | "default";

  // Project Engine linking
  projectId?: string;
  phaseId?: string;
  subtaskId?: string;

  // Sync and conflict resolution metadata
  field_timestamps: Record<string, string>;
  schema_version: number;
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
  contextSuccessRates?: Record<string, { rate: number; confidence: number; supportCount: number }>;
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
  status: "done" | "scheduled" | "fixed" | "skipped" | "expired" | "shifted";
  deadline?: string | null;
  pinned?: boolean;       // true when user manually pinned the start time
  color?: string;         // custom color theme for fixed block
  description?: string;   // multi-line detail for inline expansion
  task_nature?: "recurring" | "one_time" | "progressive";
  carried_over_from?: string;
  carry_over_count?: number;
  isRoutine?: boolean;
  rigidity?: "hard" | "soft";
  predictedDuration?: number;
  predictedCompletionProb?: number;
  suggestedIntervention?: { type: "DECOMPOSE" | "SHIFT_TO_PEAK" | "SHRINK"; reason: string };
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
  confidence?: number;
  estimationSource?: "timer" | "message" | "timestamp" | "default";
}

export type FrictionReason = "low_energy" | "distraction" | "resistance" | "emotional_resistance" | "unclear_task" | "external_interrupt" | "unknown";

export interface ReflectionEvent {
  id: string;
  date: string; // YYYY-MM-DD
  completionRate: number;
  type: "success" | "failure";
  cause: "planning" | "energy" | "discipline" | "interruption" | "success_sleep" | "success_planning" | "success_focus" | "success_load" | FrictionReason;
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

export interface Signal<T> {
  value: T;
  confidence: number; // 0–1
  sampleSize: number;
}

/**
 * BehaviorSignals: compressed behavioral model output from the Pattern Engine.
 * This — and ONLY this — is what gets sent to the AI Brain.
 * No raw task arrays, no raw log arrays.
 */
export interface BehaviorSignals {
  // Planning accuracy
  planningBias: Signal<number>;            // e.g. value: 1.34 (takes 34% longer), confidence, sampleSize

  // Time-of-day patterns (only hours with real data — no circadian defaults)
  bestHours: Signal<number[]>;             // hours where success >= 0.75 AND confidence >= 0.4
  worstHours: Signal<number[]>;            // hours where success < 0.4 AND confidence >= 0.4
  hourlySuccessMap: Record<number, { rate: number; confidence: number; supportCount: number }>;

  // Category performance
  categorySuccessRates: Record<string, { rate: number; confidence: number; supportCount: number }>;
  weakCategories: Signal<string[]>;        // categories where rate < 0.5 and confidence >= 0.4

  // Carry-over / procrastination
  averageCarryOverCount: Signal<number>;   // rolling avg carries per task in last 30 days
  procrastinationRisk: Signal<number>;     // 0–1 derived from carry-over rate + stale task age

  // Load / burnout
  recentLoadMins: Signal<number>;          // total planned minutes over last 7 days
  avgDailyCompletionRate: Signal<number>;  // 7-day rolling, 0–1
  burnoutRisk: Signal<number>;             // 0–1 derived from load + completion drop trend

  // Data confidence
  totalLoggedTasks: number;
  dataAge: "insufficient" | "early" | "mature"; // <10 | 10-50 | >50 logs
  reliability: DataReliability;
  coldStartMode: boolean;

  // Behavioral Engine & Coach Upgrades
  topFrictionReasons?: Signal<{ cause: string; percentage: number; count: number }[]>;
  interventionCandidates?: SuggestionCandidate[];
  wesScore?: Signal<number>; // Weighted Execution Score (0 to 100)
  sssScore?: Signal<number>; // Schedule Stability Score (0 to 100)
  pgsScore?: Signal<number>; // Personal Growth Score (0 to 100)
}

export type PlanningStyle = "overestimate" | "underestimate" | "procrastinate" | "consistency" | "execution";

export interface OnboardingProfile {
  completed: boolean;
  sleep_start: string; // "HH:MM"
  sleep_end: string; // "HH:MM"
  energy_pattern: "morning" | "afternoon" | "night" | "inconsistent";
  goals: string[];
  struggles: string[];
  planning_style: PlanningStyle;
  role?: "student" | "working" | "freelancer" | "exam_prep";
}

export interface CalendarEvent {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  type: "routine_override" | "event";
  effects?: {
    suspendRoutineTypes?: ("sleep" | "class" | "meal" | "commute" | "custom")[];
  };
  confidence: 0.3 | 0.8 | 1.0;
  source: "user_direct" | "ai_inferred";
  capacity_impact?: string;
  capacity_reduction_pct?: number;
}

export interface RoutineProfile {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface RoutineBlock {
  id: string;
  title: string;
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  type: "sleep" | "class" | "meal" | "commute" | "custom";
  rigidity: "hard" | "soft";
  confidence?: 0.3 | 0.8 | 1.0;
  source?: "user_direct" | "ai_inferred";
  profileId?: string; // Links this routine block to a specific routine profile
}

export interface PendingQuestion {
  id: string;
  question: string;
  priority: "low" | "medium" | "high";
}

export interface AIActionExplanation {
  action: string;
  reason: string;
  confidence: "low" | "medium" | "high";
}

export interface ParsedCommand {
  action: "start_timer" | "stop_timer" | "add_task" | "delete_task" | "postpone_task" | "move_to_tomorrow" | "change_time" | "add_routine" | "add_event" | "done" | "skip";
  taskId?: string;
  taskTitle?: string;
  newTaskTitle?: string;
  newTaskDuration?: number;
  newTime?: string;
  mins?: number;
  daysOfWeek?: number[];
  endTime?: string;
  rigidity?: "hard" | "soft";
  routineType?: "sleep" | "class" | "meal" | "commute" | "custom";
  startDate?: string;
  endDate?: string;
  eventType?: "routine_override" | "event";
  suspendRoutineTypes?: ("sleep" | "class" | "meal" | "commute" | "custom")[];
  confidence?: 0.3 | 0.8 | 1.0;
  source?: "user_direct" | "ai_inferred";
}

export type CommandResolution =
  | { status: "resolved"; command: ParsedCommand }
  | {
      status: "uncertain";
      question: string;
      options?: { id: string; title: string }[];
      action?: ParsedCommand["action"];
      mins?: number;
      newTime?: string;
    }
  | { status: "none" };


export interface SuggestionCandidate {
  id: string;
  type: "move_gym" | "reduce_load" | "pad_durations" | "break_task" | "focus_slump";
  score: number;
  message: string;
  actionLabel: string;
  whyQuery: string; // opens chat with this query when "Why?" is clicked
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
  adaptationLogs?: DaySchedule["adaptationLogs"];
  knowledgeLayer?: KnowledgeInsight[];
}

export interface DaySchedule {
  items: ScheduledItem[];
  conflicts: FlexibleTask[];
  adaptationLogs?: {
    calibratedTasksCount: number;
    postponedOptionalTasks: string[];
    interventions: { taskId: string; taskTitle: string; type: "DECOMPOSE" | "SHIFT_TO_PEAK" | "SHRINK"; reason: string }[];
  };
  planningDecisions?: PlanningDecision[];
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

export interface ActiveTimer {
  taskId: string;
  startedAt: number; // Date.now() timestamp
  title: string;
}

export interface WeeklyEvalSnapshot {
  weekStart: string;       // "YYYY-MM-DD" Monday
  completionRate: number;  // 0–1
  carryOverRate: number;   // avg carry-overs per task
  planningAccuracy: number; // actual/planned ratio, closer to 1.0 = better
  streakDays: number;
  aiSuggestionAcceptanceRate: number; // 0–1 suggestion acceptance
  pgsScore?: number;       // 0–100 Personal Growth Score
}

export interface ProjectSubtask {
  id: string;
  title: string;
  duration_minutes: number;
  status: "pending" | "done" | "skipped";
  taskId?: string; // Scheduled task ID if linked
}

export interface ProjectPhase {
  id: string;
  title: string;
  order: number;
  subtasks: ProjectSubtask[];
}

export interface Project {
  id: string;
  title: string;
  deadline: string; // YYYY-MM-DD
  goal: string;
  phases: ProjectPhase[];
  totalHoursEstimate: number;
  progress: number; // calculated percentage

  // Sync and conflict resolution metadata
  field_timestamps: Record<string, string>;
  schema_version: number;
}

export type GenerativeUICardType = "schedule_proposal" | "study_roadmap" | "project_milestone" | "reflection";

export interface GenerativeUICard {
  type: GenerativeUICardType;
  payload: any;
}

export interface ChatMessage {
  sender: "ai" | "user";
  text: string;
  questionnaire?: any;
  questionnaireSubmitted?: boolean;
  durationConfirmation?: any;
  explanations?: AIActionExplanation[];
  generativeUI?: GenerativeUICard;
  parsedCommandCard?: {
    intent: string;
    taskId?: string;
    taskTitle?: string;
    parameters: any;
    isApplied?: boolean;
    isRejected?: boolean;
    options?: { id: string; title: string }[];
    confidence: number;
  };
}

export function createFieldTimestamps(obj: Record<string, any>): Record<string, string> {
  const now = new Date().toISOString();
  const ts: Record<string, string> = {};
  for (const key of Object.keys(obj)) {
    if (key !== "field_timestamps") {
      ts[key] = now;
    }
  }
  return ts;
}

export type KnowledgeCategory =
  | 'productivity'
  | 'focus'
  | 'energy'
  | 'planning'
  | 'health'
  | 'study'
  | 'habits';

export interface KnowledgeInsight {
  id: string;
  category: KnowledgeCategory;
  text: string;
  confidence: number; // 0..1
  evidence_count: number;
  last_verified: string; // ISO timestamp
  createdAt: string; // ISO timestamp
}

export interface PlanningDecision {
  action: 'move' | 'split' | 'delay' | 'promote' | 'protect' | 'expand' | 'shrink' | 'noop';
  taskId: string;
  reason: string;
  confidence: number; // 0..1
  alternative: string;
  impact: string;
  horizon: 'today' | 'week' | 'month' | 'strategic';
  source: 'rule' | 'behavior_model' | 'knowledge_layer' | 'user' | 'AI';
  executed?: boolean;
}

export interface SyncStatus {
  state: 'offline' | 'syncing' | 'synced' | 'error';
  pending: number;
  lastSync: string | null;
  lastSuccessfulSync: string | null;
  lastError?: string;
  authenticated: boolean;
}
