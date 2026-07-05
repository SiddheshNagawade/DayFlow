import React from "react";
import { ChevronLeft, ChevronRight, TrendingUp, Sparkles, Clock, List, Calendar, Plus } from "lucide-react";
import { FlexibleTask, ScheduledItem } from "../../types";
import { minutesToTime, isFixedBlockActiveOnDate } from "../../utils/scheduler";
import { TaskCard } from "../ui/TaskCard";

interface CalendarTabProps {
  selectedDate: string;
  TODAY: string;
  flexibleTasks: FlexibleTask[];
  fixedBlocks: any[];
  daySchedule: { items: ScheduledItem[] };
  futurePredictions: Record<string, any>;
  handleMonthChange: (dir: "prev" | "next") => void;
  setSelectedDate: (date: string) => void;
  getLocalTodayStr: (date?: Date) => string;
  completedStreak: number;
  handleOpenEditFlexible: (task: FlexibleTask) => void;
  setFlexibleTasks: React.Dispatch<React.SetStateAction<FlexibleTask[]>>;
  expandedTaskIds: Record<string, boolean>;
  setExpandedTaskIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  deletingTaskId: string | null;
  setDeletingTaskId: (id: string | null) => void;
  handleDeleteFlexible: (id: string) => void;
  handleToggleTaskDone: (id: string) => void;
  handleOpenAddFlexible: (defaultToToday?: boolean) => void;
  fetchConsequenceInsight: (task: FlexibleTask) => Promise<any>;
  showToast: (msg: string, type?: "success" | "info" | "warning") => void;
  handleScheduleTaskToday: (task: FlexibleTask) => void;
  loadingInsightTaskId: string | null;
  handleInterventionFeedback?: (taskId: string, interventionType: string, wasHelpful: boolean) => void;
}

