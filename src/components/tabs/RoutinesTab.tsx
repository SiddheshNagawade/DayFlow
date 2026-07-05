import React from "react";
import {
  User,
  Settings as SettingsIcon,
  Zap,
  Target,
  Flame,
  Lock,
  Sparkles,
  Plus,
  Info,
  ChevronDown,
  ChevronRight,
  Edit2,
  Trash2,
  Calendar,
  Check,
  Brain,
  BarChart2,
  Clock,
  AlertCircle,
  RefreshCw,
  X,
  Award,
  TrendingUp,
  Moon,
  HelpCircle,
  Heart,
  Trophy,
  BookMarked,
  Circle,
  CheckCircle2,
  FolderKanban,
  Briefcase,
  Pause,
  Play,
  ChevronLeft,
  Grid
} from "lucide-react";
import { FlexibleTask, FixedBlock, RoutineBlock, UserGoal, Achievement, TaskExecutionLog, ReflectionEvent, WeightEntry, Project , createFieldTimestamps } from "../../types";
import { AppSettings } from "../../utils/storage";
import { predictGoalCompletion, suggestGoalsFromTaskHistory } from "../../utils/goalEngine";
import { generatePersonalOperatingManual } from "../../utils/mlEngine";

interface RoutinesTabProps {
  appSettings: AppSettings;
  profileName: string;
  profileEmoji: string;
  profileAge: string;
  profileBio: string;
  routineProfiles: import("../../types").RoutineProfile[];
  setRoutineProfiles: React.Dispatch<React.SetStateAction<import("../../types").RoutineProfile[]>>;
  activeRoutineProfileId: string;
  setActiveRoutineProfileId: (id: string) => void;
  totalCompletedTasks: number;
  flexibleTasks: FlexibleTask[];
  fixedBlocks: FixedBlock[];
  routineBlocks: RoutineBlock[];
  setRoutineBlocks: React.Dispatch<React.SetStateAction<RoutineBlock[]>>;
  goals: UserGoal[];
  achievements: Achievement[];
  taskExecutionLogs: TaskExecutionLog[];
  reflectionEvents: ReflectionEvent[];
  weightLog: WeightEntry[];
  selectedDate: string;
  TODAY: string;
  completedStreak: number;
  calibrationProfile: any;
  ubmInsights: any;
  behaviorSignals: any;
  evalHistory: any[];
  futurePredictions: Record<string, any>;
  profileViewTab: string;
  currentPath: string;
  projects: Project[];
  daySchedule: { items: any[] };
  handleOpenAICopilot: () => void;
  setCopilotInput: (val: string) => void;
  showToast: (msg: string, type?: "success" | "info" | "warning") => void;
  triggerHaptic: (pattern: number | number[]) => void;
  navigate: (path: string) => void;
  setShowSettingsModal: (val: boolean) => void;
  handleOpenAddFlexible: (isToday: boolean) => void;
  handleUpdateProjects: (newProjects: Project[]) => void;
  handleAutoScheduleProject: (proj: Project) => void;
  handleOpenCreateGoal: (initialValues?: any) => void;
  handleToggleGoalPause: (goalId: string) => void;
  handleOpenEditGoal: (goal: any) => void;
  handleDeleteGoal: (goalId: string) => void;
  setReflectionEvents: React.Dispatch<React.SetStateAction<ReflectionEvent[]>>;
  saveReflectionEvents: (events: ReflectionEvent[]) => void;
}

