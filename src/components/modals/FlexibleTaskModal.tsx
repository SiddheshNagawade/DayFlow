import React from "react";
import { X } from "lucide-react";
import { FlexibleTask } from "../../types";

interface FlexibleTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingTask: FlexibleTask | null;
  TODAY: string;
  flexibleForm: {
    title: string;
    description: string;
    duration_minutes: number;
    hasDeadline: boolean;
    deadline: string;
    energy_level: "high" | "medium" | "low";
    scheduled_date: string;
    importance: "critical" | "important" | "optional";
    task_flexibility: "fixed" | "movable" | "optional";
    category: string;
    rigidity: string;
    recoverability: string;
    dependency_chain: string;
    progress_type: string;
    deadline_pressure: string;
    blocked_by: string[];
    blocks: string[];
  };
  setFlexibleForm: React.Dispatch<React.SetStateAction<any>>;
  classificationFeedback: any;
  isMetadataOpen: boolean;
  setIsMetadataOpen: (open: boolean) => void;
  flexibleTasks: FlexibleTask[];
  handleTitleBlur: () => void;
  handleSubmitFlexible: (e: React.FormEvent) => void;
}

export const FlexibleTaskModal: React.FC<FlexibleTaskModalProps> = React.memo(({
  isOpen,
  onClose,
  editingTask,
  TODAY,
  flexibleForm,
  setFlexibleForm,
  classificationFeedback,
  isMetadataOpen,
  setIsMetadataOpen,
  flexibleTasks,
  handleTitleBlur,
  handleSubmitFlexible
}) => {
  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-[var(--bg-card)] border border-transparent shadow-2xl p-6 z-[100] overflow-y-auto transform transition-all duration-300 ease-out flex flex-col ${ isOpen ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" : "translate-y-full md:translate-y-10 md:scale-95 opacity-0 pointer-events-none invisible" }`}
    >
      <div className="flex justify-center pb-3">
        <span className="w-10 h-1 bg-neutral-200 dark:bg-[var(--bg-card-hover)] rounded-full" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          {editingTask ? "⚡ Edit task" : flexibleForm.scheduled_date ? "⚡ Add task to today" : "⚡ Add to backlog"}
        </h3>
        <button 
          type="button" 
          onClick={onClose}
          className="p-1 rounded-full bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
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
            onBlur={handleTitleBlur}
            className="w-full px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
          />

          {/* Description textarea */}
          <textarea
            placeholder="Notes, context, or anything else... (optional)"
            value={flexibleForm.description}
            onChange={(e) => setFlexibleForm({ ...flexibleForm, description: e.target.value })}
            rows={flexibleForm.description ? 3 : 1}
            className="w-full mt-2 px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none resize-none placeholder:text-[var(--text-tertiary)] transition-all"
          />

          {classificationFeedback && (
            <div className="mt-2 flex items-center justify-between p-2 rounded-xl bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border)] dark:border-[var(--border)] text-xs">
              <div className="flex items-center gap-1.5 font-medium">
                {classificationFeedback.confidence >= 0.75 ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[10px] font-bold">
                    ✓ Classified: {classificationFeedback.category}
                  </span>
                ) : classificationFeedback.confidence >= 0.5 ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[10px] font-bold">
                    ⚡ Guess: {classificationFeedback.category}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-100 text-[10px] font-bold">
                    ⚠️ Low confidence: {classificationFeedback.category}
                  </span>
                )}
                <span className="text-[10px] text-[var(--text-tertiary)]">
                  via {classificationFeedback.source} ({Math.round(classificationFeedback.confidence * 100)}%)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsMetadataOpen(!isMetadataOpen)}
                className="text-[10px] text-primary font-bold hover:underline"
              >
                {isMetadataOpen ? "Hide Options" : "Adjust"}
              </button>
            </div>
          )}
        </div>

        {isMetadataOpen && (
          <div className="space-y-4 pt-2 border-t border-[var(--border)] dark:border-[var(--border)] mt-2 animate-fade-in">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Duration (mins)</label>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setFlexibleForm({ ...flexibleForm, duration_minutes: Math.max(15, flexibleForm.duration_minutes - 15) })}
                    className="px-2 py-1.5 bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] rounded-lg text-xs font-bold cursor-pointer"
                  >
                    -15
                  </button>
                  <span className="flex-1 text-center font-mono text-sm font-bold bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] py-1.5 rounded-lg border">
                    {flexibleForm.duration_minutes >= 60 
                      ? `${Math.floor(flexibleForm.duration_minutes / 60)}h ${flexibleForm.duration_minutes % 60}m` 
                      : `${flexibleForm.duration_minutes}m`}
                  </span>
                  <button
                    type="button"
                    onClick={() => setFlexibleForm({ ...flexibleForm, duration_minutes: Math.min(480, flexibleForm.duration_minutes + 15) })}
                    className="px-2 py-1.5 bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] rounded-lg text-xs font-bold cursor-pointer"
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
                      className={`flex-1 py-1.5 text-xs rounded-lg font-bold border capitalize cursor-pointer ${ flexibleForm.energy_level === energy ? "bg-primary/10 text-primary border-primary" : "bg-white dark:bg-[var(--bg-card)] text-neutral-500 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border)]" }`}
                    >
                      {energy === "high" ? "🔥 High" : energy === "low" ? "🌙 Low" : "⚡ Med"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Task Importance</label>
              <div className="flex gap-1.5">
                {(["critical", "important", "optional"] as const).map((imp) => (
                  <button
                    key={imp}
                    type="button"
                    onClick={() => setFlexibleForm({ ...flexibleForm, importance: imp })}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-bold border capitalize cursor-pointer transition-all ${ flexibleForm.importance === imp ? imp === "critical" ? "bg-red-50 text-red-700 border-red-200" : imp === "important" ? "bg-primary/10 text-primary border-primary" : "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white dark:bg-[var(--bg-card)] text-neutral-500 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border)]" }`}
                  >
                    {imp === "critical" ? "🚨 Critical" : imp === "optional" ? "🌱 Optional" : "⚡ Important"}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Task Rigidity (Flexibility)</label>
              <div className="flex gap-1.5">
                {(["fixed", "movable", "optional"] as const).map((flex) => (
                  <button
                    key={flex}
                    type="button"
                    onClick={() => setFlexibleForm({ ...flexibleForm, task_flexibility: flex })}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-bold border capitalize cursor-pointer transition-all ${ flexibleForm.task_flexibility === flex ? flex === "fixed" ? "bg-purple-50 text-purple-700 border-purple-200" : flex === "optional" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200" : "bg-white dark:bg-[var(--bg-card)] text-neutral-500 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border)]" }`}
                  >
                    {flex === "fixed" ? "🔒 Rigid (Fixed)" : flex === "optional" ? "🌱 Optional" : "↔ Movable"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <div>
          <label className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] select-none cursor-pointer">
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
              min={new Date().toISOString().split('T')[0]}
              value={flexibleForm.deadline}
              onChange={(e) => setFlexibleForm({ ...flexibleForm, deadline: e.target.value })}
              className="w-full px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)] mt-1.5"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Schedule for date (optional)</label>
          <input 
            type="date" 
            min={TODAY}
            value={flexibleForm.scheduled_date}
            onChange={(e) => setFlexibleForm({ ...flexibleForm, scheduled_date: e.target.value })}
            className="w-full px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)]"
          />
          <p className="text-xs text-[#9999B3] mt-1">
            {flexibleForm.scheduled_date ? `Slotted to ${flexibleForm.scheduled_date}` : "Leave blank to save to backlog."}
          </p>
        </div>

        {/* Advanced Metadata collapsible details block */}
        <div className="pt-2">
          <details 
            open={isMetadataOpen} 
            onToggle={(e) => setIsMetadataOpen((e.target as HTMLDetailsElement).open)}
            className="border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl p-3 bg-[var(--bg-page)] space-y-3"
          >
            <summary className="text-xs font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] cursor-pointer select-none outline-none hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] flex items-center justify-between">
              <span>ADVANCED COGNITIVE METADATA</span>
              <span className="text-[10px] text-[var(--text-tertiary)] font-mono">{isMetadataOpen ? "▼ COLLAPSE" : "▶ EXPAND"}</span>
            </summary>
            
            <div className="pt-3 space-y-3 border-t border-[var(--border)] dark:border-[var(--border)]">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Category</label>
                <select
                  value={flexibleForm.category}
                  onChange={(e) => setFlexibleForm({ ...flexibleForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="study">🎓 Study</option>
                  <option value="project">💻 Project</option>
                  <option value="meeting">👥 Meeting</option>
                  <option value="health">🏋️ Health</option>
                  <option value="habit">🔄 Habit</option>
                  <option value="admin">⚙️ Admin</option>
                  <option value="social">🍻 Social</option>
                  <option value="creative">🎨 Creative</option>
                  <option value="personal">👤 Personal</option>
                  <option value="misc">📦 Misc</option>
                </select>
              </div>

              {/* Rigidity */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Rigidity</label>
                <select
                  value={flexibleForm.rigidity}
                  onChange={(e) => setFlexibleForm({ ...flexibleForm, rigidity: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="flexible">Flexible</option>
                  <option value="semi_flexible">Semi-flexible</option>
                  <option value="fixed">Fixed</option>
                </select>
              </div>

              {/* Recoverability */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Recoverability</label>
                <select
                  value={flexibleForm.recoverability}
                  onChange={(e) => setFlexibleForm({ ...flexibleForm, recoverability: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="easy">Easy to recover</option>
                  <option value="hard">Hard to recover</option>
                  <option value="impossible">Impossible to recover</option>
                </select>
              </div>

              {/* Dependency Chain */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Dependency Strength</label>
                <select
                  value={flexibleForm.dependency_chain}
                  onChange={(e) => setFlexibleForm({ ...flexibleForm, dependency_chain: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="none">No dependencies</option>
                  <option value="weak">Weak dependence</option>
                  <option value="strong">Strong dependence</option>
                </select>
              </div>

              {/* Progress Type */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Progress Model</label>
                <select
                  value={flexibleForm.progress_type}
                  onChange={(e) => setFlexibleForm({ ...flexibleForm, progress_type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="binary">Binary (Done/Not Done)</option>
                  <option value="compound">Compound (Accumulates progress)</option>
                  <option value="streak">Streak (Maintains daily momentum)</option>
                </select>
              </div>

              {/* Deadline Pressure */}
              <div>
                <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Deadline Pressure</label>
                <select
                  value={flexibleForm.deadline_pressure}
                  onChange={(e) => setFlexibleForm({ ...flexibleForm, deadline_pressure: e.target.value as any })}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                >
                  <option value="none">None</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              {/* Dependency links */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Blocked By</label>
                  <select
                    multiple
                    value={flexibleForm.blocked_by}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFlexibleForm(prev => ({ ...prev, blocked_by: selected }));
                    }}
                    className="w-full h-24 px-2 py-1 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-[11px] bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    {flexibleTasks
                      .filter(t => !editingTask || t.id !== editingTask.id)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">Blocks Tasks</label>
                  <select
                    multiple
                    value={flexibleForm.blocks}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setFlexibleForm(prev => ({ ...prev, blocks: selected }));
                    }}
                    className="w-full h-24 px-2 py-1 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-[11px] bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                  >
                    {flexibleTasks
                      .filter(t => !editingTask || t.id !== editingTask.id)
                      .map(t => (
                        <option key={t.id} value={t.id}>{t.title}</option>
                      ))}
                  </select>
                </div>
              </div>
              <p className="text-[9px] text-[var(--text-tertiary)] mt-1 leading-tight">Cmd/Ctrl-click to select multiple tasks.</p>
            </div>
          </details>
        </div>

        <div className="pt-3 border-t border-[var(--border)] dark:border-[var(--border)] flex gap-2">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-sm font-bold rounded-xl border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
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
  );
});

FlexibleTaskModal.displayName = "FlexibleTaskModal";
