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
  Pause
} from "lucide-react";
import { FixedBlock, FlexibleTask, ScheduledItem, EnergyLevel, RepeatType, ScheduleProfile, ProfileBlock, ProfileAppliesTo, UserGoal, Achievement, GoalCategory, GoalStatus, GoalMilestone, WeightEntry } from "./types";
import { generateSchedule, calculateFuturePredictions, timeToMinutes, minutesToTime, isFixedBlockActiveOnDate, calculateCalibrationProfile } from "./utils/scheduler";
import { loadFixedBlocks, saveFixedBlocks, loadFlexibleTasks, saveFlexibleTasks, loadSettings, saveSettings, isOnboardingComplete, markOnboardingComplete, loadProfiles, saveProfiles, clearAllData, loadGoals, saveGoals, loadAchievements, saveAchievements, loadWeightLog, saveWeightLog } from "./utils/storage";
import { generateMockMLData, getTaskCategory, detectHighDelayPatterns } from "./utils/mlEngine";
import { updateGoalProgressFromTask, predictGoalCompletion, generateCheckInPrompt, getGoalsDueForCheckIn, suggestGoalsFromTaskHistory, generateMilestones, checkForGlobalAchievements } from "./utils/goalEngine";

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

const TODAY = new Date().toISOString().split("T")[0];

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



