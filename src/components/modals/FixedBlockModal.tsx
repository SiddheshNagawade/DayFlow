import React from "react";
import { X } from "lucide-react";
import { FixedBlock } from "../../types";

interface FixedBlockModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingBlock: FixedBlock | null;
  fixedForm: {
    title: string;
    start_time: string;
    end_time: string;
    repeats: "none" | "daily" | "weekdays" | "custom";
    daysOfWeek?: number[];
    color?: string;
  };
  setFixedForm: React.Dispatch<React.SetStateAction<any>>;
  handleSubmitFixed: (e: React.FormEvent) => void;
}

export const FixedBlockModal: React.FC<FixedBlockModalProps> = React.memo(({
  isOpen,
  onClose,
  editingBlock,
  fixedForm,
  setFixedForm,
  handleSubmitFixed
}) => {
  return (
    <div 
      className={`absolute bottom-0 left-0 right-0 max-h-[85vh] md:max-h-[90vh] md:max-w-lg md:left-1/2 md:right-auto md:-translate-x-1/2 md:bottom-auto md:top-1/2 md:-translate-y-1/2 md:rounded-3xl bg-[var(--bg-card)] border border-transparent shadow-2xl p-6 z-[100] overflow-y-auto transform transition-all duration-300 ease-out flex flex-col ${ isOpen ? "translate-y-0 opacity-100 scale-100 pointer-events-auto" : "translate-y-full md:translate-y-10 md:scale-95 opacity-0 pointer-events-none invisible" }`}
    >
      {/* Top drag handle indicator bar */}
      <div className="flex justify-center pb-3">
        <span className="w-10 h-1 bg-neutral-200 dark:bg-[var(--bg-card-hover)] rounded-full" />
      </div>

      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-semibold text-lg text-[var(--text-primary)] dark:text-[var(--text-primary)]">
          {editingBlock ? "🔒 Edit Fixed block" : "🔒 Add Fixed block"}
        </h3>
        <button 
          type="button" 
          onClick={onClose}
          className="p-1 rounded-full bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] cursor-pointer"
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
            className="w-full px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
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
              className="w-full px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)]"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">End Time (HH:MM)</label>
            <input 
              type="time" 
              required
              value={fixedForm.end_time}
              onChange={(e) => setFixedForm({ ...fixedForm, end_time: e.target.value })}
              className="w-full px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)]"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-[#9999B3] uppercase tracking-wider mb-1">Repeats Selector</label>
          <div className="grid grid-cols-3 gap-1.5 mb-2.5">
            {(["none", "daily", "weekdays"] as const).map((rep) => (
              <button
                key={rep}
                type="button"
                onClick={() => setFixedForm({ 
                  ...fixedForm, 
                  repeats: rep,
                  daysOfWeek: rep === "weekdays" ? [1, 2, 3, 4, 5] : (rep === "daily" ? [0, 1, 2, 3, 4, 5, 6] : [])
                })}
                className={`py-2 px-1 text-xs rounded-lg font-semibold border capitalize cursor-pointer transition-colors ${ fixedForm.repeats === rep ? "bg-primary/10 text-primary border-primary" : "bg-white dark:bg-[var(--bg-card)] text-neutral-500 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)]" }`}
              >
                {rep === "none" ? "Once" : rep}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] p-2.5 rounded-xl border border-neutral-150 dark:border-[var(--border)]">
          <label className="block text-[9px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Select Specific Days (Custom)</label>
          <div className="flex flex-wrap gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayLabel, index) => {
              const active = fixedForm.repeats === "custom" && fixedForm.daysOfWeek?.includes(index);
              return (
                <button
                  key={dayLabel}
                  type="button"
                  onClick={() => {
                    let newDays = fixedForm.daysOfWeek ? [...fixedForm.daysOfWeek] : [];
                    if (fixedForm.repeats !== "custom") {
                      newDays = [index];
                    } else {
                      if (newDays.includes(index)) {
                        newDays = newDays.filter(d => d !== index);
                      } else {
                        newDays = [...newDays, index].sort();
                      }
                    }
                    setFixedForm({
                      ...fixedForm,
                      repeats: "custom",
                      daysOfWeek: newDays
                    });
                  }}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${ active ? "bg-primary text-white border-primary" : "bg-white dark:bg-[var(--bg-card)] text-neutral-500 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)]" }`}
                >
                  {dayLabel}
                </button>
              );
            })}
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
                className="w-6 h-6 rounded-full border border-neutral-300 dark:border-[var(--border)] relative cursor-pointer"
                style={{ backgroundColor: col }}
              >
                {fixedForm.color === col && (
                  <span className="absolute inset-0 flex items-center justify-center text-white text-xs">✓</span>
                )}
              </button>
            ))}
          </div>
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
            className="flex-1 py-3 text-sm font-bold rounded-xl bg-[#E24B4A] text-white hover:bg-red-700 transition-colors cursor-pointer"
          >
            {editingBlock ? "Save changes" : "Lock to schedule"}
          </button>
        </div>
      </form>
    </div>
  );
});
