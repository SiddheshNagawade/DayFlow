import React from "react";
import { 
  AlertTriangle, 
  Check, 
  Edit2, 
  Trash2, 
  ChevronDown, 
  Zap, 
  RotateCcw,
  Clock,
  ArrowRight,
  Star,
  XCircle,
  Calendar
} from "lucide-react";
import { FlexibleTask } from "../../types";
import { getTaskCategory } from "../../utils/mlEngine";
import { saveFlexibleTasks } from "../../utils/storage";

export interface TaskCardProps {
  task: FlexibleTask;
  estimateStr?: string;
  deletingTaskId: string | null;
  setDeletingTaskId: (id: string | null) => void;
  handleDeleteFlexible: (id: string) => void;
  handleToggleTaskDone: (id: string) => void;
  handleOpenEditFlexible: (task: FlexibleTask) => void;
  handleScheduleTaskToday: (task: FlexibleTask, dateStr: string) => void;
  backlogTab: "carried" | "dropped";
  setFlexibleTasks: React.Dispatch<React.SetStateAction<FlexibleTask[]>>;
  expandedTaskIds: Record<string, boolean>;
  setExpandedTaskIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  fetchConsequenceInsight: (task: FlexibleTask) => Promise<any>;
  showToast: (msg: string, type?: "success" | "info" | "warning") => void;
  
  // Timeline-specific optional props
  viewMode?: "backlog" | "timeline";
  timeSlotStr?: string;
  isActiveNow?: boolean;
  isUpNext?: boolean;
  isPastUnverified?: boolean;
  isCompleted?: boolean;
  isSkipped?: boolean;
  isExpired?: boolean;
  dragHandle?: React.ReactNode;
  timelineControls?: React.ReactNode;
  isCarriedOver?: boolean;
  loadingInsightTaskId?: string | null;
  handleInterventionFeedback?: (taskId: string, type: string, helpful: boolean) => void;
}

