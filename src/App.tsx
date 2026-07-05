import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";

import { RoutinesTab } from "./components/tabs/RoutinesTab";

import { BacklogTab } from "./components/tabs/BacklogTab";

import { CalendarTab } from "./components/tabs/CalendarTab";

import { TodayTab } from "./components/tabs/TodayTab";
import { FlexibleTaskModal } from "./components/modals/FlexibleTaskModal";
import { SettingsModal } from "./components/modals/SettingsModal";
import { FixedBlockModal } from "./components/modals/FixedBlockModal";
import { OnboardingWizard } from "./components/modals/OnboardingWizard";
import { EodCheckinModal } from "./components/modals/EodCheckinModal";
import { ProfileModal } from "./components/modals/ProfileModal";
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
  Filter,
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
 FolderKanban,
 RotateCcw
} from "lucide-react";
import { FixedBlock,  FlexibleTask, ScheduledItem, EnergyLevel, RepeatType, ScheduleProfile, ProfileBlock, ProfileAppliesTo, UserGoal, Achievement, GoalCategory, GoalStatus, GoalMilestone, WeightEntry, ClassificationResult, TaskCategory, TaskRigidity, TaskRecoverability, TaskDependencyChain, TaskProgressType, DeadlinePressure, TaskConsequence, TaskMeta, ConsequenceIntent, ReflectionEvent, TaskExecutionLog, UBMInsights, AIProposal, ActiveTimer, WeeklyEvalSnapshot, PlanningStyle, FrictionReason, OnboardingProfile, RoutineBlock, PendingQuestion, ParsedCommand, CommandResolution, AIActionExplanation, CalendarEvent, Project, ProjectPhase, ProjectSubtask, createFieldTimestamps } from "./types";
import { KnowledgeInsight, KnowledgeCategory } from "./types";
import { generateSchedule, calculateFuturePredictions, timeToMinutes, minutesToTime, isFixedBlockActiveOnDate, simulateDelayCost, getActionRisk } from "./utils/scheduler";
import { loadFixedBlocks, saveFixedBlocks, loadFlexibleTasks, saveFlexibleTasks, loadSettings, saveSettings, isOnboardingComplete, markOnboardingComplete, loadProfiles, saveProfiles, clearAllData, loadGoals, saveGoals, loadAchievements, saveAchievements, loadWeightLog, saveWeightLog, loadReflectionEvents, saveReflectionEvents, loadTaskExecutionLogs, saveTaskExecutionLogs, loadProjects, saveProjects, loadCalendarEvents, saveCalendarEvents } from "./utils/storage";
import { generateMockMLData, getTaskCategory, detectHighDelayPatterns, calculateAdvancedCalibration } from "./utils/mlEngine";
import { updateGoalProgressFromTask, predictGoalCompletion, generateCheckInPrompt, getGoalsDueForCheckIn, suggestGoalsFromTaskHistory, generateMilestones, checkForGlobalAchievements } from "./utils/goalEngine";
import { computeBehaviorSignals } from "./utils/patternEngine";
import { trainBehavioralModel, TrainedModelWeights, predictDurationMultiplier, predictCompletion } from "./utils/BehaviorModel";
import { buildAICompactContext, buildCopilotScheduleSummary } from "./utils/aiContextBuilder";
import { checkAndGenerateWeeklySnapshot, loadEvalHistory, getImprovementSummary, logProposedSuggestions, logAcceptedSuggestions } from "./utils/evaluationEngine";
import { supabase } from "./utils/supabase";
import { pullCloudData, migrateGuestData, triggerReplay } from "./utils/syncEngine";
import { AuthBanner } from "./components/AuthBanner";


