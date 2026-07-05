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
  Star
} from "lucide-react";
import { FlexibleTask } from "../../types";
import { getTaskCategory } from "../../utils/mlEngine";

export interface TaskCardProps {
  task: FlexibleTask;
  estimateStr?: string;
  deletingTaskId: string | null;
  setDeletingTaskId: (id: string | null) => void;
  handleDeleteFlexible: (id: string) => void;
  handleToggleTaskDone: (id: string) => void;
  handleOpenEditFlexible: (task: FlexibleTask) => void;
  handleScheduleTaskToday: (task: FlexibleTask) => void;
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
  timelineExpandedDetails?: React.ReactNode;
  
  // Refinements props
  loadingInsightTaskId?: string | null;
  isCarriedOver?: boolean;
  handleInterventionFeedback?: (taskId: string, interventionType: string, wasHelpful: boolean) => void;
}

export const TaskCard: React.FC<TaskCardProps> = React.memo(({
  task,
  estimateStr = "Checking gaps...",
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
  timelineExpandedDetails,
  loadingInsightTaskId = null,
  isCarriedOver = false,
  handleInterventionFeedback
}) => {
  const isHighEnergy = task.energy_level === "high";
  const isLowEnergy = task.energy_level === "low";
  const isTaskCompleted = task.status === "done" || isCompleted;
  const isDurationAdjusted = task.predictedDuration && Math.abs(task.predictedDuration - task.duration_minutes) >= 5;

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

  const isImportant = task.importance === "important" || task.importance === "critical";
  let ringStyle = "";
  if (isTaskCompleted) {
    ringStyle = "opacity-55 grayscale-[20%] bg-emerald-50/15 dark:bg-emerald-950/5 border-emerald-250 dark:border-emerald-900/30";
  } else if (isImportant) {
    ringStyle = "bg-amber-50/20 dark:bg-amber-950/10 border-amber-300 dark:border-amber-900/60 shadow-xs";
  } else if (isCarriedOver) {
    ringStyle = "border-dashed border-2 border-amber-400/80 dark:border-amber-700/50 bg-amber-50/5 dark:bg-amber-950/5 opacity-70 hover:opacity-90";
  } else if (viewMode === "timeline") {
    if (isActiveNow) ringStyle = "border-primary/30 ring-2 ring-primary/15 shadow-md shadow-primary/10 bg-white dark:bg-[var(--bg-card)]";
    else if (isUpNext) ringStyle = "border-neutral-200 dark:border-[var(--border)] border-dashed bg-white dark:bg-[var(--bg-card)]";
    else if (isSkipped || isExpired) ringStyle = "opacity-50 bg-[var(--bg-card-hover)] border-[var(--border)]";
    else if (isPastUnverified) ringStyle = "border-dashed border-neutral-300 dark:border-zinc-750 bg-neutral-50/40 dark:bg-zinc-900/30 opacity-75 hover:opacity-100";
  }

  return (
    <div 
      className={`glass-card rounded-2xl p-5 flex flex-col justify-between relative transition-all duration-200 hover:border-primary/30 overflow-hidden ${ringStyle}`}
    >
      {/* Inline confirmation delete trigger */}
      {deletingTaskId === task.id ? (
        <div className="absolute inset-0 bg-[var(--bg-card)] rounded-xl flex items-center justify-between p-4 z-10">
          <span className="text-xs font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)]">
            Remove this task permanently?
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => setDeletingTaskId(null)}
              className="px-2.5 py-1 text-xs font-bold border rounded bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] hover:bg-neutral-200 dark:hover:bg-zinc-700 text-[var(--text-secondary)] dark:text-[var(--text-primary)] transition-colors cursor-pointer"
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
          {(isCarriedOver || !!task.original_scheduled_date) && (
            <span 
              className="text-amber-700 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-200 dark:border-amber-900/30"
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
          {isImportant && !isTaskCompleted && (
            <span 
              className="text-amber-700 dark:text-amber-450 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 border border-amber-250 dark:border-amber-900/30"
            >
              <span>⭐ Important</span>
            </span>
          )}
          {viewMode === "timeline" ? (
            <div className="flex items-center gap-1.5 text-xs leading-none overflow-x-auto no-scrollbar flex-nowrap">
              {isPastUnverified && (
                <span className="text-[var(--text-tertiary)] bg-[var(--bg-page)] px-1.5 py-0.5 rounded-md text-[9px] font-bold normal-case shrink-0 border border-[var(--border)]">
                  ⏱ Unverified
                </span>
              )}
              {isActiveNow && (
                <span className="text-[var(--text-primary)] bg-[var(--bg-card-hover)] px-1.5 py-0.5 rounded-md text-[9px] font-bold normal-case shrink-0 border border-[var(--border-strong)]">
                  ⚡ Active
                </span>
              )}
              {isUpNext && (
                <span className="text-[var(--text-tertiary)] bg-[var(--bg-page)] px-1.5 py-0.5 rounded-md text-[9px] font-bold normal-case shrink-0 border border-[var(--border)]">
                  Next →
                </span>
              )}
              {isSkipped && (
                <span className="text-[var(--text-tertiary)] bg-[var(--bg-page)] px-1.5 py-0.5 rounded-md text-[9px] font-bold normal-case shrink-0 border border-[var(--border)]">
                  Skipped
                </span>
              )}
              {isExpired && (
                <span className="text-[var(--text-tertiary)] bg-[var(--bg-page)] px-1.5 py-0.5 rounded-md text-[9px] font-bold normal-case shrink-0 border border-[var(--border)]">
                  Expired
                </span>
              )}
            </div>
          ) : (
            !isCarriedOver && (

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
            )
          )}
        </div>

        {/* Action Controls */}
        <div className="flex gap-1 items-center">
          {viewMode === "timeline" ? (
            timelineControls
          ) : (
            <>
              {isTaskCompleted ? (
                <span className="p-1 text-emerald-600 bg-emerald-50 rounded" title="Task Completed">
                  <Check className="w-3.5 h-3.5 stroke-[3px]" />
                </span>
              ) : (
                <button
                  onClick={() => handleToggleTaskDone(task.id)}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
                  title="Mark Task as Done"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              )}
              <button 
                onClick={() => handleOpenEditFlexible(task)}
                className="p-1 hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[#9999B3] hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] rounded transition-colors"
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
            </>
          )}
        </div>
      </div>

      <div className="flex items-start gap-1.5 mb-2">
        {viewMode === "timeline" && dragHandle}
        <h5 className={`font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] text-sm tracking-tight leading-snug line-clamp-2 select-all font-display flex-1 ${isTaskCompleted ? "line-through text-neutral-400 dark:text-zinc-500" : ""}`}>
          {task.title}
        </h5>
      </div>

      {task.suggestedIntervention && !isTaskCompleted && (
        <div className="mt-1 mb-2 px-2.5 py-1.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-lg flex items-center justify-between gap-1.5 text-[10px] text-amber-800 dark:text-amber-300 font-medium">
          <div className="flex items-center gap-1.5">
            <span className="shrink-0 text-xs text-amber-600 dark:text-amber-400">💡</span>
            <span>{task.suggestedIntervention.reason}</span>
          </div>
          {handleInterventionFeedback && (
            <div className="flex items-center gap-2 shrink-0 border-l border-amber-200/40 pl-2">
              <button 
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
          {viewMode === "timeline" && timeSlotStr ? (
            <>
              <Clock className="w-3.5 h-3.5 text-neutral-450 dark:text-neutral-400 shrink-0" />
              <span className="font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{timeSlotStr}</span>
              {isDurationAdjusted ? (
                <span className="text-[10px] text-neutral-400 cursor-help border-b border-dotted border-neutral-300 dark:border-zinc-700" title="Adjusted using your previous work sessions">
                  (~{task.predictedDuration} min)
                </span>
              ) : (
                <span className="text-[10px] text-neutral-400">({task.duration_minutes} min)</span>
              )}
            </>
          ) : (
            <>
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
            </>
          )}
        </span>
        
        {task.deadline && (
          <span className="text-red-600 font-sans text-xs font-semibold bg-red-50 px-1.5 py-0.5 rounded border border-red-100 flex items-center gap-0.5">
            Due {new Date(task.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
      </div>

      {viewMode === "timeline" ? (
        timelineExpandedDetails
      ) : (
        <>
          <div className="flex items-center justify-between mt-3 pt-2">
            {/* Prediction stamps */}
            <span className="text-xs font-medium text-[var(--text-tertiary)] italic font-mono truncate animate-pulse-slow">
              {estimateStr}
            </span>

            {backlogTab === "dropped" ? (
              <button 
                onClick={() => {
                  setFlexibleTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: "backlog", scheduled_date: null } : t));
                  showToast("Task restored to active backlog", "success");
                }}
                className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Recover to Backlog
              </button>
            ) : task.status !== "done" && !isCarriedOver && (
              <button 
                onClick={() => handleScheduleTaskToday(task)}
                className="px-2.5 py-1 text-xs bg-primary-gradient hover:opacity-90 font-bold text-white rounded-lg transition-colors cursor-pointer flex items-center gap-0.5 text-right shrink-0"
              >
                Schedule today →
              </button>
            )}
          </div>

          {/* Expansion Details & Consequences for Flexible Tasks */}
          <div className="mt-2">
            <button
              onClick={() => setExpandedTaskIds(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
              className="flex items-center gap-1 text-[10px] font-bold text-primary/70 hover:text-primary cursor-pointer transition-colors"
            >
              <ChevronDown className={`w-3 h-3 transition-transform ${expandedTaskIds[task.id] ? "rotate-180" : ""}`} />
              {expandedTaskIds[task.id] ? "Hide details" : "See details & consequences"}
            </button>
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
        </>
      )}
    </div>
  );
});

TaskCard.displayName = "TaskCard";
