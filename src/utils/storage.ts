import { FixedBlock, FlexibleTask, ScheduleProfile, UserGoal, Achievement, WeightEntry, ReflectionEvent, TaskExecutionLog } from "../types";
import { supabase } from "./supabase";
import { enqueueSync } from "./syncEngine";
import { generatePersonalOperatingManual } from "./mlEngine";

const FIXED_BLOCKS_KEY = "schedule_planner_fixed_blocks";
const FLEXIBLE_TASKS_KEY = "schedule_planner_flexible_tasks";
const APP_SETTINGS_KEY = "schedule_planner_settings";
const ONBOARDING_KEY = "dayflow_onboarding_complete";
const PROFILES_KEY = "dayflow_routine_profiles";
const GOALS_KEY = "dayflow_goals";
const ACHIEVEMENTS_KEY = "dayflow_achievements";
const STORAGE_VERSION_KEY = "dayflow_storage_version";
const WEIGHT_LOG_KEY = "dayflow_weight_log";
const CURRENT_VERSION = "v5-weight"; // bump this to force-wipe old data
const REFLECTION_EVENTS_KEY = "dayflow_reflection_events";
const TASK_EXECUTION_LOGS_KEY = "dayflow_task_execution_logs";

export interface AppSettings {
  day_start: string;
  day_end: string;
  themeMode: "light" | "dark" | "system";
}

const DEFAULT_SETTINGS: AppSettings = {
  day_start: "07:00",
  day_end: "23:00",
  themeMode: "light"
};

// Called once on app boot — if version doesn't match, wipe everything
function ensureCleanStorage() {
  if (localStorage.getItem(STORAGE_VERSION_KEY) !== CURRENT_VERSION) {
    localStorage.removeItem(FIXED_BLOCKS_KEY);
    localStorage.removeItem(FLEXIBLE_TASKS_KEY);
    localStorage.removeItem(APP_SETTINGS_KEY);
    localStorage.removeItem(ONBOARDING_KEY);
    localStorage.removeItem(PROFILES_KEY);
    localStorage.removeItem("dayflow_notif_dismissed");
    localStorage.removeItem(GOALS_KEY);
    localStorage.removeItem(ACHIEVEMENTS_KEY);
    localStorage.removeItem(WEIGHT_LOG_KEY);
    localStorage.removeItem(REFLECTION_EVENTS_KEY);
    localStorage.removeItem(TASK_EXECUTION_LOGS_KEY);
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
  }
}

// ────────────────────────────────────────────────────────────
// PROFILE SYNC HELPER
// Packages all localStorage profile-related fields and triggers sync
// ────────────────────────────────────────────────────────────
export async function syncProfile() {
  try {
    const session = (await supabase.auth.getSession()).data.session;
    if (!session) return;
    const userId = session.user.id;

    const profilePayload = {
      profile_name: localStorage.getItem("dayflow_profile_name") || "",
      profile_emoji: "😊",
      settings: loadSettings(),
      routines: {
        blocks: (() => {
          try { return JSON.parse(localStorage.getItem("dayflow_routine_blocks") || "[]"); } catch { return []; }
        })(),
        profiles: (() => {
          try { return JSON.parse(localStorage.getItem("dayflow_routine_profiles") || "[]"); } catch { return []; }
        })(),
        active_profile_id: localStorage.getItem("dayflow_active_routine_profile_id") || ""
      },
      fixed_blocks: loadFixedBlocks(),
      goals: loadGoals(),
      achievements: loadAchievements(),
      weight_log: loadWeightLog(),
      reflections: loadReflectionEvents(),
      knowledge_layer: (() => {
        try { return JSON.parse(localStorage.getItem("dayflow_knowledge_layer") || "[]"); } catch { return []; }
      })(),
      onboarding_complete: isOnboardingComplete(),
      schema_version: 1
    };

    enqueueSync('upsert', 'profiles', userId, profilePayload);
  } catch (err) {
    console.error("Failed to sync profile payload to cloud", err);
  }
}

// ────────────────────────────────────────────────────────────
// SAVE / LOAD UTILITIES
// ────────────────────────────────────────────────────────────

