import React from "react";
import { X } from "lucide-react";
import { FlexibleTask } from "../../types";

interface EodCheckinModalProps {
  isOpen: boolean;
  onClose: () => void;
  todayIncompleteTasks: FlexibleTask[];
  staleTasks: FlexibleTask[];
  handleEodMoveToTomorrow: (id: string) => void;
  handleEodReduceAndTomorrow: (id: string, pct: number) => void;
  handleEodKeepStale: (id: string) => void;
  handleDeleteFlexible: (id: string) => void;
}

export const EodCheckinModal: React.FC<EodCheckinModalProps> = React.memo(({
  isOpen,
  onClose,
  todayIncompleteTasks,
  staleTasks,
  handleEodMoveToTomorrow,
  handleEodReduceAndTomorrow,
  handleEodKeepStale,
  handleDeleteFlexible
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-[var(--bg-card)] border border-transparent shadow-2xl p-6 z-[100] overflow-y-auto transform transition-all duration-300 ease-out flex flex-col pointer-events-auto"
    >
      <div className="flex justify-center pb-3">
        <span className="w-10 h-1 bg-neutral-200 dark:bg-[var(--bg-card-hover)] rounded-full" />
      </div>

      <div className="flex items-center justify-between mb-2">
        <h3 className="font-display font-semibold text-lg text-primary">🌅 Evening Check-in Review</h3>
        <button 
          type="button" 
          onClick={onClose}
          className="p-1 rounded-full bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
        Review incomplete items from today and stale tasks from your backlog to keep your workspace fresh.
      </p>

      <div className="space-y-5 flex-1 overflow-y-auto pr-1">
        {/* SECTION 1: INCOMPLETE TASKS TODAY */}
        <div className="space-y-3">
          <h4 className="text-xs uppercase font-bold text-[#9999B3] tracking-wider block">Today's Incomplete Tasks</h4>
          {todayIncompleteTasks.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] italic">No incomplete tasks scheduled for today.</p>
          ) : (
            <div className="space-y-3">
              {todayIncompleteTasks.map(task => (
                <div key={task.id} className="p-3 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)]/80 rounded-xl space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] font-display block leading-tight">{task.title}</span>
                    <span className="text-[10px] font-mono font-bold bg-neutral-200 px-1.5 py-0.5 rounded text-[var(--text-secondary)] dark:text-[var(--text-primary)] shrink-0">{task.duration_minutes}m</span>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      onClick={() => handleEodMoveToTomorrow(task.id)}
                      className="text-[10px] font-bold bg-primary-gradient hover:opacity-90 text-white px-2 py-1 rounded cursor-pointer transition-colors"
                    >
                      Do Tomorrow
                    </button>
                    <div className="flex items-center bg-neutral-200 rounded p-0.5 gap-0.5">
                      <button
                        onClick={() => handleEodReduceAndTomorrow(task.id, 50)}
                        className="text-[10px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] hover:bg-white dark:bg-[var(--bg-card)] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        title="Mark 50% done today, schedule remaining half tomorrow"
                      >
                        50% Done
                      </button>
                      <button
                        onClick={() => handleEodReduceAndTomorrow(task.id, 75)}
                        className="text-[10px] font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] hover:bg-white dark:bg-[var(--bg-card)] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
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
        <div className="space-y-3 pt-3 border-t border-[var(--border)] dark:border-[var(--border)]">
          <h4 className="text-xs uppercase font-bold text-[#9999B3] tracking-wider block">Stale Tasks (Pending 3+ Days)</h4>
          {staleTasks.length === 0 ? (
            <p className="text-xs text-[var(--text-tertiary)] italic">No stale backlog tasks. Nice job!</p>
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
                        <span className="text-xs font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] font-display block leading-tight">{task.title}</span>
                        <span className="text-[10px] text-amber-700 font-semibold block mt-0.5">⚠️ Pending for {ageDays} days</span>
                      </div>
                      <span className="text-[10px] font-mono font-bold bg-neutral-200 px-1.5 py-0.5 rounded text-[var(--text-secondary)] dark:text-[var(--text-primary)] shrink-0">{task.duration_minutes}m</span>
                    </div>
                    
                    <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-amber-100/60">
                      <span className="text-[10px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-semibold">Still relevant?</span>
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => handleEodKeepStale(task.id)}
                          className="text-[10px] font-bold bg-white dark:bg-[var(--bg-card)] text-emerald-600 border border-emerald-200 hover:bg-emerald-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          Yes, Keep
                        </button>
                        <button
                          onClick={() => handleDeleteFlexible(task.id)}
                          className="text-[10px] font-bold bg-white dark:bg-[var(--bg-card)] text-red-500 border border-red-200 hover:bg-red-50 px-2 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          No, Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {staleTasks.length > 3 && (
                <p className="text-[10px] text-[var(--text-tertiary)] italic text-right">+ {staleTasks.length - 3} more stale tasks in backlog</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t border-[var(--border)] dark:border-[var(--border)] flex gap-2 shrink-0">
        <button 
          type="button"
          onClick={onClose}
          className="w-full py-3 text-sm font-bold rounded-xl bg-neutral-900 text-white hover:bg-neutral-800 transition-colors cursor-pointer text-center"
        >
          Close Review
        </button>
      </div>
    </div>
  );
});