export const CalendarTab: React.FC<CalendarTabProps> = React.memo(({
  selectedDate,
  TODAY,
  flexibleTasks,
  fixedBlocks,
  daySchedule,
  futurePredictions,
  handleMonthChange,
  setSelectedDate,
  getLocalTodayStr,
  completedStreak,
  handleOpenEditFlexible,
  setFlexibleTasks,
  expandedTaskIds,
  setExpandedTaskIds,
  deletingTaskId,
  setDeletingTaskId,
  handleDeleteFlexible,
  handleToggleTaskDone,
  handleOpenAddFlexible,
  fetchConsequenceInsight,
  showToast,
  handleScheduleTaskToday,
  loadingInsightTaskId,
  handleInterventionFeedback
}) => {
  const [panelTab, setPanelTab] = React.useState<"tasks" | "schedule">("tasks");
  const [draggedTaskId, setDraggedTaskId] = React.useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = React.useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = React.useState<"before" | "after">("before");

  // Reorder callback for dragging tasks on the same calendar day
  const handleReorderTasks = React.useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
    setFlexibleTasks(prev => {
      const list = [...prev];
      const draggedIdx = list.findIndex(t => t.id === draggedId);
      const targetIdx = list.findIndex(t => t.id === targetId);
      if (draggedIdx === -1 || targetIdx === -1) return prev;
      
      const [draggedItem] = list.splice(draggedIdx, 1);
      const newTargetIdx = list.findIndex(t => t.id === targetId);
      const insertIdx = position === 'before' ? newTargetIdx : newTargetIdx + 1;
      list.splice(insertIdx, 0, draggedItem);
      return list;
    });
  }, [setFlexibleTasks]);

  const currentMonthGrid = React.useMemo(() => {
    const [year, monthVal, dayVal] = selectedDate.split("-").map(Number);
    const cursor = new Date(year, monthVal - 1, 1, 12, 0, 0);
    const month = cursor.getMonth();
    const dayOfWeek = cursor.getDay();
    const gridStart = new Date(cursor);
    gridStart.setDate(gridStart.getDate() - dayOfWeek);
    const cells = [];
    for (let i = 0; i < 35; i++) {
      const day = new Date(gridStart);
      day.setDate(gridStart.getDate() + i);
      const dStr = getLocalTodayStr(day);
      const dayFixed = fixedBlocks.filter(b => isFixedBlockActiveOnDate(b, dStr));
      const dayFlexible = flexibleTasks.filter(t => t.scheduled_date === dStr && t.status !== "skipped");
      
      const flexDuration = dayFlexible.reduce((acc, t) => acc + (t.duration_minutes || 0), 0);
      let intensityColor = "";
      if (flexDuration > 0) {
        if (flexDuration <= 60) intensityColor = "#22c55e"; // Green
        else if (flexDuration <= 120) intensityColor = "#eab308"; // Amber
        else if (flexDuration <= 180) intensityColor = "#f97316"; // Orange
        else intensityColor = "#ef4444"; // Red
      }

      cells.push({
        num: day.getDate(),
        dateStr: dStr,
        isCurrentMonth: day.getMonth() === month,
        isToday: dStr === TODAY,
        isSelected: dStr === selectedDate,
        hasFixed: dayFixed.length > 0,
        hasFlex: dayFlexible.length > 0,
        intensityColor
      });
    }
    return cells;
  }, [selectedDate, fixedBlocks, flexibleTasks, getLocalTodayStr, TODAY]);

  const dayFlexibleTasks = React.useMemo(() => {
    // Unique list of tasks scheduled on this day, or carried over from this day
    const scheduled = flexibleTasks.filter(t => t.scheduled_date === selectedDate && t.status !== "skipped");
    const carriedOver = flexibleTasks.filter(t => t.carried_over_from === selectedDate && t.scheduled_date !== selectedDate && t.status !== "skipped");
    return [...scheduled, ...carriedOver];
  }, [flexibleTasks, selectedDate]);

  return (
    <div className="tab-pane flex flex-col p-4 pt-3 pb-28 md:p-6 lg:p-8 md:pt-6 md:pb-8">
      
      {/* Stacked Layout */}
      <div className="space-y-6">
        
        {/* Top Section (Month grid) */}
        <div className="w-full space-y-4">
          
          {/* SECTION A: Monthly Calendar Grid (top block) */}
          <div className="glass-card rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3 border-b border-[var(--border)] dark:border-[var(--border)] pb-2">
              <h4 className="text-sm font-bold font-display tracking-tight text-[var(--text-primary)] dark:text-[var(--text-primary)]">
                {new Date(selectedDate).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
              </h4>
              <div className="flex gap-1.5 font-sans">
                <button 
                  onClick={() => handleMonthChange("prev")}
                  className="p-1 rounded bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-[var(--text-secondary)] dark:text-[var(--text-primary)]"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleMonthChange("next")}
                  className="p-1 rounded bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] hover:bg-neutral-200 dark:hover:bg-zinc-700 transition-colors cursor-pointer text-[var(--text-secondary)] dark:text-[var(--text-primary)]"
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
                  className={`h-11 flex flex-col items-center justify-start pt-1 pb-2 rounded-lg transition-all relative cursor-pointer ${ cell.isSelected ? "bg-primary text-white font-bold" : cell.isToday ? "bg-primary-light text-primary font-bold border border-primary/20" : cell.isCurrentMonth ? "text-neutral-800 dark:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-800" : "text-neutral-300" }`}
                >
                  <span className="text-sm">{cell.num}</span>
                  {cell.intensityColor && (
                    <span 
                      className="absolute bottom-1 left-2 right-2 h-1 rounded-full"
                      style={{ backgroundColor: cell.isSelected ? "#ffffff" : cell.intensityColor }}
                      title="Flex load intensity"
                    />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Day Detail Panel (Free, full-width below the calendar) */}
        <div className="w-full space-y-4 mt-2">
          
          <div className="flex flex-col gap-2 shrink-0">
            <h4 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-wider font-display border-b border-[var(--border)] dark:border-[var(--border)] pb-2 flex items-center justify-between">
              <span>Day Frame: {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" })}</span>
              <span className="text-xs font-mono text-[var(--text-tertiary)] font-normal">{daySchedule.items.length} slotted</span>
            </h4>

            {/* Center Toggle Tab Strip */}
            <div className="flex bg-[var(--bg-card-hover)] dark:bg-zinc-850 p-1 rounded-full items-center shadow-inner w-full">
              <button
                onClick={() => setPanelTab("tasks")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${ panelTab === "tasks" ? "bg-white dark:bg-[var(--bg-card)] text-primary shadow-sm" : "text-neutral-550 dark:text-[var(--text-secondary)] hover:text-neutral-750 dark:hover:text-white" }`}
              >
                <List className="w-3.5 h-3.5" />
                <span>Tasks ({dayFlexibleTasks.length})</span>
              </button>
              <button
                onClick={() => setPanelTab("schedule")}
                className={`flex-1 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer flex items-center justify-center gap-1.5 ${ panelTab === "schedule" ? "bg-white dark:bg-[var(--bg-card)] text-primary shadow-sm" : "text-neutral-550 dark:text-[var(--text-secondary)] hover:text-neutral-750 dark:hover:text-white" }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Timeline</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pb-6">
            {panelTab === "tasks" ? (
              <div className="space-y-4">
                {/* CTA Add Button at Top */}
                <button
                  onClick={() => handleOpenAddFlexible(true)}
                  className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-primary-gradient text-white rounded-xl text-xs font-bold shadow-md hover:opacity-95 transition-all cursor-pointer font-display"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Task for this Day</span>
                </button>

                {dayFlexibleTasks.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center space-y-3">
                    <div className="p-3 bg-[var(--bg-card-hover)] dark:bg-zinc-800 rounded-full text-[var(--text-tertiary)]">
                      <Calendar className="w-6 h-6 stroke-[1.5]" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-[var(--text-primary)]">No tasks scheduled</p>
                      <p className="text-[10px] text-[var(--text-tertiary)] max-w-[200px] mx-auto mt-0.5 leading-relaxed">
                        Routines run automatically. You can schedule tasks for this date.
                      </p>
                    </div>
                    <button
                      onClick={() => handleOpenAddFlexible(true)}
                      className="px-3.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Schedule a Task
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {dayFlexibleTasks.map((task) => {
                      const estimateStr = futurePredictions[task.id]?.reason || "Scheduled for this day";
                      
                      return (
                        <div
                          key={task.id}
                          draggable
                          onDragStart={() => setDraggedTaskId(task.id)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (task.id === draggedTaskId) return;
                            const rect = e.currentTarget.getBoundingClientRect();
                            const midY = rect.top + rect.height / 2;
                            setDragOverTaskId(task.id);
                            setDragOverPosition(e.clientY < midY ? "before" : "after");
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            if (draggedTaskId && draggedTaskId !== task.id) {
                              handleReorderTasks(draggedTaskId, task.id, dragOverPosition);
                            }
                            setDraggedTaskId(null);
                            setDragOverTaskId(null);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverTaskId(null);
                          }}
                           className={`relative transition-all duration-150 ${draggedTaskId === task.id ? "opacity-30 scale-90" : ""}`}
                        >
                          {/* Drop Indicator placeholder block */}
                          {dragOverTaskId === task.id && dragOverPosition === "before" && (
                            <div className="w-full bg-neutral-100 dark:bg-zinc-800 border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-2xl h-24 mb-4 animate-pulse flex items-center justify-center text-xs text-neutral-400 font-medium select-none">
                              Move task here
                            </div>
                          )}
                          
                          <TaskCard
                            task={task}
                            estimateStr={estimateStr}
                            deletingTaskId={deletingTaskId}
                            setDeletingTaskId={setDeletingTaskId}
                            handleDeleteFlexible={handleDeleteFlexible}
                            handleToggleTaskDone={handleToggleTaskDone}
                            handleOpenEditFlexible={handleOpenEditFlexible}
                            handleScheduleTaskToday={handleScheduleTaskToday} // Wire to action to schedule to today
                            backlogTab="carried"
                            setFlexibleTasks={setFlexibleTasks}
                            expandedTaskIds={expandedTaskIds}
                            setExpandedTaskIds={setExpandedTaskIds}
                            fetchConsequenceInsight={fetchConsequenceInsight}
                            showToast={showToast}
                            isCarriedOver={task.carried_over_from === selectedDate && task.scheduled_date !== selectedDate}
                            loadingInsightTaskId={loadingInsightTaskId}
                            handleInterventionFeedback={handleInterventionFeedback}
                          />

                          {dragOverTaskId === task.id && dragOverPosition === "after" && (
                            <div className="w-full bg-neutral-100 dark:bg-zinc-800 border-2 border-dashed border-neutral-300 dark:border-zinc-700 rounded-2xl h-24 mt-4 animate-pulse flex items-center justify-center text-xs text-neutral-400 font-medium select-none">
                              Move task here
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {daySchedule.items.length === 0 ? (
                  <p className="text-xs text-[#9999B3] italic py-3 select-none text-center">Nothing scheduled · Backlog tasks will be predicted here</p>
                ) : (
                  daySchedule.items.map((item) => {
                    const isFixedType = item.type === "fixed";
                    return (
                      <div 
                        key={item.id} 
                        className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)]/60 px-3 py-3 rounded-xl flex items-center justify-between text-xs animate-fade-in hover:bg-neutral-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <div className="truncate pr-2 select-text text-left">
                          <span className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate block text-left">{item.title}</span>
                          <span className="text-xs text-[var(--text-secondary)] dark:text-[var(--text-secondary)] font-mono">{item.start_time} – {item.end_time}</span>
                        </div>
                        <span className={`text-[11px] font-bold px-1.5 py-0.2 rounded shrink-0 uppercase tracking-wider font-mono ${ isFixedType ? "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400" : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" }`}>
                          {isFixedType ? "Fixed" : "Flexible"}
                        </span>
                      </div>
                    );
                  })
                )}

                {/* Coming from backlog prediction display */}
                <div className="mt-4 pt-4 border-t border-[var(--border)] dark:border-[var(--border)] space-y-2">
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
                            className="bg-white dark:bg-[var(--bg-card)] px-3 py-3 rounded-xl border border-dashed border-neutral-300 dark:border-[var(--border)] hover:border-[#8B7EFF]/45 hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] flex items-center justify-between text-xs cursor-pointer transition-all text-left text-[var(--text-primary)] dark:text-[var(--text-primary)] shadow-xs animate-fade-in"
                          >
                            <div className="truncate pr-2 select-text">
                              <span className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] truncate block">{task.title}</span>
                              <span className="text-[11px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-mono">Estimated prediction slot</span>
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
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CalendarTab.displayName = "CalendarTab";
