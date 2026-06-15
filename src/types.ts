export type RepeatType = "daily" | "weekdays" | "custom" | "none";
export type EnergyLevel = "high" | "medium" | "low";
export type TaskStatus = "backlog" | "scheduled" | "done";
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

export interface FlexibleTask {
  id: string;
  title: string;
  duration_minutes: number;
  deadline: string | null; // "YYYY-MM-DD" or null
  energy_level: EnergyLevel;
  status: TaskStatus;
  scheduled_date: string | null; // "YYYY-MM-DD" or null
  scheduled_start_time?: string; // slotted start e.g. "14:00"
  scheduled_end_time?: string;   // slotted end e.g. "16:00"

  // Manual override: user dragged/pinned this task to a specific start time
  pinned_start_time?: string;    // "HH:MM" - overrides auto-schedule for this day
  priority?: number;             // lower = scheduled earlier (set by drag order)

  // Telemetry fields for personalization
  actual_start_time?: string;      // "HH:MM" format
  actual_duration_minutes?: number; // actual elapsed minutes
  completed_at?: string;            // ISO timestamp when user checked it done
  
  // Advanced CCM Telemetry
  mood_before?: number;   // 1-10 scale
  mood_after?: number;    // 1-10 scale
  complexity?: number;    // 1-10 complexity
  interruptions?: number; // counter
  category?: "work" | "exercise" | "relax" | "personal";
}

export interface HourlyMetric {
  hour: number;
  completionRate: number;
  focusQuality: number; // Performance ratio: (actual - planned) / planned * -1
  consistency: number;  // Standard dev indicator
  label: "Peak" | "Peak+" | "Good" | "Declining" | "Slump" | "Lowest" | "Low" | "Recovery" | "Improving" | "Moderate" | "Dropping" | "Crashed" | "Dead";
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

export interface ScheduledItem {
  id: string;
  type: "fixed" | "flexible";
  title: string;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  energy_level?: EnergyLevel;
  locked: boolean;
  status: "done" | "scheduled" | "fixed";
  deadline?: string | null;
  pinned?: boolean; // true when user manually pinned the start time
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
