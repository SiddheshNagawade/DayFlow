import { FixedBlock, FlexibleTask, ScheduleProfile, UserGoal, Achievement } from "../types";

const FIXED_BLOCKS_KEY = "schedule_planner_fixed_blocks";
const FLEXIBLE_TASKS_KEY = "schedule_planner_flexible_tasks";
const APP_SETTINGS_KEY = "schedule_planner_settings";
const ONBOARDING_KEY = "dayflow_onboarding_complete";
const PROFILES_KEY = "dayflow_routine_profiles";
const GOALS_KEY = "dayflow_goals";
const ACHIEVEMENTS_KEY = "dayflow_achievements";
const STORAGE_VERSION_KEY = "dayflow_storage_version";
const CURRENT_VERSION = "v4-goals"; // bump this to force-wipe old data

export interface AppSettings {
  day_start: string;
  day_end: string;
}

const DEFAULT_SETTINGS: AppSettings = {
  day_start: "07:00",
  day_end: "23:00"
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
    localStorage.setItem(STORAGE_VERSION_KEY, CURRENT_VERSION);
  }
}

export function loadFixedBlocks(): FixedBlock[] {
  ensureCleanStorage();
  const data = localStorage.getItem(FIXED_BLOCKS_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveFixedBlocks(blocks: FixedBlock[]) {
  localStorage.setItem(FIXED_BLOCKS_KEY, JSON.stringify(blocks));
}

export function loadFlexibleTasks(): FlexibleTask[] {
  ensureCleanStorage();
  const data = localStorage.getItem(FLEXIBLE_TASKS_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveFlexibleTasks(tasks: FlexibleTask[]) {
  localStorage.setItem(FLEXIBLE_TASKS_KEY, JSON.stringify(tasks));
}

export function loadSettings(): AppSettings {
  const data = localStorage.getItem(APP_SETTINGS_KEY);
  if (!data) return DEFAULT_SETTINGS;
  try { return JSON.parse(data); } catch { return DEFAULT_SETTINGS; }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(APP_SETTINGS_KEY, JSON.stringify(settings));
}

export function isOnboardingComplete(): boolean {
  return localStorage.getItem(ONBOARDING_KEY) === "true";
}

export function markOnboardingComplete() {
  localStorage.setItem(ONBOARDING_KEY, "true");
}

export function loadProfiles(): ScheduleProfile[] {
  const data = localStorage.getItem(PROFILES_KEY);
  if (!data) return [];
  try { return JSON.parse(data); } catch { return []; }
}

export function saveProfiles(profiles: ScheduleProfile[]) {
  localStorage.setItem(PROFILES_KEY, JSON.stringify(profiles));
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
        date: pl.date || new Date().toISOString().split("T")[0]
      })) : []
    }));
  } catch (e) {
    console.error("Failed to parse goals", e);
    return [];
  }
}

export function saveGoals(goals: UserGoal[]) {
  localStorage.setItem(GOALS_KEY, JSON.stringify(goals));
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
}