export function loadFixedBlocks(): FixedBlock[] {
  ensureCleanStorage();
  const data = localStorage.getItem(FIXED_BLOCKS_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveFixedBlocks(blocks: FixedBlock[]) {
  localStorage.setItem(FIXED_BLOCKS_KEY, JSON.stringify(blocks));
  syncProfile();
}

export function loadFlexibleTasks(): FlexibleTask[] {
  ensureCleanStorage();
  const data = localStorage.getItem(FLEXIBLE_TASKS_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

const pendingWrites: Record<string, () => void> = {};

if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    Object.values(pendingWrites).forEach((write) => write());
  });
}

function createDebouncedSaver<T>(key: string, delay: number = 500) {
  let timeoutId: any = null;
  let latestData: T | null = null;

  const flush = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (latestData !== null) {
      localStorage.setItem(key, JSON.stringify(latestData));
      latestData = null;
    }
    delete pendingWrites[key];
  };

  return (data: T) => {
    latestData = data;
    pendingWrites[key] = flush;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      flush();
    }, delay);
  };
}

const debouncedSaveFlexibleTasks = createDebouncedSaver<FlexibleTask[]>(FLEXIBLE_TASKS_KEY);
const debouncedSaveReflectionEvents = createDebouncedSaver<ReflectionEvent[]>(REFLECTION_EVENTS_KEY);
const debouncedSaveTaskExecutionLogs = createDebouncedSaver<TaskExecutionLog[]>(TASK_EXECUTION_LOGS_KEY);

export function saveFlexibleTasks(tasks: FlexibleTask[]) {
  const oldTasks = loadFlexibleTasks();
  debouncedSaveFlexibleTasks(tasks);

  try {
    const insights = generatePersonalOperatingManual(tasks);
    localStorage.setItem("dayflow_knowledge_layer", JSON.stringify(insights));
  } catch (err) {
    console.error("Failed to generate and save personal operating manual", err);
  }

  (async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      syncProfile();

      for (const t of tasks) {
        const oldT = oldTasks.find(o => o.id === t.id);
        if (!oldT || JSON.stringify(oldT) !== JSON.stringify(t)) {
          enqueueSync('upsert', 'tasks', t.id, t, t.field_timestamps || {});
        }
      }
      for (const o of oldTasks) {
        if (!tasks.some(t => t.id === o.id)) {
          enqueueSync('delete', 'tasks', o.id, o);
        }
      }
    } catch (err) {
      console.error("Error in saveFlexibleTasks sync", err);
    }
  })();
}

export function loadSettings(): AppSettings {
  const data = localStorage.getItem(APP_SETTINGS_KEY);
  if (!data) return DEFAULT_SETTINGS;
  try { return JSON.parse(data); } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
  syncProfile();
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, "true");
  syncProfile();
}

