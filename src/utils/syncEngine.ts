import { supabase } from "./supabase";
import { SyncStatus } from "../types";

export interface SyncOperation {
  id: string; // Record ID (for tasks, projects, calendar_events, or profile userId)
  op: 'upsert' | 'delete';
  table: 'tasks' | 'projects' | 'calendar_events' | 'profiles' | 'behavior_logs';
  payload: any;
  field_timestamps: Record<string, string>;
  client_ts: string;
}

type SyncStatusListener = (status: SyncStatus) => void;
const listeners = new Set<SyncStatusListener>();
let currentStatus: SyncStatus = {
  state: 'synced',
  pending: 0,
  lastSync: localStorage.getItem("dayflow_last_sync_ts"),
  lastSuccessfulSync: localStorage.getItem("dayflow_last_successful_sync_ts"),
  authenticated: false
};

export function getSyncStatus(): SyncStatus {
  return { ...currentStatus };
}

export function subscribeToSyncStatus(listener: SyncStatusListener): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}

function updateStatus(newStatus: Partial<SyncStatus>) {
  let lastSucc = currentStatus.lastSuccessfulSync;
  if (newStatus.state === 'synced') {
    lastSucc = newStatus.lastSync || new Date().toISOString();
  }

  currentStatus = {
    ...currentStatus,
    ...newStatus,
    lastSuccessfulSync: lastSucc
  };

  if (currentStatus.lastSync) {
    localStorage.setItem("dayflow_last_sync_ts", currentStatus.lastSync);
  }
  if (currentStatus.lastSuccessfulSync) {
    localStorage.setItem("dayflow_last_successful_sync_ts", currentStatus.lastSuccessfulSync);
  }

  // Resolve authenticated state asynchronously from Supabase
  supabase.auth.getSession().then(({ data }) => {
    const isAuth = !!data.session;
    if (currentStatus.authenticated !== isAuth) {
      currentStatus.authenticated = isAuth;
    }
    listeners.forEach(l => l(currentStatus));
  }).catch(() => {
    listeners.forEach(l => l(currentStatus));
  });
}