export const RoutinesTab: React.FC<RoutinesTabProps> = React.memo(({
  appSettings,
  profileName,
  profileEmoji,
  profileAge,
  profileBio,
  routineProfiles,
  setRoutineProfiles,
  activeRoutineProfileId,
  setActiveRoutineProfileId,
  totalCompletedTasks,
  flexibleTasks,
  fixedBlocks,
  routineBlocks,
  setRoutineBlocks,
  goals,
  achievements,
  taskExecutionLogs,
  reflectionEvents,
  weightLog,
  selectedDate,
  TODAY,
  completedStreak,
  calibrationProfile,
  ubmInsights,
  behaviorSignals,
  evalHistory,
  futurePredictions,
  profileViewTab,
  currentPath,
  projects,
  daySchedule,
  handleOpenAICopilot,
  setCopilotInput,
  showToast,
  triggerHaptic,
  navigate,
  setShowSettingsModal,
  handleOpenAddFlexible,
  handleUpdateProjects,
  handleAutoScheduleProject,
  handleOpenCreateGoal,
  handleToggleGoalPause,
  handleOpenEditGoal,
  handleDeleteGoal,
  setReflectionEvents,
  saveReflectionEvents
}) => {
  const personalManualInsights = React.useMemo(() => {
    return generatePersonalOperatingManual(flexibleTasks);
  }, [flexibleTasks]);

  const [editingRoutineBlockId, setEditingRoutineBlockId] = React.useState<string | null>(null);
  const [showAddRoutineForm, setShowAddRoutineForm] = React.useState(false);
  const [showAddProfileModal, setShowAddProfileModal] = React.useState(false);
  const [newProfileName, setNewProfileName] = React.useState("");

  const handleSaveProfile = () => {
    if (!newProfileName.trim()) return;
    const newId = `profile-${Date.now()}`;
    const newProfile = {
      id: newId,
      name: newProfileName.trim()
    };
    setRoutineProfiles(prev => [...prev, newProfile]);
    setActiveRoutineProfileId(newId);
    setNewProfileName("");
    setShowAddProfileModal(false);
    showToast(`Profile "${newProfile.name}" created!`, "success");
    triggerHaptic(30);
  };

  const handleDeleteProfile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const prof = routineProfiles.find(p => p.id === id);
    if (prof?.isDefault) {
      showToast("Cannot delete default profiles!", "warning");
      return;
    }
    setRoutineProfiles(prev => prev.filter(p => p.id !== id));
    setRoutineBlocks(prev => prev.filter(b => b.profileId !== id));
    if (activeRoutineProfileId === id) {
      setActiveRoutineProfileId("regular");
    }
    showToast("Profile deleted.", "info");
    triggerHaptic(20);
  };
  const [routineBlockForm, setRoutineBlockForm] = React.useState({
    title: "",
    startTime: "09:00",
    endTime: "10:00",
    daysOfWeek: [1, 2, 3, 4, 5] as number[],
    type: "custom" as "sleep" | "class" | "meal" | "commute" | "custom",
    rigidity: "soft" as "hard" | "soft"
  });

  const formatCause = (cause: string) => {
    if (!cause) return "General reflection";
    return cause.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
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
        rigidity: routineBlockForm.rigidity,
        profileId: r.profileId || activeRoutineProfileId
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
        rigidity: routineBlockForm.rigidity,
        profileId: activeRoutineProfileId
      };
      setRoutineBlocks(prev => [...prev, newBlock]);
      showToast("Routine block created!", "success");
    }
    const resetForm = {
      title: "",
      startTime: "09:00",
      endTime: "10:00",
      daysOfWeek: [1, 2, 3, 4, 5] as number[],
      type: "custom" as "sleep" | "class" | "meal" | "commute" | "custom",
      rigidity: "soft" as "hard" | "soft"
    };
    setRoutineBlockForm(resetForm);
    setShowAddRoutineForm(false);
    setEditingRoutineBlockId(null);
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

  const calibrationPercentage = React.useMemo(() => {
    return Math.min(Math.round((calibrationProfile.totalCompletions / 15) * 100), 100);
  }, [calibrationProfile]);

  const frictionReport = React.useMemo(() => {
    const frictionCounts: Record<string, number> = {
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

    const categoriesMap: Record<string, string> = {
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

  const recentReflections = React.useMemo(() => {
    return [...reflectionEvents]
      .sort((a, b) => b.id.localeCompare(a.id))
      .slice(0, 7);
  }, [reflectionEvents]);

  const sortedWeightLog = React.useMemo(() => {
    return [...weightLog].sort((a, b) => a.date.localeCompare(b.date));
  }, [weightLog]);

  const sparklinePoints = React.useMemo(() => {
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

  const executionScore = React.useMemo(() => {
    const todayFlex = daySchedule.items.filter(i => i.type === "flexible");
    if (todayFlex.length === 0) return null;
    const done = todayFlex.filter(i => i.status === "done").length;
    return { score: Math.round((done / todayFlex.length) * 100), done, total: todayFlex.length };
  }, [daySchedule.items]);

  const momentumState = React.useMemo((): "high" | "stable" | "low" => {
    const score = executionScore?.score ?? 0;
    if (completedStreak >= 5 && score >= 75) return "high";
    if (completedStreak >= 2 && score >= 50) return "stable";
    return "low";
  }, [completedStreak, executionScore]);

  return (
    <div className="tab-pane flex flex-col p-4 pt-3 pb-28 md:p-6 lg:p-8 md:pt-6 md:pb-8 bg-[var(--bg-page)] text-slate-800 dark:text-[var(--text-primary)] relative">
      <div className="flex flex-col gap-6 md:gap-8 max-w-4xl mx-auto w-full">
      
        {/* ── Instagram-style Profile Header ─────────────────── */}
        {/* Single horizontal row: avatar left, everything right */}
        <div className="flex flex-row items-start gap-4 pb-5 border-b border-[var(--border-strong)] dark:border-[var(--border)] relative">

          {/* Settings gear — absolute top-right, never pushes layout */}
          <button 
            onClick={() => {
              setShowSettingsModal(true);
              triggerHaptic(15);
            }}
            className="absolute top-0 right-0 p-2 rounded-xl bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 text-[var(--text-secondary)] dark:text-[var(--text-primary)] transition-all cursor-pointer z-10"
            title="Settings"
          >
            <SettingsIcon className="w-4.5 h-4.5" />
          </button>

          {/* Left: Avatar */}
          <div className="shrink-0">
            <div className="w-[72px] h-[72px] md:w-24 md:h-24 rounded-full bg-gradient-to-tr from-[#7F77DD] via-[#A894FF] to-[#14B8A6] p-[2.5px] flex items-center justify-center shadow-md">
              <div className="w-full h-full rounded-full bg-white dark:bg-[var(--bg-card)] flex items-center justify-center text-[2rem] md:text-[2.5rem] select-none">
                {profileEmoji || "👨‍💻"}
              </div>
            </div>
          </div>

          {/* Right: Name, stats, bio — stacked vertically */}
          <div className="flex-1 min-w-0 pr-10 space-y-1.5 pt-1">
            {/* Name + age pill on same line */}
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold tracking-tight text-[var(--text-primary)] font-display leading-tight">{profileName || "Guest"}</h2>
              {profileAge && (
                <span className="px-2 py-0.5 text-[10px] bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] text-[var(--text-tertiary)] rounded-full font-semibold shrink-0">
                  {profileAge} yrs
                </span>
              )}
            </div>

            {/* Stats row — always visible, compact */}
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-start">
                <span className="font-extrabold text-sm leading-none text-[var(--text-primary)]">{totalCompletedTasks}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] leading-none mt-0.5">tasks done</span>
              </div>
              <div className="w-px h-5 bg-[var(--border-strong)] dark:bg-[var(--border)]" />
              <div className="flex flex-col items-start">
                <span className="font-extrabold text-sm leading-none text-[var(--text-primary)]">{routineBlocks.length}</span>
                <span className="text-[10px] text-[var(--text-tertiary)] leading-none mt-0.5">routines</span>
              </div>
              <div className="w-px h-5 bg-[var(--border-strong)] dark:bg-[var(--border)]" />
              <div className="flex flex-col items-start">
                <span className="font-extrabold text-sm leading-none text-[var(--text-primary)]">{completedStreak}d</span>
                <span className="text-[10px] text-[var(--text-tertiary)] leading-none mt-0.5">streak</span>
              </div>
            </div>

            {/* Bio */}
            {profileBio && (
              <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed font-sans line-clamp-2">{profileBio}</p>
            )}
          </div>
        </div>  {/* Tab switcher: Analytics vs Routines vs Projects vs Goals */}
  <div className="flex justify-center border-b border-neutral-200 dark:border-zinc-700/60 pb-px">
    <div className="flex gap-6 sm:gap-8 overflow-x-auto max-w-full no-scrollbar">
      <button 
        onClick={() => {
          navigate("/routines");
          triggerHaptic(12);
        }}
        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${ profileViewTab === "insights" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-650 dark:text-[var(--text-primary)]" }`}
      >
        <TrendingUp className="w-3.5 h-3.5" />
        <span>Analytics</span>
      </button>
      <button 
        onClick={() => {
          navigate("/routines/editor");
          triggerHaptic(12);
        }}
        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${ profileViewTab === "routines" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-650 dark:text-[var(--text-primary)]" }`}
      >
        <Grid className="w-3.5 h-3.5" />
        <span>Routines</span>
      </button>
      <button 
        onClick={() => {
          navigate("/projects");
          triggerHaptic(12);
        }}
        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${ profileViewTab === "projects" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-650 dark:text-[var(--text-primary)]" }`}
      >
        <FolderKanban className="w-3.5 h-3.5" />
        <span>Projects</span>
      </button>
      <button 
        onClick={() => {
          navigate("/goals");
          triggerHaptic(12);
        }}
        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 shrink-0 ${ profileViewTab === "goals" ? "border-primary text-primary" : "border-transparent text-neutral-400 hover:text-neutral-650 dark:text-[var(--text-primary)]" }`}
      >
        <Target className="w-3.5 h-3.5" />
        <span>Goals</span>
      </button>
    </div>
  </div>

 {/* Tab Content */}
 
        {profileViewTab === "insights" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
            {/* Section B: Daily Execution Summary */}
            {executionScore !== null && (
              <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-5 space-y-3.5 font-sans">
                <h4 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
                  <Flame className="w-3.5 h-3.5 text-orange-500 fill-orange-500/10" /> Daily Execution & Momentum
                </h4>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-2xl font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{executionScore.score}%</span>
                    <span className="block text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Tasks: {executionScore.done} / {executionScore.total} completed</span>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${ momentumState === "high" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : momentumState === "stable" ? "bg-amber-50 text-amber-700 border border-amber-100" : "bg-red-50 text-red-700 border border-red-100" }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${ momentumState === "high" ? "bg-emerald-500" : momentumState === "stable" ? "bg-amber-500" : "bg-red-500" }`} />
                      {momentumState === "high" ? "High Momentum" : momentumState === "stable" ? "Steady" : "Behind"}
                    </span>
                  </div>
                </div>
                <div className="w-full h-1.5 bg-[var(--bg-card-hover)] rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${ momentumState === "high" ? "bg-emerald-500" : momentumState === "stable" ? "bg-amber-500" : "bg-red-500" }`}
                    style={{ width: `${executionScore.score}%` }}
                  />
                </div>
              </div>
            )}

            {/* Section C: AI Calibration */}
            <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-5 space-y-3 font-sans">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-amber-500/10 animate-pulse" /> Circadian Calibration Matrix
                </h4>
                <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono ${ calibrationProfile.phase === 2 ? "bg-emerald-50 text-emerald-700 border border-emerald-200/50 animate-pulse" : "bg-amber-50 text-amber-700 border border-amber-200/50" }`}>
                  {calibrationProfile.phase === 2 ? "Phase 2: Calibrated" : "Phase 1: Defaults"}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">
                  <span>Calibration Status ({calibrationProfile.totalCompletions} / 15 tasks):</span>
                  <span className="font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)]">{calibrationPercentage}%</span>
                </div>
                <div className="w-full h-2 bg-[var(--bg-card-hover)] rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full transition-all duration-700 ease-out" style={{ width: `${calibrationPercentage}%` }} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-neutral-50 dark:bg-zinc-850/50 border border-transparent p-2.5 rounded-xl">
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Peak Focus Time</span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)] capitalize flex items-center gap-1 mt-0.5">
                    {calibrationProfile.peakFocusTime === "morning" && <Clock className="w-3.5 h-3.5 text-primary" />}
                    {calibrationProfile.peakFocusTime === "afternoon" && <Sparkles className="w-3.5 h-3.5 text-amber-500" />}
                    {calibrationProfile.peakFocusTime === "evening" && <Moon className="w-3.5 h-3.5 text-indigo-750" />}
                    {calibrationProfile.peakFocusTime} focus
                  </span>
                </div>
                <div className="bg-neutral-50 dark:bg-zinc-850/50 border border-transparent p-2.5 rounded-xl">
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Underestimate Multiplier</span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-mono mt-0.5 block">
                    {calibrationProfile.underestimateRatio.toFixed(2)}x duration
                  </span>
                </div>
                <div className="bg-neutral-50 dark:bg-zinc-850/50 border border-transparent p-2.5 rounded-xl">
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Adaptive Work Gap</span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-mono mt-0.5 block">
                    {calibrationProfile.optimalWorkGap} minutes
                  </span>
                </div>
                <div className="bg-neutral-50 dark:bg-zinc-850/50 border border-transparent p-2.5 rounded-xl">
                  <span className="block text-[9px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Post-Exercise Gap</span>
                  <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)] font-mono mt-0.5 block">
                    {calibrationProfile.exerciseRecoveryGap} minutes
                  </span>
                </div>
              </div>
            </div>

            {/* Section D: Weekly Performance History */}
            <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-5 space-y-4 md:col-span-2">
              <h3 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
                <TrendingUp className="w-4 h-4 text-primary" /> Weekly Snapshots
              </h3>
              {evalHistory.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-250/70 rounded-2xl bg-[var(--bg-page)] ">
                  <Award className="w-8 h-8 text-neutral-350 mx-auto mb-2" />
                  <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] block font-semibold">No performance snapshots available yet</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {evalHistory.map((snap) => {
                    const formattedDate = new Date(snap.weekStart).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    const adherence = snap.aiSuggestionAcceptanceRate;
                    const accuracyDiffPct = Math.round((1 - snap.planningAccuracy) * 100);
                    const accuracyLabel = accuracyDiffPct > 0 
                      ? `Underestimate by ${accuracyDiffPct}%` 
                      : accuracyDiffPct < 0 
                        ? `Overestimate by ${Math.abs(accuracyDiffPct)}%` 
                        : "On target";
                    
                    const pushPct = Math.round(snap.carryOverRate * 100);
                    const pushLabel = `${pushPct}% tasks pushed`;

                    return (
                      <div key={snap.weekStart} className="border border-[var(--border)] dark:border-[var(--border)] bg-neutral-50 dark:bg-zinc-800/30 rounded-2xl p-4 space-y-3 hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 transition-colors">
                        <div className="flex items-center justify-between border-b border-[var(--border)] dark:border-[var(--border)] pb-2">
                          <span className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] font-display">Week of {formattedDate}</span>
                          <span className="text-[10px] font-mono font-bold bg-primary-light text-primary px-2 py-0.5 rounded-full">
                            🔥 {snap.streakDays}d Streak
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                          <div>
                            <span className="block text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-0.5">Completion</span>
                            <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] font-mono">{Math.round(snap.completionRate * 100)}%</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-0.5">Tasks Pushed</span>
                            <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] font-mono">{pushLabel}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-0.5">Time Accuracy</span>
                            <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] font-mono">{accuracyLabel}</span>
                          </div>
                          <div>
                            <span className="block text-[9px] text-[var(--text-tertiary)] font-bold uppercase tracking-wider mb-0.5">AI Adherence</span>
                            <span className="font-bold text-indigo-600 font-mono">
                              {adherence === 1.0 && !localStorage.getItem("dayflow_ai_suggestion_events") ? "N/A" : `${Math.round(adherence * 100)}%`}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section E: Weekly Friction Report */}
            {frictionReport && (
              <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-5 space-y-4 text-left">
                <h3 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
                  <Zap className="w-4 h-4 text-amber-500 fill-amber-500/10" /> Weekly Friction Report
                </h3>
                <div className="space-y-3">
                  {frictionReport.report.map((item) => (
                    <div key={item.key} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span className="text-[var(--text-primary)]">${item.label}</span>
                        <span className="text-amber-600 font-mono">${item.percentage}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-neutral-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                        <div className="h-full bg-amber-500 rounded-full" style={{ width: `${item.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="text-xs bg-amber-50/50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 p-3 rounded-2xl leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
                  💡 <strong>Coach Insight:</strong> ${frictionReport.insight}
                </div>
              </div>
            )}

            {/* Section F: Reflection History */}
            <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-5 space-y-4 text-left">
              <h3 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
                <BookMarked className="w-4 h-4 text-primary" /> Recent Reflections
              </h3>
              {recentReflections.length === 0 ? (
                <div className="text-center py-4 text-xs text-[var(--text-tertiary)] italic">
                  No reflections recorded yet. Reflect daily in the Today view!
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {recentReflections.map((refl) => (
                    <div key={refl.id} className="p-3 bg-neutral-50 dark:bg-zinc-800/30 rounded-2xl border border-[var(--border)] space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold text-[var(--text-tertiary)] font-mono">
                        <span>${new Date(refl.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                        <span className={`px-2 py-0.5 rounded-full uppercase ${ refl.type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700" }`}>
                          ${refl.type}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">
                        ${refl.notes || formatCause(refl.cause)}
                      </p>
                      {refl.notes && refl.cause && (
                        <span className="text-[10px] italic text-[var(--text-tertiary)] block">
                          Blocker: ${formatCause(refl.cause)}
                        </span>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => {
                      if (confirm("Clear your reflection history?")) {
                        setReflectionEvents([]);
                        saveReflectionEvents([]);
                      }
                    }}
                    className="text-[10px] text-rose-500 font-bold hover:underline cursor-pointer block text-right mt-1 w-full"
                  >
                    Clear reflection history
                  </button>
                </div>
              )}
            </div>

            {/* Section G: Fitness Tracking */}
            {sortedWeightLog.length > 0 ? (
              <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-5 space-y-4 text-left">
                <h3 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
                  <Heart className="w-4 h-4 text-rose-500 fill-rose-500/10" /> Fitness & Weight Trend
                </h3>
                {(() => {
                  const earliest = sortedWeightLog[0];
                  const latest = sortedWeightLog[sortedWeightLog.length - 1];
                  const diff = latest.weight - earliest.weight;
                  const diffStr = diff > 0 ? '+' + diff.toFixed(1) + 'kg' : diff.toFixed(1) + 'kg';
                  const timeWeeks = Math.max(1, Math.round((new Date(latest.date).getTime() - new Date(earliest.date).getTime()) / (1000 * 60 * 60 * 24 * 7)));
                  const points = sparklinePoints;

                  return (
                    <div className="space-y-4">
                      <div className="flex items-baseline gap-2.5">
                        <span className="text-2xl font-bold text-[var(--text-primary)]">${latest.weight} kg</span>
                        <span className={`text-xs font-bold ${ diff > 0 ? "text-rose-500" : "text-emerald-600" }`}>
                          ${diffStr} in ${timeWeeks} ${timeWeeks === 1 ? "week" : "weeks"}
                        </span>
                      </div>
                      
                      {points && (
                        <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                          <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase font-mono">Weight Sparkline (last 8 logs)</span>
                          <svg className="w-28 h-8 text-primary overflow-visible animate-pulse" viewBox="0 0 100 30">
                            <polyline
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points={points}
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-5 text-center space-y-2 text-left">
                <h3 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
                  <Heart className="w-4 h-4 text-rose-500" /> Fitness Tracking
                </h3>
                <p className="text-xs text-[var(--text-tertiary)] italic leading-relaxed font-sans">
                  No weight telemetry recorded. Tell Day Coach to "log my weight as 70kg" to track body weight trends automatically!
                </p>
              </div>
            )}
          </div>
        )}

        {profileViewTab === "routines" && (() => {

          return (
            <div className="space-y-5 text-left animate-fade-in">

               {/* ── Add / Edit Routine Block Modal Overlay ─────────── */}
              {(showAddRoutineForm || editingRoutineBlockId) && (
                <div className="fixed inset-0 bg-white dark:bg-zinc-900 z-[120] flex flex-col animate-slide-up">
                  {/* Full-screen top navigation bar */}
                  <header className="h-[64px] border-b border-zinc-150 dark:border-zinc-800 px-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
                    <button
                      onClick={() => {
                        setShowAddRoutineForm(false);
                        setEditingRoutineBlockId(null);
                        setRoutineBlockForm({ title: "", startTime: "09:00", endTime: "10:00", daysOfWeek: [1, 2, 3, 4, 5], type: "custom", rigidity: "soft" });
                      }}
                      className="flex items-center gap-1.5 py-2 text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer font-bold text-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      {editingRoutineBlockId ? "Edit Routine" : "New Routine Block"}
                    </span>
                    <div className="w-12"></div>
                  </header>

                  {/* Body container */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="space-y-4">
                      {/* Routine Title */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Routine Title</label>
                        <input 
                          type="text"
                          placeholder="e.g. Lunch Break, Gym Prep"
                          value={routineBlockForm.title}
                          onChange={e => setRoutineBlockForm({ ...routineBlockForm, title: e.target.value })}
                          className="w-full px-4 py-3 border border-zinc-250 dark:border-zinc-700 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-all"
                        />
                      </div>

                      {/* Routine Type */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Routine Type</label>
                        <select
                          value={routineBlockForm.type}
                          onChange={e => setRoutineBlockForm({ ...routineBlockForm, type: e.target.value as any })}
                          className="w-full px-4 py-3 border border-zinc-250 dark:border-zinc-700 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-all"
                        >
                          <option value="sleep">💤 Sleep</option>
                          <option value="class">🎓 Class / Work</option>
                          <option value="meal">🍽️ Meal</option>
                          <option value="commute">🚗 Commute</option>
                          <option value="custom">⚙️ Custom</option>
                        </select>
                      </div>

                      {/* Time grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Start Time</label>
                          <input 
                            type="time"
                            value={routineBlockForm.startTime}
                            onChange={e => setRoutineBlockForm({ ...routineBlockForm, startTime: e.target.value })}
                            className="w-full px-4 py-3 border border-zinc-250 dark:border-zinc-700 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-all"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">End Time</label>
                          <input 
                            type="time"
                            value={routineBlockForm.endTime}
                            onChange={e => setRoutineBlockForm({ ...routineBlockForm, endTime: e.target.value })}
                            className="w-full px-4 py-3 border border-zinc-250 dark:border-zinc-700 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-mono focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-all"
                          />
                        </div>
                      </div>

                      {/* Rigidity selection */}
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Rigidity</label>
                        <select
                          value={routineBlockForm.rigidity}
                          onChange={e => setRoutineBlockForm({ ...routineBlockForm, rigidity: e.target.value as any })}
                          className="w-full px-4 py-3 border border-zinc-250 dark:border-zinc-700 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-all"
                        >
                          <option value="soft">Soft (can shift slightly if tasks overlap)</option>
                          <option value="hard">Hard (strictly locked to these exact hours)</option>
                        </select>
                      </div>

                      {/* Days Active */}
                      <div className="space-y-2">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Days Active</label>
                        <div className="flex flex-wrap gap-2">
                          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName, index) => {
                            const active = routineBlockForm.daysOfWeek.includes(index);
                            return (
                              <button
                                key={dayName}
                                type="button"
                                onClick={() => toggleDayInRoutineBlockForm(index)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${ active ? "bg-zinc-900 dark:bg-white text-white dark:text-black border-zinc-900 dark:border-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-transparent hover:bg-zinc-200" }`}
                              >
                                {dayName}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Action Button */}
                  <footer className="p-6 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0">
                    <button
                      onClick={handleSaveRoutineBlock}
                      disabled={!routineBlockForm.title.trim()}
                      className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90 rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer border-none"
                    >
                      <Check className="w-4 h-4" />
                      <span>{editingRoutineBlockId ? "Update Routine" : "Create Routine"}</span>
                    </button>
                  </footer>
                </div>
              )}

              {/* ── Add Profile Modal Overlay ─────────── */}
              {showAddProfileModal && (
                <div className="fixed inset-0 bg-white dark:bg-zinc-900 z-[120] flex flex-col animate-slide-up">
                  {/* Full-screen top navigation bar */}
                  <header className="h-[64px] border-b border-zinc-150 dark:border-zinc-800 px-4 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 shrink-0">
                    <button
                      onClick={() => {
                        setShowAddProfileModal(false);
                        setNewProfileName("");
                      }}
                      className="flex items-center gap-1.5 py-2 text-zinc-500 hover:text-zinc-850 dark:text-zinc-400 dark:hover:text-zinc-200 cursor-pointer font-bold text-xs"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    <span className="font-bold text-xs uppercase tracking-wider text-zinc-800 dark:text-zinc-200">
                      Create Profile
                    </span>
                    <div className="w-12"></div>
                  </header>

                  {/* Body container */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-5">
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Profile Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Travel, Midterms, Weekend"
                          value={newProfileName}
                          onChange={e => setNewProfileName(e.target.value)}
                          className="w-full px-4 py-3 border border-zinc-250 dark:border-zinc-700 rounded-xl text-xs bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-zinc-400 focus:bg-white transition-all"
                        />
                      </div>
                      <p className="text-xs text-zinc-500 leading-relaxed">
                        Create a unique profile template with its own set of sleeping, waking, meal, and focus windows to fit different life routines.
                      </p>
                    </div>
                  </div>

                  {/* Footer Action Button */}
                  <footer className="p-6 border-t border-zinc-150 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 shrink-0">
                    <button
                      onClick={handleSaveProfile}
                      disabled={!newProfileName.trim()}
                      className="w-full py-3.5 bg-zinc-900 dark:bg-white text-white dark:text-black hover:opacity-90 rounded-2xl text-xs font-bold transition-all shadow-md disabled:opacity-40 flex items-center justify-center gap-1.5 cursor-pointer border-none"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Create Profile</span>
                    </button>
                  </footer>
                </div>
              )}

              {/* ── Personal Operating Manual ─────────────── */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] dark:bg-[var(--bg-card)] p-4 shadow-xs mb-6 text-left">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shrink-0">
                    <Brain className="w-4 h-4 text-zinc-700 dark:text-zinc-300" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-[var(--text-primary)]">Personal Operating Manual</h4>
                    <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-semibold">How You Work Best</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {personalManualInsights.map((insight) => {
                    const categoryIcons = {
                      productivity: "⏱️",
                      focus: "☀️",
                      energy: "⚡",
                      planning: "📅",
                      health: "🏃‍♂️",
                      study: "💻",
                      habits: "🏃‍♂️"
                    };
                    return (
                      <div key={insight.id} className="flex items-start gap-2.5 text-xs">
                        <span className="text-sm leading-none shrink-0">{categoryIcons[insight.category] || "🎯"}</span>
                        <span className="text-[var(--text-secondary)] dark:text-[var(--text-primary)] leading-relaxed font-medium">
                          {insight.text}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Routine Profiles — Full Card Grid ─────────────── */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">
                    Routine Profiles
                  </span>
                  <button
                    onClick={() => setShowAddProfileModal(true)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-dashed border-[var(--border-strong)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Profile
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {routineProfiles.map((p) => {
                    const isActive = p.id === activeRoutineProfileId;
                    const profileBlocks = routineBlocks.filter(b => (b.profileId || "regular") === p.id);
                    const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

                    return (
                      <div
                        key={p.id}
                        className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                          isActive
                            ? "border-[var(--text-primary)]/40 bg-white dark:bg-[var(--bg-card)] shadow-sm"
                            : "border-[var(--border)] bg-[var(--bg-page)] dark:bg-[var(--bg-card)]/50 hover:border-[var(--border-strong)]"
                        }`}
                      >
                        {/* Profile Header */}
                        <div
                          className="flex items-center justify-between p-4 cursor-pointer"
                          onClick={() => {
                            setActiveRoutineProfileId(p.id);
                            triggerHaptic(15);
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold shrink-0 ${isActive ? "bg-slate-900 dark:bg-white text-white dark:text-black" : "bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"}`}>
                              {p.id === "regular" ? "📅" : p.id === "vacation" ? "🏖️" : "⚙️"}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-bold text-[var(--text-primary)] font-display">{p.name}</h4>
                                {p.isDefault && (
                                  <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-tertiary)] border border-[var(--border)] px-1.5 py-0.5 rounded">
                                    Default
                                  </span>
                                )}
                                {isActive && (
                                  <span className="text-[9px] font-black uppercase tracking-widest bg-slate-900 dark:bg-white text-white dark:text-black px-1.5 py-0.5 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">
                                {profileBlocks.length} routine block{profileBlocks.length !== 1 ? "s" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {!p.isDefault && (
                              <button
                                onClick={(e) => handleDeleteProfile(p.id, e)}
                                className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                                title="Delete profile"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <ChevronRight className={`w-4 h-4 text-[var(--text-tertiary)] transition-transform duration-200 ${isActive ? "rotate-90" : ""}`} />
                          </div>
                        </div>

                        {/* Expanded: Routine Blocks for this profile */}
                        {isActive && (
                          <div className="border-t border-[var(--border)]/60 px-4 pb-4 pt-3 space-y-3 animate-fade-in">
                            {/* Quick weekly day overview */}
                            {profileBlocks.length > 0 && (
                              <div className="flex items-center gap-1.5 pb-2">
                                {DAYS.map((d, idx) => {
                                  const hasBlock = profileBlocks.some(b => b.daysOfWeek.includes(idx));
                                  return (
                                    <div
                                      key={idx}
                                      className={`flex-1 py-1.5 rounded-lg text-[9px] font-black text-center transition-colors ${
                                        hasBlock
                                          ? "bg-slate-900 dark:bg-white text-white dark:text-black"
                                          : "bg-[var(--bg-card-hover)] text-[var(--text-tertiary)]"
                                      }`}
                                    >
                                      {d}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Routine block cards */}
                            {profileBlocks.length === 0 ? (
                              <div className="py-8 text-center flex flex-col items-center gap-2">
                                <BookMarked className="w-6 h-6 text-[var(--text-tertiary)] stroke-[1.5]" />
                                <p className="text-xs text-[var(--text-tertiary)]">No routine blocks yet</p>
                                <p className="text-[10px] text-[var(--text-tertiary)] max-w-xs leading-relaxed">
                                  Add blocks like wake-up, gym, meals, or study time to automate your daily schedule.
                                </p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {profileBlocks.map(block => {
                                  const daysStr = block.daysOfWeek.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join(" · ");
                                  return (
                                    <div
                                      key={block.id}
                                      className="flex items-center justify-between bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border)] rounded-xl px-3 py-2.5 group"
                                    >
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <span className="text-xs font-bold text-[var(--text-primary)] truncate">{block.title}</span>
                                          <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                                            block.rigidity === "hard"
                                              ? "bg-[var(--bg-page)] text-[var(--text-secondary)] border-[var(--border-strong)]"
                                              : "bg-[var(--bg-page)] text-[var(--text-tertiary)] border-[var(--border)]"
                                          }`}>
                                            {block.type}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                          <Clock className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                                          <span className="text-[10px] font-mono text-[var(--text-tertiary)]">{block.startTime} – {block.endTime}</span>
                                          <span className="text-[10px] text-[var(--text-tertiary)]">·</span>
                                          <span className="text-[10px] text-[var(--text-tertiary)] truncate">{daysStr}</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                          onClick={() => handleStartEditRoutineBlock(block)}
                                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                                          title="Edit"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                          onClick={() => handleDeleteRoutineBlock(block.id)}
                                          className="p-1.5 rounded-lg text-[var(--text-tertiary)] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                                          title="Delete"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Add Block CTA */}
                            <button
                              onClick={() => {
                                setShowAddRoutineForm(true);
                                setEditingRoutineBlockId(null);
                                setRoutineBlockForm({ title: "", startTime: "09:00", endTime: "10:00", daysOfWeek: [1, 2, 3, 4, 5], type: "custom", rigidity: "soft" });
                                triggerHaptic(12);
                              }}
                              className="w-full flex items-center justify-center gap-1.5 py-2.5 border border-dashed border-[var(--border-strong)] rounded-xl text-xs font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:border-[var(--text-primary)]/30 hover:bg-[var(--bg-card-hover)] transition-all cursor-pointer"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              Add Routine Block
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>



            </div>
          );
        })()}

        {profileViewTab === "projects" && (
 <div className="space-y-6 text-left animate-fade-in">
 {/* Create Manual Project card */}
 <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)]/60 rounded-3xl p-6 shadow-sm space-y-4">
 <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
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
 , schema_version: 1, field_timestamps: {} };
  newProj.field_timestamps = createFieldTimestamps(newProj);
 handleUpdateProjects([...projects, newProj]);
 e.currentTarget.reset();
 showToast(`Project "${title}" created!`, "success");
 }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
 <div className="space-y-1">
 <label className="block text-[10px] font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider">Project Title</label>
 <input name="projectTitle" type="text" placeholder="e.g. Portfolio Website, Midterm Prep" className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-primary font-sans" required />
 </div>
 <div className="space-y-1">
 <label className="block text-[10px] font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider">High-Level Goal</label>
 <input name="projectGoal" type="text" placeholder="e.g. Complete Units 1-5 & mock exams" className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-primary font-sans" />
 </div>
 <div className="space-y-1">
 <label className="block text-[10px] font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider">Deadline Date</label>
 <input name="projectDeadline" type="date" className="w-full px-3 py-2 border border-neutral-250 rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-primary font-sans" required />
 </div>
 <div className="md:col-span-3 flex justify-end">
 <button type="submit" className="bg-primary-gradient hover:opacity-90 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer font-display">
 Create Project
 </button>
 </div>
 </form>
 </div>

 {/* Projects List */}
 {projects.length === 0 ? (
 <div className="py-16 text-center flex flex-col items-center justify-center bg-white dark:bg-[var(--bg-card)] border border-dashed border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-6 shadow-xs">
 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
 <FolderKanban className="w-6 h-6 stroke-[1.5]" />
 </div>
 <p className="text-sm font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)]">No active projects yet</p>
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
 <div key={proj.id} className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)]/60 rounded-3xl p-6 shadow-sm space-y-4">
 <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
 <div className="space-y-1 text-left">
 <h4 className="text-base font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] flex items-center gap-1.5">
 <Briefcase className="w-5 h-5 text-primary" />
 {proj.title}
 </h4>
 <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-medium">{proj.goal}</p>
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
 className="bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] border border-[var(--border-strong)] dark:border-[var(--border)] px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer font-display"
 >
 <Trash2 className="w-3.5 h-3.5" />
 <span>Delete</span>
 </button>
 </div>
 </div>

 {/* Progress bar & urgent metric block */}
 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center pt-2">
 <div className="space-y-1">
 <div className="flex justify-between text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)]">
 <span>Overall Progress</span>
 <span>{proj.progress}% ({doneSubtasksCount}/{totalSubtasks.length} subtasks)</span>
 </div>
 <div className="w-full bg-neutral-200 rounded-full h-2 overflow-hidden">
 <div className="bg-primary h-full rounded-full transition-all duration-300" style={{ width: `${proj.progress}%` }} />
 </div>
 </div>
 
 {/* Metrics columns */}
 <div className="bg-[var(--bg-page)] border border-[var(--border)] dark:border-[var(--border)] rounded-2xl p-3 text-center grid grid-cols-2 gap-4 col-span-2">
 <div>
 <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block">Urgency Score</span>
 <span className={`text-sm font-black ${urgency > 2 ? 'text-amber-500' : 'text-neutral-700 dark:text-[var(--text-primary)]'}`}>
 {urgency} hours/day
 </span>
 </div>
 <div>
 <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest block">Estimated Time Remaining</span>
 <span className="text-sm font-black text-[var(--text-secondary)] dark:text-[var(--text-primary)]">
 {remainingHours} hours ({totalSubtasks.filter(s => s.status === "pending").length} tasks)
 </span>
 </div>
 </div>
 </div>

 {/* Phases list */}
 <div className="mt-4 border-t border-[var(--border)] dark:border-[var(--border)] pt-4 space-y-4 text-left">
 <h5 className="text-xs font-black text-[var(--text-tertiary)] uppercase tracking-widest">Phases & Subtasks Checklist</h5>
 {proj.phases.map((phase) => (
 <div key={phase.id} className="bg-[var(--bg-page)] border border-[var(--border-strong)] dark:border-[var(--border)]/40 p-4.5 rounded-2xl space-y-3">
 <div className="flex justify-between items-center">
 <span className="text-xs font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)]">{phase.title}</span>
 </div>

 {/* Subtasks checklist */}
 <div className="space-y-2">
 {phase.subtasks.map((sub, sIdx) => {
 const isDone = sub.status === "done";
 return (
 <div key={sub.id} className="flex items-center justify-between gap-3 text-xs bg-white dark:bg-[var(--bg-card)] border border-neutral-150 dark:border-[var(--border)] p-2.5 rounded-xl">
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
 className="cursor-pointer text-neutral-450 dark:text-[var(--text-secondary)] hover:text-primary transition-colors shrink-0"
 >
 {isDone ? (
 <CheckCircle2 className="w-4 h-4 text-emerald-500" />
 ) : (
 <Circle className="w-4 h-4 text-neutral-300" />
 )}
 </button>
 <span className={`font-semibold truncate ${isDone ? 'line-through text-neutral-400' : 'text-neutral-700 dark:text-[var(--text-primary)]'}`}>
 {sub.title}
 </span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{sub.duration_minutes}m</span>
 
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
 className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
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
 className="text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] disabled:opacity-30 cursor-pointer"
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
 }} className="flex items-center gap-2 mt-3 pt-2 border-t border-dashed border-[var(--border-strong)] dark:border-[var(--border)]">
 <input name="subtaskTitle" type="text" placeholder="Add subtask title..." className="flex-1 px-3 py-1.5 border border-[#D5D5E2] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-primary font-sans" required />
 <input name="subtaskDuration" type="number" placeholder="60" className="w-20 px-3 py-1.5 border border-[#D5D5E2] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-primary font-sans" />
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
 <h3 className="text-sm font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-1.5">
 <Target className="w-4 h-4 text-primary" /> Active Milestones
 </h3>
 <p className="text-xs text-neutral-450 dark:text-[var(--text-secondary)] mt-0.5 font-sans">Track your progress toward long-term life objectives.</p>
 </div>
 <button
 onClick={() => handleOpenCreateGoal()}
 className="bg-primary-gradient hover:opacity-90 text-white px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer font-display"
 >
 <Plus className="w-4 h-4" />
 <span>New Goal</span>
 </button>
 </div>

 {goals.length === 0 ? (
 <div className="py-16 text-center flex flex-col items-center justify-center bg-white dark:bg-[var(--bg-card)] border border-dashed border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-6 shadow-xs">
 <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-3">
 <Target className="w-6 h-6 stroke-[1.5]" />
 </div>
 <p className="text-sm font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)]">No active goals yet</p>
 <p className="text-xs text-[var(--text-tertiary)] max-w-xs px-6 mt-1 leading-relaxed text-center font-sans">
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
 <div key={goal.id} className={`bg-white dark:bg-[var(--bg-card)] border rounded-3xl p-5 shadow-xs transition-all flex flex-col gap-4 relative overflow-hidden group ${ goal.status === "paused" ? "opacity-65 border-neutral-200 dark:border-[var(--border)]" : "border-neutral-200 dark:border-[var(--border)]/80 hover:border-neutral-300 dark:border-[var(--border)]" }`}>
 {/* Top Row */}
 <div className="flex items-start justify-between gap-3 text-left">
 <div className="space-y-1 text-left">
 <div className="flex items-center gap-1.5">
 <span className={`text-[10px] font-extrabold uppercase tracking-widest px-2 py-0.5 rounded-full border ${ goal.category === "fitness" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : goal.category === "academic" ? "bg-violet-50 text-violet-750 border-violet-100" : goal.category === "project" ? "bg-cyan-50 text-cyan-750 border-cyan-100" : goal.category === "habit" ? "bg-amber-50 text-amber-700 border-amber-100" : "bg-neutral-50 dark:bg-[var(--bg-card-hover)] text-neutral-600 dark:text-[var(--text-primary)] border-neutral-200 dark:border-[var(--border)]" }`}>
 {goal.category}
 </span>
 {goal.status === "paused" && (
 <span className="text-[10px] font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] px-1.5 py-0.5 rounded">Paused</span>
 )}
 {goal.status === "achieved" && (
 <span className="text-[10px] font-extrabold text-emerald-650 uppercase tracking-widest bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
 <Trophy className="w-2.5 h-2.5 animate-bounce" /> Complete
 </span>
 )}
 </div>
 <h4 className="font-display font-bold text-sm text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight group-hover:text-primary transition-colors">{goal.title}</h4>
 {goal.description && <p className="text-xs text-neutral-450 dark:text-[var(--text-secondary)] leading-relaxed font-sans">{goal.description}</p>}
 </div>

 {/* Action Buttons */}
 <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
 <button 
 onClick={() => handleToggleGoalPause(goal.id)}
 className="p-1.5 hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-[var(--text-primary)] rounded-lg cursor-pointer transition-colors"
 title={goal.status === "active" ? "Pause tracking" : "Activate"}
 >
 {goal.status === "active" ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
 </button>
 <button 
 onClick={() => handleOpenEditGoal(goal)}
 className="p-1.5 hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-[var(--text-primary)] rounded-lg cursor-pointer transition-colors"
 title="Edit goal"
 >
 <Edit2 className="w-3.5 h-3.5" />
 </button>
 <button 
 onClick={() => handleDeleteGoal(goal.id)}
 className="p-1.5 hover:bg-red-50 text-[var(--text-tertiary)] hover:text-red-650 rounded-lg cursor-pointer transition-colors"
 title="Delete goal"
 >
 <Trash2 className="w-3.5 h-3.5" />
 </button>
 </div>
 </div>

 {/* Progress values & sparkline */}
 <div className="flex items-end justify-between border-t border-[var(--border)] dark:border-[var(--border)] pt-3">
 <div className="text-left">
 <span className="text-2xl font-black text-[var(--text-primary)] dark:text-[var(--text-primary)] font-mono tracking-tight">{goal.currentValue}</span>
 <span className="text-xs text-neutral-450 dark:text-[var(--text-secondary)] font-medium ml-1">/ {goal.targetValue} {goal.metricLabel}</span>
 </div>
 {renderSparkline(goal.progressLog)}
 </div>

 {/* Progress bar */}
 <div className="space-y-1.5">
 <div className="w-full h-2 bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] rounded-full overflow-hidden">
 <div 
 className="h-full bg-gradient-to-r from-violet-500 to-emerald-400 transition-all duration-500 rounded-full" 
 style={{ width: `${pct}%` }}
 />
 </div>
 <div className="flex justify-between items-center text-[10px] text-[var(--text-tertiary)] font-medium font-sans">
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
 <h4 className="text-xs font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
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
 <h5 className="font-bold text-xs text-[var(--text-primary)] dark:text-[var(--text-primary)] group-hover:text-primary transition-colors font-display">{sug.title}</h5>
 <p className="text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] leading-relaxed font-sans">{sug.suggestion}</p>
 <span className="inline-block text-[9px] font-extrabold text-primary uppercase tracking-widest mt-1">Tap to pre-fill</span>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Achievements Timeline */}
 <div className="space-y-5">
 <h4 className="text-xs font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-1.5 font-display">
 <Award className="w-4 h-4 text-emerald-600" /> Unlocked Achievements
 </h4>

 {achievements.length === 0 ? (
 <div className="py-10 text-center text-xs text-[var(--text-tertiary)] italic bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl shadow-3xs p-6 font-sans">
 Complete task routines and reach goal milestones to unlock your first achievement badge.
 </div>
 ) : (
 <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-6 shadow-xs relative">
 {/* Vertical timeline line */}
 <div className="absolute left-10 top-8 bottom-8 w-0.5 bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)]" />
 
 <div className="space-y-6">
 {[...achievements].sort((a, b) => new Date(b.earnedAt).getTime() - new Date(a.earnedAt).getTime()).map(ach => (
 <div key={ach.id} className="flex gap-4 items-start relative z-10 text-left group">
 {/* Left earned Date */}
 <div className="w-14 text-right shrink-0 mt-1">
 <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider block font-mono">
 {new Date(ach.earnedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
 </span>
 </div>

 {/* Center badge */}
 <div className="w-8 h-8 rounded-full bg-[#F5F4FF] border border-[var(--border)] dark:border-[var(--border)] flex items-center justify-center shrink-0 shadow-2xs group-hover:scale-110 transition-transform duration-200 text-lg select-none">
 {ach.icon}
 </div>

 {/* Right text info */}
 <div className="space-y-0.5">
 <h5 className="font-bold text-xs text-[var(--text-primary)] dark:text-[var(--text-primary)] group-hover:text-primary transition-colors font-display">{ach.title}</h5>
 <p className="text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-sans">{ach.description}</p>
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

  );
});

RoutinesTab.displayName = "RoutinesTab";