export function loadProfiles(): ScheduleProfile[] {
  const data = localStorage.getItem(PROFILES_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveProfiles(profiles: ScheduleProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
  syncProfile();
}

export function clearAllData() {
  localStorage.removeItem(FIXED_BLOCKS_KEY);
  localStorage.removeItem(FLEXIBLE_TASKS_KEY);
  localStorage.removeItem(APP_SETTINGS_KEY);
  localStorage.removeItem(ONBOARDING_KEY);
  localStorage.removeItem(PROFILES_KEY);
  localStorage.removeItem(STORAGE_VERSION_KEY);
  localStorage.removeItem(GOALS_KEY);
  localStorage.removeItem(ACHIEVEMENTS_KEY);
  localStorage.removeItem(WEIGHT_LOG_KEY);
  localStorage.removeItem(REFLECTION_EVENTS_KEY);
  localStorage.removeItem(TASK_EXECUTION_LOGS_KEY);
  localStorage.removeItem("dayflow_projects");
  localStorage.removeItem("dayflow_calendar_events");
}

export function loadGoals(): UserGoal[] {
  ensureCleanStorage();
  const data = localStorage.getItem(GOALS_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((g: any) => ({
      ...g,
      createdAt: g.createdAt || new Date().toISOString(),
      targetDate: g.targetDate || undefined,
      lastCheckInAt: g.lastCheckInAt || undefined,
      nextCheckInAt: g.nextCheckInAt || undefined,
      milestones: Array.isArray(g.milestones) ? g.milestones.map((m: any) => ({
        ...m,
        achievedAt: m.achievedAt || undefined
      })) : [],
      progressLog: Array.isArray(g.progressLog) ? g.progressLog.map((pl: any) => ({
        ...pl,
        date: pl.date || new Date().toLocaleDateString("sv")
      })) : []
    }));
  } catch (e) {
    console.error("Failed to parse goals", e);
    return [];
  }
}

export function saveGoals(goals: UserGoal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
  syncProfile();
}

export function loadAchievements(): Achievement[] {
  ensureCleanStorage();
  const data = localStorage.getItem(ACHIEVEMENTS_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((a: any) => ({
      ...a,
      earnedAt: a.earnedAt || new Date().toISOString()
    }));
  } catch (e) {
    console.error("Failed to parse achievements", e);
    return [];
  }
}

export function saveAchievements(achievements: Achievement[]) {
  localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  syncProfile();
}

export function loadWeightLog(): WeightEntry[] {
  const data = localStorage.getItem(WEIGHT_LOG_KEY);
  if (!data) return [];
  try {
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((e: any) => e.date && typeof e.weight === "number");
  } catch { return []; }
}

export function saveWeightLog(log: WeightEntry[]) {
  localStorage.setItem(WEIGHT_LOG_KEY, JSON.stringify(log));
  syncProfile();
}

export function loadReflectionEvents(): ReflectionEvent[] {
  const data = localStorage.getItem(REFLECTION_EVENTS_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveReflectionEvents(events: ReflectionEvent[]) {
  debouncedSaveReflectionEvents(events);
  syncProfile();
}

export function loadTaskExecutionLogs(): TaskExecutionLog[] {
  const data = localStorage.getItem(TASK_EXECUTION_LOGS_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveTaskExecutionLogs(logs: TaskExecutionLog[]) {
  const oldLogs = loadTaskExecutionLogs();
  debouncedSaveTaskExecutionLogs(logs);

  (async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      for (const log of logs) {
        const exists = oldLogs.some(o => o.taskId === log.taskId && o.date === log.date && o.completed === log.completed);
        if (!exists) {
          const tasks = loadFlexibleTasks();
          const task = tasks.find(t => t.id === log.taskId);

          const payload = {
            event_type: log.completed ? 'completed' : log.skipped ? 'skipped' : 'carry',
            task_id: log.taskId,
            task_category: task?.category || 'personal',
            task_priority: task?.importance || 'important',
            project_id: task?.projectId || null,
            planned_duration: log.plannedDuration,
            actual_duration: log.actualDuration,
            hour_of_day: log.scheduledStartHour !== undefined ? log.scheduledStartHour : null,
            day_of_week: log.date ? new Date(log.date).getDay() : new Date().getDay(),
            energy_level: task?.energy_level || 'medium',
            focus_score: 1.0,
            interruption_count: 0,
            ai_intervention: 'none',
            device_id: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            scheduler_version: 'v1.0',
            task_snapshot: task ? { ...task } : {},
            client_occurred_at: new Date().toISOString()
          };

          const logId = `blog-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          enqueueSync('upsert', 'behavior_logs', logId, payload);
        }
      }
    } catch (err) {
      console.error("Error in saveTaskExecutionLogs sync", err);
    }
  })();
}

// ────────────────────────────────────────────────────────────
// PROJECT AND CALENDAR SAVING HELPERS
// ────────────────────────────────────────────────────────────

export function loadProjects(): any[] {
  const data = localStorage.getItem("dayflow_projects");
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveProjects(projects: any[]) {
  const oldProjects = loadProjects();
  localStorage.setItem("dayflow_projects", JSON.stringify(projects));

  (async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      for (const p of projects) {
        const oldP = oldProjects.find(o => o.id === p.id);
        if (!oldP || JSON.stringify(oldP) !== JSON.stringify(p)) {
          enqueueSync('upsert', 'projects', p.id, p, p.field_timestamps || {});
        }
      }
      for (const o of oldProjects) {
        if (!projects.some(p => p.id === o.id)) {
          enqueueSync('delete', 'projects', o.id, o);
        }
      }
    } catch (err) {
      console.error("Error in saveProjects sync", err);
    }
  })();
}

export function loadCalendarEvents(): any[] {
  const data = localStorage.getItem("dayflow_calendar_events");
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveCalendarEvents(events: any[]) {
  const oldEvents = loadCalendarEvents();
  localStorage.setItem("dayflow_calendar_events", JSON.stringify(events));

  (async () => {
    try {
      const session = (await supabase.auth.getSession()).data.session;
      if (!session) return;

      for (const e of events) {
        const oldE = oldEvents.find(o => o.id === e.id);
        if (!oldE || JSON.stringify(oldE) !== JSON.stringify(e)) {
          enqueueSync('upsert', 'calendar_events', e.id, e);
        }
      }
      for (const o of oldEvents) {
        if (!events.some(e => e.id === o.id)) {
          enqueueSync('delete', 'calendar_events', o.id, o);
        }
      }
    } catch (err) {
      console.error("Error in saveCalendarEvents sync", err);
    }
  })();
}
