import React, { useState, useMemo, useCallback } from "react";
import { 
  Search, 
  Sparkles, 
  TrendingUp, 
  SlidersHorizontal,
  RotateCcw,
  Edit2,
  Trash2,
  ChevronDown,
  Zap,
  Info,
  Flame,
  Calendar,
  Lock,
  Plus,
  Filter,
  Check,
  AlertTriangle
} from "lucide-react";
import { FlexibleTask, FrictionReason } from "../../types";
import { TaskCard } from "../ui/TaskCard";

interface BacklogTabProps {
  backlogTab: "carried" | "dropped";
  setBacklogTab: (tab: "carried" | "dropped") => void;
  flexibleTasks: FlexibleTask[];
  setFlexibleTasks: React.Dispatch<React.SetStateAction<FlexibleTask[]>>;
  expandedTaskIds: Record<string, boolean>;
  setExpandedTaskIds: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  handleOpenEditFlexible: (task: FlexibleTask) => void;
  handleScheduleTaskToday: (task: FlexibleTask) => void;
  setDeletingTaskId: (id: string | null) => void;
  showToast: (msg: string, type?: "success" | "info" | "warning") => void;
  TODAY: string;
  fetchConsequenceInsight: (task: FlexibleTask) => Promise<any>;
  consequenceCache: Record<string, any>;
  // Missing props added
  deletingTaskId: string | null;
  handleDeleteFlexible: (id: string) => void;
  handleToggleTaskDone: (id: string) => void;
  handleOpenAddFlexible: (isToday: boolean) => void;
  futurePredictions: Record<string, any>;
  handleInterventionFeedback?: (taskId: string, interventionType: string, wasHelpful: boolean) => void;
}