export default function App() {
  // 1. Core Application State
  const [fixedBlocks, setFixedBlocks] = useState<FixedBlock[]>([]);
  const [flexibleTasks, setFlexibleTasks] = useState<FlexibleTask[]>([]);
  const [appSettings, setAppSettings] = useState({ day_start: "07:00", day_end: "23:00" });

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState<"welcome" | "fixed">("welcome");
  const [onboardingBlocks, setOnboardingBlocks] = useState<FixedBlock[]>([]);
  const [onboardingForm, setOnboardingForm] = useState({
    title: "",
    start_time: "09:00",
    end_time: "10:00",
    repeats: "daily" as RepeatType,
    color: "#E24B4A"
  });

  // Phase 2 insight banner
  const [showPhase2Banner, setShowPhase2Banner] = useState(false);
  const prevPhaseRef = useRef<1 | 2>(1);

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
    if (currentPath === "/insights" || currentPath === "/routines/insights") return "routines";
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
        if (currentPath === "/insights" || currentPath === "/routines/insights") return "Insights";
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
    if (currentPath === "/insights" || currentPath === "/routines/insights") return "insights";
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
  const [activeBottomSheet, setActiveBottomSheet] = useState<"fixed" | "flexible" | "emergency" | "assistant" | "profile" | "eodreview" | "goal" | null>(null);
  
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
    color: "#E24B4A"
  });

  const [flexibleForm, setFlexibleForm] = useState({
    title: "",
    duration_minutes: 60,
    hasDeadline: false,
    deadline: "",
    energy_level: "medium" as EnergyLevel,
    scheduled_date: ""
  });


  // Unified AI Copilot sheet state
  const [copilotInput, setCopilotInput] = useState("");
  const [isProcessingCopilot, setIsProcessingCopilot] = useState(false);
  const [copilotError, setCopilotError] = useState<string | null>(null);
  const [proposedChanges, setProposedChanges] = useState<any[] | null>(null);
  const [chatHistory, setChatHistory] = useState<{ sender: "ai" | "user"; text: string }[]>([]);
  const [greetingMessage, setGreetingMessage] = useState("");

  // Vision image attachment for copilot
  const [copilotImage, setCopilotImage] = useState<{ base64: string; mimeType: string; previewUrl: string } | null>(null);
  const copilotImageInputRef = useRef<HTMLInputElement>(null);

  // Inline task card expansion state
  const [expandedTaskIds, setExpandedTaskIds] = useState<Record<string, boolean>>({});

  // Frictionless completion dialog
  const [effortDialogTaskId, setEffortDialogTaskId] = useState<string | null>(null);

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
    const mockTasks = generateMockMLData();
    handleUpdateFlexible(mockTasks, true);
    showToast("Demo completion history injected silently!", "success");
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

  // Emergency block removed

  // 1. Initial Storage Bootstrap
  useEffect(() => {
    const blocks = loadFixedBlocks();
    const tasks = loadFlexibleTasks();
    setFixedBlocks(blocks);
    setFlexibleTasks(tasks);
    setAppSettings(loadSettings());
    setProfiles(loadProfiles());
    setGoals(loadGoals());
    setAchievements(loadAchievements());
    setWeightLog(loadWeightLog());

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

  // Compute effective fixed blocks for any date (profile blocks + manual one-off blocks)
  const effectiveFixedBlocks = useMemo(() => {
    const dayOfWeek = new Date(selectedDate + "T12:00:00").getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Find the active profile: manual override first, then day-type match
    const activeProfile =
      profiles.find(p => p.isActive) ||
      profiles.find(p => {
        if (p.appliesTo === "everyday") return true;
        if (p.appliesTo === "weekdays" && !isWeekend) return true;
        if (p.appliesTo === "weekends" && isWeekend) return true;
        return false;
      });

    // Convert profile blocks to FixedBlock format
    const profileFixed: FixedBlock[] = (activeProfile?.blocks || []).map(b => ({
      id: `profile-${b.id}`,
      title: b.title,
      start_time: b.start_time,
      end_time: b.end_time,
      repeats: "daily" as RepeatType,
      locked: true,
      date: selectedDate,
      color: b.color
    }));

    return [...profileFixed, ...fixedBlocks];
  }, [profiles, fixedBlocks, selectedDate]);

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
    
    setFlexibleTasks(newTasks);
    saveFlexibleTasks(newTasks);
  };

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
    return flexibleTasks.filter(t => isTaskStale(t));
  }, [flexibleTasks]);

  const calibrationProfile = useMemo(() => {
    return calculateCalibrationProfile(flexibleTasks);
  }, [flexibleTasks]);

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

  // Daily Schedule Calculations (uses effectiveFixedBlocks which merges profile + manual blocks)
  const daySchedule = useMemo(() => {
    return generateSchedule(
      selectedDate,
      effectiveFixedBlocks,
      flexibleTasks,
      appSettings.day_start,
      appSettings.day_end,
      null,
      60,
      calibrationProfile,
      delayPatterns
    );
  }, [selectedDate, effectiveFixedBlocks, flexibleTasks, appSettings, calibrationProfile, delayPatterns]);

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
      color: "#E24B4A"
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
      color: block.color || "#E24B4A"
    });
    setActiveBottomSheet("fixed");
  };

  const handleSubmitFixed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fixedForm.title.trim()) return;

    if (editingBlock) {
      const updated = fixedBlocks.map((b) => 
        b.id === editingBlock.id 
          ? { ...b, title: fixedForm.title, start_time: fixedForm.start_time, end_time: fixedForm.end_time, repeats: fixedForm.repeats, color: fixedForm.color }
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
        date: selectedDate
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
    setFlexibleForm({
      title: "",
      duration_minutes: 45,
      hasDeadline: false,
      deadline: "",
      energy_level: "medium",
      scheduled_date: defaultToToday ? selectedDate : ""
    });
    setActiveBottomSheet("flexible");
  };

  const handleOpenEditFlexible = (task: FlexibleTask) => {
    setEditingTask(task);
    setFlexibleForm({
      title: task.title,
      duration_minutes: task.duration_minutes,
      hasDeadline: !!task.deadline,
      deadline: task.deadline || "",
      energy_level: task.energy_level,
      scheduled_date: task.scheduled_date || ""
    });
    setActiveBottomSheet("flexible");
  };

  const handleSubmitFlexible = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flexibleForm.title.trim()) return;

    if (editingTask) {
      const updated = flexibleTasks.map((t) => 
        t.id === editingTask.id 
          ? { 
              ...t, 
              title: flexibleForm.title.trim(), 
              duration_minutes: Number(flexibleForm.duration_minutes), 
              deadline: flexibleForm.hasDeadline ? flexibleForm.deadline : null, 
              energy_level: flexibleForm.energy_level,
              scheduled_date: flexibleForm.scheduled_date || null
            }
          : t
      );
      handleUpdateFlexible(updated);
      showToast("Flexible task updated!", "success");
    } else {
      const scheduledDate = flexibleForm.scheduled_date ? flexibleForm.scheduled_date : null;
      const newTask: FlexibleTask = {
        id: `flex-${Date.now()}`,
        title: flexibleForm.title.trim(),
        duration_minutes: Number(flexibleForm.duration_minutes),
        deadline: flexibleForm.hasDeadline ? flexibleForm.deadline : null,
        energy_level: flexibleForm.energy_level,
        status: scheduledDate ? "scheduled" : "backlog",
        scheduled_date: scheduledDate
      };
      handleUpdateFlexible([...flexibleTasks, newTask]);
      showToast(scheduledDate ? `Task added to today's schedule!` : "Task added to backlog!", "success");
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
    
    if (timeOfDay === "evening") {
      // Evening check: check for incomplete items
      const incomplete = todayTasks.filter(item => item.type === "flexible" && item.status !== "done");
      if (incomplete.length > 0) {
        const listStr = incomplete.map(t => `"${t.title}"`).join(", ");
        greeting = `Hey! 🌙\n\nI noticed you have some unfinished tasks today: ${listStr}.\n\nWhat happened? Busy day? Let me know, and we can move them to tomorrow or reschedule them!`;
      } else {
        greeting = `Good evening! 🌙\n\nYou've finished all your scheduled items for today. Great job! Ready to wind down, or is there something you want to schedule for tomorrow?`;
      }
    } else if (overdueTask && Math.random() > 0.5) {
      greeting = `Heads up! 📋\n\n"${overdueTask.title}" has been waiting in your backlog for ${overdueDays} days.\n\nStill want to do it? Let's get it scheduled today, change the deadline, or clear it out. What do you think?`;
    } else if (scheduledCount === 0 && backlogCount === 0) {
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
      greeting = `Good ${timeOfDay}! 👋\n\nHow's your day going? Let me know if you want to add a task, reschedule something, or clear your schedule!`;
    }

    setChatHistory([{ sender: "ai", text: greeting }]);
    setCopilotInput("");
    setCopilotError(null);
    setProposedChanges(null);
    setActiveBottomSheet("assistant");
  };

  const handleSendCopilotMessage = async (textOverride?: any) => {
    const isOverride = typeof textOverride === "string";
    const messageText = isOverride ? textOverride.trim() : copilotInput.trim();
    if (!messageText && !copilotImage) return;

    const displayText = messageText || (copilotImage ? "[Image attached]" : "");
    setChatHistory(prev => [...prev, { sender: "user", text: displayText }]);
    if (!isOverride) {
      setCopilotInput("");
    }
    const imagePayload = copilotImage ? { base64: copilotImage.base64, mimeType: copilotImage.mimeType } : undefined;
    setCopilotImage(null);
    setIsProcessingCopilot(true);
    setCopilotError(null);
    setProposedChanges(null);

    let data;
    try {
      const response = await fetch("/api/adjust-schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userText: messageText || "Please analyze the attached image and extract schedule/workout/weight info.",
          currentSchedule: daySchedule.items,
          pendingTasks: flexibleTasks.filter(t => t.status !== "done"),
          today: selectedDate,
          image: imagePayload
        })
      });

      if (!response.ok) {
        throw new Error("API failed");
      }

      data = await response.json();
    } catch (err: any) {
      console.warn("AI Copilot API failed. Falling back to local offline rule adjuster.");
      data = adjustScheduleOffline(messageText, daySchedule.items, flexibleTasks, selectedDate);
    }

    setIsProcessingCopilot(false);
    
    if (data.changes && data.changes.length > 0) {
      setProposedChanges(data.changes);
    }

    setChatHistory(prev => [...prev, { sender: "ai", text: data.message || "I couldn't figure out any adjustments for that request. Try saying something like 'add task gym' or 'postpone work'." }]);
    triggerHaptic(25);
  };

  const handleConfirmAIChanges = () => {
    if (!proposedChanges) return;

    let updatedFlexible = [...flexibleTasks];
    let updatedFixed = [...fixedBlocks];
    let updatedGoals = [...goals];
    let updatedWeightLog = [...weightLog];
    let goalsModified = false;
    let weightModified = false;
    let appliedCount = 0;

    for (const change of proposedChanges) {
      const { action, taskId, newDate, newTime, durationMultiplier, newTaskTitle, newTaskDuration, newTaskDescription, goalTitle, goalCategory, goalMetric, goalTarget, goalKeywords, insertImmediately, weightValue } = change;

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
            start_time: pinTime || b.start_time
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
      if (weightModified) {
        setWeightLog(updatedWeightLog);
        saveWeightLog(updatedWeightLog);
        showToast(`Weight logged: ${updatedWeightLog[updatedWeightLog.length - 1]?.weight} kg`, "success");
      } else {
        showToast(`Applied ${appliedCount} schedule adjustments!`, "success");
      }
      triggerHaptic([40, 40]);
    }

    setActiveBottomSheet(null);
    setCopilotInput("");
    setProposedChanges(null);
    setChatHistory([]);
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
    const base = new Date(selectedDate);
    // Let's generate a beautiful weekly stripe (Centered around active date)
    const startOfWeek = new Date(base);
    startOfWeek.setDate(base.getDate() - 3); // 3 days back, 11 days forward

    for (let i = 0; i < 14; i++) {
      const nextDay = new Date(startOfWeek);
      nextDay.setDate(startOfWeek.getDate() + i);
      const label = nextDay.toLocaleDateString("en-US", { weekday: "short" });
      const num = nextDay.getDate();
      const isoStr = nextDay.toISOString().split("T")[0];
      
      const dayFixed = fixedBlocks.filter(b => isFixedBlockActiveOnDate(b, isoStr));
      const dayFlexible = flexibleTasks.filter(t => t.scheduled_date === isoStr);
      
      days.push({
        label,
        num,
        isoStr,
        isToday: isoStr === new Date().toISOString().split("T")[0],
        hasFixed: dayFixed.length > 0,
        hasFlex: dayFlexible.length > 0,
        totalItems: dayFixed.length + dayFlexible.length
      });
    }
    return days;
  }, [selectedDate, fixedBlocks, flexibleTasks]);

  // Calendar monthly dates generator
  const currentMonthGrid = useMemo(() => {
    const cursor = new Date(selectedDate);
    cursor.setDate(1); // First of the month
    const month = cursor.getMonth();
    const year = cursor.getFullYear();

    // Start of grid (Sunday block offset)
    const dayOfWeek = cursor.getDay();
    const gridStart = new Date(cursor);
    gridStart.setDate(gridStart.getDate() - dayOfWeek);

    const cells = [];
    // Generate 35 cells for month view
    for (let i = 0; i < 35; i++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      const dStr = day.toISOString().split("T")[0];

      const dayFixed = fixedBlocks.filter(b => isFixedBlockActiveOnDate(b, dStr));
      const dayFlexible = flexibleTasks.filter(t => t.scheduled_date === dStr);

      cells.push({
        num: day.getDate(),
        dateStr: dStr,
        isCurrentMonth: day.getMonth() === month,
        isToday: dStr === new Date().toISOString().split("T")[0],
        isSelected: dStr === selectedDate,
        hasFixed: dayFixed.length > 0,
        hasFlex: dayFlexible.length > 0
      });
    }
    return cells;
  }, [selectedDate, fixedBlocks, flexibleTasks]);

  // Handle month jump
  const handleMonthChange = (direction: "prev" | "next") => {
    const current = new Date(selectedDate);
    current.setMonth(current.getMonth() + (direction === "next" ? 1 : -1));
    setSelectedDate(current.toISOString().split("T")[0]);
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
      color: onboardingForm.color
    };
    setOnboardingBlocks(prev => [...prev, block]);
    setOnboardingForm({ title: "", start_time: "09:00", end_time: "10:00", repeats: "daily", color: "#E24B4A" });
  };

  const handleRemoveOnboardingBlock = (id: string) => {
    setOnboardingBlocks(prev => prev.filter(b => b.id !== id));
  };

  const handleCompleteOnboarding = () => {
    handleUpdateFixed(onboardingBlocks);
    markOnboardingComplete();
    setShowOnboarding(false);
    showToast("Setup complete! Your schedule is ready.", "success");
    triggerHaptic([30, 20, 30]);
  };

  const handleSkipOnboarding = () => {
    markOnboardingComplete();
    setShowOnboarding(false);
  };

  if (showOnboarding) {
    return (
      <div className="h-[100dvh] w-screen bg-gradient-to-br from-[#F0EFFE] via-[#F8F9FA] to-[#E8F5EF] flex items-center justify-center p-4 overflow-hidden">
        {/* Ambient blobs */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-violet-400/15 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-400/10 blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
        </div>

        <div className="w-full max-w-lg bg-white/90 backdrop-blur-xl border border-white/40 rounded-3xl shadow-2xl overflow-hidden">

          {onboardingStep === "welcome" ? (
            <div className="p-8 flex flex-col items-center text-center gap-5">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <Check className="w-9 h-9 text-white stroke-[3px]" />
              </div>
              <div className="space-y-2">
                <h1 className="font-display font-bold text-2xl text-neutral-900 tracking-tight">Welcome to DayFlow</h1>
                <p className="text-sm text-neutral-500 leading-relaxed max-w-sm">
                  Your intelligent daily scheduler. It learns how you work and arranges your day automatically.
                </p>
              </div>
              <div className="w-full bg-neutral-50 border border-neutral-100 rounded-2xl p-4 text-left space-y-3">
                <h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">How it works</h3>
                <div className="space-y-2.5">
                  {[
                    { icon: "⚙️", label: "Setup once", desc: "Enter your fixed time commitments — gym, sleep, classes" },
                    { icon: "📋", label: "Daily in 30 sec", desc: "Add flexible tasks each morning. App arranges them automatically." },
                    { icon: "✓", label: "Just check boxes", desc: "Complete tasks as you go. App learns your patterns silently." },
                    { icon: "🧠", label: "Gets smarter", desc: "After 15 tasks, scheduling personalizes to your actual behavior." }
                  ].map(item => (
                    <div key={item.label} className="flex items-start gap-3">
                      <span className="text-lg leading-none mt-0.5">{item.icon}</span>
                      <div>
                        <span className="text-xs font-bold text-neutral-800 block">{item.label}</span>
                        <span className="text-xs text-neutral-500 leading-relaxed">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 w-full pt-1">
                <button
                  onClick={handleSkipOnboarding}
                  className="flex-1 py-3 text-sm font-bold border border-neutral-200 rounded-xl text-neutral-500 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Skip setup
                </button>
                <button
                  onClick={() => setOnboardingStep("fixed")}
                  className="flex-1 py-3 text-sm font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  Set up my schedule <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col max-h-[90vh]">
              <div className="p-6 pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                    <Lock className="w-3.5 h-3.5 text-red-500" />
                  </div>
                  <h2 className="font-display font-bold text-lg text-neutral-900">Your Fixed Schedule</h2>
                </div>
                <p className="text-xs text-neutral-500 leading-relaxed">
                  Add time commitments that happen every day or week. You'll never need to re-enter these.
                </p>
              </div>

              <div className="overflow-y-auto flex-1 p-6 space-y-5">
                {/* Add block form */}
                <div className="bg-neutral-50 border border-neutral-200 rounded-2xl p-4 space-y-3">
                  <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Add a commitment</h4>
                  <input
                    type="text"
                    placeholder="e.g. Gym, Sleep, Math Class, Lunch"
                    value={onboardingForm.title}
                    onChange={e => setOnboardingForm({ ...onboardingForm, title: e.target.value })}
                    onKeyDown={e => e.key === "Enter" && handleAddOnboardingBlock()}
                    className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">Start</label>
                      <input type="time" value={onboardingForm.start_time} onChange={e => setOnboardingForm({ ...onboardingForm, start_time: e.target.value })} className="w-full px-2 py-2 border border-neutral-200 rounded-lg text-sm bg-white" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1">End</label>
                      <input type="time" value={onboardingForm.end_time} onChange={e => setOnboardingForm({ ...onboardingForm, end_time: e.target.value })} className="w-full px-2 py-2 border border-neutral-200 rounded-lg text-sm bg-white" />
                    </div>
                  </div>
                  <div className="flex gap-1.5">
                    {(["none", "daily", "weekdays"] as const).map(rep => (
                      <button
                        key={rep}
                        onClick={() => setOnboardingForm({ ...onboardingForm, repeats: rep })}
                        className={`flex-1 py-1.5 text-xs rounded-lg font-bold border capitalize cursor-pointer ${
                          onboardingForm.repeats === rep ? "bg-primary/10 text-primary border-primary" : "bg-white text-neutral-500 border-neutral-200"
                        }`}
                      >
                        {rep === "none" ? "Once" : rep}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Color:</span>
                    {["#E24B4A", "#7F77DD", "#1D9E75", "#EF9F27", "#3C3489"].map(col => (
                      <button key={col} onClick={() => setOnboardingForm({ ...onboardingForm, color: col })} className="w-6 h-6 rounded-full border-2 cursor-pointer relative" style={{ backgroundColor: col, borderColor: onboardingForm.color === col ? col : "transparent" }}>
                        {onboardingForm.color === col && <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✓</span>}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handleAddOnboardingBlock}
                    disabled={!onboardingForm.title.trim()}
                    className="w-full py-2.5 text-sm font-bold bg-primary text-white rounded-xl disabled:opacity-40 hover:bg-primary-dark transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add to schedule
                  </button>
                </div>

                {/* List of added blocks */}
                {onboardingBlocks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Added so far</h4>
                    {onboardingBlocks.map(block => (
                      <div key={block.id} className="flex items-center justify-between bg-white border border-neutral-100 rounded-xl px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: block.color || "#E24B4A" }} />
                          <div>
                            <span className="text-sm font-semibold text-neutral-800">{block.title}</span>
                            <span className="text-xs text-neutral-400 ml-2 font-mono">{block.start_time}–{block.end_time}</span>
                            <span className="text-xs text-neutral-400 ml-1 capitalize">· {block.repeats === "none" ? "once" : block.repeats}</span>
                          </div>
                        </div>
                        <button onClick={() => handleRemoveOnboardingBlock(block.id)} className="p-1 hover:bg-red-50 text-neutral-400 hover:text-red-500 rounded-lg transition-colors cursor-pointer">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {onboardingBlocks.length === 0 && (
                  <div className="text-center py-4 text-xs text-neutral-400 italic">
                    No commitments added yet. You can also skip and add them later.
                  </div>
                )}
              </div>

              <div className="p-6 pt-3 border-t border-neutral-100 flex gap-3">
                <button
                  onClick={handleSkipOnboarding}
                  className="flex-1 py-3 text-sm font-bold border border-neutral-200 rounded-xl text-neutral-500 hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  Skip for now
                </button>
                <button
                  onClick={handleCompleteOnboarding}
                  className="flex-2 px-6 py-3 text-sm font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/20 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  {onboardingBlocks.length > 0 ? `Save ${onboardingBlocks.length} block${onboardingBlocks.length > 1 ? "s" : ""} & Start` : "Start with empty schedule"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

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
          <header id="mobile_sticky_header" className="h-16 border-b border-neutral-200 px-4 flex items-center justify-between bg-white z-30 flex-shrink-0 relative text-slate-800">
            <div 
              onClick={handleLogoClick}
              className="flex items-center gap-1.5 cursor-pointer select-none"
              title="Tap 5 times for developer mode"
            >
              <span className="font-display font-black text-lg md:text-xl text-[#0F172A] tracking-tight">{pageTitle}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              {activeTab === "today" && daySchedule.items.length > 0 && (
                <span className="text-[11px] font-bold font-mono px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-full ml-1 animate-fade-in">
                  {totalCompletedScheduledCount}
                </span>
              )}
            </div>

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
                
                {/* EOD Pending Review Banner */}
                {selectedDate === TODAY && currentTimeMins >= 19 * 60 && todayIncompleteTasks.length > 0 && !eodDismissed && (
                  <div className="bg-amber-50 border-b border-amber-200 px-4 py-3 flex items-center justify-between text-xs text-amber-800 shrink-0 font-medium z-10">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>You have {todayIncompleteTasks.length} uncompleted tasks remaining today.</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => setActiveBottomSheet("eodreview")}
                        className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-2.5 py-1 rounded transition-colors cursor-pointer"
                      >
                        Review Now
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
                

                {/* Grid container giving dual layout on desktop, standard layout on mobile */}
                <div className="flex-1 lg:grid lg:grid-cols-12 lg:gap-6 lg:p-6 overflow-y-auto lg:overflow-hidden h-full">
                  
                  {/* Left Column (Timeline blocks) */}
                  <div className="lg:col-span-8 flex flex-col h-full lg:overflow-y-auto pb-24 lg:pb-6 lg:pr-3">
                    
                    {/* 2. Morning AI Copilot invite card (On mobile only) */}
                    <div className="p-3 lg:hidden">
                      <div 
                        onClick={handleOpenAICopilot}
                        className="bg-[#FFFFFF] border border-neutral-200/80 rounded-xl p-3.5 shadow-xs cursor-pointer hover:border-primary/40 group transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-[#EEEDFE] rounded-lg text-primary transition-transform duration-200">
                            <Sparkles className="w-4 h-4 fill-primary/10" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-[#1A1A2E]">Good morning · Ask AI Copilot</h4>
                            <p className="text-xs text-[#9999B3]">Unified assistant to schedule and adjust your day</p>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-[#9999B3] group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>

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
                      <button
                        onClick={handleOpenAICopilot}
                        className="px-4 py-2 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 font-display"
                      >
                        <Sparkles className="w-3.5 h-3.5" /> Launch AI Copilot
                      </button>
                    </div>
                  ) : (
                    <div className="relative border-l border-neutral-200/40 pl-4 py-1 ml-2.5">
                      
                      {daySchedule.items.map((item, idx) => {
                        const isFixedType = item.type === "fixed";
                        const isEmergencyItem = item.id.includes("emergency_block") || item.title.includes("Emergency");
                        const isCompleted = item.status === "done";
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

                        return (
                          <div
                            key={`${item.id}-${idx}`}
                            className="relative mb-5 last:mb-3 group"
                            draggable={!isFixedType && !isEmergencyItem && !isCompleted}
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
                                isEmergencyItem
                                  ? "bg-amber-500 border-amber-600"
                                  : isFixedType
                                  ? "bg-[#E24B4A] border-red-200"
                                  : isCompleted
                                  ? "bg-emerald-500 border-emerald-600"
                                  : "bg-[#1D9E75] border-emerald-100"
                              }`} 
                            />

                            {/* TIMELINE CARD */}
                            <div 
                              className={`rounded-2xl border border-neutral-150 p-4.5 relative transition-all text-left shadow-xs ${
                                isDragging ? "opacity-40 scale-95 ring-2 ring-primary/30" :
                                isDragOver ? "ring-2 ring-primary/20" :
                                isCompleted ? "opacity-60 bg-[#F0FDF4]" : "bg-white hover:scale-[1.005] hover:shadow-sm hover:border-neutral-200/80"
                              }`}
                              style={{
                                borderLeft: `3px solid ${
                                  isCompleted
                                    ? "#16A34A"
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
                                    </div>

                                    <h4 className={`text-sm font-semibold tracking-tight leading-snug font-display mt-1 ${isCompleted ? "line-through text-neutral-400/70 opacity-50" : "text-neutral-800"}`}>
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

                                  {/* Controls: complete + edit + remove */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {!isFixedType && (
                                      <button 
                                        onClick={() => {
                                          if (isCompleted) {
                                            handleToggleTaskDone(item.id);
                                          } else {
                                            // Frictionless: show quick effort picker
                                            setEffortDialogTaskId(item.id);
                                          }
                                        }}
                                        className="p-1 cursor-pointer hover:bg-neutral-50 rounded-lg text-neutral-400 hover:text-emerald-500 transition-colors"
                                        title={isCompleted ? "Re-schedule" : "Mark Complete"}
                                      >
                                        {isCompleted ? (
                                          <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                                        ) : (
                                          <Circle className="w-5 h-5" />
                                        )}
                                      </button>
                                    )}

                                    {isFixedType && !isEmergencyItem && (
                                      <span className="p-1 cursor-not-allowed text-[#9999B3]" title="Absolute Locked">
                                        <Lock className="w-3.5 h-3.5" />
                                      </span>
                                    )}

                                    <div className="flex items-center gap-0.5">
                                      {!isCompleted && !isEmergencyItem && (
                                        <button 
                                          onClick={() => isFixedType
                                            ? handleOpenEditFixed(fixedBlocks.find(b => b.id === item.id)!)
                                            : handleOpenEditFlexible(flexibleTasks.find(t => t.id === item.id)!)
                                          }
                                          className="p-1 text-[#9999B3] hover:text-primary hover:bg-neutral-50 rounded transition-colors cursor-pointer"
                                          title="Edit"
                                        >
                                          <Edit2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                      
                                      {/* Can't do today button */}
                                      {!isFixedType && !isCompleted && (
                                        <button
                                          onClick={() => handleCantDoToday(item.id)}
                                          className="p-1 text-[#9999B3] hover:text-amber-500 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                                          title="Can't do today (Move to tomorrow)"
                                        >
                                          <CalendarDays className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* Return to Backlog button */}
                                      {!isFixedType && !isCompleted && (
                                        <button 
                                          onClick={() => handleUnscheduleTask(item.id)}
                                          className="p-1 text-[#9999B3] hover:text-blue-500 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                                          title="Return to Backlog"
                                        >
                                          <X className="w-3.5 h-3.5" />
                                        </button>
                                      )}

                                      {/* Delete button */}
                                      {!isEmergencyItem && (
                                        <button 
                                          onClick={() => isFixedType ? handleDeleteFixed(item.id) : handleDeleteFlexible(item.id)}
                                          className="p-1 text-[#9999B3] hover:text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                                          title={isFixedType ? "Delete block" : "Delete task entirely"}
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                </div>
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
                                          const updated = flexibleTasks.map(t =>
                                            t.id === item.id ? {
                                              ...t,
                                              status: "done" as const,
                                              focus_quality_effort: effort,
                                              completed_at: new Date().toISOString(),
                                              actual_duration_minutes: t.duration_minutes,
                                              category: t.category || getTaskCategory(t.title),
                                            } : t
                                          );
                                          handleUpdateFlexible(updated);
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

                              {/* Inline Task Expansion (workout exercises / class details) */}
                              {task?.description && (
                                <div className="mt-2">
                                  <button
                                    onClick={() => setExpandedTaskIds(prev => ({ ...prev, [item.id]: !prev[item.id] }))}
                                    className="flex items-center gap-1 text-[10px] font-bold text-primary/70 hover:text-primary cursor-pointer transition-colors"
                                  >
                                    <ChevronDown className={`w-3 h-3 transition-transform ${expandedTaskIds[item.id] ? "rotate-180" : ""}`} />
                                    {expandedTaskIds[item.id] ? "Hide details" : "See details"}
                                  </button>
                                  {expandedTaskIds[item.id] && (
                                    <div className="mt-2 p-3 bg-[#FAFAFA] border border-neutral-100 rounded-xl space-y-1.5 animate-fade-in">
                                      {task.description.split("\n").filter(Boolean).map((line, i) => (
                                        <div key={i} className="flex items-start gap-2 text-xs">
                                          <span className="w-4 h-4 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 text-[9px] font-bold mt-0.5">{i + 1}</span>
                                          <span className="text-neutral-600 font-medium leading-relaxed">{line.replace(/^[-•*]\s*/, "")}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Deadline badge */}
                              {item.deadline && (
                                <div className="mt-2 text-xs bg-amber-50 text-amber-700/80 border border-amber-100 rounded-lg px-2 py-0.5 w-max font-semibold ml-6">
                                  Due {new Date(item.deadline).toLocaleDateString("en", { weekday: "short", day: "numeric" })}
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

                {/* Right Column (Controls index companion - Only visible on lg+) */}
                <div className="hidden lg:block lg:col-span-4 space-y-4 lg:overflow-y-auto h-full pb-6 lg:pr-1">
                  
                  {/* DayFlow AI Copilot Card */}
                  <div 
                    onClick={handleOpenAICopilot}
                    className="glass-card rounded-2xl p-5 cursor-pointer hover:border-primary/45 group transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-[#EEEDFE] rounded-lg text-primary transition-transform duration-200 shrink-0">
                        <Sparkles className="w-5 h-5 fill-primary/10" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-sm font-bold text-[#1A1A2E]">DayFlow AI Copilot</h4>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        </div>
                        <p className="text-xs text-[#5A5A7A] leading-relaxed font-sans">
                          Talk with your unified assistant to schedule tasks, log mood, and adjust timing dynamically.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs font-bold text-primary pt-3 border-t border-neutral-100">
                      <span>Launch AI Copilot</span>
                      <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-0.75 transition-transform font-sans" />
                    </div>
                  </div>

                  {/* Interactive inline instructions config */}
                  <div className="glass-card rounded-2xl p-5 space-y-3 font-sans">
                    <h4 className="text-xs font-bold text-[#9999B3] uppercase tracking-wider">Timeline Diagnostics</h4>
                    
                    <div className="space-y-2.5">
                      <div className="flex gap-2 items-start text-xs text-[#5A5A7A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0 mt-1.5"></span>
                        <p><strong className="text-[#1A1A2E] font-semibold">Absolute Locked:</strong> Non-negotiable static hours (e.g. sleep, gym workout, class sessions).</p>
                      </div>
                      <div className="flex gap-2 items-start text-xs text-[#5A5A7A]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 mt-1.5"></span>
                        <p><strong className="text-[#1A1A2E] font-semibold">Adaptive Slotting:</strong> Fluid backlog tasks fill open gaps chronologically.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>
              </div>
            )}

            {/* TAB VIEW 2: MASTER BACKLOG */}
            {activeTab === "backlog" && (
              <div className="flex-1 flex flex-col p-4 md:p-6 lg:p-8 h-full overflow-y-auto">
                
                {/* Search / Filter Pills header */}
                <div className="flex items-center justify-between mb-4 gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#9999B3]">Backlog Filter</span>
                  <div className="flex gap-1.5 overflow-x-auto py-0.5 shrink-0 scrollbar-none">
                    {(["all", "deadline", "anytime", "done"] as const).map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setBacklogFilter(filter)}
                        className={`px-4 py-2 text-xs rounded-full cursor-pointer font-bold capitalize transition-all border whitespace-nowrap ${
                          backlogFilter === filter
                            ? "bg-primary text-white border-primary"
                            : "bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-150"
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
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                      <Zap className="w-8 h-8 text-neutral-300 stroke-[1.5] mb-2" />
                      <p className="text-sm font-semibold text-neutral-700">Backlog queue is empty</p>
                      <p className="text-xs text-[#9999B3] max-w-sm px-10 mt-1 leading-relaxed">
                        Tap "＋" to fill-up backlog items. No deadlines required; predictions map them automatically.
                      </p>
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
                  
                  {/* Instagram-style Profile Header */}
                  <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pb-6 border-b border-neutral-250/60 text-left">
                    {/* Avatar Circle */}
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 md:w-28 md:h-28 rounded-full bg-gradient-to-tr from-[#7F77DD] via-[#A894FF] to-[#14B8A6] p-[3px] flex items-center justify-center shadow-lg transition-transform duration-300 hover:rotate-6">
                        <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-4xl select-none">
                          {profileEmoji || "👨‍💻"}
                        </div>
                      </div>
                    </div>
                    
                    {/* Bio & Details */}
                    <div className="flex-1 text-center md:text-left space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                        <h2 className="text-xl font-bold tracking-tight text-neutral-800 font-display">{profileName}</h2>
                        <div className="flex items-center justify-center gap-2">
                          <span className="px-2.5 py-0.5 text-xs bg-neutral-100 border border-neutral-200 text-neutral-550 rounded-full font-semibold">
                            {profileAge} yrs old
                          </span>
                          <button 
                            onClick={() => {
                              navigate("/settings");
                              triggerHaptic(15);
                            }}
                            className="px-3 py-1 bg-white hover:bg-neutral-50 border border-neutral-200 hover:border-neutral-300 text-neutral-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                          >
                            Settings
                          </button>
                        </div>
                      </div>
                      
                      {/* Stats row */}
                      <div className="flex items-center justify-center md:justify-start gap-6 text-sm font-semibold text-neutral-750 py-1">
                        <div>
                          <span className="font-extrabold text-neutral-900">{totalCompletedTasks}</span> <span className="text-neutral-550 font-normal">tasks completed</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-neutral-900">{profiles.length}</span> <span className="text-neutral-550 font-normal">routines</span>
                        </div>
                        <div>
                          <span className="font-extrabold text-neutral-900">{completedStreak}d</span> <span className="text-neutral-550 font-normal">streak</span>
                        </div>
                      </div>

                      {/* Bio text */}
                      <div className="text-xs text-neutral-600 leading-relaxed font-sans max-w-md">
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
                      <button 
                        onClick={() => {
                          navigate("/insights");
                          triggerHaptic(12);
                        }}
                        className={`pb-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 cursor-pointer flex items-center gap-1.5 ${
                          profileViewTab === "insights" 
                            ? "border-primary text-primary" 
                            : "border-transparent text-neutral-400 hover:text-neutral-650"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>CCM Insights</span>
                      </button>
                    </div>
                  </div>

                  {/* Tab Content */}
                  {profileViewTab === "grid" && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="text-left">
                          <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-widest">Active Schedule Routines</h3>
                          <p className="text-xs text-neutral-400 mt-0.5">Toggle and configure templates for automated daily slotting.</p>
                        </div>
                        <button
                          onClick={handleOpenNewProfile}
                          className="bg-primary hover:bg-primary-dark text-white px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1 cursor-pointer font-display"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Create Routine</span>
                        </button>
                      </div>

                      {/* Profiles Grid */}
                      {profiles.length === 0 ? (
                        <div className="py-20 text-center flex flex-col items-center justify-center bg-white border border-dashed border-neutral-200 rounded-2xl">
                          <User className="w-8 h-8 text-neutral-400 stroke-[1.5] mb-2" />
                          <p className="text-sm font-semibold text-neutral-600">No Custom Profiles</p>
                          <p className="text-xs text-neutral-400 max-w-xs px-6 mt-1 leading-relaxed text-center font-sans">
                            Tap "Create Routine" to define fixed blocks for different daily structures.
                          </p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {profiles.map(profile => (
                            <div 
                              key={profile.id}
                              className="bg-white border border-neutral-200/60 rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 hover:-translate-y-0.5 shadow-sm hover:shadow-md relative text-left"
                            >
                              <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                  <span className="text-2xl p-2 bg-neutral-50 rounded-2xl border border-neutral-100 shadow-inner select-none">{profile.emoji || "📅"}</span>
                                  <button
                                    onClick={() => handleToggleProfileActive(profile.id)}
                                    className={`px-3 py-1.5 text-[10px] uppercase font-extrabold rounded-xl transition-all cursor-pointer shadow-sm ${
                                      profile.isActive 
                                        ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                                        : "bg-neutral-100 border border-neutral-200 text-neutral-500 hover:bg-neutral-150"
                                    }`}
                                  >
                                    {profile.isActive ? "Active" : "Activate"}
                                  </button>
                                </div>

                                <div className="text-left">
                                  <h4 className="font-bold text-neutral-800 text-sm font-display tracking-tight mb-0.5">{profile.name}</h4>
                                  <span className="text-[9px] uppercase tracking-wide font-extrabold px-1.5 py-0.5 rounded-md bg-neutral-50 border border-neutral-150 text-neutral-500">
                                    Applies: {profile.appliesTo}
                                  </span>
                                  {profile.description && (
                                    <p className="text-xs text-neutral-500 leading-relaxed mt-2 font-sans">{profile.description}</p>
                                  )}
                                </div>

                                {/* Profile Blocks */}
                                <div className="space-y-1.5 text-left">
                                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-neutral-400 block">Commitments ({profile.blocks.length})</span>
                                  {profile.blocks.length === 0 ? (
                                    <p className="text-xs text-neutral-400 italic">No blocks configured.</p>
                                  ) : (
                                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1 scrollbar-thin">
                                      {profile.blocks.map(block => (
                                        <div 
                                          key={block.id}
                                          className="px-2.5 py-1.5 bg-neutral-50/60 border border-neutral-100/40 rounded-xl flex items-center justify-between text-xs"
                                        >
                                          <span className="font-medium text-neutral-700">{block.title}</span>
                                          <span className="text-neutral-400 font-mono font-bold">{block.start_time} - {block.end_time}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center justify-between border-t border-neutral-100 pt-3 mt-6">
                                <button
                                  onClick={() => handleOpenEditProfile(profile)}
                                  className="text-xs font-bold text-primary hover:text-primary-dark cursor-pointer transition-colors flex items-center gap-1 font-display"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteProfile(profile.id)}
                                  className="text-xs font-bold text-red-500 hover:text-red-600 cursor-pointer transition-colors flex items-center gap-1"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Delete</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {profileViewTab === "insights" && (
                    /* CCM INSIGHTS VIEWPORT */
                    <div className="space-y-6 text-left">
                      {/* Subtitle / Calibration status indicator banner */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white border border-neutral-200/60 p-5 rounded-3xl shadow-xs text-left">
                        <div className="space-y-1 text-left">
                          <h3 className="text-sm font-bold text-neutral-800 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-amber-500 fill-amber-500/10" /> Circadian Rhythm AI Calibration
                          </h3>
                          <p className="text-xs text-neutral-500 leading-relaxed font-sans max-w-md">
                            Cognitive profiling uses historical completions to customize transition gaps and task durations.
                          </p>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1 text-right self-stretch sm:self-auto justify-between sm:justify-start">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono border ${
                            calibrationProfile.phase === 2 
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/50" 
                              : "bg-amber-50 text-amber-700 border-amber-200/50"
                          }`}>
                            {calibrationProfile.phase === 2 ? "Phase 2: Calibrated" : "Phase 1: Smart Defaults"}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-medium font-mono">
                            {calibrationProfile.totalCompletions} tasks logged
                          </span>
                        </div>
                      </div>

                      {/* Diagnostic Summary Cards Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                        <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-1 text-left">
                          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Peak Rhythm Focus</span>
                          <span className="text-base font-bold text-neutral-800 capitalize flex items-center gap-1 mt-0.5">
                            {calibrationProfile.peakFocusTime === "morning" && <Clock className="w-4 h-4 text-primary" />}
                            {calibrationProfile.peakFocusTime === "afternoon" && <Sparkles className="w-4 h-4 text-amber-500" />}
                            {calibrationProfile.peakFocusTime === "evening" && <Moon className="w-4 h-4 text-indigo-700" />}
                            {calibrationProfile.peakFocusTime} Focus
                          </span>
                          <span className="text-[10px] text-neutral-400 font-medium block">Best mental alignment</span>
                        </div>
                        <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-1 text-left">
                          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Underestimate Ratio</span>
                          <span className="text-base font-bold text-neutral-800 font-mono mt-0.5 block">
                            {calibrationProfile.underestimateRatio.toFixed(2)}x
                          </span>
                          <span className="text-[10px] text-neutral-400 font-medium block">Average duration error</span>
                        </div>
                        <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-1 text-left">
                          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Estimated Time Saved</span>
                          <span className="text-base font-bold text-emerald-650 font-mono mt-0.5 block">
                            ~{calibrationProfile.timeSavedMinutes || 90}m / day
                          </span>
                          <span className="text-[10px] text-neutral-400 font-medium block">Via automated pacing</span>
                        </div>
                        <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-1 text-left">
                          <span className="block text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Mood Alignment r</span>
                          <span className="text-base font-bold text-indigo-650 font-mono mt-0.5 block">
                            {(calibrationProfile.moodCorrelation !== undefined ? calibrationProfile.moodCorrelation : 0.87) >= 0 ? "+" : ""}
                            {(calibrationProfile.moodCorrelation !== undefined ? calibrationProfile.moodCorrelation : 0.87).toFixed(2)}
                          </span>
                          <span className="text-[10px] text-neutral-400 font-medium block">Pearson correlation coefficient</span>
                        </div>
                      </div>

                      {/* Bar Chart: Hourly Circadian Energy Cycle */}
                      <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-display">Circadian Rhythm Hourly Completion Rates</h4>
                            <p className="text-[11px] text-neutral-400 font-medium font-sans">Learned hour-by-hour task resolution efficiency curves</p>
                          </div>
                        </div>

                        {/* Chart Area */}
                        <div className="pt-2">
                          <div className="h-44 w-full flex items-end justify-between gap-1 overflow-x-auto pb-2 scrollbar-none font-mono">
                            {calibrationProfile.hourlyMetrics?.filter(m => m.hour >= 7 && m.hour <= 22).map((m) => {
                              // Color determination
                              let colorClass = "bg-[#D1D5DB]"; // slate gray default
                              if (m.completionRate >= 80) colorClass = "bg-emerald-500 hover:bg-emerald-600";
                              else if (m.completionRate >= 50) colorClass = "bg-amber-500 hover:bg-amber-600";
                              else colorClass = "bg-rose-500 hover:bg-rose-600";

                              const hourFormatted = m.hour === 12 ? "12p" : m.hour > 12 ? `${m.hour - 12}p` : `${m.hour}a`;

                              return (
                                <div key={m.hour} className="flex-1 flex flex-col items-center gap-2 min-w-[20px] max-w-[40px] group relative">
                                  {/* Tooltip on hover */}
                                  <div className="absolute bottom-[105%] bg-neutral-900 text-white text-[9px] font-sans rounded px-1.5 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 font-bold shadow-md whitespace-nowrap text-center">
                                    <span>Rate: {m.completionRate}%</span>
                                    <span className="block text-neutral-300 font-normal">Consistency: {m.consistency}%</span>
                                    <span className="block text-[#C7B5FF]">{m.label} State</span>
                                  </div>

                                  {/* Bar container */}
                                  <div className="w-full bg-neutral-100 rounded-t-lg h-28 flex items-end overflow-hidden">
                                    <div 
                                      className={`w-full rounded-t-lg transition-all duration-500 ease-out cursor-pointer ${colorClass}`}
                                      style={{ height: `${m.completionRate}%` }}
                                    />
                                  </div>

                                  {/* X label */}
                                  <span className="text-[9px] text-neutral-400 font-bold">{hourFormatted}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Chart Legend */}
                        <div className="flex items-center gap-4 text-[10px] font-bold text-neutral-500 font-sans pt-2 border-t border-neutral-100">
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                            <span>Peak Zone (≥80%)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <span>Moderate Zone (50%-79%)</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <span>Slump Zone (&lt;50%)</span>
                          </div>
                        </div>
                      </div>

                      {/* Row 2: Category Biases & Transition Gaps */}
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left">
                        
                        {/* Left sub-block: Category Estimation Biases (Machine Learning Learned Ratios) */}
                        <div className="lg:col-span-6 bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-4 text-left">
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-display">Category Duration Biases</h4>
                            <p className="text-[11px] text-neutral-400 font-medium font-sans">Learned ratio multipliers applied automatically to planning times</p>
                          </div>

                          <div className="space-y-3 font-sans">
                            {calibrationProfile.categoryBiases?.map((b) => {
                              const percentText = b.bias >= 1.0 ? `+${Math.round((b.bias - 1.0)*100)}% Underestimated` : `-${Math.round((1.0 - b.bias)*100)}% Overestimated`;
                              
                              // Badge styling
                              let badgeClass = "bg-neutral-50 border-neutral-200 text-neutral-600";
                              if (b.bias >= 1.3) badgeClass = "bg-rose-55 border-rose-200 text-rose-700";
                              else if (b.bias >= 1.1) badgeClass = "bg-amber-55 border-amber-200 text-amber-700";
                              else if (b.bias < 1.0) badgeClass = "bg-emerald-55 border-emerald-200 text-emerald-700";

                              return (
                                <div key={b.category} className="p-3 bg-neutral-50/50 border border-neutral-100 rounded-2xl flex items-center justify-between text-xs gap-3">
                                  <div className="space-y-0.5 text-left">
                                    <span className="font-bold text-neutral-850 capitalize block text-left">{b.category}</span>
                                    <span className="text-[10px] text-neutral-450 font-medium block leading-none">{percentText}</span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-neutral-400 font-medium font-mono">{b.samples} logs</span>
                                    <span className={`px-2 py-0.5 rounded font-mono font-bold border ${badgeClass}`}>
                                      {b.bias.toFixed(2)}x
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Right sub-block: Transition Buffer Gaps */}
                        <div className="lg:col-span-6 bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-4 text-left">
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-display">Transition Recovery Buffers</h4>
                            <p className="text-[11px] text-neutral-400 font-medium font-sans">Dynamic cognitive break targets required between tasks</p>
                          </div>

                          <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1 scrollbar-thin font-sans text-left">
                            {calibrationProfile.transitionGaps?.filter(tg => tg.fromType !== tg.toType || tg.fromType === "work").map((tg, idx) => {
                              const fromStr = tg.fromType;
                              const toStr = tg.toType;

                              return (
                                <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-neutral-50/60 border border-neutral-100/50 rounded-2xl">
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <span className="font-bold text-neutral-700 capitalize truncate">{fromStr}</span>
                                    <span className="text-neutral-400 font-bold shrink-0">→</span>
                                    <span className="font-semibold text-neutral-700 capitalize truncate">{toStr}</span>
                                  </div>

                                  <div className="flex items-center gap-2 text-right shrink-0 font-mono">
                                    <span className="text-[10px] text-neutral-400 font-medium">{tg.completionRate}% Success</span>
                                    <span className="font-bold text-[#8B7EFF] bg-indigo-50/60 px-2 py-0.5 border border-[#E0D9FF]/50 rounded-lg">
                                      {tg.optimalGap} min
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                      </div>

                      {/* Row 3: Procrastination Patterns Signature warnings */}
                      <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-4 text-left">
                        <div className="text-left">
                          <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-display">Procrastination & Behavior Signatures</h4>
                          <p className="text-[11px] text-neutral-400 font-medium font-sans">ML-modeled failure loops detected in your historical performance</p>
                        </div>

                        {calibrationProfile.procrastinationSignatures && calibrationProfile.procrastinationSignatures.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-sans text-left">
                            {calibrationProfile.procrastinationSignatures.map((s) => {
                              let severityBadge = "bg-neutral-50 border-neutral-200 text-neutral-500";
                              if (s.severity === "high") {
                                severityBadge = "bg-rose-50 border-rose-200 text-rose-700";
                              } else if (s.severity === "medium") {
                                severityBadge = "bg-amber-50 border-amber-200 text-amber-700";
                              }

                              return (
                                <div key={s.patternId} className="border border-neutral-150 bg-neutral-50/30 rounded-3xl p-4 flex flex-col justify-between space-y-3.5 text-left transition-all hover:bg-neutral-50/80">
                                  <div className="space-y-1.5 text-left">
                                    <div className="flex items-start justify-between gap-2">
                                      <h5 className="font-bold text-neutral-800 text-xs tracking-tight">{s.title}</h5>
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-extrabold border shrink-0 leading-none ${severityBadge}`}>
                                        {s.severity} loop
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-neutral-500 leading-relaxed font-sans">{s.description}</p>
                                  </div>

                                  <div className="space-y-2 pt-2 border-t border-neutral-100 text-left">
                                    <div className="flex items-center justify-between text-[10px] font-mono font-bold text-neutral-550">
                                      <span>Success probability rate:</span>
                                      <span className={s.completionRate < 30 ? "text-red-500" : "text-amber-600"}>
                                        {s.completionRate}%
                                      </span>
                                    </div>
                                    
                                    {/* Recommendation banner */}
                                    <div className="bg-white/80 border border-neutral-200 p-2.5 rounded-2xl flex items-start gap-1.5">
                                      <Sparkles className="w-3.5 h-3.5 text-primary fill-primary/10 shrink-0 mt-0.5" />
                                      <div className="text-left">
                                        <span className="text-[9px] font-bold text-primary uppercase tracking-wider block font-sans">System Calibrated Action</span>
                                        <p className="text-[10px] text-neutral-600 leading-relaxed font-sans">{s.recommendation}</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8 px-4 border border-dashed border-neutral-200 rounded-3xl bg-neutral-50/20 font-sans">
                            <p className="text-xs text-neutral-500 font-medium">No behavioral failure loops detected yet.</p>
                            <p className="text-[10px] text-neutral-400 mt-1">Continue logging task completions to calibrate your rhythm and unlock personalized performance signatures.</p>
                          </div>
                        )}
                      </div>


                      {/* ─── Weight & Health Progress ─── */}
                      <div className="bg-white border border-neutral-200/60 rounded-3xl p-5 shadow-xs space-y-4 text-left">
                        <div className="flex items-center justify-between">
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-neutral-800 uppercase tracking-wider font-display flex items-center gap-1.5">
                              <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-100" /> Health & Weight Progress
                            </h4>
                            <p className="text-[11px] text-neutral-400 font-medium font-sans mt-0.5">
                              Log weight via AI Copilot: <span className="text-primary font-semibold">"Today I weigh 74.5 kg"</span>
                            </p>
                          </div>
                          {weightLog.length > 0 && (
                            <div className="text-right">
                              <span className="text-xl font-extrabold text-neutral-800 font-mono">{weightLog[weightLog.length - 1]?.weight} <span className="text-xs font-bold text-neutral-400">kg</span></span>
                              <span className="block text-[10px] text-neutral-400 font-medium">Latest entry</span>
                            </div>
                          )}
                        </div>

                        {weightLog.length < 2 ? (
                          <div className="text-center py-8 px-4 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/30">
                            <Heart className="w-8 h-8 text-neutral-300 stroke-[1.5] mx-auto mb-2" />
                            <p className="text-xs text-neutral-500 font-medium">No weight data yet</p>
                            <p className="text-[10px] text-neutral-400 mt-1 max-w-xs mx-auto">
                              Tell the AI Copilot your weight each day (e.g. "Today I weigh 75 kg") or attach a scale photo and it will log it automatically.
                            </p>
                          </div>
                        ) : (() => {
                          const recent = weightLog.slice(-30);
                          const vals = recent.map(e => e.weight);
                          const min = Math.min(...vals);
                          const max = Math.max(...vals);
                          const range = max - min || 1;
                          const w = 400;
                          const h = 100;
                          const points = recent.map((e, i) => {
                            const x = (i / (recent.length - 1)) * w;
                            const y = h - ((e.weight - min) / range) * (h - 10) - 5;
                            return `${x},${y}`;
                          }).join(" ");
                          const firstWeight = recent[0].weight;
                          const lastWeight = recent[recent.length - 1].weight;
                          const delta = lastWeight - firstWeight;
                          const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1);
                          const deltaColor = delta < 0 ? "text-emerald-600" : delta > 0 ? "text-rose-600" : "text-neutral-500";

                          return (
                            <div className="space-y-3">
                              {/* Delta badge */}
                              <div className="flex items-center gap-3">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full border font-mono ${delta < 0 ? "bg-emerald-50 border-emerald-200 text-emerald-700" : delta > 0 ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-neutral-50 border-neutral-200 text-neutral-600"}`}>
                                  {deltaStr} kg over {recent.length} logs
                                </span>
                                <span className="text-[10px] text-neutral-400 font-medium">{recent[0].date} → {recent[recent.length - 1].date}</span>
                              </div>

                              {/* SVG Line Chart */}
                              <div className="bg-neutral-50 border border-neutral-100 rounded-2xl p-3 overflow-hidden">
                                <svg viewBox={`0 0 ${w} ${h + 20}`} className="w-full h-28" preserveAspectRatio="none">
                                  {/* Gradient fill */}
                                  <defs>
                                    <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="0%" stopColor="#8B7EFF" stopOpacity="0.25" />
                                      <stop offset="100%" stopColor="#8B7EFF" stopOpacity="0" />
                                    </linearGradient>
                                  </defs>
                                  {/* Fill area */}
                                  <polygon
                                    points={`0,${h + 5} ${points} ${w},${h + 5}`}
                                    fill="url(#wGrad)"
                                  />
                                  {/* Line */}
                                  <polyline
                                    points={points}
                                    fill="none"
                                    stroke="#8B7EFF"
                                    strokeWidth="2.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  />
                                  {/* Dots for each entry */}
                                  {recent.map((e, i) => {
                                    const x = (i / (recent.length - 1)) * w;
                                    const y = h - ((e.weight - min) / range) * (h - 10) - 5;
                                    return <circle key={i} cx={x} cy={y} r="3" fill="#8B7EFF" stroke="white" strokeWidth="1.5" />;
                                  })}
                                </svg>
                                <div className="flex items-center justify-between text-[9px] text-neutral-400 font-mono mt-1">
                                  <span>{recent[0].date}</span>
                                  <span className={`font-bold text-[10px] ${deltaColor}`}>{deltaStr} kg trend</span>
                                  <span>{recent[recent.length - 1].date}</span>
                                </div>
                              </div>

                              {/* Last 7 log entries */}
                              <div className="space-y-1 max-h-32 overflow-y-auto pr-1 scrollbar-thin">
                                {[...weightLog].reverse().slice(0, 7).map((e, i) => (
                                  <div key={i} className="flex items-center justify-between text-xs py-1 border-b border-neutral-50">
                                    <span className="text-neutral-500 font-medium">{new Date(e.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                                    <span className="font-bold text-neutral-800 font-mono">{e.weight} kg</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>

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
                <span>Ask AI</span>
              </button>
            </div>
          )}

          {/* BOTTOM NAVIGATION TAB BAR (Fixed boundary, does not move) */}
          <nav id="mobile_sticky_bottom_nav" className="menu h-20 border-t border-neutral-200/60 bg-white grid grid-cols-4 items-center z-45 flex-shrink-0 md:!hidden pb-1" role="navigation" style={{ '--component-active-color': '#7C3AED' } as React.CSSProperties}>
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
                <div className="grid grid-cols-3 gap-1.5">
                  {(["none", "daily", "weekdays"] as const).map((rep) => (
                    <button
                      key={rep}
                      type="button"
                      onClick={() => setFixedForm({ ...fixedForm, repeats: rep })}
                      className={`py-2 px-1 text-xs rounded-lg font-semibold border capitalize ${
                        fixedForm.repeats === rep
                          ? "bg-primary/10 text-primary border-primary"
                          : "bg-white text-neutral-500 border-neutral-200"
                      }`}
                    >
                      {rep === "none" ? "Once" : rep}
                    </button>
                  ))}
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
                  className="w-full px-3 py-2.5 border border-neutral-200 rounded-xl text-sm bg-white focus:ring-1 focus:ring-primary focus:outline-none"
                />
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
            const isCopilotFullScreen = userPromptsCount >= 3;
            return (
              <div 
                className={`absolute z-49 bg-white/95 backdrop-blur-xl transition-all duration-300 ease-out flex flex-col overflow-y-auto ${
                  activeBottomSheet === "assistant" 
                    ? "opacity-100 scale-100 pointer-events-auto" 
                    : "opacity-0 pointer-events-none invisible"
                } ${
                  isCopilotFullScreen
                    ? "top-0 bottom-0 left-0 right-0 w-full h-full max-h-screen rounded-none p-6"
                    : "bottom-0 left-0 right-0 max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl border border-neutral-200/80 shadow-2xl p-6 transform " + 
                      (activeBottomSheet === "assistant" ? "translate-y-0 scale-100" : "translate-y-full md:translate-y-10 md:scale-95")
                }`}
              >
                {!isCopilotFullScreen && (
                  <div className="flex justify-center pb-3">
                    <span className="w-10 h-1 bg-neutral-200 rounded-full" />
                  </div>
                )}

                {/* Header */}
                <div className="flex items-center justify-between mb-4 gap-2">
                  <h3 className="font-display font-semibold text-lg text-[#0F172A] flex items-center gap-1.5 shrink-0">
                    <Sparkles className="w-5 h-5 text-primary fill-primary/10 shrink-0" />
                    <span>DayFlow AI Copilot</span>
                  </h3>
                  
                  <button
                    type="button"
                    onClick={() => handleSendCopilotMessage("Summarize my day and plan tomorrow")}
                    disabled={isProcessingCopilot}
                    className="ml-auto px-2.5 py-1 text-[10px] md:text-xs font-bold bg-gradient-to-r from-primary to-indigo-600 hover:from-primary-dark hover:to-indigo-700 text-white rounded-full transition-all cursor-pointer flex items-center gap-1 shrink-0 active:scale-95 duration-200 disabled:opacity-50 disabled:pointer-events-none shadow-sm shadow-primary/10"
                    title="Summarize my day and plan tomorrow"
                  >
                    <Sparkles className="w-3 h-3 fill-white/10" />
                    <span>Summarize & Plan</span>
                  </button>
                </div>

            {/* Content Container */}
            <div className="space-y-5 flex-1 flex flex-col min-h-0">
              
              {/* Copilot Chat Message Area */}
              <div className="space-y-3 flex-1 max-h-[50vh] overflow-y-auto pr-1 flex flex-col">
                {chatHistory.map((msg, idx) => {
                  const isAI = msg.sender === "ai";
                  return (
                    <div 
                      key={idx} 
                      className={`flex flex-col max-w-[85%] ${isAI ? "self-start" : "self-end ml-auto"}`}
                    >
                      <div 
                        className={`p-3.5 text-xs leading-relaxed ${
                          isAI 
                            ? "bg-[#F6F5FF] border border-[#E0D9FF] text-[#1F2937] rounded-xl font-medium shadow-none" 
                            : "bg-primary text-white rounded-xl font-semibold shadow-[0_2px_4px_rgba(79,70,229,0.2)]"
                        }`}
                        style={{ whiteSpace: "pre-wrap" }}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })}
                {isProcessingCopilot && (
                  <div className="flex items-center gap-2 text-xs text-[#94A3B8] font-bold animate-pulse p-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                    <span>AI is formulating suggestions...</span>
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

                // Contextual greeting based on time
                if (hour < 10) {
                  personalized.push(`Good morning ${firstName}! Start with my highest priority task`);
                } else if (hour >= 21) {
                  personalized.push(`Wrap up my day and summarize what I got done`);
                } else {
                  personalized.push(`I'm feeling productive this ${timeGreeting}`);
                }

                // Based on today's specific tasks
                if (todayPending.length > 0) {
                  personalized.push(`I can't do "${todayPending[0].title}" today, move it`);
                } else {
                  personalized.push(`I'm lazy/tired. Keep it light today`);
                }

                // Based on backlog
                if (backlogTop.length > 0) {
                  personalized.push(`Schedule "${backlogTop[0].title}" for me today`);
                } else {
                  personalized.push(`Add study session for 2 hours`);
                }

                // Always useful
                personalized.push(`Postpone my gym/workout to tomorrow`);
                personalized.push(`Create a personalized workout plan for me`);
                personalized.push(`Summarize my day and plan tomorrow`);

                return (
                  <div className="space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-[#94A3B8] block">Quick prompts for you, {firstName}:</span>
                    <div className="flex flex-wrap gap-1.5">
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
                <div className="p-4 bg-white border border-[#E0D9FF] rounded-xl space-y-3 shadow-xs animate-fade-in text-left">
                  <div className="flex items-center gap-1.5 text-neutral-400 font-bold text-[11px] uppercase tracking-wider font-display">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <span>Proposed Changes</span>
                  </div>
                  <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                    {proposedChanges.map((change, idx) => (
                      <div key={idx} className="p-2.5 bg-neutral-50 border border-neutral-150 rounded-xl flex items-start gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-primary-light text-primary shrink-0 font-mono inline-block">
                              {change.action}
                            </span>
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
              <div className="border-t border-neutral-100 pt-4 space-y-2">
                {/* File Preview (image or PDF) */}
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
                    <button onClick={() => setCopilotImage(null)} className="text-indigo-300 hover:text-indigo-600 cursor-pointer shrink-0">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                {/* Hidden file input — images + PDFs, max 5 MB */}
                <input
                  ref={copilotImageInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    // ── Guard: 5 MB size limit ──────────────────────────────
                    const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
                    if (file.size > MAX_BYTES) {
                      showToast(`File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max allowed is 5 MB.`, "warning");
                      e.target.value = "";
                      return;
                    }

                    // ── Guard: PDFs — size proxy for page count (~300 KB/page) ──
                    // We can't count pages client-side without a library,
                    // so we cap PDFs at 1.5 MB ≈ ~5 pages as a safe proxy.
                    if (file.type === "application/pdf" && file.size > 1.5 * 1024 * 1024) {
                      showToast("PDF too large. Please keep PDFs under ~5 pages / 1.5 MB to stay within AI limits.", "warning");
                      e.target.value = "";
                      return;
                    }

                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result as string;
                      const base64 = dataUrl.split(",")[1];
                      // PDFs don't get a visual preview URL — use a sentinel
                      const previewUrl = file.type === "application/pdf" ? "" : dataUrl;
                      setCopilotImage({ base64, mimeType: file.type, previewUrl });
                    };
                    reader.readAsDataURL(file);
                    e.target.value = "";
                  }}
                />
                <div className="relative flex items-center">
                  <textarea 
                    value={copilotInput}
                    onChange={(e) => setCopilotInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendCopilotMessage();
                      }
                    }}
                    placeholder={
                      proposedChanges
                        ? "Changes ready below..."
                        : copilotImage
                        ? "Describe the file or just hit send..."
                        : `Hey ${profileName.split(" ")[0] || "there"}, what's on your mind? (e.g. 'I weigh 74.5 kg today')`
                    }
                    rows={2}
                    className="w-full pl-3 pr-24 py-2.5 border border-neutral-200 rounded-2xl text-xs bg-white focus:ring-1 focus:ring-primary focus:outline-none resize-none font-sans font-medium"
                    disabled={isProcessingCopilot || !!proposedChanges}
                  />
                  
                  <div className="absolute right-2.5 flex items-center gap-1.5">
                    {/* Attach image button */}
                    {!proposedChanges && (
                      <button
                        type="button"
                        onClick={() => copilotImageInputRef.current?.click()}
                        className={`p-2 rounded-xl transition-colors cursor-pointer ${
                          copilotImage ? "bg-indigo-100 text-indigo-600" : "bg-neutral-50 hover:bg-neutral-100 text-[#475569]"
                        }`}
                        title="Attach image or PDF (workout plan, timetable, scale photo)"
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
                          isListening ? "bg-red-500 text-white animate-pulse" : "bg-neutral-50 hover:bg-neutral-100 text-[#475569]"
                        }`}
                        title="Voice dictate"
                        disabled={isProcessingCopilot}
                      >
                        <Mic className="w-3.5 h-3.5" />
                      </button>
                    )}
                    
                    {!proposedChanges && (
                      <button
                        type="button"
                        onClick={handleSendCopilotMessage}
                        className="p-2 rounded-xl bg-primary hover:bg-primary-dark text-white transition-colors cursor-pointer"
                        disabled={isProcessingCopilot || (!copilotInput.trim() && !copilotImage)}
                      >
                        <Send className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Actions Area */}
              <div className="flex gap-2.5">
                {proposedChanges ? (
                  <>
                    <button 
                      type="button"
                      onClick={() => {
                        setProposedChanges(null);
                        setChatHistory(prev => [...prev, { sender: "ai", text: "Got it, let's adjust. What would you like to change?" }]);
                      }}
                      className="flex-1 py-3 text-xs font-bold rounded-xl bg-neutral-100 hover:bg-neutral-200 border border-neutral-300 text-neutral-800 transition-colors cursor-pointer text-center font-display animate-fade-in"
                    >
                      Revise Request
                    </button>
                    <button 
                      type="button"
                      onClick={handleConfirmAIChanges}
                      className="flex-1 py-3 text-xs font-bold rounded-xl bg-primary hover:bg-primary-dark text-white transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm shadow-primary/20 text-center font-display animate-fade-in"
                    >
                      <Check className="w-4 h-4" />
                      <span>Confirm Changes</span>
                    </button>
                  </>
                ) : (
                  <button 
                    type="button"
                    onClick={() => {
                      setActiveBottomSheet(null);
                      setCopilotInput("");
                      setProposedChanges(null);
                      setChatHistory([]);
                    }}
                    className="w-full py-3 text-xs font-bold rounded-xl border border-neutral-200 transition-colors cursor-pointer text-[#475569] hover:bg-neutral-50 text-center font-display"
                    disabled={isProcessingCopilot}
                  >
                    Close
                  </button>
                )}
              </div>
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