const triggerHaptic = (pattern: number | number[]) => {
  if (typeof window !== "undefined" && window.navigator && window.navigator.vibrate) {
    window.navigator.vibrate(pattern);
  }
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  estimateStr,
  deletingTaskId,
  setDeletingTaskId,
  handleDeleteFlexible,
  handleToggleTaskDone,
  handleOpenEditFlexible,
  handleScheduleTaskToday,
  backlogTab,
  setFlexibleTasks,
  expandedTaskIds,
  setExpandedTaskIds,
  fetchConsequenceInsight,
  showToast,
  viewMode = "backlog",
  timeSlotStr,
  isActiveNow = false,
  isUpNext = false,
  isPastUnverified = false,
  isCompleted = false,
  isSkipped = false,
  isExpired = false,
  dragHandle,
  timelineControls,
  isCarriedOver = false,
  loadingInsightTaskId = null,
  handleInterventionFeedback
}) => {
  const isHighEnergy = task.energy_level === "high";
  const isLowEnergy = task.energy_level === "low";
  const isTaskCompleted = task.status === "done" || isCompleted;
  const isImportant = task.importance === "important" || task.importance === "critical";
  const isDurationAdjusted = task.predictedDuration && Math.abs(task.predictedDuration - task.duration_minutes) >= 5;

  const [swipeX, setSwipeX] = React.useState(0);
  const [isSwipeOpen, setIsSwipeOpen] = React.useState(false);
  const swipeTouchStart = React.useRef(0);

  const handleTouchStart = (e: React.TouchEvent) => {
    swipeTouchStart.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const dx = e.touches[0].clientX - swipeTouchStart.current;
    
    // Swipe right (reveals delete on the left): limit to 65px
    if (dx > 0) {
      setSwipeX(Math.min(dx, 65));
    } 
    // Swipe left (reveals edit and star on the right): limit to -105px
    else if (dx < 0) {
      setSwipeX(Math.max(dx, -105));
    }
  };

  const handleTouchEnd = () => {
    if (swipeX > 25) {
      setSwipeX(55); // open left swipe action (Delete)
      setIsSwipeOpen(true);
    } else if (swipeX < -25) {
      setSwipeX(-95); // open right swipe actions (Edit & Star)
      setIsSwipeOpen(true);
    } else {
      setSwipeX(0);
      setIsSwipeOpen(false);
    }
  };

  const closeSwipe = () => {
    setSwipeX(0);
    setIsSwipeOpen(false);
  };

  React.useEffect(() => {
    if (!isSwipeOpen) return;
    const handleGlobalClick = () => {
      closeSwipe();
    };
    window.addEventListener("click", handleGlobalClick);
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [isSwipeOpen]);

  const handleToggleImportance = () => {
    const nextImportance = isImportant ? "optional" as const : "important" as const;
    setFlexibleTasks(prev => {
      const updated = prev.map(t => t.id === task.id ? { 
        ...t, 
        importance: nextImportance,
        field_timestamps: { ...t.field_timestamps, importance: new Date().toISOString() }
      } : t);
      saveFlexibleTasks(updated);
      return updated;
    });
    showToast(isImportant ? "Task marked as normal" : "Task marked as Important ⭐", "success");
  };

  // Helper isTaskStale
  const isTaskStale = (t: FlexibleTask): boolean => {
    if (t.status === "done") return false;
    const parts = t.id.split("-");
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

  let ringStyle = "";
  if (isTaskCompleted) {
    ringStyle = "opacity-55 grayscale-[20%] bg-emerald-50/15 dark:bg-emerald-950/5 border-emerald-250 dark:border-emerald-900/30";
  } else if (isImportant) {
    ringStyle = "bg-amber-50/20 dark:bg-amber-950/10 border-amber-300 dark:border-amber-900/60 shadow-xs hover:translate-y-[-2px] hover:shadow-md";
  } else if (isCarriedOver) {
    ringStyle = "border-dashed border-2 border-amber-400/80 dark:border-amber-700/50 bg-amber-50/5 dark:bg-amber-950/5 opacity-70 hover:opacity-90 hover:translate-y-[-2px]";
  } else {
    // Normal card styling (replaces glass-card fallback so Tailwind colors can render)
    ringStyle = "bg-white dark:bg-zinc-900 border-zinc-800 dark:border-zinc-350 hover:border-zinc-950 dark:hover:border-zinc-50 hover:translate-y-[-2px] hover:shadow-md";
  }

  const TODAY = new Date().toLocaleDateString("en-CA");

  return (
    <div className="relative overflow-hidden rounded-2xl w-full">
      {/* Left swipe actions (reveals Delete on swiping right, swipeX > 0) */}
      {swipeX > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center pl-3.5 z-0 animate-fade-in">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setDeletingTaskId(task.id);
              closeSwipe();
            }}
            className="flex items-center justify-center w-9 h-9 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl hover:bg-red-100 transition-colors text-red-500 cursor-pointer"
            title="Delete item"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Right swipe actions (reveals Edit & Star on swiping left, swipeX < 0) */}
      {swipeX < 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-3.5 z-0 animate-fade-in">
          {/* Star/Importance Toggle */}
          {!isTaskCompleted && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleToggleImportance();
                closeSwipe();
              }}
              className={`flex items-center justify-center w-9 h-9 rounded-xl transition-colors cursor-pointer border ${
                isImportant 
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-500 hover:bg-amber-100 border-amber-200 dark:border-amber-900/30" 
                  : "bg-neutral-50 dark:bg-zinc-800 text-neutral-400 dark:text-zinc-500 hover:text-amber-500 border-neutral-200 dark:border-zinc-700"
              }`}
              title={isImportant ? "Mark as Normal" : "Mark as Important"}
            >
              <Star className={`w-3.5 h-3.5 ${isImportant ? "fill-amber-500" : ""}`} />
            </button>
          )}
          {/* Edit */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenEditFlexible(task);
              closeSwipe();
            }}
            className="flex items-center justify-center w-9 h-9 bg-neutral-50 dark:bg-zinc-850 border border-neutral-200 dark:border-zinc-700 rounded-xl hover:bg-neutral-100 dark:hover:bg-zinc-800 transition-colors text-zinc-500 cursor-pointer"
            title="Edit detailed attributes"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main card (rounded border wrapper) */}
      <div 
        onClick={(e) => {
          if (isSwipeOpen || swipeX !== 0) {
            e.stopPropagation();
            closeSwipe();
            return;
          }
          setExpandedTaskIds(prev => ({ ...prev, [task.id]: !prev[task.id] }));
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: "transform 0.15s ease",
        }}
        className={`rounded-2xl p-5 border flex flex-col justify-between relative z-10 transition-all duration-200 hover:border-primary/30 cursor-pointer overflow-hidden ${ringStyle}`}
      >
        {/* Inline confirmation delete trigger */}
        {deletingTaskId === task.id ? (
          <div className="absolute inset-0 bg-[var(--bg-card)] rounded-xl flex items-center justify-between p-4 z-10">
            <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)]">
              Remove this task permanently?
            </span>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setDeletingTaskId(null);
                }}
                className="px-2.5 py-1 text-xs font-bold border rounded bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] hover:bg-neutral-200 dark:hover:bg-zinc-700 text-[var(--text-secondary)] dark:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteFlexible(task.id);
                }}
                className="px-2.5 py-1 text-xs font-bold text-white rounded bg-red-600 hover:bg-red-700 transition-colors cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}

        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            {(isCarriedOver || !!task.original_scheduled_date) && (
              <span 
                className="text-amber-700 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-250 dark:border-amber-900/30"
                title={task.backlog_shifted_at ? `Shifted to backlog on ${new Date(task.backlog_shifted_at).toLocaleString()}` : undefined}
              >
                <span>➡️ Pending</span>
                {task.original_scheduled_date && (
                  <span className="opacity-80">
                    (From {new Date(task.original_scheduled_date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })})
                  </span>
                )}
              </span>
            )}
            {!isCarriedOver && (
              <>
                <span 
                  className="w-1.5 h-1.5 rounded-full"
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
              </>
            )}
          </div>

          {/* Circular checkbox directly on the card itself */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTaskDone(task.id);
              triggerHaptic(50);
            }}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center cursor-pointer transition-all shrink-0 ${
              isTaskCompleted
                ? "bg-zinc-900 dark:bg-zinc-100 border-zinc-900 dark:border-zinc-100"
                : "border-zinc-300 dark:border-zinc-600 hover:border-zinc-500"
            }`}
            title={isTaskCompleted ? "Mark as Incomplete" : "Mark as Done"}
          >
            {isTaskCompleted && <Check className="w-3.5 h-3.5 text-white dark:text-zinc-900 stroke-[2.5]" />}
          </button>
        </div>

        <div className="flex items-start gap-1.5 mb-2">
          <h5 className={`font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-sm tracking-tight leading-snug line-clamp-2 select-all font-display flex-1 ${isTaskCompleted ? "line-through text-neutral-400 dark:text-zinc-500" : ""}`}>
            {task.title}
          </h5>
        </div>

        {task.suggestedIntervention && !isTaskCompleted && (
          <div className="mt-1 mb-2 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-lg flex items-center justify-between gap-1.5 text-[10px] text-amber-800 dark:text-amber-300 font-medium">
            <div className="flex items-center gap-1.5">
              <span className="shrink-0 text-xs text-amber-600 dark:text-amber-450">💡</span>
              <span>{task.suggestedIntervention.reason}</span>
            </div>
            {handleInterventionFeedback && (
              <div className="flex items-center gap-2 shrink-0 border-l border-amber-200/40 pl-2">
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInterventionFeedback(task.id, task.suggestedIntervention!.type, true);
                  }}
                  className="hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                  title="This suggestion is helpful"
                >
                  👍
                </button>
                <button 
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleInterventionFeedback(task.id, task.suggestedIntervention!.type, false);
                  }}
                  className="hover:scale-125 transition-transform active:scale-95 cursor-pointer"
                  title="This suggestion is not helpful"
                >
                  👎
                </button>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between text-xs mt-2 pt-2 border-t border-[var(--border)] dark:border-[var(--border)] gap-1 font-mono">
          <span className="text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-sans flex items-center gap-1.5">
            {isDurationAdjusted ? (
              <span>
                Duration: <strong className="text-[var(--text-secondary)] dark:text-[var(--text-primary)]">{task.duration_minutes} min</strong>
                <span className="text-[10px] text-neutral-400 ml-1.5 cursor-help border-b border-dotted border-neutral-300 dark:border-zinc-700" title="Adjusted using your previous work sessions">
                  (Estimated: {task.predictedDuration} min)
                </span>
              </span>
            ) : (
              <span>
                Duration: <strong className="text-[var(--text-secondary)] dark:text-[var(--text-primary)]">{task.duration_minutes} min</strong>
              </span>
            )}
          </span>
          
          {task.deadline && (
            <span className="text-red-600 font-sans text-xs font-semibold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-0.5">
              Due {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3 pt-2">
          {/* Prediction stamps */}
          <span className="text-xs font-medium text-[var(--text-tertiary)] italic font-mono truncate">
            {estimateStr}
          </span>

          {backlogTab === "dropped" ? (
            <button 
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFlexibleTasks(prev => {
                  const updated = prev.map(t => t.id === task.id ? { 
                    ...t, 
                    status: "backlog" as const, 
                    backlog_shifted_at: undefined,
                    field_timestamps: { ...t.field_timestamps, status: new Date().toISOString() } 
                  } : t);
                  saveFlexibleTasks(updated);
                  return updated;
                });
                showToast(`"${task.title}" recovered to backlog!`, "success");
              }}
              className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Recover to Backlog
            </button>
          ) : task.status !== "done" && !isCarriedOver && (
            <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
              <label 
                className="px-2.5 py-1.5 text-xs bg-primary-gradient hover:opacity-90 font-bold text-white rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer relative"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule</span>
                <input 
                  type="date"
                  min={TODAY}
                  onChange={(e) => {
                    if (e.target.value) {
                      handleScheduleTaskToday(task, e.target.value);
                    }
                  }}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  title="Select date to schedule task"
                />
              </label>
            </div>
          )}
        </div>

        {/* Expansion Details & Consequences for Flexible Tasks */}
        <div className="mt-2">
          {expandedTaskIds[task.id] && (
            <div className="mt-2 space-y-3">
              {/* Standard Description Box */}
              {task.description && (
                <div className="p-3 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)]/60 rounded-xl">
                  <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest block mb-1">Description / Subtasks</span>
                  <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] whitespace-pre-wrap">{task.description}</p>
                </div>
              )}

              {/* AI Consequence Box — monochrome */}
              {task.status !== "done" && (
                <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] overflow-hidden">
                  <div className="flex items-center justify-between px-3 pt-2.5 pb-2 border-b border-[var(--border)]/60">
                    <span className="text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> Consequence
                    </span>
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        fetchConsequenceInsight(task);
                      }}
                      disabled={loadingInsightTaskId === task.id}
                      className="text-[9px] font-bold text-[var(--text-tertiary)] hover:text-[var(--text-primary)] cursor-pointer flex items-center gap-1 disabled:opacity-40 transition-colors"
                    >
                      {loadingInsightTaskId === task.id && (
                        <span className="w-2.5 h-2.5 border border-[var(--text-tertiary)] border-t-transparent rounded-full animate-spin shrink-0" />
                      )}
                      {task.consequence_insight ? "Regen" : "Analyze"}
                    </button>
                  </div>
                  <div className="px-3 py-2.5">
                    {task.consequence_insight ? (
                      <p className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-primary)] leading-relaxed">{task.consequence_insight}</p>
                    ) : (
                      <p className="text-xs text-[var(--text-tertiary)] italic">Tap &ldquo;Analyze&rdquo; to see the impact of skipping.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

TaskCard.displayName = "TaskCard";
