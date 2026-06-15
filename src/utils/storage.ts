import { FixedBlock, FlexibleTask, ScheduleProfile } from "../types";

const FIXED_BLOCKS_KEY = "schedule_planner_fixed_blocks";
const FLEXIBLE_TASKS_KEY = "schedule_planner_flexible_tasks";
const APP_SETTINGS_KEY = "schedule_planner_settings";
const ONBOARDING_KEY = "dayflow_onboarding_complete";
const PROFILES_KEY = "dayflow_routine_profiles";
const STORAGE_VERSION_KEY = "dayflow_storage_version";
const CURRENT_VERSION = "v3-clean"; // bump this to force-wipe old data

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
}
