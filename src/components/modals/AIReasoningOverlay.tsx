import React from "react";
import { Sparkles } from "lucide-react";
import { FlexibleTask } from "../../types";

interface AIReasoningOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  aiReasoningResult: {
    proposalRisk: string;
    message: string;
    proposals: any[];
  } | null;
  flexibleTasks: FlexibleTask[];
  executeAIProposals: (proposals: any[]) => void;
  setLastReflectedDate: (date: string) => void;
  TODAY: string;
}

export const AIReasoningOverlay: React.FC<AIReasoningOverlayProps> = React.memo(({
  isOpen,
  onClose,
  aiReasoningResult,
  flexibleTasks,
  executeAIProposals,
  setLastReflectedDate,
  TODAY
}) => {
  if (!isOpen || !aiReasoningResult) return null;

  return (
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
                    💡 Coaching Suggestion: {p.type === "ask" ? p.question : p.message}
                  </div>
                );
              }
              
              const targetTask = flexibleTasks.find(t => t.id === p.taskId);
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
                      {p.reason}
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
            onClick={onClose}
            className="flex-1 py-3 text-xs font-bold rounded-2xl border border-[var(--border-strong)] dark:border-[var(--border)] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] transition-colors cursor-pointer text-center"
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => {
              executeAIProposals(aiReasoningResult.proposals);
              setLastReflectedDate(TODAY);
              localStorage.setItem("dayflow_last_reflected_date", TODAY);
              onClose();
            }}
            className="flex-1 py-3 text-xs font-bold rounded-2xl bg-primary-gradient hover:opacity-90 text-white transition-colors cursor-pointer text-center font-display"
          >
            Apply proposals
          </button>
        </div>
      </div>
    </div>
  );
});

AIReasoningOverlay.displayName = "AIReasoningOverlay";