interface Toast {
 id: string;
 message: string;
 type: "success" | "info" | "warning" | "upgrade";
 showUndo?: boolean;
 duration?: number;
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
 <div className="relative w-full flex items-center">
 <textarea 
 value={localVal}
 onChange={(e) => setLocalVal(e.target.value)}
 onKeyDown={handleKeyDown}
 placeholder={placeholder}
 rows={2}
 className="w-full pl-4 pr-14 py-3 text-xs focus:outline-none resize-none font-sans font-medium bg-[var(--bg-card)] border border-[var(--border-strong)] dark:gemini-input-capsule dark:text-[var(--text-primary)]"
 disabled={disabled}
 />
 {localVal.trim().length > 0 && !disabled && !isProcessing && (
 <button
 onClick={() => {
 onSend(localVal);
 setLocalVal("");
 }}
 className="absolute right-2 p-1.5 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors shadow-sm z-10 cursor-pointer flex items-center justify-center h-8 w-8"
 title="Send Message"
 >
 <Send className="w-3.5 h-3.5" />
 </button>
 )}
 </div>
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
 <span className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{activeTimer.title}</span>
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


const DEFAULT_REGULAR_BLOCKS: RoutineBlock[] = [
  {
    id: "sleep-regular-morning",
    title: "💤 Sleep (Morning)",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "00:00",
    endTime: "07:00",
    type: "sleep",
    rigidity: "hard",
    profileId: "regular"
  },
  {
    id: "sleep-regular-night",
    title: "💤 Sleep (Night)",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "23:00",
    endTime: "23:59",
    type: "sleep",
    rigidity: "hard",
    profileId: "regular"
  },
  {
    id: "meal-regular-breakfast",
    title: "🍳 Breakfast",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "08:00",
    endTime: "08:30",
    type: "meal",
    rigidity: "hard",
    profileId: "regular"
  },
  {
    id: "meal-regular-lunch",
    title: "🥪 Lunch",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "13:00",
    endTime: "13:45",
    type: "meal",
    rigidity: "hard",
    profileId: "regular"
  },
  {
    id: "meal-regular-dinner",
    title: "🍽️ Dinner",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "20:00",
    endTime: "20:45",
    type: "meal",
    rigidity: "hard",
    profileId: "regular"
  },
  {
    id: "work-regular-study",
    title: "🎓 Work / Study Session",
    daysOfWeek: [1, 2, 3, 4, 5],
    startTime: "09:00",
    endTime: "17:00",
    type: "class",
    rigidity: "soft",
    profileId: "regular"
  }
];

const DEFAULT_VACATION_BLOCKS: RoutineBlock[] = [
  {
    id: "sleep-vacation-morning",
    title: "💤 Sleep (Morning)",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "00:00",
    endTime: "09:30",
    type: "sleep",
    rigidity: "hard",
    profileId: "vacation"
  },
  {
    id: "sleep-vacation-night",
    title: "💤 Sleep (Night)",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "23:30",
    endTime: "23:59",
    type: "sleep",
    rigidity: "hard",
    profileId: "vacation"
  },
  {
    id: "relax-vacation-leisure",
    title: "🌴 Vacation Chill & Relax",
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startTime: "11:00",
    endTime: "18:00",
    type: "custom",
    rigidity: "soft",
    profileId: "vacation"
  }
];

const ToastItem: React.FC<{ 
  toast: Toast; 
  onDismiss: (id: string) => void;
  onUndo?: () => void;
}> = ({ toast, onDismiss, onUndo }) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const swipeTouchStart = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeTouchStart.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - swipeTouchStart.current;
    setSwipeX(dx);
  };

  const handleTouchEnd = () => {
    if (Math.abs(swipeX) > 80) {
      setSwipeX(swipeX > 0 ? 400 : -400);
      setIsExiting(true);
      setTimeout(() => {
        onDismiss(toast.id);
      }, 150);
    } else {
      setSwipeX(0);
    }
  };

  useEffect(() => {
    const duration = toast.duration || (toast.showUndo ? 6000 : 3500);
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onDismiss(toast.id);
      }, 250);
    }, duration);
    return () => clearTimeout(timer);
  }, [toast, onDismiss]);

  const animationClass = isExiting ? "animate-toast-retract" : "animate-toast-drop";

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        transform: `translateX(${swipeX}px)`,
        transition: swipeX === 0 ? "transform 0.2s ease" : "none",
        opacity: Math.max(0, 1 - Math.abs(swipeX) / 250),
      }}
      className={`px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold text-white ${animationClass} flex items-start justify-between gap-3 pointer-events-auto select-none cursor-grab active:cursor-grabbing w-full ${ 
        toast.type === "warning" 
          ? "bg-amber-600 border-amber-500" 
          : toast.type === "info" 
          ? "bg-indigo-600 border-indigo-500" 
          : toast.type === "upgrade"
          ? "bg-gradient-to-r from-violet-600 to-emerald-600 border-transparent shadow-2xl"
          : "bg-emerald-600 border-emerald-500" 
      }`}
    >
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span className="whitespace-pre-wrap flex-1 text-left select-all">{toast.message}</span>
      </div>
      {toast.showUndo && onUndo && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUndo();
          }}
          className="px-2 py-1 text-[10px] font-bold bg-white text-indigo-700 rounded-md hover:bg-neutral-100 transition-colors cursor-pointer shrink-0 mt-0.5"
        >
          Undo
        </button>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<any>(null);

  // 1. Core Application State
  const [fixedBlocks, setFixedBlocks] = useState<FixedBlock[]>([]);
 const [flexibleTasks, setFlexibleTasks] = useState<FlexibleTask[]>([]);
 const [projects, setProjects] = useState<Project[]>([]);
 const [appSettings, setAppSettings] = useState<import("./utils/storage").AppSettings>({
    day_start: "07:00",
    day_end: "23:00",
    themeMode: "light"
  });

  // Routine Profiles
  const [routineProfiles, setRoutineProfiles] = useState<import("./types").RoutineProfile[]>(() => {
    try {
      const stored = localStorage.getItem("dayflow_routine_profiles");
      if (stored) return JSON.parse(stored);
    } catch (_) {}
    return [
      { id: "regular", name: "Regular", isDefault: true },
      { id: "vacation", name: "Vacation", isDefault: true }
    ];
  });

  const [activeRoutineProfileId, setActiveRoutineProfileId] = useState<string>(() => {
    try {
      const stored = localStorage.getItem("dayflow_active_routine_profile_id");
      if (stored) return stored;
    } catch (_) {}
    return "regular";
  });

  useEffect(() => {
    localStorage.setItem("dayflow_routine_profiles", JSON.stringify(routineProfiles));
  }, [routineProfiles]);

  useEffect(() => {
    localStorage.setItem("dayflow_active_routine_profile_id", activeRoutineProfileId);
  }, [activeRoutineProfileId]);

  // Auto-rollover previous days' incomplete tasks to backlog
  useEffect(() => {
    if (flexibleTasks.length === 0) return;
    
    const pastStale = flexibleTasks.filter(t => 
      t.scheduled_date !== null && 
      t.scheduled_date < TODAY && 
      t.status !== "done" && 
      t.status !== "skipped" && 
      t.status !== "expired"
    );

    if (pastStale.length > 0) {
      const nowStr = new Date().toISOString();
      const updated = flexibleTasks.map(t => {
        const isStale = pastStale.some(st => st.id === t.id);
        if (isStale) {
          return {
            ...t,
            status: "backlog" as const,
            scheduled_date: null,
            pinned_start_time: undefined,
            original_scheduled_date: t.scheduled_date || undefined,
            backlog_shifted_at: nowStr
          };
        }
        return t;
      });
      handleUpdateFlexible(updated);
      showToast(`${pastStale.length} incomplete tasks shifted to backlog.`, "info");
    }
  }, [flexibleTasks, TODAY]);

  // Behavioral Intervention States
  const [isAligning, setIsAligning] = useState(false);
  const [selectedFrictionReason, setSelectedFrictionReason] = useState<string | null>(null);
  const [selectedFrictionTags, setSelectedFrictionTags] = useState<string[]>([]);
  const [frictionNotes, setFrictionNotes] = useState<string>("");
  const [decompositionMethod, setDecompositionMethod] = useState<"ai" | "manual">("ai");
  const [manualSubtasks, setManualSubtasks] = useState<string[]>([]);
  const [manualSubtaskDurations, setManualSubtaskDurations] = useState<number[]>([]);
  const [aiDecomposePreview, setAiDecomposePreview] = useState<Array<{ title: string; duration: number }>>([]);  const [isDecomposingLoading, setIsDecomposingLoading] = useState<string | null>(null);

  const executePostponeWithFrictionDetails = (
    taskId: string,
    actionType: "delay_15" | "delay_30" | "tomorrow",
    reason: FrictionReason,
    notes: string,
    start_time?: string
  ) => {
    const newReflection: ReflectionEvent = {
      id: "refl_" + Math.random().toString(36).substr(2, 9),
      date: TODAY,
      completionRate: 0,
      type: "failure",
      cause: reason,
      notes: notes || `Friction logged for postpone (${actionType})`
    };
    
    const updatedReflections = [...reflectionEvents, newReflection];
    setReflectionEvents(updatedReflections);
    saveReflectionEvents(updatedReflections);

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
          last_friction_reason: reason
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
          last_friction_reason: reason
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
        focus_quality_effort: "struggled" as const,
        delay_count: (t.delay_count || 0) + 1,
        last_friction_reason: reason,
        original_scheduled_date: t.original_scheduled_date || t.scheduled_date || selectedDate
      } : t);
      handleUpdateFlexible(updated);
      showToast("Task moved to tomorrow. Friction logged.", "info");
    }
  };

  const executeInlineDecomposition = (
    taskId: string,
    subtasks: Array<{ title: string; duration: number }>
  ) => {
    const task = flexibleTasks.find(t => t.id === taskId);
    if (!task) return;
    const dateKey = task.scheduled_date || TODAY;
    const tasksWithoutOriginal = flexibleTasks.filter(t => t.id !== taskId);
    const newSubtasks: FlexibleTask[] = subtasks.map((st, sIdx) => {
      const subtask: FlexibleTask = {
        id: `sub_${taskId}_${sIdx}_${Math.random().toString(36).substr(2, 5)}`,
        title: st.title,
        duration_minutes: st.duration,
        deadline: task.deadline,
        energy_level: task.energy_level,
        status: "scheduled" as const,
        scheduled_date: dateKey,
        task_nature: "one_time" as const,
        carry_over_count: 0,
        delay_count: 0,
        focus_quality_effort: "good",
        importance: task.importance || "important",
        task_flexibility: task.task_flexibility || "movable",
        schema_version: 1,
        field_timestamps: {}
      };
      subtask.field_timestamps = createFieldTimestamps(subtask);
      return subtask;
    });
    const finalTasks = [...tasksWithoutOriginal, ...newSubtasks];
    handleUpdateFlexible(finalTasks);
    showToast("Task successfully split into actionable steps!", "success");
    triggerHaptic(45);
  };  const handleAlignTimeline = () => {
    const nowMins = currentTimeMins;
    const dayEndMins = timeToMinutes(appSettings.day_end);
    
    const todayIncompleteTasks = flexibleTasks.filter(t => {
      if (t.scheduled_date !== TODAY) return false;
      if (t.status === "done" || t.status === "skipped" || t.status === "expired") return false;
      
      // Preserve active tasks and tasks that ended less than 3 hours ago (180 mins)
      if (t.scheduled_start_time) {
        const startMins = timeToMinutes(t.scheduled_start_time);
        const endMins = startMins + (t.predictedDuration || t.duration_minutes);
        
        if (nowMins >= startMins && nowMins <= endMins) return false;
        if (nowMins > endMins && (nowMins - endMins < 180)) return false;
      }
      return true;
    });

    if (todayIncompleteTasks.length === 0) {
      showToast("All tasks are already up-to-date!", "success");
      return;
    }

    setIsAligning(true);
    triggerHaptic(45);

    setTimeout(() => {
      const sortedTasks = [...todayIncompleteTasks].sort((a, b) => {
        const startA = timeToMinutes(a.scheduled_start_time || "00:00");
        const startB = timeToMinutes(b.scheduled_start_time || "00:00");
        return startA - startB;
      });

      let availableMins = dayEndMins - nowMins;
      if (availableMins <= 0) {
        const updated = flexibleTasks.map(t => {
          if (t.scheduled_date === TODAY && t.status !== "done" && t.status !== "skipped") {
            return {
              ...t,
              scheduled_date: null,
              pinned_start_time: undefined,
              status: "backlog" as const
            };
          }
          return t;
        });
        handleUpdateFlexible(updated);
        showToast("Day end reached. Remaining tasks moved to backlog.", "info");
        setIsAligning(false);
        return;
      }

      let totalDuration = sortedTasks.reduce((sum, t) => sum + t.duration_minutes, 0);

      let shrinkRatio = 1.0;
      if (totalDuration > availableMins) {
        shrinkRatio = Math.max(0.7, availableMins / totalDuration);
      }

      let currentStartMins = nowMins;
      const updatedTasks = flexibleTasks.map(t => {
        const isTaskToReschedule = sortedTasks.some(st => st.id === t.id);
        if (!isTaskToReschedule) return t;

        const originalDuration = t.duration_minutes;
        const newDuration = Math.round(originalDuration * shrinkRatio);

        if (currentStartMins + newDuration <= dayEndMins) {
          const startTimeStr = minutesToTime(currentStartMins);
          currentStartMins += newDuration;
          return {
            ...t,
            duration_minutes: newDuration,
            pinned_start_time: startTimeStr,
            focus_quality_effort: "okay" as const
          };
        } else {
          return {
            ...t,
            scheduled_date: null,
            pinned_start_time: undefined,
            status: "backlog" as const
          };
        }
      });

      handleUpdateFlexible(updatedTasks);
      showToast(`Rescheduled as per remaining time today. Compacted by ${Math.round((1 - shrinkRatio) * 100)}%.`, "success");
      setIsAligning(false);
    }, 600);
  };

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

  // Machine Learning behavior model weights in-memory state
  const [mlModel, setMlModel] = useState<TrainedModelWeights>({
    classifierWeights: [],
    regressorWeights: [],
    meanAbsoluteError: 0,
    modelActive: false,
    trainingSamples: 0
  });
  const lastTrainedCompletionsRef = useRef<number>(-1);

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

  // Backlog Grooming recommendation state for backlog duplicates
  const [groomingRecommendation, setGroomingRecommendation] = useState<{ title: string; count: number; ids: string[] } | null>(null);

  useEffect(() => {
    if (flexibleTasks.length === 0) return;
    if (sessionStorage.getItem("dayflow_backlog_groomed") === "true") return;

    // Find active backlog tasks
    const backlog = flexibleTasks.filter(t => t.status === "backlog" && (!t.scheduled_date || t.scheduled_date < TODAY));
    
    // Group by title
    const titleGroups: Record<string, FlexibleTask[]> = {};
    backlog.forEach(t => {
      const normTitle = t.title.trim().toLowerCase();
      if (!normTitle) return;
      if (!titleGroups[normTitle]) titleGroups[normTitle] = [];
      titleGroups[normTitle].push(t);
    });

    // Find groups with duplicates
    for (const [title, group] of Object.entries(titleGroups)) {
      if (group.length > 1) {
        // Sort by creation or ID
        const sorted = [...group].sort((a, b) => {
          const timeA = a.createdDate ? new Date(a.createdDate).getTime() : 0;
          const timeB = b.createdDate ? new Date(b.createdDate).getTime() : 0;
          return timeB - timeA; // newer first
        });

        // The first one is the active one; the rest are duplicates to drop
        const toDrop = sorted.slice(1);
        const ids = toDrop.map(t => t.id);

        setGroomingRecommendation({
          title: sorted[0].title,
          count: ids.length,
          ids
        });
        break; // Only show one popup suggestion per session at a time
      }
    }
  }, [flexibleTasks, TODAY]);

  // Train/retrain BehaviorModel in-memory
  useEffect(() => {
    const completedTasks = flexibleTasks.filter(t => t.status === "done");
    const numCompleted = completedTasks.length;

    const shouldRetrain = 
      lastTrainedCompletionsRef.current === -1 || 
      (numCompleted >= 50 && lastTrainedCompletionsRef.current < 50) || 
      Math.abs(numCompleted - lastTrainedCompletionsRef.current) >= 10;

    if (shouldRetrain) {
      const trained = trainBehavioralModel(flexibleTasks, behaviorSignals);
      setMlModel(trained);
      lastTrainedCompletionsRef.current = numCompleted;

      // Toast alert when first activated
      if (trained.modelActive && !localStorage.getItem("dayflow_ml_notified_active")) {
        localStorage.setItem("dayflow_ml_notified_active", "true");
        showToast("🎉 Your personal duration model is ready! Predictions now adapt to your history.", "success");
      }
    }
  }, [flexibleTasks, behaviorSignals]);

  // Cloud Sync Sign-In Reminder Prompt State
  const [showSyncPromptModal, setShowSyncPromptModal] = useState(false);

  useEffect(() => {
    // If user is already signed in, do not prompt
    if (user) return;

    // Set first launch date if missing
    let firstLaunch = localStorage.getItem("dayflow_first_launch_date");
    if (!firstLaunch) {
      firstLaunch = TODAY;
      localStorage.setItem("dayflow_first_launch_date", TODAY);
    }

    const usageDays = Math.round(
      (new Date(TODAY + "T00:00:00").getTime() - new Date(firstLaunch + "T00:00:00").getTime()) /
        86400000
    );

    if (usageDays >= 2) {
      const lastPrompt = localStorage.getItem("dayflow_last_sync_prompt_date");
      if (!lastPrompt) {
        // Never prompted before, and 2 days have passed
        setShowSyncPromptModal(true);
      } else {
        // Alt days prompt check (2 days since last prompt)
        const daysSincePrompt = Math.round(
          (new Date(TODAY + "T00:00:00").getTime() - new Date(lastPrompt + "T00:00:00").getTime()) /
            86400000
        );
        if (daysSincePrompt >= 2) {
          setShowSyncPromptModal(true);
        }
      }
    }
  }, [user, TODAY]);

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
 scheduled_date: t.scheduled_date || selectedDate,
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
    if (path === "/settings") {
      setShowSettingsModal(true);
    }
  }, []);

 useEffect(() => {
    const handlePopState = () => {
      const p = window.location.pathname;
      setCurrentPath(p === "/" || p === "" ? "/today" : p);
      if (p === "/settings") {
        setShowSettingsModal(true);
      }
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

 const activeTab = useMemo(() => {
    if (currentPath === "/settings") return "routines";
    if (currentPath === "/backlog") return "backlog";
    if (currentPath === "/calendar") return "calendar";
    if (currentPath.startsWith("/routines")) return "routines";
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
      if (currentPath === "/settings") return "Settings";
      return "Profile";
 case "today":
 default:
 return "Today";
 }
 }, [activeTab, currentPath]);  const profileViewTab = useMemo(() => {
     if (currentPath === "/goals" || currentPath === "/routines/goals") return "goals";
     if (currentPath === "/projects" || currentPath === "/routines/projects") return "projects";
     if (currentPath === "/routines/editor" || currentPath === "/routines/list") return "routines";
     return "insights";
   }, [currentPath]);

 const changeTabWithHaptic = (tab: "today" | "backlog" | "calendar" | "routines") => {
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
 const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
 
 // Active Date selection
 const [selectedDate, setSelectedDate] = useState(TODAY);
 
 // Toasts state
 const [toasts, setToasts] = useState<Toast[]>([]);
 const [lastDeletedTask, setLastDeletedTask] = useState<FlexibleTask | null>(null);

 // Search/Filters in Backlog
 const [backlogFilter, setBacklogFilter] = useState<"all" | "deadline" | "anytime" | "done">("all");
 const [backlogTab, setBacklogTab] = useState<"carried" | "dropped">("carried");
 
 // Notification States
 const [showNotificationPrompt, setShowNotificationPrompt] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(() => {
    return typeof window !== "undefined" && window.location.pathname === "/settings";
  });
 const notificationTimeouts = useRef<number[]>([]);

 // Sound feedback ref
 const [speechSupported, setSpeechSupported] = useState(false);
 const [isListening, setIsListening] = useState(false);

 // Bottom Sheets control
 const [activeBottomSheet, setRawActiveBottomSheet] = useState<"fixed" | "flexible" | "emergency" | "assistant" | "profile" | "eodreview" | "goal" | null>(null);
 const [todaySubTab, setTodaySubTab] = useState<"timeline" | "copilot">("timeline");  const setActiveBottomSheet = (sheet: "fixed" | "flexible" | "emergency" | "assistant" | "profile" | "eodreview" | "goal" | null) => {
    setRawActiveBottomSheet(sheet);
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
 description: "",
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

 // Increased timeouts to 5 minutes to prevent the frontend from prematurely aborting slow AI requests
 const getTimeoutForOperation = (opType: "copilot" | "project_wizard" | "consequence" | "classification"): number => {
 switch (opType) {
 case "copilot": return 300000;
 case "project_wizard": return 300000;
 case "consequence": return 300000;
 case "classification": return 300000;
 }
 return 300000;
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
      deadline: null,
      schema_version: 1,
      field_timestamps: {}
    };
    newTask.field_timestamps = createFieldTimestamps(newTask);
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
 const [profileName, setProfileName] = useState(() => {
 const savedName = localStorage.getItem("dayflow_profile_name");
 if (savedName) return savedName;
 
 // Auto-generate a guest name for frictionless onboarding
 const newGuestName = `Guest${Math.floor(Math.random() * 10000)}`;
 localStorage.setItem("dayflow_profile_name", newGuestName);
 return newGuestName;
 });
 const [profileAge, setProfileAge] = useState(() => localStorage.getItem("dayflow_profile_age") || "");
 const [profileBio, setProfileBio] = useState(() => localStorage.getItem("dayflow_profile_bio") || "");
 const [profileEmoji, setProfileEmoji] = useState(() => localStorage.getItem("dayflow_profile_emoji") || "👤");


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
    { label: "profile", icon: BookMarked, value: "routines" as const }
  ], []);

  const [showBacklogFilterDropdown, setShowBacklogFilterDropdown] = useState(false);

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
 breakMins?: number; // set for break actions
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
 checkAndGenerateWeeklySnapshot(flexibleTasks, taskExecutionLogs);
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

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error", err);
      showToast("Failed to sign out.", "warning");
    }
  };

  const syncCloudAndState = async (userId: string) => {
    const cloudData = await pullCloudData(userId);
    if (cloudData) {
      if (cloudData.tasks && cloudData.tasks.length > 0) {
        setFlexibleTasks(cloudData.tasks);
        localStorage.setItem("schedule_planner_flexible_tasks", JSON.stringify(cloudData.tasks));
      }
      if (cloudData.projects && cloudData.projects.length > 0) {
        setProjects(cloudData.projects);
        localStorage.setItem("dayflow_projects", JSON.stringify(cloudData.projects));
      }
      if (cloudData.calendar_events && cloudData.calendar_events.length > 0) {
        setCalendarEvents(cloudData.calendar_events);
        localStorage.setItem("dayflow_calendar_events", JSON.stringify(cloudData.calendar_events));
      }
      if (cloudData.profile) {
        const prof = cloudData.profile;
        if (prof.fixed_blocks) {
          setFixedBlocks(prof.fixed_blocks);
          localStorage.setItem("schedule_planner_fixed_blocks", JSON.stringify(prof.fixed_blocks));
        }
        if (prof.goals) {
          setGoals(prof.goals);
          localStorage.setItem("dayflow_goals", JSON.stringify(prof.goals));
        }
        if (prof.achievements) {
          setAchievements(prof.achievements);
          localStorage.setItem("dayflow_achievements", JSON.stringify(prof.achievements));
        }
        if (prof.weight_log) {
          setWeightLog(prof.weight_log);
          localStorage.setItem("dayflow_weight_log", JSON.stringify(prof.weight_log));
        }
        if (prof.reflections) {
          setReflectionEvents(prof.reflections);
          localStorage.setItem("dayflow_reflection_events", JSON.stringify(prof.reflections));
        }
        if (prof.settings && Object.keys(prof.settings).length > 0) {
          setAppSettings(prof.settings);
          localStorage.setItem("schedule_planner_settings", JSON.stringify(prof.settings));
        }
        if (prof.routines?.profiles) {
          setRoutineProfiles(prof.routines.profiles);
          localStorage.setItem("dayflow_routine_profiles", JSON.stringify(prof.routines.profiles));
        }
        if (prof.routines?.blocks) {
          setRoutineBlocks(prof.routines.blocks);
          localStorage.setItem("dayflow_routine_blocks", JSON.stringify(prof.routines.blocks));
        }
        if (prof.routines?.active_profile_id) {
          setActiveRoutineProfileId(prof.routines.active_profile_id);
          localStorage.setItem("dayflow_active_routine_profile_id", prof.routines.active_profile_id);
        }
        if (prof.profile_name) {
          localStorage.setItem("dayflow_profile_name", prof.profile_name);
        }
      }
      triggerReplay();
    }
  };

  // Supabase Auth and Data Sync Listener
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      if (currentUser) {
        setUser(currentUser);
        syncCloudAndState(currentUser.id);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const u = session.user;
        setUser(u);
        
        const migrated = localStorage.getItem("dayflow_migrated_to_cloud") === "true";
        if (!migrated) {
          showToast("Syncing your local data to the cloud...", "info");
          await migrateGuestData(u.id);
          localStorage.setItem("dayflow_migrated_to_cloud", "true");
        }
        await syncCloudAndState(u.id);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
        localStorage.removeItem("dayflow_migrated_to_cloud");
        // Reload guest mode data from localStorage
        setFixedBlocks(loadFixedBlocks());
        setFlexibleTasks(loadFlexibleTasks());
        setProjects(loadProjects());
        setAppSettings(loadSettings());
        setProfiles(loadProfiles());
        setGoals(loadGoals());
        setAchievements(loadAchievements());
        setWeightLog(loadWeightLog());
        setReflectionEvents(loadReflectionEvents());
        setTaskExecutionLogs(loadTaskExecutionLogs());
        setCalendarEvents(loadCalendarEvents());
        showToast("Switched to local Guest Mode.", "info");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


 // Theme Mode Effect
 useEffect(() => {
 const applyTheme = () => {
 const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
 if (appSettings.themeMode === 'dark' || (appSettings.themeMode === 'system' && isSystemDark)) {
 document.documentElement.classList.add('dark');
 } else {
 document.documentElement.classList.remove('dark');
 }
 };
 
 applyTheme();
 
 const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
 const handleChange = () => {
 if (appSettings.themeMode === 'system') applyTheme();
 };
 mediaQuery.addEventListener('change', handleChange);
 
 return () => mediaQuery.removeEventListener('change', handleChange);
 }, [appSettings.themeMode]);

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
 const activeRoutines = routineBlocks.filter(r => { const pId = r.profileId || 'regular'; return pId === activeRoutineProfileId && !suspendedTypes.has(r.type); });

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
    const backlogTaskCount = flexibleTasks.filter(
      t => t.scheduled_date === null && t.status !== "done"
    ).length;

    let knowledgeLayer: KnowledgeInsight[] = [];
    try {
      const stored = localStorage.getItem("dayflow_knowledge_layer");
      if (stored) knowledgeLayer = JSON.parse(stored);
    } catch (_) {}

    const compactContext = buildAICompactContext(
      triggerType,
      behaviorSignals,
      staleTasks,
      daySchedule.items,
      goals,
      triggerType === "drift" ? driftedTask : null,
      backlogTaskCount,
      userNotesVal,
      daySchedule.adaptationLogs,
      knowledgeLayer
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
 };  const yesterdayCompletionRate = useMemo(() => {
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = getLocalTodayStr(yesterdayDate);
  const yesterdayTasks = flexibleTasks.filter(t => t.scheduled_date === yesterdayStr);
  if (yesterdayTasks.length === 0) return null;
  const completedCount = yesterdayTasks.filter(t => t.status === "done").length;
  return completedCount / yesterdayTasks.length;
  }, [flexibleTasks]);

  // Toast Dispatcher Helper
  const showToast = (
    message: string, 
    type: "success" | "info" | "warning" | "upgrade" = "success", 
    showUndo: boolean = false,
    duration?: number
  ) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type, showUndo, duration }]);
  };

 // Calculate Streak count
 const completedStreak = useMemo(() => {
 let streak = 0;
 const todayRef = new Date(selectedDate);  for (let i = 0; i < 30; i++) {
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

  const dailyCoachReflection = useMemo(() => {
    const avoidedTask = [...flexibleTasks]
      .filter(t => t.scheduled_date === TODAY && t.status !== "done")
      .sort((a, b) => {
        const scoreA = (a.delay_count || 0) + (a.carry_over_count || 0);
        const scoreB = (b.delay_count || 0) + (b.carry_over_count || 0);
        return scoreB - scoreA;
      })[0];

    const avoidanceScore = avoidedTask ? (avoidedTask.delay_count || 0) + (avoidedTask.carry_over_count || 0) : 0;
    const highStakesKeywords = ["portfolio", "study", "exam", "gym", "workout", "thesis", "code", "project", "presentation", "report", "apply", "job"];
    const hasHighStakesTask = avoidedTask && highStakesKeywords.some(kw => avoidedTask.title.toLowerCase().includes(kw));

    if (avoidedTask && avoidanceScore >= 2) {
      if (hasHighStakesTask) {
        return `You are selectively avoiding high-stakes evaluative work like "${avoidedTask.title}". It's completely natural to feel anxiety about starting, but breaking it into tiny pieces will help you rebuild momentum today.`;
      } else {
        return `We noticed you've postponed "${avoidedTask.title}" several times. When resistance is high, the best strategy is to shrink the task scope to a ridiculously easy first step.`;
      }
    }    if (yesterdayCompletionRate !== null && yesterdayCompletionRate >= 0.8) {
      return `You had an exceptional flow yesterday, completing ${Math.round((yesterdayCompletionRate ?? 0) * 100)}% of your commitments. Let's keep that momentum alive today—focus on the single most important task first.`;
    } else if (yesterdayCompletionRate !== null && yesterdayCompletionRate > 0 && yesterdayCompletionRate < 0.5) {
      return `Yesterday felt a bit heavy with a ${Math.round((yesterdayCompletionRate ?? 0) * 100)}% completion rate. Today is a fresh page. Let's pick one clear task and protect your energy to get it done.`;
    }

    if (completedStreak >= 3) {
      return `You are on a strong consistency streak of ${completedStreak} days. Your brain is building powerful execution habits. Protect this streak today by starting your routines early.`;
    }

    return "Your day is a blank slate. Focus on steady, gentle progress over perfection. Small, consistent actions compound into massive shifts.";
  }, [flexibleTasks, yesterdayCompletionRate, completedStreak]);

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

 const backlogCount = flexibleTasks.filter(t => t.status === "backlog" && (!t.scheduled_date || t.scheduled_date < TODAY)).length;

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
  const base = calculateAdvancedCalibration(flexibleTasks);
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
     const alreadyShown = localStorage.getItem("dayflow_phase2_toast_shown");
     if (!alreadyShown) {
       showToast(
         "DayFlow just got smarter ✨\n15 tasks completed! Your schedule now uses your personal patterns — peak focus time, real durations, and optimal gaps.",
         "upgrade",
         false,
         8000
       );
       localStorage.setItem("dayflow_phase2_toast_shown", "true");
     }
   }
   prevPhaseRef.current = calibrationProfile.phase;
 }, [calibrationProfile.phase]);

 const delayPatterns = useMemo(() => {
 return detectHighDelayPatterns(flexibleTasks);
 }, [flexibleTasks]);  const daySchedule = useMemo(() => {
    const suspendedTypes = getSuspendedRoutineTypesForDate(selectedDate);
    const activeRoutines = routineBlocks.filter(r => { const pId = r.profileId || 'regular'; return pId === activeRoutineProfileId && !suspendedTypes.has(r.type); });

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
      activeRoutines,
      mlModel,
      behaviorSignals,
      goals,
      calendarEvents,
      currentTimeMins
    );
  }, [selectedDate, effectiveFixedBlocks, flexibleTasks, appSettings, calibrationProfile, delayPatterns, routineBlocks, getSuspendedRoutineTypesForDate, mlModel, behaviorSignals, goals, calendarEvents, currentTimeMins]);

  useEffect(() => {
    if (!daySchedule || !daySchedule.items || daySchedule.items.length === 0) return;

    let needsUpdate = false;
    const updated = flexibleTasks.map(t => {
      const scheduledItem = daySchedule.items.find(item => item.id === t.id && item.type === "flexible" && item.status !== "shifted");
      if (scheduledItem) {
        if (t.scheduled_start_time !== scheduledItem.start_time || t.scheduled_end_time !== scheduledItem.end_time) {
          needsUpdate = true;
          return {
            ...t,
            scheduled_start_time: scheduledItem.start_time,
            scheduled_end_time: scheduledItem.end_time
          };
        }
      }
      return t;
    });

    if (needsUpdate) {
      handleUpdateFlexible(updated);
    }
  }, [daySchedule, flexibleTasks]);

  const hasUnverifiedPastTasks = useMemo(() => {
    if (selectedDate !== TODAY) return false;
    return daySchedule.items.some(item => {
      if (item.type === "fixed" || item.status === "done" || item.status === "skipped" || item.status === "expired") return false;
      const endMins = timeToMinutes(item.end_time);
      const nowMins = currentTimeMins;
      return endMins < nowMins;
    });
  }, [daySchedule.items, currentTimeMins, selectedDate]);

  const needsReschedulePulse = useMemo(() => {
    if (selectedDate !== TODAY) return false;
    return daySchedule.items.some(item => {
      if (item.type === "fixed" || item.status === "done" || item.status === "skipped" || item.status === "expired") return false;
      const endMins = timeToMinutes(item.end_time);
      const nowMins = currentTimeMins;
      return nowMins - endMins >= 180; // 3 hours = 180 minutes
    });
  }, [daySchedule.items, currentTimeMins, selectedDate]);

 const hasMeaningfulContext = useMemo(() => {
 const hasActiveSchedule = daySchedule?.items?.length > 0;
 const hasStaleTasks = staleTasks.length > 0;
 const hasSnapshots = (evalHistory?.length || 0) > 0 || (reflectionEvents?.length || 0) > 0 || (weightLog?.length || 0) > 0;
 return hasActiveSchedule || hasStaleTasks || hasSnapshots;
 }, [daySchedule?.items, staleTasks, evalHistory, reflectionEvents, weightLog]);

 const showReflectionCard = useMemo(() => {
  // Never show if already reflected today
  if (lastReflectedDate === TODAY) return false;
  // Never show if no historical context at all
  if (!hasMeaningfulContext) return false;
  // Never show if no completion rate to reason about
  if (yesterdayCompletionRate === null) return false;
  // Only show if user actually has stale/incomplete tasks — not for successful days
  const hasAnyStaleTasks = staleTasks.length > 0;
  return hasAnyStaleTasks;
  }, [staleTasks, lastReflectedDate, TODAY, hasMeaningfulContext, yesterdayCompletionRate]);

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
   const formatCause = (cause: string) => {
    if (!cause) return "General reflection";
    return cause
      .replace(/_/g, " ")
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  const frictionReport = useMemo(() => {
    const frictionCounts = {
      low_energy: 0,
      distraction: 0,
      resistance: 0,
      emotional_resistance: 0,
      unclear_task: 0,
      external_interrupt: 0,
      unknown: 0
    };
    
    let totalCount = 0;
    reflectionEvents.forEach(evt => {
      if (evt.type === "failure" && evt.cause && evt.cause in frictionCounts) {
        frictionCounts[evt.cause]++;
        totalCount++;
      }
    });

    if (totalCount === 0) return null;

    const categoriesMap = {
      low_energy: "⚡ Fatigue / Low Energy",
      distraction: "🔊 Distraction / Phone",
      resistance: "🐢 Resistance to Start",
      emotional_resistance: "😨 Emotional Resistance",
      unclear_task: "❓ Unclear / Vague Task",
      external_interrupt: "🚨 External Interruption",
      unknown: "🤷 Other Friction"
    };

    const sortedReport = Object.keys(frictionCounts)
      .map(key => ({
        key,
        label: categoriesMap[key] || key,
        count: frictionCounts[key],
        percentage: Math.round((frictionCounts[key] / totalCount) * 100)
      }))
      .filter(item => item.count > 0)
      .sort((a, b) => b.count - a.count);

    let insight = "Keep tracking to identify your main execution friction patterns.";
    if (sortedReport.length > 0) {
      const top = sortedReport[0].key;
      if (top === "unclear_task") {
        insight = "Your biggest blocker is unclear task definition. Try breaking tasks down into tiny, actionable micro-steps before scheduling.";
      } else if (top === "low_energy") {
        insight = "Fatigue is holding you back. Protect your energy levels, take breaks, and schedule demanding tasks during peak alert hours.";
      } else if (top === "distraction") {
        insight = "Distractions are breaking your flow. Use site blockers, put your phone in another room, or set up a quiet workspace.";
      } else if (top === "resistance") {
        insight = "Friction is highest before starting. Use the 5-minute rule: commit to working on the task for just 5 minutes.";
      } else if (top === "emotional_resistance") {
        insight = "Fear of failing or perfectionism is causing avoidance. Focus on progress over perfection, and permit yourself to write messy drafts.";
      } else if (top === "external_interrupt") {
        insight = "External meetings/events interrupt you. Reserve blocks of 'Do Not Disturb' time on your calendar to protect deep work.";
      }
    }

    return {
      total: totalCount,
      report: sortedReport,
      insight
    };
  }, [reflectionEvents]);

  const recentReflections = useMemo(() => {
    return [...reflectionEvents]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 7);
  }, [reflectionEvents]);

  const sortedWeightLog = useMemo(() => {
    return [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  }, [weightLog]);

  const sparklinePoints = useMemo(() => {
    const last8 = sortedWeightLog.slice(-8);
    if (last8.length < 2) return "";
    const weights = last8.map(w => w.weight);
    const min = Math.min(...weights);
    const max = Math.max(...weights);
    const range = max - min || 1;
    const width = 100;
    const height = 30;
    const points = last8.map((w, idx) => {
      const x = (idx / (last8.length - 1)) * width;
      const y = height - ((w.weight - min) / range) * height;
      return x + "," + y;
    }).join(" ");
    return points;
  }, [sortedWeightLog]);

const futurePredictions = useMemo(() => {
 return calculateFuturePredictions(
 flexibleTasks,
 effectiveFixedBlocks,
 appSettings.day_start,
 appSettings.day_end,
 selectedDate,
 calibrationProfile,
 mlModel,
 behaviorSignals,
 calendarEvents
 );
 }, [flexibleTasks, effectiveFixedBlocks, appSettings, selectedDate, calibrationProfile, mlModel, behaviorSignals, calendarEvents]);


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

 // Prevent scheduling to a past date
 const defaultDate = (defaultToToday && selectedDate >= TODAY) ? selectedDate : TODAY;

 setFlexibleForm({
 title: "",
 description: "",
 duration_minutes: 45,
 hasDeadline: false,
 deadline: "",
 energy_level: "medium",
 scheduled_date: defaultDate,
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
 description: task.description || "",
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

 // Strict validation against past dates
 if (scheduledDateVal && scheduledDateVal < TODAY) {
 showToast("Cannot schedule a task for a past date!", "warning");
 return;
 }
 if (deadlineVal && deadlineVal < TODAY) {
 showToast("Cannot set a deadline in the past!", "warning");
 return;
 }

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
 description: flexibleForm.description.trim() || undefined,
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
      description: flexibleForm.description.trim() || undefined,
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
      blocks: flexibleForm.blocks,
      schema_version: 1,
      field_timestamps: {}
    };
    newTask.field_timestamps = createFieldTimestamps(newTask);
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
 const lowerText = messageText?.toLowerCase() || "";
 const isMicroCoach = lowerText.startsWith("why") || lowerText.includes("motivate") || lowerText.includes("tired") || lowerText.includes("procrastinat") || lowerText.includes("friction");
 const isChat = lowerText.startsWith("how") || lowerText.startsWith("what") || lowerText.startsWith("hello") || lowerText.startsWith("hi ") || lowerText === "hi" || lowerText.includes("advice");

 let endpoint = "/api/adjust-schedule";
 let bodyPayload: any = {
 userText: messageText || "Please analyze the attached image and extract schedule/workout/weight info.",
 today: selectedDate,
 };

 if (imagePayload) {
 bodyPayload.image = imagePayload;
 }

 if (isMicroCoach) {
 endpoint = "/api/micro-coach";
 bodyPayload.behaviorSignals = "User is currently in Today tab looking for guidance.";
 } else if (isChat) {
 endpoint = "/api/chat";
 // V3.1: Pass only compact schedule summary for chat
 const { scheduleSummary } = buildCopilotScheduleSummary(
 daySchedule.items,
 flexibleTasks.filter(t => t.status !== "done"),
 selectedDate
 );
 bodyPayload.scheduleSummary = scheduleSummary;
 } else {
 // V3.1: Replace raw task arrays with compact text summaries
 const { scheduleSummary, pendingSummary } = buildCopilotScheduleSummary(
 daySchedule.items,
 flexibleTasks.filter(t => t.status !== "done"),
 selectedDate
 );
 bodyPayload.scheduleSummary = scheduleSummary;
 bodyPayload.pendingSummary = pendingSummary;
 bodyPayload.routineBlocksSummary = routineBlocks.map(r => `${r.title} (${r.startTime}-${r.endTime}, rigidity: ${r.rigidity}, type: ${r.type}, days: ${r.daysOfWeek.join(",")})`).join("\n");
 bodyPayload.calendarEventsSummary = calendarEvents.map(e => `${e.title} (${e.startDate} to ${e.endDate}, type: ${e.type})`).join("\n");
 }

 const response = await fetch(endpoint, {
 method: "POST",
 headers: { "Content-Type": "application/json" },
 signal: controller.signal,
 body: JSON.stringify(bodyPayload)
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

 if (endpoint === "/api/chat" && response.body) {
 const reader = response.body.getReader();
 const decoder = new TextDecoder("utf-8");
 let aiText = "";
 
 setChatHistory(prev => [...prev, { sender: "ai", text: "..." }]);
 
 while (true) {
 const { done, value } = await reader.read();
 if (done) break;
 const chunk = decoder.decode(value, { stream: true });
 
 const lines = chunk.split("\n");
 for (const line of lines) {
 if (line.startsWith("data: ")) {
 const dataStr = line.slice(6).trim();
 if (dataStr === "[DONE]") continue;
 try {
 const parsed = JSON.parse(dataStr);
 if (parsed.text) {
 aiText += parsed.text;
 setChatHistory(prev => {
 const newHistory = [...prev];
 newHistory[newHistory.length - 1].text = aiText;
 return newHistory;
 });
 }
 } catch (e) {}
 }
 }
 }
 data = { changes: [], message: aiText };
 } else {
 data = await response.json();
 }

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
 
 // Format the answers beautifully for the chat UI
 const formattedAnswers = msg.questionnaire.questions.map((q: any) => {
 if (q.type === "task_list") {
 const tasks = Array.isArray(answers[q.id]) ? answers[q.id] : [];
 const taskStr = tasks.map((t: any) => ` - ${t.title || "Untitled"} (${t.duration || 0}m)`).join("\n");
 return `• ${q.label}\n${taskStr}`;
 }
 return `• ${q.label}\n ↳ ${answers[q.id]}`;
 }).join("\n\n");
 
 if (msg.questionnaire.type === "workout_plan") {
 const workoutType = answers["workout_type"];
 const weightGoal = answers["weight_goal"];
 const goalDetails = answers["goal_details"] || "General fitness";
 const frequency = answers["frequency"];
 userSummary = `Here are my preferences:\n\n${formattedAnswers}`;
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
 userSummary = `Here are my preferences:\n\n${formattedAnswers}`;
 promptForAI = `Generate a customized project plan. User options:
- Type: ${projectType}
- Sessions: ${sessionCount}
- Duration: ${sessionDuration}
- Goal: ${goalName}

Please create the specified number of backlog tasks representing the project phases with the given duration. Include descriptions detailing steps. Also create a tracking goal.`;
 } else {
 // General online AI clarification answers compilation
 userSummary = `Here are my answers:\n\n${formattedAnswers}`;
 const plainAnswersList = msg.questionnaire.questions.map((q: any) => {
 if (q.type === "task_list") {
 const tasks = Array.isArray(answers[q.id]) ? answers[q.id] : [];
 return `- ${q.label}:\n${tasks.map((t: any) => ` * ${t.title || "Untitled"} (Duration: ${t.duration || 0} mins)`).join("\n")}`;
 }
 return `- ${q.label}: ${answers[q.id]}`;
 }).join("\n");
 promptForAI = `Here are my answers to your clarification questions:\n${plainAnswersList}\n\nPlease formulate the detailed schedule adjustment plan now based on this context.`;
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
 // General questionnaire fallback if AI times out
 offlineData = {
 changes: [],
 message: "The DayFlow AI service took too long to process your answers and timed out (high server load). I've saved your project parameters locally. Please try adding specific tasks manually using the 'add task' command for now!"
 };
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
 , schema_version: 1, field_timestamps: {} };
      newFlexTask.field_timestamps = createFieldTimestamps(newFlexTask);
      
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
 , schema_version: 1, field_timestamps: {} };
  newProject.field_timestamps = createFieldTimestamps(newProject);

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
 , schema_version: 1, field_timestamps: {} };
  newTask.field_timestamps = createFieldTimestamps(newTask);
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

  if (action === "mark_important") {
    const isFlexTask = taskId?.startsWith("flex-") || taskId?.startsWith("ai-flex-");
    if (isFlexTask) {
      updatedFlexible = updatedFlexible.map(t => t.id === taskId ? {
        ...t,
        importance: change.importance || "important"
      } : t);
      appliedCount++;
    }
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


 // Schedule task directly to specific date from backlog
 const handleScheduleTaskToday = (task: FlexibleTask, dateStr?: string) => {
    const targetDate = dateStr || selectedDate;
    const updated = flexibleTasks.map((t) => 
      t.id === task.id ? { 
        ...t, 
        scheduled_date: targetDate, 
        status: "scheduled" as const,
        field_timestamps: { ...t?.field_timestamps, scheduled_date: new Date().toISOString(), status: new Date().toISOString() }
      } : t
    );
    handleUpdateFlexible(updated);
    
    const tomorrowStr = new Date(Date.now() + 86400000).toLocaleDateString("en-CA");
    const formattedDate = targetDate === TODAY ? "today" : targetDate === tomorrowStr ? "tomorrow" : targetDate;
    showToast(`"${task.title}" scheduled for ${formattedDate}!`, "success");
    triggerHaptic(40);
    
    if (targetDate === TODAY) {
      setSelectedDate(TODAY);
      navigate("/today");
    } else {
      setSelectedDate(targetDate);
      navigate("/calendar");
    }
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
 setAppSettings({ day_start: "07:00", day_end: "23:00", themeMode: "light" });
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
 total_achievements: achievements.length,
 total_projects: projects.length,
 total_calendar_events: calendarEvents.length
 },
 flexible_tasks: flexibleTasks,
 fixed_blocks: fixedBlocks,
 routine_profiles: profiles,
 goals: goals,
 achievements: achievements,
 projects: projects,
 calendar_events: calendarEvents
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

  const handleInterventionFeedback = (taskId: string, interventionType: string, wasHelpful: boolean) => {
    try {
      const stored = localStorage.getItem("dayflow_intervention_feedback") || "[]";
      const list = JSON.parse(stored);
      list.push({
        taskId,
        interventionType,
        wasHelpful,
        timestamp: Date.now()
      });
      localStorage.setItem("dayflow_intervention_feedback", JSON.stringify(list));
      showToast("Feedback recorded. The model will adjust!", "success");
    } catch (_) {}
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
  scheduled_date: t.scheduled_date || selectedDate,
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

  const handleUndoDelete = () => {
    if (lastDeletedTask) {
      const updated = [...flexibleTasks, lastDeletedTask];
      handleUpdateFlexible(updated);
      showToast(`Restored "${lastDeletedTask.title}"!`, "success");
      setLastDeletedTask(null);
    }
  };

  const handleDeleteFlexible = (id: string) => {
    const taskToDelete = flexibleTasks.find((t) => t.id === id);
    if (taskToDelete) {
      setLastDeletedTask(taskToDelete);
      handleUpdateFlexible(flexibleTasks.filter((t) => t.id !== id));
      setDeletingTaskId(null);
      showToast(`Deleted "${taskToDelete.title}"`, "info", true);
      triggerHaptic(25);
    }
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
 if (backlogTab === "dropped") {
 return flexibleTasks.filter(t => t.status === "skipped" || t.status === "expired");
 }

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
 }, [flexibleTasks, backlogFilter, backlogTab]);

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
 , schema_version: 1, field_timestamps: {} };
  newTask.field_timestamps = createFieldTimestamps(newTask);
 
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

  const fetchDailyPlan = async (task: import("./types").FlexibleTask, forDate: string): Promise<string | null> => {
    if (task.daily_plan && task.daily_plan_generated_date === forDate) {
      return task.daily_plan;
    }
    try {
      const startHour = task.scheduled_start_time
        ? parseInt(task.scheduled_start_time.split(":")[0], 10)
        : new Date().getHours();
      const timeOfDay = startHour < 12 ? "morning" : startHour < 17 ? "afternoon" : "evening";
      const prevPlans: string[] = [];
      if (task.description) {
        const prevLines = task.description.split("\n").filter((l: string) => l.startsWith("Previously ("));
        prevPlans.push(...prevLines.map((l: string) => l.replace(/^Previously \([^)]+\): /, "")));
      }
      const res = await fetch("/api/daily-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: task.title,
          taskDescription: task.description || "",
          durationMinutes: task.duration_minutes,
          timeOfDay,
          previousPlans: prevPlans,
        }),
      });
      if (!res.ok) throw new Error("daily-plan API failed");
      const data = await res.json();
      const planText = ((data.steps as string[]) || []).join("\n");
      return planText;
    } catch {
      return task.description || null;
    }
  };

  const handleCompleteOnboarding = (
    role: string,
    sleep: { wake: string; sleep: string; energy: string },
    blocks: FixedBlock[]
  ) => {
    const profile: OnboardingProfile = {
      completed: true,
      sleep_start: sleep.wake,
      sleep_end: sleep.sleep,
      energy_pattern: sleep.energy as any,
      goals: [],
      struggles: [],
      planning_style: "underestimate",
      role: role as any
    };
    localStorage.setItem("dayflow_onboarding_profile", JSON.stringify(profile));

    // Save sleep settings
    const newSettings = { day_start: sleep.wake, day_end: sleep.sleep, themeMode: appSettings.themeMode || ("light" as const) };
    setAppSettings(newSettings);
    saveSettings(newSettings);

    // Save routines/fixed commitments
    handleUpdateFixed(blocks);

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
    const greeting = `Welcome to DayFlow! 🚀 I'm your Day Coach.\n\nI've configured your base profile as a **${role}** with wake hours **${sleep.wake} - ${sleep.sleep}**.\n\nTo start off, let me ask: ${firstQ.question}`;
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

 if (showOnboarding) {
    return (
      <OnboardingWizard
        isOpen={showOnboarding}
        TODAY={TODAY}
        onComplete={handleCompleteOnboarding}
        onSkip={handleSkipOnboarding}
      />
    );
  }

 const toggleDayInRoutineBlockForm = (dayNum: number) => {
 setRoutineBlockForm(prev => {
 const exists = prev.daysOfWeek.includes(dayNum);
 const days = exists 
 ? prev.daysOfWeek.filter(d => d !== dayNum)
 : [...prev.daysOfWeek, dayNum].sort();
 return { ...prev, daysOfWeek: days };
 });
 };

 const renderCopilotContent = (isInline: boolean) => {
 const userPromptsCount = chatHistory.filter(m => m.sender === "user").length;
 const isCopilotFullScreen = !isInline && userPromptsCount >= 3 && !copilotMinimized;

 return (
 <div className="flex flex-col h-full overflow-hidden text-left bg-white dark:bg-[var(--bg-card)] p-0">
 {/* Header */}
 <div className="flex items-center justify-between mb-4 gap-2 border-b border-[var(--border-strong)] dark:border-[var(--border)]/40 pb-3 flex-shrink-0">
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
 className="px-2 py-1 text-[10px] font-bold border border-[var(--border-strong)] dark:border-[var(--border)] text-neutral-550 dark:text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200"
 title={copilotMinimized ? "Expand chat view" : "Minimize chat view"}
 >
 {copilotMinimized ? (
 <>
 <Maximize2 className="w-3 h-3 text-[var(--text-tertiary)]" />
 <span className="hidden sm:inline">Expand</span>
 </>
 ) : (
 <>
 <Minimize2 className="w-3 h-3 text-[var(--text-tertiary)]" />
 <span className="hidden sm:inline">Minimize</span>
 </>
 )}
 </button>
 )}

 <button
 type="button"
 onClick={handleResetCopilotChat}
 className="px-2 py-1 text-[10px] font-bold border border-[var(--border-strong)] dark:border-[var(--border)] text-neutral-550 dark:text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200 disabled:opacity-50"
 title="Reset chat context"
 >
 <RefreshCw className="w-3 h-3 text-[var(--text-tertiary)] group-hover:rotate-180 transition-transform" />
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
 className="p-1.5 rounded-full border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-neutral-555 hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] cursor-pointer active:scale-95 duration-200 shrink-0 ml-1"
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
 <p className="text-[var(--text-secondary)] leading-relaxed text-[11px]">{copilotError}</p>
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
 <div className="p-3 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-2xl shadow-sm space-y-2 w-full text-left">
 <textarea
 value={editingMessageText}
 onChange={(e) => setEditingMessageText(e.target.value)}
 className="w-full p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-primary font-sans resize-none text-slate-800 dark:text-[var(--text-primary)]"
 rows={2}
 />
 <div className="flex justify-end gap-1.5">
 <button
 type="button"
 onClick={() => setEditingMessageIdx(null)}
 className="px-2 py-1 text-[10px] font-bold border border-[var(--border-strong)] dark:border-[var(--border)] text-neutral-550 dark:text-[var(--text-secondary)] rounded-lg hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] cursor-pointer"
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
 className={`text-xs leading-relaxed ${ isAI ? "p-3.5 bg-[#F6F5FF] border border-[#E0D9FF] text-[#1F2937] rounded-xl font-medium shadow-none text-left dark:msg-model dark:border-transparent" : "p-3.5 bg-primary text-white rounded-xl font-semibold shadow-[0_2px_4px_rgba(79,70,229,0.2)] text-left dark:msg-user dark:shadow-none" }`}
 style={{ whiteSpace: "pre-wrap" }}
 >
 {msg.text}
 </div>
 
 {!isAI && !isProcessingCopilot && (
 <div className="absolute -left-9 sm:-left-[4.5rem] top-1/2 -translate-y-1/2 flex flex-col sm:flex-row items-center gap-1.5 opacity-70 md:opacity-0 group-hover/msg:opacity-100 transition-opacity z-10">
 <button
 type="button"
 onClick={() => {
 const updatedHistory = chatHistory.slice(0, idx);
 handleSendCopilotMessage(msg.text, updatedHistory);
 }}
 className="p-1.5 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-neutral-450 dark:text-[var(--text-secondary)] hover:text-primary cursor-pointer shadow-3xs"
 title="Retry message"
 >
 <RotateCcw className="w-3 h-3" />
 </button>
 <button
 type="button"
 onClick={() => {
 setEditingMessageIdx(idx);
 setEditingMessageText(msg.text);
 }}
 className="p-1.5 rounded-xl bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-neutral-450 dark:text-[var(--text-secondary)] hover:text-neutral-650 dark:text-[var(--text-primary)] cursor-pointer shadow-3xs"
 title="Edit message"
 >
 <Pencil className="w-3 h-3" />
 </button>
 </div>
 )}
 
 {/* Duration confirmation inline chip */}
 {msg.durationConfirmation && (
 <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3 text-left text-slate-800 dark:text-[var(--text-primary)] w-full min-w-[260px] animate-fade-in">
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
 className="w-20 p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] text-neutral-705 text-center font-mono focus:outline-none focus:ring-1 focus:ring-primary"
 placeholder="Mins"
 />
 <span className="text-xs text-neutral-550 dark:text-[var(--text-secondary)] font-medium">minutes</span>
 </div>
 <div className="flex gap-2 pt-2 border-t border-[var(--border)] dark:border-[var(--border)]">
 <button
 type="button"
 onClick={() => {
 const updated = [...chatHistory];
 updated[idx].durationConfirmation.isEditing = false;
 setChatHistory(updated);
 }}
 className="flex-1 py-1.5 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-bold border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
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
 className="flex-1 py-1.5 bg-primary-gradient hover:opacity-90 text-white font-bold rounded-xl text-[11px] font-display transition-all shadow-sm shadow-primary/20 cursor-pointer text-center"
 >
 Save
 </button>
 </div>
 </div>
 ) : (
 <div className="flex gap-2 pt-2 border-t border-[var(--border)] dark:border-[var(--border)]">
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
 <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-2xl p-4 shadow-xs space-y-3 text-left w-full min-w-[260px] animate-fade-in">
 <div className="flex items-center gap-1.5 font-bold text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-wider font-display">
 <Sparkles className="w-3.5 h-3.5 text-primary" />
 <span>Action Log & Explanations</span>
 </div>
 <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
 {msg.explanations.map((exp, expIdx) => (
 <div key={expIdx} className="p-2.5 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-neutral-150 dark:border-[var(--border)] rounded-xl space-y-1.5">
 <div className="flex items-center justify-between gap-2">
 <span className="text-[11px] font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] leading-tight">
 {exp.action}
 </span>
 <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono inline-block shrink-0 ${ exp.confidence === "low" ? "bg-rose-50 text-rose-600 border border-rose-105" : exp.confidence === "medium" ? "bg-amber-50 text-amber-600 border border-amber-105" : "bg-emerald-50 text-emerald-600 border border-emerald-105" }`}>
 {exp.confidence} confidence
 </span>
 </div>
 <p className="text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] leading-normal font-medium">{exp.reason}</p>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Evening Check-in conversational chips */}
 {msg.questionnaire && msg.questionnaire.type === "evening_checkin" && !msg.questionnaireSubmitted && (
 <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3 text-left text-slate-800 dark:text-[var(--text-primary)] w-full min-w-[260px] animate-fade-in">
 <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
 <Moon className="w-3.5 h-3.5 fill-primary/10 text-primary animate-pulse" />
 <span>Evening Review</span>
 </div>
 
 {msg.questionnaire.currentStep === "unmarked_completion" && (
 <div className="space-y-2">
 <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-medium">Did you finish any of these tasks but forget to mark them done?</p>
 <div className="flex flex-wrap gap-2 pt-1">
 {(msg.questionnaire.openTaskIds || []).map((taskId: string) => {
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
 className="py-1.5 px-3 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-bold border border-neutral-250 rounded-xl text-[10px] cursor-pointer transition-colors"
 >
 No, none of these
 </button>
 </div>
 </div>
 )}

 {msg.questionnaire.currentStep === "task_reason" && (
 <div className="space-y-2">
 <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-medium">
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
 <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-medium">
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
 <p className="text-xs text-neutral-650 dark:text-[var(--text-primary)] font-medium">Tomorrow's schedule is set! Should we pull in any of these from backlog?</p>
 <div className="flex flex-col gap-1.5 pt-1">
 {flexibleTasks
 .filter(t => t.status === "backlog" && !isUnimportantTask(t.title, t.meta))
 .slice(0, 3)
 .map((task) => (
 <button
 key={task.id}
 type="button"
 onClick={() => handleEveningCheckinSelect("pull", task.id, idx)}
 className="py-2 px-3 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] text-neutral-750 dark:text-[var(--text-primary)] font-bold rounded-xl text-[10px] cursor-pointer transition-colors text-left"
 >
 + Pull: "{task.title}" ({task.duration_minutes}m)
 </button>
 ))}
 <button
 type="button"
 onClick={() => handleEveningCheckinSelect("pull_none", null, idx)}
 className="py-2 px-3 bg-neutral-105 hover:bg-neutral-200 dark:bg-[var(--bg-card-hover)] text-neutral-550 dark:text-[var(--text-secondary)] font-extrabold rounded-xl text-[10px] cursor-pointer transition-colors text-center"
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
 <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-2xl p-4 shadow-xs space-y-3.5 text-left text-slate-800 dark:text-[var(--text-primary)] w-full min-w-[260px] animate-fade-in font-sans">
 <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
 <Sparkles className="w-3.5 h-3.5 fill-primary/10 text-primary animate-pulse" />
 <span>Task Decomposition</span>
 </div>
 <p className="text-xs text-neutral-650 dark:text-[var(--text-primary)] font-medium leading-relaxed">
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
 className="flex-1 py-2 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] border border-neutral-250 text-neutral-550 dark:text-[var(--text-secondary)] font-bold rounded-xl text-[11px] cursor-pointer transition-colors text-center"
 >
 Keep As Is
 </button>
 </div>
 </div>
 )}

 {/* Questionnaire setup wizard card */}
 {msg.questionnaire && !msg.questionnaireSubmitted && (
 <div className="mt-3 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)]/80 rounded-2xl p-4 shadow-xs space-y-3.5 text-left text-slate-800 dark:text-[var(--text-primary)] w-full min-w-[260px] animate-fade-in">
 <div className="flex items-center gap-2 font-bold text-xs text-primary uppercase tracking-wider">
 <Sparkles className="w-3.5 h-3.5 fill-primary/10 text-primary" />
 <span>Plan Setup Wizard</span>
 </div>
 <h5 className="text-xs font-extrabold text-neutral-850 dark:text-[var(--text-primary)] leading-tight">
 {msg.questionnaire.title}
 </h5>
 
 <div className="space-y-3">
 {msg.questionnaire.questions.map((q: any, qIdx: number) => (
 <div key={q.id} className="space-y-1">
 <label className="text-[11px] font-bold text-neutral-550 dark:text-[var(--text-secondary)] block">
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
 className="w-full p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] text-neutral-705 focus:outline-none focus:ring-1 focus:ring-primary font-sans cursor-pointer"
 >
 {q.options?.map((opt: string) => (
 <option key={opt} value={opt}>
 {opt}
 </option>
 ))}
 </select>
 ) : q.type === "task_list" ? (
 <div className="space-y-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl p-2 bg-[var(--bg-page)] ">
 {(Array.isArray(q.value) ? q.value : [{ title: "", duration: 30 }]).map((taskItem: any, tIdx: number, arr: any[]) => (
 <div key={tIdx} className="flex gap-2 items-center">
 <input
 type="text"
 placeholder="Task / Chapter name"
 value={taskItem.title}
 onChange={(e) => {
 const updated = [...chatHistory];
 const msgCopy = { ...updated[idx] };
 if (msgCopy.questionnaire) {
 const qCopy = { ...msgCopy.questionnaire };
 const newList = [...arr];
 newList[tIdx] = { ...newList[tIdx], title: e.target.value };
 qCopy.questions = qCopy.questions.map((item: any, i: number) =>
 i === qIdx ? { ...item, value: newList } : item
 );
 msgCopy.questionnaire = qCopy;
 updated[idx] = msgCopy;
 setChatHistory(updated);
 }
 }}
 className="flex-1 p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary"
 />
 <div className="flex items-center gap-1 w-24">
 <input
 type="number"
 value={taskItem.duration}
 onChange={(e) => {
 const updated = [...chatHistory];
 const msgCopy = { ...updated[idx] };
 if (msgCopy.questionnaire) {
 const qCopy = { ...msgCopy.questionnaire };
 const newList = [...arr];
 newList[tIdx] = { ...newList[tIdx], duration: parseInt(e.target.value) || 0 };
 qCopy.questions = qCopy.questions.map((item: any, i: number) =>
 i === qIdx ? { ...item, value: newList } : item
 );
 msgCopy.questionnaire = qCopy;
 updated[idx] = msgCopy;
 setChatHistory(updated);
 }
 }}
 className="w-full p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)] text-center focus:ring-1 focus:ring-primary"
 />
 <span className="text-[10px] text-[var(--text-tertiary)] font-bold">m</span>
 </div>
 <button
 type="button"
 onClick={() => {
 const updated = [...chatHistory];
 const msgCopy = { ...updated[idx] };
 if (msgCopy.questionnaire) {
 const qCopy = { ...msgCopy.questionnaire };
 const newList = arr.filter((_, filterIdx) => filterIdx !== tIdx);
 qCopy.questions = qCopy.questions.map((item: any, i: number) =>
 i === qIdx ? { ...item, value: newList.length > 0 ? newList : [{ title: "", duration: 30 }] } : item
 );
 msgCopy.questionnaire = qCopy;
 updated[idx] = msgCopy;
 setChatHistory(updated);
 }
 }}
 className="p-1.5 text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ))}
 <button
 type="button"
 onClick={() => {
 const updated = [...chatHistory];
 const msgCopy = { ...updated[idx] };
 if (msgCopy.questionnaire) {
 const qCopy = { ...msgCopy.questionnaire };
 const currentArr = Array.isArray(q.value) ? q.value : [{ title: "", duration: 30 }];
 qCopy.questions = qCopy.questions.map((item: any, i: number) =>
 i === qIdx ? { ...item, value: [...currentArr, { title: "", duration: 30 }] } : item
 );
 msgCopy.questionnaire = qCopy;
 updated[idx] = msgCopy;
 setChatHistory(updated);
 }
 }}
 className="w-full py-1.5 flex items-center justify-center gap-1 text-[11px] font-bold text-primary hover:bg-primary/5 rounded-lg border border-dashed border-primary/30 transition-colors"
 >
 <Plus className="w-3 h-3" />
 Add Task
 </button>
 </div>
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
 className="w-full p-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] text-neutral-705 focus:outline-none focus:ring-1 focus:ring-primary font-sans"
 />
 )}
 </div>
 ))}
 </div>

 <div className="flex gap-2 pt-2.5 border-t border-[var(--border)] dark:border-[var(--border)]">
 <button
 type="button"
 onClick={() => {
 const updated = [...chatHistory];
 updated[idx] = { ...updated[idx], questionnaireSubmitted: true };
 setChatHistory(updated);
 }}
 className="flex-1 py-2 bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] hover:bg-neutral-200 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-bold rounded-xl text-[11px] font-display transition-colors cursor-pointer text-center"
 >
 Dismiss
 </button>
 <button
 type="button"
 onClick={() => {
 handleSubmitQuestionnaire(idx);
 }}
 className="flex-1 py-2 bg-primary-gradient hover:opacity-90 text-white font-bold rounded-xl text-[11px] font-display transition-all shadow-sm shadow-primary/20 cursor-pointer text-center"
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
 <div className="flex items-center justify-between gap-2 text-xs text-[#94A3B8] dark:text-white font-bold p-3 bg-[var(--bg-page)] rounded-2xl border border-[var(--border)] dark:border-transparent dark:animate-aurora-shimmer animate-pulse dark:animate-none">
 <div className="flex items-center gap-2">
 <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
 <span className="text-neutral-650 dark:text-[var(--text-primary)] font-medium transition-all duration-300">
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
    const personalized = [
      "I have uploaded my timetable please make a routine of that",
      "My mornings are not productive, please keep lighter tasks in the morning",
      "I want to start a reading habit. Add a session for this in my free time"
    ];

 return (
 <div className="space-y-1.5 flex-shrink-0">
 <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Quick prompts for you, {firstName}:</span>
 <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1 scrollbar-none">
 {personalized.map((sStr) => (
 <button
 key={sStr}
 type="button"
 onClick={() => setCopilotInput(sStr)}
 className="text-left py-1.5 px-3 bg-white dark:bg-[var(--bg-card)] hover:bg-primary/5 hover:border-primary/30 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs font-semibold text-[#475569] cursor-pointer transition-all shadow-xs"
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
 <div className="p-4 bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF] rounded-xl space-y-3 shadow-xs animate-fade-in text-left flex-shrink-0">
 <div className="flex items-center gap-1.5 text-[var(--text-tertiary)] font-bold text-[11px] uppercase tracking-wider font-display">
 <Sparkles className="w-3.5 h-3.5 text-primary" />
 <span>Proposed Changes</span>
 </div>
 <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
 {proposedChanges.map((change, idx) => (
 <div key={idx} className="p-2.5 bg-neutral-55 border border-neutral-150 dark:border-[var(--border)] rounded-xl flex items-start gap-2">
 <div className="space-y-1 flex-1">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1.5">
 <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-light text-primary shrink-0 font-mono inline-block">
 {change.action}
 </span>
 <span className={`text-[9.5px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded font-mono inline-block shrink-0 ${ change.confidence === "low" ? "bg-rose-50 text-rose-600 border border-rose-100" : change.confidence === "medium" ? "bg-amber-50 text-amber-600 border border-amber-100" : "bg-emerald-50 text-emerald-600 border border-emerald-100" }`}>
 {change.confidence || "high"} confidence
 </span>
 </div>
 <div className="flex items-center gap-2">
 {change.newTime && (
 <span className="text-[10px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-mono">{change.newTime}</span>
 )}
 <button
 onClick={() => setProposedChanges(prev => prev ? prev.filter((_, i) => i !== idx) : null)}
 className="p-1 text-[#9999B3] hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
 title="Reject this specific change"
 >
 <Trash2 className="w-3 h-3" />
 </button>
 </div>
 </div>
 <p className="text-[12px] font-medium text-[var(--text-secondary)] dark:text-[var(--text-primary)] leading-relaxed">{change.reasoning}</p>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Chat Input & Mic & Attach Area */}
 <div className="border-t border-[var(--border)] dark:border-[var(--border)] pt-4 space-y-2 flex-shrink-0">
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
 className={`p-2 rounded-xl transition-colors cursor-pointer ${ copilotImage ? "bg-indigo-100 text-indigo-600" : "bg-neutral-55 hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[#475569]" }`}
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
 className={`p-2 rounded-xl transition-colors cursor-pointer ${ isListening ? "bg-red-500 text-white animate-pulse" : "bg-neutral-55 hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[#475569]" }`}
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
 className="flex-1 py-3 text-xs font-bold rounded-xl bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] hover:bg-neutral-200 dark:bg-[var(--bg-card-hover)] border border-neutral-300 dark:border-[var(--border)] text-[var(--text-primary)] dark:text-[var(--text-primary)] transition-colors cursor-pointer text-center font-display animate-fade-in"
 >
 Revise
 </button>
 <button 
 type="button"
 onClick={handleConfirmAIChanges}
 className="flex-1 py-3 text-xs font-bold rounded-xl bg-primary-gradient hover:opacity-90 text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20 text-center font-display animate-fade-in"
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
 <div id="dayflow_app_container" className="h-[100dvh] w-screen text-[var(--text-primary)] bg-[var(--bg-page)] flex items-stretch justify-stretch overflow-hidden select-none select-text relative">
 
 {/* Background ambient blobs — subtle, theme-aware */}
 <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
 <div className="absolute top-[30%] left-[-20%] w-[70vw] h-[70vw] md:w-[600px] md:h-[600px] rounded-full bg-violet-400/5 dark:bg-violet-600/5 blur-[120px] animate-pulse-slow"></div>
 <div className="absolute bottom-[-20%] right-[-15%] w-[60vw] h-[60vw] md:w-[500px] md:h-[500px] rounded-full bg-emerald-400/5 dark:bg-emerald-600/5 blur-[130px] animate-pulse-slow" style={{ animationDelay: "3s" }}></div>
 </div>

  {/* Dynamic Toast Container wrapper inside device mockup */}
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full px-4">
    {toasts.map((t) => (
      <ToastItem 
        key={t.id} 
        toast={t} 
        onDismiss={(id) => setToasts((prev) => prev.filter((toast) => toast.id !== id))}
        onUndo={handleUndoDelete}
      />
    ))}
  </div>

 {notificationResponseTask && (
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in">
 <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-[var(--border)] overflow-hidden animate-scale-up">
 {/* Header / Accent indicator */}
 <div className="bg-gradient-to-r from-indigo-500 to-cyan-500 px-6 py-8 text-white relative">
 <button 
 onClick={() => setNotificationResponseTask(null)}
 className="absolute top-4 right-4 p-1.5 rounded-full bg-white hover:bg-white transition-colors text-white cursor-pointer"
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
 <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
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
 className="w-full py-3.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:text-[var(--text-primary)] rounded-2xl font-bold text-sm transition-all cursor-pointer flex items-center justify-center gap-2"
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
 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 animate-fade-in">
 <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl shadow-2xl max-w-md w-full border border-slate-100 dark:border-[var(--border)] overflow-hidden animate-scale-up">
 {/* Header */}
 <div className="bg-gradient-to-r from-violet-500 to-indigo-600 px-6 py-8 text-white relative">
 <button 
 onClick={() => setActiveGoalCheckIn(null)}
 className="absolute top-4 right-4 p-1.5 rounded-full bg-white hover:bg-white transition-colors text-white cursor-pointer"
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
 <p className="text-sm text-[var(--text-secondary)] leading-relaxed font-sans">
 {activeGoalCheckIn.prompt}
 </p>

 <div>
 <label className="block text-[10px] font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider mb-1">
 Current Value ({activeGoalCheckIn.goal.metricLabel})
 </label>
 <input 
 type="number" 
 step="any"
 value={checkInResponseVal}
 onChange={(e) => setCheckInResponseVal(e.target.value)}
 placeholder={`e.g. ${activeGoalCheckIn.goal.currentValue + 1}`}
 className="w-full px-3.5 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
 required
 />
 </div>

 <div className="flex gap-3 pt-2">
 <button
 type="button"
 onClick={() => setActiveGoalCheckIn(null)}
 className="flex-1 py-3 border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] rounded-xl font-bold text-sm transition-colors cursor-pointer"
 >
 Skip Check-in
 </button>
 <button
 type="submit"
 className="flex-1 py-3 bg-primary-gradient hover:opacity-90 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-primary/10 cursor-pointer"
 >
 Log Progress
 </button>
 </div>
 </form>
 </div>
 </div>
 )}



 {/* PARENT BODY CONTAINER GIVING RESPONSIVE LAYOUT */}
 <div id="app_responsive_layout" className="w-full h-full flex items-stretch bg-[var(--bg-page)] overflow-hidden relative z-10">
 
 {/* SIDE BAR DESKTOP NAVIGATION & CONTROL PANEL (Adaptive desktop menu view) */}
 <aside 
 id="desktop_diagnostic_rail" 
 className={`hidden md:flex relative flex-col justify-between shrink-0 font-sans border-r border-[var(--border)] glass-panel transition-all duration-300 z-30 ${ isSidebarCollapsed ? "w-[76px] p-4" : "p-5" }`}
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
 <h1 className="font-display font-bold text-base tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)] leading-none">DayFlow</h1>
 <p className="text-[11px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold mt-0.5">Active Studio</p>
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
 className="p-1 hover:bg-[var(--bg-card-hover)] rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer transition-colors"
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
 className="p-1.5 bg-[var(--bg-card)] rounded-lg text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-primary border border-[var(--border-strong)] dark:border-[var(--border)]/40 shadow-xs cursor-pointer transition-all"
 title="Expand Sidebar"
 >
 <ChevronRight className="w-4 h-4" />
 </button>
 </div>
 )}

 <div className="h-px bg-[var(--border-strong)]"></div>

 {/* Premium Desktop Navigation Sidebar Menu */}
 <div className="space-y-2">
 {!isSidebarCollapsed && (
 <span className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest block mb-2 px-1">Menu Navigation</span>
 )}
 
 <button
 onClick={() => changeTabWithHaptic("today")}
 className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${ isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5" } ${ activeTab === "today" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]" }`}
 title={isSidebarCollapsed ? "Daily Timeline" : undefined}
 >
 <div className="flex items-center gap-2.5">
 <CalendarCheck className="w-4.5 h-4.5" />
 {!isSidebarCollapsed && <span>Daily Timeline</span>}
 </div>
 {!isSidebarCollapsed && daySchedule.items.length > 0 && (
 <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${activeTab === "today" ? "bg-[var(--bg-panel)]/20 text-white" : "bg-neutral-200 dark:bg-[var(--bg-card-hover)] text-neutral-600 dark:text-[var(--text-primary)]"}`}>
 {daySchedule.items.filter(i => i.status === "done").length}/{daySchedule.items.length}
 </span>
 )}
 </button>

 <button
 onClick={() => changeTabWithHaptic("backlog")}
 className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${ isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5" } ${ activeTab === "backlog" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]" }`}
 title={isSidebarCollapsed ? "Backlog Queue" : undefined}
 >
 <div className="flex items-center gap-2.5">
 <Layers className="w-4.5 h-4.5" />
 {!isSidebarCollapsed && <span>Backlog Queue</span>}
 </div>
 {!isSidebarCollapsed && dashboardStats.backlog > 0 && (
 <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${activeTab === "backlog" ? "bg-[var(--bg-panel)]/20 text-white" : "bg-primary-light text-primary"}`}>
 {dashboardStats.backlog}
 </span>
 )}
 </button>

 <button
 onClick={() => changeTabWithHaptic("calendar")}
 className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${ isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5" } ${ activeTab === "calendar" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]" }`}
 title={isSidebarCollapsed ? "Future Calendar" : undefined}
 >
 <div className="flex items-center gap-2.5">
 <CalendarDays className="w-4.5 h-4.5" />
 {!isSidebarCollapsed && <span>Future Calendar</span>}
 </div>
 </button>

 <button
 onClick={() => changeTabWithHaptic("routines")}
 className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${ isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5" } ${ activeTab === "routines" ? "bg-primary text-white shadow-lg shadow-primary/25" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]" }`}
 title={isSidebarCollapsed ? "Routines" : undefined}
 >
 <div className="flex items-center gap-2.5">
 <BookMarked className="w-4.5 h-4.5" />
 {!isSidebarCollapsed && <span>Routines</span>}
 </div>
 {!isSidebarCollapsed && profiles.length > 0 && (
 <span className={`text-xs font-mono px-1.5 py-0.5 rounded font-bold ${activeTab === "routines" ? "bg-[var(--bg-panel)]/20 text-white" : "bg-primary-light text-primary"}`}>
 {profiles.length}
 </span>
 )}
 </button>

   <button
  onClick={() => { setShowSettingsModal(true); triggerHaptic(12); }}
  className={`w-full flex items-center rounded-xl text-xs font-bold transition-all cursor-pointer ${ isSidebarCollapsed ? "justify-center p-2.5" : "justify-between px-3 py-2.5" } ${ showSettingsModal ? "bg-primary-light text-primary" : "text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]" }`}
  title={isSidebarCollapsed ? "Settings" : undefined}
  >
  <div className="flex items-center gap-2.5">
  <SettingsIcon className="w-4.5 h-4.5" />
  {!isSidebarCollapsed && <span>Settings</span>}
  </div>
  </button>
 </div>

 </div>

 <AuthBanner user={user} onSignOut={handleSignOut} isCollapsed={isSidebarCollapsed} />
 </aside>
<div id="phone_mockup_container" className="flex-1 h-full bg-transparent flex flex-col overflow-hidden relative">
 
 {/* TOP APP HEADER BAR (Fixed boundary, does not move) */}
 <header id="mobile_sticky_header" className="min-h-[64px] pt-[env(safe-area-inset-top,10px)] md:pt-0 border-b border-[var(--border-strong)] dark:border-[var(--border)]/50 px-4 flex items-center justify-between bg-[var(--bg-panel)] z-30 flex-shrink-0 relative text-slate-805 dark:text-[var(--text-primary)]">
 <div 
 onClick={handleLogoClick}
 className="flex items-center gap-1.5 cursor-pointer select-none"
 title="Tap 5 times for developer mode"
 >
 <span className="font-display font-black text-lg md:text-xl text-slate-900 dark:text-white tracking-tight">{pageTitle}</span>
 <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
 {activeTab === "today" && daySchedule.items.length > 0 && (
 <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full ml-1">
 {totalCompletedScheduledCount}
 </span>
 )}
 </div>

 {/* Header Right Area: Quick manual add + date navigation */}
 <div className="flex items-center gap-3">

 {/* Selected Date Jump Widget and Arrow Controls shifted to the Right (Minimalistic style) */}
 <div className="flex items-center gap-1">
 <button 
 onClick={() => {
 const d = new Date(selectedDate);
 d.setDate(d.getDate() - 1);
 setSelectedDate(d.toISOString().split("T")[0]);
 }}
 className="p-1.5 rounded-full hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[#475569] cursor-pointer active:scale-90 transition-all duration-150"
 title="Previous Day"
 >
 <ChevronLeft className="w-4.5 h-4.5 text-[#475569] dark:text-zinc-650" />
 </button>
 
 <div className="flex flex-col items-center px-1 text-center select-none min-w-[94px]">
    <span className="text-[14.5px] font-bold text-[#475569] dark:text-zinc-400 capitalize leading-tight">
      {(() => {
        const todayStr = getLocalTodayStr();
        if (selectedDate === todayStr) return "Today";
        const diff = Math.round(
          (new Date(selectedDate + "T00:00:00").getTime() - new Date(todayStr + "T00:00:00").getTime()) /
            86400000
        );
        if (diff === -1) return "Yesterday";
        if (diff === 1) return "Tomorrow";
        return new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { weekday: "short" });
      })()}
    </span>
    <span className="text-[12.5px] font-semibold text-neutral-450 dark:text-neutral-500 font-mono mt-0.5 leading-none">
      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
    </span>
  </div>

 <button 
 onClick={() => {
 const d = new Date(selectedDate);
 d.setDate(d.getDate() + 1);
 setSelectedDate(d.toISOString().split("T")[0]);
 }}
 className="p-1.5 rounded-full hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[#475569] cursor-pointer active:scale-90 transition-all duration-150"
 title="Next Day"
 >
 <ChevronRight className="w-4.5 h-4.5 text-[#475569] dark:text-zinc-650" />
 </button>
 </div>
 </div>

 {/* Navbar Integrated Subtle Progress Line */}
 {activeTab === "today" && daySchedule.items.length > 0 && (
 <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-neutral-200 overflow-hidden">
 <div 
 className="h-full bg-primary rounded-full transition-all duration-500"
 style={{ width: `${completedTodayPercentage}%` }}
 />
 </div>
 )}
 </header>

 {/* MAIN DYNAMIC CONTENT RAIL (Independently scrolling tab viewports) */}
 <main id="mobile_viewport_content" className="flex-1 overflow-hidden flex flex-col relative bg-[var(--bg-page)]">
 
 {/* Floating Notification Permission Request Modal */}
 {showNotificationPrompt && (
 <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 p-4 bg-[var(--bg-card)] border border-indigo-100 rounded-2xl shadow-xl z-40 animate-slide-up flex flex-col gap-2.5">
 <div className="flex items-start justify-between">
 <div className="flex gap-2">
 <span className="text-lg">🚀</span>
 <div className="space-y-0.5 text-left">
 <h5 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Enable reminders</h5>
 <p className="text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] leading-relaxed">
 Get notified when it is time to transition tasks.
 </p>
 </div>
 </div>
 <button 
 onClick={handleDismissNotifications}
 className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] p-0.5 rounded-lg hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] cursor-pointer"
 >
 <X className="w-4 h-4" />
 </button>
 </div>
 <div className="flex items-center justify-end gap-2 mt-1">
 <button 
 onClick={handleDismissNotifications}
 className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-bold px-3 py-1.5 hover:bg-indigo-50 text-indigo-600 rounded-lg transition-colors cursor-pointer"
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
    <TodayTab
      fetchDailyPlan={fetchDailyPlan}
      handleInterventionFeedback={handleInterventionFeedback}
      activeTimer={activeTimer}
      handleStopTimer={handleStopTimer}
      selectedDate={selectedDate}
      TODAY={TODAY}
      currentTimeMins={currentTimeMins}
      todayIncompleteTasks={todayIncompleteTasks}
      eodDismissed={eodDismissed}
      handleStartEveningCheckin={handleStartEveningCheckin}
      setEodDismissed={setEodDismissed}
      copilotUndoState={copilotUndoState}
      handleUndoAIChanges={handleUndoAIChanges}
      setCopilotUndoState={setCopilotUndoState}
      showDriftBanner={showDriftBanner}
      driftedTask={driftedTask}
      handleToggleTaskDone={handleToggleTaskDone}
      driftPromptCountToday={driftPromptCountToday}
      setDriftPromptCountToday={setDriftPromptCountToday}
      setLastDriftPromptAt={setLastDriftPromptAt}
      handleDelayTask15Minutes={handleDelayTask15Minutes}
      runAIResolution={runAIResolution}
      isProcessingAIReasoning={isProcessingAIReasoning}
      setSelectedDate={setSelectedDate}
      getLocalTodayStr={getLocalTodayStr}
      daySchedule={daySchedule}
      formatMinutes={formatMinutes}
      handleDeleteFlexible={handleDeleteFlexible}
      handleOpenEditFlexible={handleOpenEditFlexible}
      handleOpenAddFlexible={handleOpenAddFlexible}
      showToast={showToast}
      flexibleTasks={flexibleTasks}
      appSettings={appSettings}
      calibrationProfile={calibrationProfile}
      delayPatterns={delayPatterns}
      routineBlocks={routineBlocks}
      setRoutineBlocks={setRoutineBlocks}
      getSuspendedRoutineTypesForDate={getSuspendedRoutineTypesForDate}
      handleDeleteFixed={handleDeleteFixed}
      handleOpenAddFixed={handleOpenAddFixed}
      handleOpenEditFixed={handleOpenEditFixed}
      handleStartTimer={handleStartTimer}
      hasUnverifiedPastTasks={hasUnverifiedPastTasks}
      handleAlignTimeline={handleAlignTimeline}
      projects={projects}
      consequenceCache={consequenceCache}
      fetchConsequenceInsight={fetchConsequenceInsight}
      executeNegotiationCommand={executeNegotiationCommand}
      handleOpenAICopilot={handleOpenAICopilot}
      setCopilotInput={setCopilotInput}
      completedStreak={completedStreak}
      profileName={profileName}
      handleUpdateFlexible={handleUpdateFlexible}
      recordTaskExecutionLog={recordTaskExecutionLog}
      checkDayComplete={checkDayComplete}
      triggerHaptic={triggerHaptic}
      dragOverPosition={dragOverPosition}
      setDragOverPosition={setDragOverPosition}
      executePostponeDirectly={executePostponeDirectly}
      draggedTaskId={draggedTaskId}
      setDraggedTaskId={setDraggedTaskId}
      dragOverTaskId={dragOverTaskId}
      setDragOverTaskId={setDragOverTaskId}
      activeNowTask={activeNowTask}
      upNextTask={upNextTask}
      handleDragStart={handleDragStart}
      handleDragOver={handleDragOver}
      handleDrop={handleDrop}
      handleDragEnd={handleDragEnd}
      handleOpenPinTime={handleOpenPinTime}
      handleUnpinTime={handleUnpinTime}
      pinTimeTaskId={pinTimeTaskId}
      setPinTimeTaskId={setPinTimeTaskId}
      pinTimeValue={pinTimeValue}
      setPinTimeValue={setPinTimeValue}
      handleConfirmPinTime={handleConfirmPinTime}
      fixedBlocks={fixedBlocks}
      executePostponeWithFrictionDetails={executePostponeWithFrictionDetails}
      executePostponeWithFriction={executePostponeWithFriction}
      executeInlineDecomposition={executeInlineDecomposition}
      deletingTaskId={deletingTaskId}
      loadingInsightTaskId={loadingInsightTaskId}
      setFlexibleTasks={setFlexibleTasks}
      handleScheduleTaskToday={handleScheduleTaskToday}
      setDeletingTaskId={setDeletingTaskId}
      dailyCoachReflection={dailyCoachReflection}
      showReflectionCard={showReflectionCard}
      yesterdayCompletionRate={yesterdayCompletionRate}
      selectedCause={selectedCause}
      setSelectedCause={setSelectedCause}
      reflectionNotes={reflectionNotes}
      setReflectionNotes={setReflectionNotes}
      runLocalResolution={runLocalResolution}
      reflectionEvents={reflectionEvents}
      setReflectionEvents={setReflectionEvents}
      saveReflectionEvents={saveReflectionEvents}
      staleTasks={staleTasks}
      totalPlannedDurationMins={totalPlannedDurationMins}
      setActiveTimer={setActiveTimer}
      
    />
  )}

 {/* TAB VIEW 2: MASTER BACKLOG */}
  {activeTab === "backlog" && (
    <BacklogTab
      backlogTab={backlogTab}
      setBacklogTab={setBacklogTab}
      flexibleTasks={flexibleTasks}
      setFlexibleTasks={setFlexibleTasks}
      expandedTaskIds={expandedTaskIds}
      setExpandedTaskIds={setExpandedTaskIds}
      handleOpenEditFlexible={handleOpenEditFlexible}
      handleScheduleTaskToday={handleScheduleTaskToday}
      setDeletingTaskId={setDeletingTaskId}
      showToast={showToast}
      TODAY={TODAY}
      fetchConsequenceInsight={fetchConsequenceInsight}
      consequenceCache={consequenceCache}
      deletingTaskId={deletingTaskId}
      handleDeleteFlexible={handleDeleteFlexible}
      handleToggleTaskDone={handleToggleTaskDone}
      handleOpenAddFlexible={handleOpenAddFlexible}
      futurePredictions={futurePredictions}
      handleInterventionFeedback={handleInterventionFeedback}
    />
  )}

 {/* TAB VIEW 3: FUTURE CALENDAR + PREDICTIONS */}
  {activeTab === "calendar" && (
    <CalendarTab
      selectedDate={selectedDate}
      TODAY={TODAY}
      flexibleTasks={flexibleTasks}
      fixedBlocks={fixedBlocks}
      daySchedule={daySchedule}
      futurePredictions={futurePredictions}
      handleMonthChange={handleMonthChange}
      setSelectedDate={setSelectedDate}
      getLocalTodayStr={getLocalTodayStr}
      completedStreak={completedStreak}
      handleOpenEditFlexible={handleOpenEditFlexible}
      setFlexibleTasks={setFlexibleTasks}
      expandedTaskIds={expandedTaskIds}
      setExpandedTaskIds={setExpandedTaskIds}
      deletingTaskId={deletingTaskId}
      setDeletingTaskId={setDeletingTaskId}
      handleDeleteFlexible={handleDeleteFlexible}
      handleToggleTaskDone={handleToggleTaskDone}
      handleOpenAddFlexible={handleOpenAddFlexible}
      fetchConsequenceInsight={fetchConsequenceInsight}
      showToast={showToast}
      handleScheduleTaskToday={handleScheduleTaskToday}
      loadingInsightTaskId={loadingInsightTaskId}
      handleInterventionFeedback={handleInterventionFeedback}
    />
  )}

   {/* TAB VIEW 4: ROUTINES & SCHEDULE PROFILES */}
  {activeTab === "routines" && (
    <RoutinesTab
      appSettings={appSettings}
      profileName={profileName}
      profileEmoji={profileEmoji}
      profileAge={profileAge}
      profileBio={profileBio}
      routineProfiles={routineProfiles}
      setRoutineProfiles={setRoutineProfiles}
      activeRoutineProfileId={activeRoutineProfileId}
      setActiveRoutineProfileId={setActiveRoutineProfileId}
      totalCompletedTasks={totalCompletedTasks}
      flexibleTasks={flexibleTasks}
      fixedBlocks={fixedBlocks}
      routineBlocks={routineBlocks}
      setRoutineBlocks={setRoutineBlocks}
      goals={goals}
      achievements={achievements}
      taskExecutionLogs={taskExecutionLogs}
      reflectionEvents={reflectionEvents}
      weightLog={weightLog}
      selectedDate={selectedDate}
      TODAY={TODAY}
      completedStreak={completedStreak}
      calibrationProfile={calibrationProfile}
      ubmInsights={ubmInsights}
      behaviorSignals={behaviorSignals}
      evalHistory={evalHistory}
      futurePredictions={futurePredictions}
      profileViewTab={profileViewTab}
      currentPath={currentPath}
      projects={projects}
      daySchedule={daySchedule}
      handleOpenAICopilot={handleOpenAICopilot}
      setCopilotInput={setCopilotInput}
      showToast={showToast}
      triggerHaptic={triggerHaptic}
      navigate={navigate}
      setShowSettingsModal={setShowSettingsModal}
      handleOpenAddFlexible={handleOpenAddFlexible}
      handleUpdateProjects={handleUpdateProjects}
      handleAutoScheduleProject={handleAutoScheduleProject}
      handleOpenCreateGoal={handleOpenCreateGoal}
      handleToggleGoalPause={handleToggleGoalPause}
      handleOpenEditGoal={handleOpenEditGoal}
      handleDeleteGoal={handleDeleteGoal}
      setReflectionEvents={setReflectionEvents}
      saveReflectionEvents={saveReflectionEvents}
    />
  )}

  </main>

  {/* UNIFIED FLOATING ACTION AREA */}
  {(() => {
    const isChatVisible = activeTab !== "routines";
    const isRescheduleVisible = activeTab === "today" && selectedDate === TODAY;
    const isAddTaskVisible = activeTab === "today" || activeTab === "backlog";
    const transitionStyle = {
      transition: "all 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
    };

    return (
      <div className="absolute md:bottom-6 bottom-[100px] right-4 z-[80] flex flex-col gap-2 items-end justify-end pointer-events-none">
        {/* Row 1: Action buttons */}
        <div className="flex gap-2 items-center pointer-events-none">
          {/* Reschedule Button */}
          <div
            style={transitionStyle}
            className={`w-12 h-12 overflow-hidden ${
              isRescheduleVisible 
                ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
                : "opacity-0 translate-y-10 scale-75 pointer-events-none"
            }`}
          >
            <button
              onClick={handleAlignTimeline}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl active:scale-95 transition-all cursor-pointer border shrink-0 ${
                needsReschedulePulse 
                  ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-750 dark:border-zinc-300 shadow-zinc-300/20 animate-pulse ring-2 ring-zinc-500/20 text-white dark:text-zinc-900" 
                  : "bg-zinc-800 dark:bg-zinc-800 border-zinc-700/20 text-white dark:text-zinc-200"
              }`}
              title="Reschedule Day / Align Timeline"
            >
              <RefreshCw className={`w-5 h-5 stroke-[2.5px] ${isAligning ? "animate-spin" : ""}`} />
            </button>
          </div>

          {/* Add Task Button */}
          <div
            style={transitionStyle}
            className={`w-12 h-12 overflow-hidden ${
              isAddTaskVisible 
                ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
                : "opacity-0 translate-y-10 scale-75 pointer-events-none"
            }`}
          >
            <button
              onClick={() => handleOpenAddFlexible(activeTab === "today")}
              className="w-12 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-xl shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer border border-emerald-500/20 shrink-0"
              title="Add Task"
            >
              <Plus className="w-6 h-6 stroke-[2.5px]" />
            </button>
          </div>
        </div>

        {/* Row 2: Let's Chat Button */}
        <div
          style={transitionStyle}
          className={`min-w-[104px] w-auto h-12 overflow-hidden ${
            isChatVisible 
              ? "opacity-100 translate-y-0 scale-100 pointer-events-auto" 
              : "opacity-0 translate-y-10 scale-75 pointer-events-none"
          }`}
        >
          <button
            onClick={handleOpenAICopilot}
            className="bg-primary-gradient hover:opacity-90 text-white min-w-[104px] px-4 h-12 rounded-2xl text-xs font-bold transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-1.5 cursor-pointer transform hover:scale-105 active:scale-95 font-display shrink-0 whitespace-nowrap"
            title="Ask DayFlow AI Copilot"
          >
            <Sparkles className="w-4 h-4 fill-current stroke-[2px]" />
            <span>{copilotButtonLabel}</span>
          </button>
        </div>
      </div>
    );
  })()}

  {/* BOTTOM NAVIGATION TAB BAR (Floating Pill) */}
 
 <nav id="mobile_sticky_bottom_nav" className="menu fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-sm h-[64px] bg-white/85 dark:bg-[#1e1e23]/85 backdrop-blur-md shadow-2xl shadow-black/15 dark:shadow-black/40 rounded-full grid grid-cols-4 items-center z-[80] md:!hidden px-2 border border-[var(--border)]" role="navigation">
    {menuItems.map((item, index) => {
      const isActive = item.value === activeTab;
      const IconComponent = item.icon;

      return (
        <button
          key={item.label}
          className={`menu__item ${isActive ? 'active' : ''}`}
          onClick={() => changeTabWithHaptic(item.value)}
          ref={(el) => { itemRefs.current[index] = el; }}
        >
          <div className="menu__icon">
            <IconComponent className="icon" />
          </div>
          <span
            ref={(el) => { textRefs.current[index] = el; }}
            className={`text-[9px] font-bold capitalize tracking-tight mt-0.5 transition-colors duration-200 ${isActive ? 'hidden' : 'inline-block text-[#94A3B8] dark:text-neutral-500'}`}
          >
            {item.label}
          </span>
          {item.value === "backlog" && dashboardStats.backlog > 0 && (
            <span className="absolute top-1.5 right-2.5 w-4.5 h-4.5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center font-mono z-10 shadow-sm border-2 border-white">
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
 className="absolute inset-0 bg-black/40 z-[90] pointer-events-auto transition-opacity animate-fade-in cursor-pointer"
 />
 )}
  <FixedBlockModal
    isOpen={activeBottomSheet === "fixed"}
    onClose={() => setActiveBottomSheet(null)}
    editingBlock={editingBlock}
    fixedForm={fixedForm}
    setFixedForm={setFixedForm}
    handleSubmitFixed={handleSubmitFixed}
  />

  {/* SHEET 2 — Add/Edit Flexible Task */}
  <FlexibleTaskModal
    isOpen={activeBottomSheet === "flexible"}
    onClose={() => setActiveBottomSheet(null)}
    editingTask={editingTask}
    TODAY={TODAY}
    flexibleForm={flexibleForm}
    setFlexibleForm={setFlexibleForm}
    classificationFeedback={classificationFeedback}
    isMetadataOpen={isMetadataOpen}
    setIsMetadataOpen={setIsMetadataOpen}
    flexibleTasks={flexibleTasks}
    handleTitleBlur={handleTitleBlur}
    handleSubmitFlexible={handleSubmitFlexible}
  />

  {/* Settings Modal */}
  <SettingsModal
    isOpen={showSettingsModal}
    onClose={() => setShowSettingsModal(false)}
    profileName={profileName}
    setProfileName={setProfileName}
    profileAge={profileAge}
    setProfileAge={setProfileAge}
    profileBio={profileBio}
    setProfileBio={setProfileBio}
    profileEmoji={profileEmoji}
    setProfileEmoji={setProfileEmoji}
    appSettings={appSettings}
    setAppSettings={setAppSettings}
    saveSettings={saveSettings}
    notificationPermission={notificationPermission}
    handleRequestNotifications={handleRequestNotifications}
    exportMyData={exportMyData}
    importMyData={importMyData}
    showDevTools={showDevTools}
    handleInjectMockMLData={handleInjectMockMLData}
    showDeleteConfirm={showDeleteConfirm}
    setShowDeleteConfirm={setShowDeleteConfirm}
    deleteConfirmText={deleteConfirmText}
    setDeleteConfirmText={setDeleteConfirmText}
    performDataWipe={performDataWipe}
    currentPath={currentPath}
    navigate={navigate}
    showToast={showToast}
    triggerHaptic={triggerHaptic}
  />

 {/* SHEET 3 — AI Copilot */}
 {(() => {
 const userPromptsCount = chatHistory.filter(m => m.sender === "user").length;
 const isCopilotFullScreen = userPromptsCount >= 3 && !copilotMinimized;
 return (
 <div 
 className={`fixed z-[100] bg-white dark:bg-[var(--bg-card)] transition-all duration-300 ease-in-out flex flex-col overflow-hidden ${ activeBottomSheet === "assistant" ? "opacity-100 pointer-events-auto translate-x-0 md:translate-x-0" : "opacity-0 pointer-events-none invisible translate-y-10 md:translate-y-0 md:translate-x-full" } ${ isCopilotFullScreen ? "top-0 bottom-0 left-0 right-0 w-full h-full max-h-screen md:max-w-3xl md:left-auto md:right-0 md:top-0 md:bottom-0 md:h-screen md:rounded-l-3xl md:rounded-r-none border border-neutral-200 dark:border-[var(--border)]/80 shadow-2xl p-6" : "bottom-0 left-0 right-0 max-h-[90vh] md:max-h-screen md:h-screen md:top-0 md:bottom-0 md:right-0 md:left-auto md:w-[380px] md:max-w-md md:rounded-l-3xl md:rounded-r-none border border-neutral-200 dark:border-[var(--border)]/80 shadow-2xl p-6 transform " + (activeBottomSheet === "assistant" ? "translate-y-0 md:translate-x-0" : "translate-y-full md:translate-x-full") }`}
 >
 {!isCopilotFullScreen && (
 <div className="flex justify-center pb-3">
 <span className="w-10 h-1 bg-neutral-200 dark:bg-[var(--bg-card-hover)] rounded-full" />
 </div>
 )}
 <div className="flex-1 overflow-y-auto">
 {renderCopilotContent(false)}
 </div>
 </div>
 );
 })()}

 {/* SHEET 5 — End of Day Review */}
  <EodCheckinModal
    isOpen={activeBottomSheet === "eodreview"}
    onClose={() => setActiveBottomSheet(null)}
    todayIncompleteTasks={todayIncompleteTasks}
    staleTasks={staleTasks}
    handleEodMoveToTomorrow={handleEodMoveToTomorrow}
    handleEodReduceAndTomorrow={handleEodReduceAndTomorrow}
    handleEodKeepStale={handleEodKeepStale}
    handleDeleteFlexible={handleDeleteFlexible}
  />

 {/* SHEET 6 — Profile Creator / Editor */}
  <ProfileModal
    isOpen={activeBottomSheet === "profile"}
    onClose={() => setActiveBottomSheet(null)}
    editingProfile={editingProfile}
    profileForm={profileForm}
    setProfileForm={setProfileForm}
    profileBlockForm={profileBlockForm}
    setProfileBlockForm={setProfileBlockForm}
    handleAddProfileBlock={handleAddProfileBlock}
    handleRemoveProfileBlock={handleRemoveProfileBlock}
    handleSaveProfile={handleSaveProfile}
  />

 {/* SHEET 7 — Goal Creator / Editor */}
 <div 
 className={`absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-[var(--bg-card)] border border-transparent shadow-2xl p-6 z-[100] overflow-y-auto transform transition-all duration-300 ease-out flex flex-col text-slate-800 dark:text-[var(--text-primary)] ${ activeBottomSheet === "goal" ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" : "translate-y-full md:translate-y-10 md:scale-95 opacity-0 pointer-events-none invisible" }`}
 >
 <div className="flex justify-center pb-3">
 <span className="w-10 h-1 bg-neutral-200 dark:bg-[var(--bg-card-hover)] rounded-full" />
 </div>

 <div className="flex items-center justify-between mb-2">
 <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-1.5">
 <Target className="w-5 h-5 text-primary shrink-0" />
 <span>{editingGoal ? "Edit Goal" : "Create Goal"}</span>
 </h3>
 <button 
 type="button" 
 onClick={() => setActiveBottomSheet(null)}
 className="p-1 rounded-full bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
 >
 <X className="w-4 h-4" />
 </button>
 </div>

 <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4 font-sans">
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
 className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
 required
 />
 </div>

 <div className="grid grid-cols-2 gap-3">
 <div>
 <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Category</label>
 <select
 value={goalForm.category}
 onChange={(e) => setGoalForm({ ...goalForm, category: e.target.value as GoalCategory })}
 className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
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
 className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
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
 className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
 />
 </div>
 <div>
 <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Target Value</label>
 <input 
 type="number" 
 step="any"
 value={goalForm.targetValue}
 onChange={(e) => setGoalForm({ ...goalForm, targetValue: parseFloat(e.target.value) || 1 })}
 className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
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
 className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none font-mono"
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
 className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
 />
 </div>

 <div>
 <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Description (Optional)</label>
 <textarea 
 value={goalForm.description}
 onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
 placeholder="Describe your motivation or specifics..."
 rows={2}
 className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none font-sans"
 />
 </div>
 </div>

 <div className="pt-4 border-t border-[var(--border)] dark:border-[var(--border)] flex gap-2 shrink-0">
 <button 
 type="button"
 onClick={() => setActiveBottomSheet(null)}
 className="flex-1 py-3 text-sm font-bold rounded-xl border border-[var(--border-strong)] dark:border-[var(--border)] transition-colors cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-center"
 >
 Discard
 </button>
 <button 
 type="button"
 onClick={handleSaveGoal}
 className="flex-1 py-3 text-sm font-bold rounded-xl bg-primary-gradient hover:opacity-90 text-white transition-colors cursor-pointer text-center font-display"
 >
 {editingGoal ? "Save Changes" : "Create Goal"}
 </button>
 </div>
 </div>

 {/* AI PROPOSAL CONFIRMATION OVERLAY */}
 {showConfirmationOverlay && aiReasoningResult && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
 <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl p-6 max-w-md w-full border border-neutral-150 dark:border-[var(--border)] shadow-2xl text-left space-y-4 animate-scale-up">
 <div className="flex items-center gap-2.5">
 <div className="p-2.5 bg-indigo-50 rounded-2xl text-primary shrink-0">
 <Sparkles className="w-5 h-5 fill-primary/10" />
 </div>
 <div>
 <h3 className="font-display font-black text-md text-[var(--text-primary)]">AI Schedule Proposals</h3>
 <div className="flex items-center gap-1.5 mt-0.5">
 <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${ aiReasoningResult.proposalRisk === "high" ? "bg-rose-500/10 text-rose-500" : "bg-amber-500/10 text-amber-500" }`}>
 {aiReasoningResult.proposalRisk} Risk
 </span>
 </div>
 </div>
 </div>

 <div className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] leading-relaxed bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] p-3.5 rounded-2xl border border-[var(--border)] dark:border-[var(--border)]">
 {aiReasoningResult.message}
 </div>

 <div className="space-y-2">
 <label className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider">Proposed Actions</label>
 <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
 {aiReasoningResult.proposals.map((p, idx) => {
 if (p.type === "abstain") {
 return (
 <div key={idx} className="p-2.5 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] rounded-xl text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] italic border border-[var(--border)] dark:border-[var(--border)]">
 Abstain: {p.reason}
 </div>
 );
 }
 if (p.type === "suggest" || p.type === "ask") {
 return (
 <div key={idx} className="p-2.5 bg-violet-50/50 dark:bg-violet-950/20 rounded-xl text-xs text-violet-700 dark:text-violet-400 border border-violet-100/50 dark:border-violet-900/30">
 💡 Coaching Suggestion: {p.type === "ask" ? (p as any).question : (p as any).message}
 </div>
 );
 }
 
 const targetTask = flexibleTasks.find(t => t.id === (p as any).taskId);
 return (
 <div key={idx} className="flex items-start gap-2.5 p-3 bg-white dark:bg-[var(--bg-card)] border border-neutral-150 dark:border-[var(--border)] rounded-2xl text-xs">
 <div className="mt-0.5 font-bold uppercase text-[9px] px-1.5 py-0.5 rounded bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] shrink-0">
 {p.type.replace("_", " ")}
 </div>
 <div className="flex-1 min-w-0">
 <div className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate">
 {targetTask ? targetTask.title : "Unknown task"}
 </div>
 <div className="text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] mt-0.5">
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
 className="flex-1 py-3 text-xs font-bold rounded-2xl border border-[var(--border-strong)] dark:border-[var(--border)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] transition-colors cursor-pointer text-center"
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
 className="flex-1 py-3 text-xs font-bold rounded-2xl bg-primary-gradient hover:opacity-90 text-white transition-colors cursor-pointer text-center font-display"
 >
 Apply proposals
 </button>
 </div>
 </div>
 </div>
 )}

 {/* DAY SUMMARY POPUP REMINDER */}
 {showDaySummaryReminder && (
 <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in">
 <div className="bg-white dark:bg-[var(--bg-card)] rounded-3xl p-6 max-w-sm w-full border border-neutral-150 dark:border-[var(--border)] shadow-2xl text-center space-y-4.5 animate-scale-up">
 <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-650 text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
 <Sparkles className="w-6 h-6 fill-white/10" />
 </div>
 <div className="space-y-1.5">
 <h3 className="font-display font-black text-lg text-[var(--text-primary)]">Wrap up your day! 🌟</h3>
 <p className="text-xs text-[var(--text-secondary)] leading-relaxed font-medium">
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
 className="w-full py-2.5 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] rounded-2xl text-xs font-semibold transition-all active:scale-97 cursor-pointer"
 >
 I'll do it later
 </button>
 </div>
 </div>
 </div>
 )}

   {/* BACKLOG GROOMING ASSISTANT MODAL */}
  {groomingRecommendation && (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-[999] animate-fade-in">
      <div className="bg-white dark:bg-[var(--bg-card)] border border-neutral-150 dark:border-[var(--border)] rounded-3xl p-6 max-w-md w-full shadow-2xl flex flex-col gap-4.5 animate-scale-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center text-2xl shrink-0">
            🧹
          </div>
          <div>
            <h3 className="text-md font-bold text-[var(--text-primary)]">Clean Up Your Backlog</h3>
            <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold font-mono">Backlog Grooming Assistant</p>
          </div>
        </div>
        
        <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] leading-relaxed">
          We detected <strong>{groomingRecommendation.count} older duplicate</strong> instances of your task <strong>"{groomingRecommendation.title}"</strong> piling up in your backlog.
        </p>
        
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 rounded-2xl text-[11px] flex gap-2 font-medium">
          <span>💡</span>
          <span>Shifting backlog duplicates to the <strong>Dropped</strong> tab keeps your active lists focused and prevents the scheduler from piling multiple copies on the same day.</span>
        </div>

        <div className="flex gap-2.5 justify-end mt-1.5">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("dayflow_backlog_groomed", "true");
              setGroomingRecommendation(null);
            }}
            className="px-4 py-2 border border-neutral-250 dark:border-[var(--border)] text-xs font-bold rounded-xl bg-transparent hover:bg-neutral-50 dark:hover:bg-zinc-800 text-[var(--text-secondary)] dark:text-[var(--text-secondary)] transition-colors cursor-pointer"
          >
            Keep Them
          </button>
          <button
            type="button"
            onClick={() => {
              const idsToDrop = new Set(groomingRecommendation.ids);
              setFlexibleTasks(prev => {
                const updated = prev.map(t => {
                  if (idsToDrop.has(t.id)) {
                    return {
                      ...t,
                      status: "skipped" as const,
                      backlog_shifted_at: new Date().toISOString(),
                      field_timestamps: {
                        ...t.field_timestamps,
                        status: new Date().toISOString()
                      }
                    };
                  }
                  return t;
                });
                saveFlexibleTasks(updated);
                return updated;
              });
              sessionStorage.setItem("dayflow_backlog_groomed", "true");
              setGroomingRecommendation(null);
              showToast(`Moved ${groomingRecommendation.count} duplicate tasks to the Dropped tab.`, "success");
            }}
            className="px-4 py-2 bg-primary-gradient text-white text-xs font-bold rounded-xl transition-all hover:scale-[1.02] cursor-pointer"
          >
            Drop Duplicates
          </button>
        </div>
      </div>
    </div>
  )}

    {/* CLOUD SIGN IN ENGAGEMENT POPUP */}
  {showSyncPromptModal && (
    <div 
      onClick={() => {
        localStorage.setItem("dayflow_last_sync_prompt_date", TODAY);
        setShowSyncPromptModal(false);
      }}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-[9999] flex items-center justify-center p-4 animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking modal content
        className="bg-white dark:bg-[var(--bg-card)] border border-neutral-150 dark:border-[var(--border)] rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 animate-scale-up relative"
      >
        {/* Close Button X */}
        <button
          onClick={() => {
            localStorage.setItem("dayflow_last_sync_prompt_date", TODAY);
            setShowSyncPromptModal(false);
          }}
          className="absolute top-4 right-4 p-1 rounded-full bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 text-[var(--text-secondary)] dark:text-[var(--text-primary)] cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-primary-gradient text-white flex items-center justify-center mx-auto shadow-lg shadow-primary/20 text-xl">
          ☁️
        </div>
        
        <div className="space-y-1.5">
          <h3 className="font-display font-black text-lg text-[var(--text-primary)]">Secure Your Focus Flows ☁️</h3>
          <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] leading-relaxed font-medium">
            You've been tracking your daily flows for a few days! Backup your tasks, projects, routines, and goals automatically on the cloud to prevent losing data.
          </p>
        </div>

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="button"
            onClick={async () => {
              localStorage.setItem("dayflow_last_sync_prompt_date", TODAY);
              setShowSyncPromptModal(false);
              try {
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: {
                    redirectTo: window.location.origin
                  }
                });
              } catch (err: any) {
                console.error("Auth error", err);
                showToast(err.message || "Failed to initiate sign in", "warning");
              }
            }}
            className="w-full py-3 bg-primary-gradient hover:opacity-95 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-primary/10 cursor-pointer"
          >
            Sign In with Google
          </button>
          <button
            type="button"
            onClick={() => {
              localStorage.setItem("dayflow_last_sync_prompt_date", TODAY);
              setShowSyncPromptModal(false);
            }}
            className="w-full py-2.5 bg-transparent hover:bg-neutral-50 dark:hover:bg-zinc-800 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] rounded-2xl text-xs font-semibold transition-all cursor-pointer"
          >
            Continue Offline
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
