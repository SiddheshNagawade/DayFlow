import React, { useState } from "react";
import { Sparkles, Plus, X, ArrowRight, Check } from "lucide-react";
import { FixedBlock } from "../../types";

interface OnboardingWizardProps {
  isOpen: boolean;
  TODAY: string;
  onComplete: (role: string, sleep: { wake: string; sleep: string; energy: string }, blocks: FixedBlock[]) => void;
  onSkip: () => void;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = React.memo(({
  isOpen,
  TODAY,
  onComplete,
  onSkip
}) => {
  const [onboardingSleep, setOnboardingSleep] = useState({ 
    wake: "07:00", 
    sleep: "23:00", 
    energy: "morning" as "morning" | "afternoon" | "night" | "inconsistent" 
  });
  const [onboardingStep, setOnboardingStep] = useState<"welcome" | "identity" | "sleep" | "fixed">("welcome");
  const [onboardingRole, setOnboardingRole] = useState<"student" | "working" | "freelancer" | "exam_prep">("working");
  const [onboardingBlocks, setOnboardingBlocks] = useState<FixedBlock[]>([]);
  const [onboardingForm, setOnboardingForm] = useState({ 
    title: "", 
    start_time: "09:00", 
    end_time: "10:00", 
    repeats: "daily" as "none" | "daily" | "weekdays" | "custom", 
    color: "#E24B4A", 
    daysOfWeek: [1, 2, 3, 4, 5] 
  });

  if (!isOpen) return null;

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
      color: onboardingForm.color,
      daysOfWeek: onboardingForm.daysOfWeek
    };
    setOnboardingBlocks(prev => [...prev, block]);
    setOnboardingForm({ 
      title: "", 
      start_time: "09:00", 
      end_time: "10:00", 
      repeats: "daily", 
      color: "#E24B4A", 
      daysOfWeek: [1, 2, 3, 4, 5] 
    });
  };

  const handleRemoveOnboardingBlock = (id: string) => {
    setOnboardingBlocks(prev => prev.filter(b => b.id !== id));
  };

  const steps = ["welcome", "identity", "sleep", "fixed"] as const;
  const currentStepIdx = steps.indexOf(onboardingStep);