export const BacklogTab: React.FC<BacklogTabProps> = React.memo(({
  backlogTab,
  setBacklogTab,
  flexibleTasks,
  setFlexibleTasks,
  expandedTaskIds,
  setExpandedTaskIds,
  handleOpenEditFlexible,
  handleScheduleTaskToday,
  setDeletingTaskId,
  showToast,
  TODAY,
  fetchConsequenceInsight,
  consequenceCache,
  deletingTaskId,
  handleDeleteFlexible,
  handleToggleTaskDone,
  handleOpenAddFlexible,
  futurePredictions,
  handleInterventionFeedback
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [backlogFilter, setBacklogFilter] = useState<"all" | "deadline" | "anytime" | "done">("all");
  const [showBacklogFilterDropdown, setShowBacklogFilterDropdown] = useState(false);

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<"before" | "after">("before");

  const handleReorderTasks = useCallback((draggedId: string, targetId: string, position: 'before' | 'after') => {
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

  // Helper isTaskStale
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

  // Filter calculations (used to be in App.tsx but fit perfectly here as local useMemos)
  const carriedBacklog = useMemo(() => {
    return flexibleTasks.filter(t => t.status === "backlog" && (!t.scheduled_date || t.scheduled_date < TODAY));
  }, [flexibleTasks, TODAY]);

  const droppedTasks = useMemo(() => {
    return flexibleTasks.filter(t => t.status === "skipped" || t.status === "expired");
  }, [flexibleTasks]);

  const filteredBacklogTasks = useMemo(() => {
    const list = backlogTab === "carried" ? carriedBacklog : droppedTasks;
    return list.filter(t => {
      const matchSearch = t.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (t.description || "").toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchFilter = true;
      if (backlogFilter === "deadline") {
        matchFilter = !!t.deadline;
      } else if (backlogFilter === "anytime") {
        matchFilter = !t.deadline;
      } else if (backlogFilter === "done") {
        matchFilter = t.status === "done";
      }
      return matchSearch && matchFilter;
    });
  }, [backlogTab, carriedBacklog, droppedTasks, searchQuery, backlogFilter]);

  const backlogCompletionRate = useMemo(() => {
    const relevant = flexibleTasks.filter(t => t.status === "done" || t.status === "skipped" || t.status === "expired");
    if (relevant.length === 0) return 0;
    const completed = relevant.filter(t => t.status === "done").length;
    return Math.round((completed / relevant.length) * 100);
  }, [flexibleTasks]);

  return (
  <div className="tab-pane flex flex-col p-4 pt-3 pb-28 md:p-6 lg:p-8 md:pt-6 md:pb-8">
 
 {/* Search / Filter Pills header with Center Toggle */}
  <div className="flex flex-col mb-4 gap-4">
    <div className="flex items-center justify-between w-full relative">
      {/* Spacer to align center toggle on desktop */}
      <div className="w-8 h-8 hidden md:block" />

      {/* CENTER TOGGLE */}
      <div className="flex bg-[var(--bg-card-hover)] p-1 rounded-full items-center shadow-inner mx-auto">
        <button
          onClick={() => setBacklogTab("carried")}
          className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${ backlogTab === "carried" ? "bg-white dark:bg-[var(--bg-card)] text-primary shadow-sm" : "text-neutral-550 dark:text-[var(--text-secondary)] hover:text-neutral-700 dark:text-[var(--text-primary)]" }`}
        >
          Carried Forward
        </button>
        <button
          onClick={() => setBacklogTab("dropped")}
          className={`px-4 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${ backlogTab === "dropped" ? "bg-white dark:bg-[var(--bg-card)] text-rose-600 shadow-sm" : "text-neutral-550 dark:text-[var(--text-secondary)] hover:text-neutral-700 dark:text-[var(--text-primary)]" }`}
        >
          Dropped
        </button>
      </div>

      {/* RIGHT SIDE: FILTER DROPDOWN */}
      {backlogTab === "carried" ? (
        <div className="relative">
          <button
            onClick={() => setShowBacklogFilterDropdown(!showBacklogFilterDropdown)}
            className={`p-2 rounded-full hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 border border-[var(--border-strong)] dark:border-[var(--border)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] cursor-pointer transition-all ${showBacklogFilterDropdown ? 'bg-[var(--bg-card-hover)] text-primary border-primary' : ''}`}
            title="Filter Backlog"
          >
            <Filter className="w-4 h-4" />
          </button>
          
          {showBacklogFilterDropdown && (
            <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-2xl shadow-xl z-30 py-1.5 animate-scale-up">
              {(["all", "deadline", "anytime", "done"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setBacklogFilter(filter);
                    setShowBacklogFilterDropdown(false);
                  }}
                  className={`w-full text-left px-4 py-2 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between ${ backlogFilter === filter ? "text-primary bg-primary/5" : "text-neutral-605 dark:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]" }`}
                >
                  <span className="capitalize">{filter === "all" ? "Active" : filter === "deadline" ? "Has Deadline" : filter}</span>
                  {backlogFilter === filter && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="w-8 h-8" />
      )}
    </div>
  </div>
  {/* Backlog Grid list container */}
 <div className="flex-1 space-y-3 pb-24">
 {filteredBacklogTasks.length === 0 ? (
 <div className="py-20 text-center flex flex-col items-center justify-center space-y-3.5">
 <div className="p-4 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-full text-[var(--text-tertiary)] shadow-sm">
 <Zap className="w-7 h-7 stroke-[1.5]" />
 </div>
 <div>
 <p className="text-sm font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)]">Backlog queue is empty</p>
 <p className="text-xs text-[#9999B3] max-w-sm px-10 mt-1 leading-relaxed">
 No deadlines required; predictions map them automatically. Add tasks to fill up the backlog.
 </p>
 </div>
 <button
 onClick={() => handleOpenAddFlexible(false)}
 className="px-4 py-2 bg-primary-gradient hover:opacity-90 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5 font-display"
 >
 <Plus className="w-3.5 h-3.5" /> Add Backlog Task
 </button>
 </div>
 ) : (
   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
   {filteredBacklogTasks.map((task) => {
     const estimateStr = futurePredictions[task.id]?.reason || "Checking gaps...";
     return (
       <div
         key={task.id}
         draggable
         onDragStart={() => setDraggedTaskId(task.id)}
         onDragOver={(e) => {
           e.preventDefault();
           
           // Auto-scroll the tab pane if dragging near boundaries
           const scrollContainer = e.currentTarget.closest(".tab-pane");
           if (scrollContainer) {
             const rect = scrollContainer.getBoundingClientRect();
             const threshold = 80;
             const speed = 10;
             const topDist = e.clientY - rect.top;
             const bottomDist = rect.bottom - e.clientY;
             if (topDist > 0 && topDist < threshold) {
               scrollContainer.scrollTop -= speed * (1 - topDist / threshold);
             } else if (bottomDist > 0 && bottomDist < threshold) {
               scrollContainer.scrollTop += speed * (1 - bottomDist / threshold);
             }
           }

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
           handleScheduleTaskToday={handleScheduleTaskToday}
           backlogTab={backlogTab}
           setFlexibleTasks={setFlexibleTasks}
           expandedTaskIds={expandedTaskIds}
           setExpandedTaskIds={setExpandedTaskIds}
           fetchConsequenceInsight={fetchConsequenceInsight}
           showToast={showToast}
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
 </div>
  );
});

BacklogTab.displayName = "BacklogTab";