// ────────────────────────────────────────────────────────────
// INDEXEDDB MANAGER FOR OFFLINE SYNC QUEUE
// ────────────────────────────────────────────────────────────
const DB_NAME = "dayflow_sync_db";
const STORE_NAME = "sync_queue";
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function addQueueOp(op: SyncOperation): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.put(op);
    tx.oncomplete = () => {
      updatePendingCount();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function getQueueOps(): Promise<SyncOperation[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function removeQueueOp(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      updatePendingCount();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

async function updatePendingCount() {
  try {
    const ops = await getQueueOps();
    updateStatus({ pending: ops.length });
  } catch (err) {
    console.error("Failed to update pending sync count", err);
  }
}

// ────────────────────────────────────────────────────────────
// CONFLICT RESOLUTION MERGE LOGIC
// ────────────────────────────────────────────────────────────
export function mergeRecord(local: any, remote: any): any {
  if (!local) return remote;
  if (!remote) return local;

  const merged = { ...remote, ...local };
  const localTimestamps = local.field_timestamps || {};
  const remoteTimestamps = remote.field_timestamps || {};

  const keys = Array.from(new Set([
    ...Object.keys(local),
    ...Object.keys(remote)
  ]));

  const mergedTimestamps: Record<string, string> = {};

  for (const key of keys) {
    if (key === "field_timestamps" || key === "id" || key === "user_id" || key === "schema_version" || key === "updated_at") {
      continue;
    }

    const localTime = localTimestamps[key] ? new Date(localTimestamps[key]).getTime() : -Infinity;
    const remoteTime = remoteTimestamps[key] ? new Date(remoteTimestamps[key]).getTime() : -Infinity;

    if (localTime >= remoteTime) {
      merged[key] = local[key];
      if (localTimestamps[key]) mergedTimestamps[key] = localTimestamps[key];
    } else {
      merged[key] = remote[key];
      if (remoteTimestamps[key]) mergedTimestamps[key] = remoteTimestamps[key];
    }
  }

  // Done terminal state override: once done, a task stays completed.
  if (local.status === 'done' || remote.status === 'done') {
    merged.status = 'done';
    merged.completed_at = local.completed_at || remote.completed_at || new Date().toISOString();
  }

  merged.field_timestamps = mergedTimestamps;
  return merged;
}

// ────────────────────────────────────────────────────────────
// QUEUE OPERATION ENQUEUER
// ────────────────────────────────────────────────────────────
export async function enqueueSync(
  op: 'upsert' | 'delete',
  table: 'tasks' | 'projects' | 'calendar_events' | 'profiles' | 'behavior_logs',
  id: string,
  payload: any,
  fieldTimestamps: Record<string, string> = {}
) {
  const client_ts = new Date().toISOString();
  const session = (await supabase.auth.getSession()).data.session;

  if (!session) {
    // Guest mode: do nothing
    return;
  }

  const syncOp: SyncOperation = {
    id: `${table}:${id}`,
    op,
    table,
    payload,
    field_timestamps: fieldTimestamps,
    client_ts
  };

  await addQueueOp(syncOp);
  
  if (navigator.onLine) {
    triggerReplay();
  } else {
    updateStatus({ state: 'offline' });
  }
}

// ────────────────────────────────────────────────────────────
// REPLAY QUEUE ENGINE
// ────────────────────────────────────────────────────────────
let isReplaying = false;

export async function triggerReplay(): Promise<void> {
  if (isReplaying) return;
  const session = (await supabase.auth.getSession()).data.session;
  if (!session) return;

  isReplaying = true;
  updateStatus({ state: 'syncing', lastError: undefined });

  try {
    const ops = await getQueueOps();
    if (ops.length === 0) {
      updateStatus({ state: 'synced', lastSync: new Date().toISOString() });
      isReplaying = false;
      return;
    }

    for (const op of ops) {
      const sessionData = (await supabase.auth.getSession()).data.session;
      if (!sessionData) {
        updateStatus({ state: 'error', lastError: "Session expired" });
        isReplaying = false;
        return;
      }
      const userId = sessionData.user.id;

      if (op.op === 'upsert') {
        if (op.table === 'behavior_logs') {
          // behavior logs are append-only. Insert directly, client_occurred_at is set.
          const { error } = await supabase.from('behavior_logs').insert({
            user_id: userId,
            ...op.payload
          });
          if (error) throw error;
        } else if (op.table === 'profiles') {
          // profiles single row keyed by id
          const { data: remoteProfile, error: getErr } = await supabase
            .from('profiles')
            .select()
            .eq('id', userId)
            .maybeSingle();

          if (getErr) throw getErr;

          const merged = mergeRecord(op.payload, remoteProfile);
          const { error: setErr } = await supabase
            .from('profiles')
            .upsert({
              id: userId,
              ...merged
            });
          if (setErr) throw setErr;
        } else {
          // tasks, projects, calendar_events are keyed by id + user_id
          if (op.table === 'tasks') {
            const { data: remoteRec, error: getErr } = await supabase
              .from('tasks')
              .select()
              .eq('id', op.payload.id)
              .eq('user_id', userId)
              .maybeSingle();

            if (getErr) throw getErr;

            const merged = mergeRecord(op.payload, remoteRec);
            const { error: setErr } = await supabase
              .from('tasks')
              .upsert({
                id: op.payload.id,
                user_id: userId,
                status: merged.status || 'backlog',
                scheduled_date: merged.scheduled_date || null,
                deadline: merged.deadline || null,
                priority: merged.priority || 'important',
                project_id: merged.projectId || merged.project_id || null,
                estimated_duration: merged.duration_minutes || merged.estimated_duration || 60,
                blocked_by: merged.blocked_by || [],
                blocks: merged.blocks || [],
                completed_at: merged.completed_at || null,
                data: merged,
                field_timestamps: merged.field_timestamps || {},
                schema_version: merged.schema_version || 1
              });
            if (setErr) throw setErr;
          } else if (op.table === 'projects') {
            const { data: remoteRec, error: getErr } = await supabase
              .from('projects')
              .select()
              .eq('id', op.payload.id)
              .eq('user_id', userId)
              .maybeSingle();

            if (getErr) throw getErr;

            const merged = mergeRecord(op.payload, remoteRec);
            const { error: setErr } = await supabase
              .from('projects')
              .upsert({
                id: op.payload.id,
                user_id: userId,
                goal_id: merged.goal || merged.goal_id || null,
                status: merged.status || 'active',
                target_completion_date: merged.deadline || merged.target_completion_date || null,
                data: merged,
                field_timestamps: merged.field_timestamps || {},
                schema_version: merged.schema_version || 1
              });
            if (setErr) throw setErr;
          } else if (op.table === 'calendar_events') {
            const { data: remoteRec, error: getErr } = await supabase
              .from('calendar_events')
              .select()
              .eq('id', op.payload.id)
              .eq('user_id', userId)
              .maybeSingle();

            if (getErr) throw getErr;

            const merged = mergeRecord(op.payload, remoteRec);
            const { error: setErr } = await supabase
              .from('calendar_events')
              .upsert({
                id: op.payload.id,
                user_id: userId,
                start_date: merged.startDate || merged.start_date,
                end_date: merged.endDate || merged.end_date,
                type: merged.type || 'other',
                capacity_impact: merged.capacity_impact || 'none',
                capacity_reduction_pct: merged.capacity_reduction_pct || 0,
                data: merged,
                schema_version: merged.schema_version || 1
              });
            if (setErr) throw setErr;
          }
        }
      } else if (op.op === 'delete') {
        // Soft delete logic: upsert record with deleted_at set.
        if (op.table === 'tasks') {
          const { error } = await supabase
            .from('tasks')
            .upsert({
              id: op.payload.id,
              user_id: userId,
              status: op.payload.status || 'backlog',
              priority: op.payload.priority || 'important',
              deleted_at: new Date().toISOString(),
              data: { ...op.payload, deleted_at: new Date().toISOString() },
              schema_version: op.payload.schema_version || 1
            });
          if (error) throw error;
        } else if (op.table === 'projects') {
          const { error } = await supabase
            .from('projects')
            .upsert({
              id: op.payload.id,
              user_id: userId,
              status: op.payload.status || 'active',
              deleted_at: new Date().toISOString(),
              data: { ...op.payload, deleted_at: new Date().toISOString() },
              schema_version: op.payload.schema_version || 1
            });
          if (error) throw error;
        } else if (op.table === 'calendar_events') {
          const { error } = await supabase
            .from('calendar_events')
            .upsert({
              id: op.payload.id,
              user_id: userId,
              start_date: op.payload.startDate || op.payload.start_date || new Date().toISOString().split('T')[0],
              end_date: op.payload.endDate || op.payload.end_date || new Date().toISOString().split('T')[0],
              deleted_at: new Date().toISOString(),
              data: { ...op.payload, deleted_at: new Date().toISOString() },
              schema_version: op.payload.schema_version || 1
            });
          if (error) throw error;
        }
      }

      await removeQueueOp(op.id);
    }

    updateStatus({ state: 'synced', lastSync: new Date().toISOString() });
  } catch (err: any) {
    console.error("Sync replay error", err);
    updateStatus({ state: 'error', lastError: err.message || "Unknown network error" });
  } finally {
    isReplaying = false;
  }
}

// ────────────────────────────────────────────────────────────
// CLOUD SYNC ENGINE PULL (PULL ALL FROM CLOUD)
// ────────────────────────────────────────────────────────────
export async function pullCloudData(userId: string): Promise<{
  profile: any;
  tasks: any[];
  projects: any[];
  calendar_events: any[];
} | null> {
  try {
    const [profileRes, tasksRes, projectsRes, calendarRes] = await Promise.all([
      supabase.from('profiles').select().eq('id', userId).maybeSingle(),
      supabase.from('tasks').select().eq('user_id', userId).is('deleted_at', null),
      supabase.from('projects').select().eq('user_id', userId).is('deleted_at', null),
      supabase.from('calendar_events').select().eq('user_id', userId).is('deleted_at', null)
    ]);

    if (profileRes.error) throw profileRes.error;
    if (tasksRes.error) throw tasksRes.error;
    if (projectsRes.error) throw projectsRes.error;
    if (calendarRes.error) throw calendarRes.error;

    return {
      profile: profileRes.data || null,
      tasks: (tasksRes.data || []).map(r => ({ ...(r.data as any), id: r.id })),
      projects: (projectsRes.data || []).map(r => ({ ...(r.data as any), id: r.id })),
      calendar_events: (calendarRes.data || []).map(r => ({ ...(r.data as any), id: r.id }))
    };
  } catch (err) {
    console.error("Failed to pull cloud data", err);
    return null;
  }
}

// ────────────────────────────────────────────────────────────
// GUEST MIGRATION ENGINE (PULL -> MERGE -> PUSH)
// ────────────────────────────────────────────────────────────
export async function migrateGuestData(userId: string): Promise<void> {
  console.log("Starting guest data migration pull-merge-push sequence...");

  const cloud = await pullCloudData(userId);
  if (!cloud) {
    console.warn("Could not retrieve cloud state; skipping migration to avoid data loss.");
    return;
  }

  // 1. Load guest data from localStorage keys
  const localTasks = (() => {
    try {
      return JSON.parse(localStorage.getItem("schedule_planner_flexible_tasks") || "[]");
    } catch { return []; }
  })();

  const localProjects = (() => {
    try {
      return JSON.parse(localStorage.getItem("dayflow_projects") || "[]");
    } catch { return []; }
  })();

  const localCalendar = (() => {
    try {
      return JSON.parse(localStorage.getItem("dayflow_calendar_events") || "[]");
    } catch { return []; }
  })();

  const localProfileData = {
    profile_name: localStorage.getItem("dayflow_profile_name") || "",
    profile_emoji: "😊",
    settings: (() => {
      try {
        return JSON.parse(localStorage.getItem("schedule_planner_settings") || "{}");
      } catch { return {}; }
    })(),
    routines: {
      blocks: (() => {
        try {
          return JSON.parse(localStorage.getItem("dayflow_routine_blocks") || "[]");
        } catch { return []; }
      })(),
      profiles: (() => {
        try {
          return JSON.parse(localStorage.getItem("dayflow_routine_profiles") || "[]");
        } catch { return []; }
      })(),
      active_profile_id: localStorage.getItem("dayflow_active_routine_profile_id") || ""
    },
    fixed_blocks: (() => {
      try {
        return JSON.parse(localStorage.getItem("schedule_planner_fixed_blocks") || "[]");
      } catch { return []; }
    })(),
    goals: (() => {
      try {
        return JSON.parse(localStorage.getItem("dayflow_goals") || "[]");
      } catch { return []; }
    })(),
    achievements: (() => {
      try {
        return JSON.parse(localStorage.getItem("dayflow_achievements") || "[]");
      } catch { return []; }
    })(),
    weight_log: (() => {
      try {
        return JSON.parse(localStorage.getItem("dayflow_weight_log") || "[]");
      } catch { return []; }
    })(),
    reflections: (() => {
      try {
        return JSON.parse(localStorage.getItem("dayflow_reflection_events") || "[]");
      } catch { return []; }
    })(),
    knowledge_layer: (() => {
      try {
        return JSON.parse(localStorage.getItem("dayflow_knowledge_layer") || "[]");
      } catch { return []; }
    })(),
    onboarding_complete: localStorage.getItem("dayflow_onboarding_complete") === "true"
  };

  // 2. Merge Tasks
  const mergedTasks: any[] = [];
  const taskMap = new Map<string, any>();
  
  // Load cloud first
  cloud.tasks.forEach(t => taskMap.set(t.id, t));
  // Merge guest
  localTasks.forEach((guestTask: any) => {
    const existing = taskMap.get(guestTask.id);
    if (existing) {
      taskMap.set(guestTask.id, mergeRecord(guestTask, existing));
    } else {
      taskMap.set(guestTask.id, guestTask);
    }
  });
  taskMap.forEach(v => mergedTasks.push(v));

  // 3. Merge Projects
  const mergedProjects: any[] = [];
  const projMap = new Map<string, any>();
  cloud.projects.forEach(p => projMap.set(p.id, p));
  localProjects.forEach((guestProj: any) => {
    const existing = projMap.get(guestProj.id);
    if (existing) {
      projMap.set(guestProj.id, mergeRecord(guestProj, existing));
    } else {
      projMap.set(guestProj.id, guestProj);
    }
  });
  projMap.forEach(v => mergedProjects.push(v));

  // 4. Merge Calendar Events
  const mergedCal: any[] = [];
  const calMap = new Map<string, any>();
  cloud.calendar_events.forEach(c => calMap.set(c.id, c));
  localCalendar.forEach((guestCal: any) => {
    const existing = calMap.get(guestCal.id);
    if (existing) {
      calMap.set(guestCal.id, mergeRecord(guestCal, existing));
    } else {
      calMap.set(guestCal.id, guestCal);
    }
  });
  calMap.forEach(v => mergedCal.push(v));

  // 5. Merge Profiles
  const mergedProfile = mergeRecord(localProfileData, cloud.profile);

  // 6. Push merged data back to Supabase
  try {
    updateStatus({ state: 'syncing' });

    // Upsert Profile
    const { error: profErr } = await supabase.from('profiles').upsert({
      id: userId,
      profile_name: mergedProfile.profile_name,
      profile_emoji: mergedProfile.profile_emoji || "😊",
      settings: mergedProfile.settings,
      routines: mergedProfile.routines,
      fixed_blocks: mergedProfile.fixed_blocks,
      goals: mergedProfile.goals,
      life_visions: mergedProfile.life_visions || [],
      achievements: mergedProfile.achievements,
      weight_log: mergedProfile.weight_log,
      reflections: mergedProfile.reflections,
      knowledge_layer: mergedProfile.knowledge_layer,
      onboarding_complete: mergedProfile.onboarding_complete,
      schema_version: 1
    });
    if (profErr) throw profErr;

    // Upsert Tasks
    for (const t of mergedTasks) {
      const { error } = await supabase.from('tasks').upsert({
        id: t.id,
        user_id: userId,
        status: t.status || 'backlog',
        scheduled_date: t.scheduled_date,
        deadline: t.deadline,
        priority: t.priority || 'important',
        project_id: t.project_id,
        data: t,
        field_timestamps: t.field_timestamps || {},
        schema_version: t.schema_version || 1
      });
      if (error) throw error;
    }

    // Upsert Projects
    for (const p of mergedProjects) {
      const { error } = await supabase.from('projects').upsert({
        id: p.id,
        user_id: userId,
        status: p.status || 'active',
        target_completion_date: p.target_completion_date,
        data: p,
        field_timestamps: p.field_timestamps || {},
        schema_version: p.schema_version || 1
      });
      if (error) throw error;
    }

    // Upsert Calendar
    for (const c of mergedCal) {
      const { error } = await supabase.from('calendar_events').upsert({
        id: c.id,
        user_id: userId,
        start_date: c.start_date,
        end_date: c.end_date,
        type: c.type || 'other',
        capacity_impact: c.capacity_impact || 'none',
        capacity_reduction_pct: c.capacity_reduction_pct || 0,
        data: c,
        schema_version: c.schema_version || 1
      });
      if (error) throw error;
    }

    // Write final merged data back to localStorage caches
    localStorage.setItem("schedule_planner_flexible_tasks", JSON.stringify(mergedTasks));
    localStorage.setItem("dayflow_projects", JSON.stringify(mergedProjects));
    localStorage.setItem("dayflow_calendar_events", JSON.stringify(mergedCal));
    localStorage.setItem("dayflow_profile_name", mergedProfile.profile_name);
    localStorage.setItem("schedule_planner_settings", JSON.stringify(mergedProfile.settings));
    localStorage.setItem("dayflow_routine_blocks", JSON.stringify(mergedProfile.routines.blocks || []));
    localStorage.setItem("dayflow_routine_profiles", JSON.stringify(mergedProfile.routines.profiles || []));
    localStorage.setItem("dayflow_active_routine_profile_id", mergedProfile.routines.active_profile_id || "");
    localStorage.setItem("schedule_planner_fixed_blocks", JSON.stringify(mergedProfile.fixed_blocks));
    localStorage.setItem("dayflow_goals", JSON.stringify(mergedProfile.goals));
    localStorage.setItem("dayflow_achievements", JSON.stringify(mergedProfile.achievements));
    localStorage.setItem("dayflow_weight_log", JSON.stringify(mergedProfile.weight_log));
    localStorage.setItem("dayflow_reflection_events", JSON.stringify(mergedProfile.reflections));
    localStorage.setItem("dayflow_onboarding_complete", mergedProfile.onboarding_complete ? "true" : "false");

    updateStatus({ state: 'synced', lastSync: new Date().toISOString() });
    console.log("Guest data migration completed successfully!");
  } catch (err: any) {
    console.error("Migration write error", err);
    updateStatus({ state: 'error', lastError: `Migration failed: ${err.message}` });
  }
}

// ────────────────────────────────────────────────────────────
// NETWORK STATUS WATCHER
// ────────────────────────────────────────────────────────────
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    triggerReplay();
  });
  window.addEventListener("offline", () => {
    updateStatus({ state: 'offline' });
  });
}