  return (
    <div className="h-[100dvh] w-screen bg-gradient-to-br from-[#F0EFFE] via-[#F8F9FA] to-[#E8F5EF] dark:from-[#0d0c15] dark:via-[#09090b] dark:to-[#05110d] flex items-center justify-center p-4 overflow-hidden z-50 relative select-none">
      {/* Ambient blobs */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-violet-400/15 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-emerald-400/10 blur-[150px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="w-full max-w-lg bg-[var(--bg-card)] border border-transparent dark:border-[var(--border)]/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header Progress Indicators */}
        {onboardingStep !== "welcome" && (
          <div className="px-6 pt-5 pb-3 bg-[var(--bg-card)] border-b border-[var(--border)] dark:border-[var(--border)] dark:border-zinc-850 shrink-0">
            <div className="flex items-center justify-between text-[10px] font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
              <span>Setup Progress</span>
              <span>Step {currentStepIdx} of {steps.length - 1}</span>
            </div>
            <div className="h-1.5 bg-[var(--bg-card-hover)] dark:bg-[var(--bg-card-hover)] rounded-full flex overflow-hidden">
              {steps.slice(1).map((s, idx) => (
                <div 
                  key={s} 
                  className={`flex-1 h-full border-r border-white dark:border-zinc-900 last:border-0 transition-all duration-300 ${ idx < currentStepIdx ? "bg-primary" : "bg-neutral-200" }`} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Dynamic Step Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-left">
          {onboardingStep === "welcome" && (
            <div className="flex flex-col items-center text-center gap-5 py-4">
              <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
                <Sparkles className="w-8 h-8 text-white fill-white/10" />
              </div>
              <div className="space-y-2">
                <h1 className="font-display font-black text-2xl text-[var(--text-primary)] dark:text-[var(--text-primary)] tracking-tight">Meet DayFlow</h1>
                <span className="inline-block text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono">Behavioral Execution Coach</span>
                <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] leading-relaxed max-w-sm mx-auto">
                  Traditional planners ask you to schedule tasks. DayFlow learns how you *actually* execute them, intervening to reduce resistance and prevent slips.
                </p>
              </div>
            </div>
          )}

          {onboardingStep === "identity" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-display font-black text-lg text-[var(--text-primary)] dark:text-[var(--text-primary)]">What is your primary role?</h2>
                <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Select your current profile to help tailor advice.</p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {[
                  { id: "student", label: "🎓 Student", desc: "Classes, exams, assignment prep, lectures" },
                  { id: "working", label: "💼 Working Professional", desc: "Meetings, structured work, routine daily tasks" },
                  { id: "freelancer", label: "💻 Freelancer / Builder", desc: "Self-directed work, coding projects, client milestones" },
                  { id: "exam_prep", label: "📝 Exam Prep / General", desc: "Intense self-study, study streaks, structured timeline" }
                ].map(opt => {
                  const isSelected = onboardingRole === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setOnboardingRole(opt.id as any)}
                      className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${ isSelected ? "bg-primary/5 border-primary text-primary" : "bg-white dark:bg-[var(--bg-card)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-800 text-neutral-700 dark:text-[var(--text-primary)] border-neutral-200 dark:border-[var(--border)]/80 dark:border-[var(--border)]" }`}
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold block">{opt.label}</span>
                        <span className={`text-[10px] leading-relaxed block ${isSelected ? "text-primary/70" : "text-neutral-455 dark:text-[var(--text-secondary)]"}`}>{opt.desc}</span>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${ isSelected ? "border-primary bg-primary" : "border-neutral-300 dark:border-[var(--border)] bg-white dark:bg-[var(--bg-card)]" }`}>
                        {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white dark:bg-[var(--bg-card)]" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {onboardingStep === "sleep" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-display font-black text-lg text-[var(--text-primary)] dark:text-[var(--text-primary)]">Sleep & Energy Profile</h2>
                <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Establishing your baseline wake hours helps place slots.</p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider">Wake Up Time</label>
                  <input 
                    type="time" 
                    value={onboardingSleep.wake} 
                    onChange={e => setOnboardingSleep({ ...onboardingSleep, wake: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)] font-mono focus:outline-none focus:ring-1 focus:ring-primary" 
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider">Sleep/Winddown</label>
                  <input 
                    type="time" 
                    value={onboardingSleep.sleep} 
                    onChange={e => setOnboardingSleep({ ...onboardingSleep, sleep: e.target.value })} 
                    className="w-full px-3 py-2.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-sm bg-white dark:bg-[var(--bg-card)] font-mono focus:outline-none focus:ring-1 focus:ring-primary" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider">When do you feel best?</label>
                <p className="text-[10px] text-[var(--text-tertiary)]">Warm-starts the circadian rhythm focus peaks model.</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: "morning", label: "☀️ Morning Focus", desc: "Best work before lunch" },
                    { key: "afternoon", label: "🌤 Afternoon Drive", desc: "Peak from 1 PM to 5 PM" },
                    { key: "night", label: "🌙 Night Owl Focus", desc: "Productive after dinner" },
                    { key: "inconsistent", label: "🌀 Inconsistent", desc: "Varies day-to-day" }
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={() => setOnboardingSleep({ ...onboardingSleep, energy: opt.key as any })}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${ onboardingSleep.energy === opt.key ? "bg-primary/5 border-primary text-primary" : "bg-white dark:bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-neutral-700 dark:text-[var(--text-primary)] border-neutral-200 dark:border-[var(--border)]" }`}
                    >
                      <span className="text-xs font-bold">{opt.label}</span>
                      <span className={`text-[10px] ${onboardingSleep.energy === opt.key ? "text-primary/70" : "text-neutral-455 dark:text-[var(--text-secondary)]"}`}>{opt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {onboardingStep === "fixed" && (
            <div className="space-y-5">
              <div className="space-y-1">
                <h2 className="font-display font-black text-lg text-[var(--text-primary)] dark:text-[var(--text-primary)]">Fixed Commitments</h2>
                <p className="text-xs text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]">Lock down hours you cannot schedule tasks in (classes, office, routines).</p>
              </div>

              <div className="bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-2xl p-4 space-y-3 font-sans">
                <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Add Commitment Block</h4>
                <input
                  type="text"
                  placeholder="e.g. Math Class, Office Work, Gym"
                  value={onboardingForm.title}
                  onChange={e => setOnboardingForm({ ...onboardingForm, title: e.target.value })}
                  onKeyDown={e => e.key === "Enter" && handleAddOnboardingBlock()}
                  className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">Start Time</label>
                    <input type="time" value={onboardingForm.start_time} onChange={e => setOnboardingForm({ ...onboardingForm, start_time: e.target.value })} className="w-full px-2 py-1.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)]" />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-neutral-450 dark:text-[var(--text-secondary)] uppercase tracking-wider mb-0.5">End Time</label>
                    <input type="time" value={onboardingForm.end_time} onChange={e => setOnboardingForm({ ...onboardingForm, end_time: e.target.value })} className="w-full px-2 py-1.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)]" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex gap-1.5">
                    {(["none", "daily", "weekdays"] as const).map(rep => (
                      <button
                        key={rep}
                        type="button"
                        onClick={() => setOnboardingForm({ 
                          ...onboardingForm, 
                          repeats: rep,
                          daysOfWeek: rep === "weekdays" ? [1, 2, 3, 4, 5] : (rep === "daily" ? [0, 1, 2, 3, 4, 5, 6] : [])
                        })}
                        className={`flex-1 py-1 text-[10px] rounded-lg font-bold border capitalize cursor-pointer ${ onboardingForm.repeats === rep ? "bg-primary/10 text-primary border-primary" : "bg-white dark:bg-[var(--bg-card)] text-neutral-500 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border)]" }`}
                      >
                        {rep === "none" ? "Once" : rep}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] p-1.5 rounded-lg border border-[var(--border-strong)] dark:border-[var(--border)]/60 justify-center">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayLabel, index) => {
                      const active = onboardingForm.repeats === "custom" && onboardingForm.daysOfWeek?.includes(index);
                      return (
                        <button
                          key={dayLabel}
                          type="button"
                          onClick={() => {
                            let newDays = onboardingForm.daysOfWeek ? [...onboardingForm.daysOfWeek] : [];
                            if (onboardingForm.repeats !== "custom") {
                              newDays = [index];
                            } else {
                              if (newDays.includes(index)) {
                                newDays = newDays.filter(d => d !== index);
                              } else {
                                newDays = [...newDays, index].sort();
                              }
                            }
                            setOnboardingForm({
                              ...onboardingForm,
                              repeats: "custom",
                              daysOfWeek: newDays
                            });
                          }}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors cursor-pointer ${ active ? "bg-primary text-white border-primary" : "bg-white dark:bg-[var(--bg-card)] text-neutral-500 dark:text-[var(--text-secondary)] border-neutral-200 dark:border-[var(--border)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)]" }`}
                        >
                          {dayLabel.slice(0, 1)}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddOnboardingBlock}
                  disabled={!onboardingForm.title.trim()}
                  className="w-full py-2 bg-primary text-white rounded-lg text-xs font-bold disabled:opacity-40 hover:bg-primary-dark transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Block
                </button>
              </div>

              {onboardingBlocks.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Commitments Added</h4>
                  {onboardingBlocks.map(block => (
                    <div key={block.id} className="flex items-center justify-between bg-white dark:bg-[var(--bg-card)] border border-[var(--border)] dark:border-[var(--border)] rounded-xl px-3 py-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: block.color }} />
                        <span className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)]">{block.title}</span>
                        <span className="text-[10px] text-neutral-455 dark:text-[var(--text-secondary)] font-mono">({block.start_time}–{block.end_time})</span>
                      </div>
                      <button onClick={() => handleRemoveOnboardingBlock(block.id)} className="text-[var(--text-tertiary)] hover:text-red-500 p-0.5 rounded cursor-pointer">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-[var(--bg-page)] border-t border-[var(--border)] dark:border-[var(--border)] flex items-center justify-between shrink-0 font-sans">
          {onboardingStep === "welcome" ? (
            <>
              <button
                type="button"
                onClick={onSkip}
                className="px-4 py-3 text-xs font-bold border border-neutral-250 rounded-xl text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
              >
                Skip Onboarding
              </button>
              <button
                type="button"
                onClick={() => setOnboardingStep("identity")}
                className="px-5 py-3 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm transition-all flex items-center gap-1 cursor-pointer"
              >
                Set up Profile <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  const idx = currentStepIdx;
                  if (idx > 0) setOnboardingStep(steps[idx - 1]);
                }}
                className="px-4 py-2.5 text-xs font-bold text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] hover:text-[var(--text-primary)] dark:text-[var(--text-primary)] transition-colors cursor-pointer"
              >
                Back
              </button>
              
              {currentStepIdx === steps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => onComplete(onboardingRole, onboardingSleep, onboardingBlocks)}
                  className="px-5 py-3 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-md shadow-primary/10 transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3px]" /> Finish Setup
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOnboardingStep(steps[currentStepIdx + 1]);
                  }}
                  className="px-5 py-3 text-xs font-bold rounded-xl bg-primary text-white hover:bg-primary-dark shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                  Next <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
});
