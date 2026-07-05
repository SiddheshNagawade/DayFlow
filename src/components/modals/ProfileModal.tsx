import React from "react";
import { X, BookMarked, Trash2 } from "lucide-react";
import { ScheduleProfile, ProfileAppliesTo } from "../../types";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingProfile: ScheduleProfile | null;
  profileForm: {
    name: string;
    emoji: string;
    accentColor: string;
    appliesTo: ProfileAppliesTo;
    description: string;
    blocks: any[];
  };
  setProfileForm: React.Dispatch<React.SetStateAction<any>>;
  profileBlockForm: {
    title: string;
    start_time: string;
    end_time: string;
  };
  setProfileBlockForm: React.Dispatch<React.SetStateAction<any>>;
  handleAddProfileBlock: () => void;
  handleRemoveProfileBlock: (id: string) => void;
  handleSaveProfile: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = React.memo(({
  isOpen,
  onClose,
  editingProfile,
  profileForm,
  setProfileForm,
  profileBlockForm,
  setProfileBlockForm,
  handleAddProfileBlock,
  handleRemoveProfileBlock,
  handleSaveProfile
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
        <h3 className="font-display font-semibold text-lg text-primary flex items-center gap-1.5">
          <BookMarked className="w-5 h-5 text-primary shrink-0" />
          <span>{editingProfile ? "Edit Profile" : "Create Profile"}</span>
        </h3>
        <button 
          type="button" 
          onClick={onClose}
          className="p-1 rounded-full bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)]"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-xs text-[var(--text-secondary)] leading-relaxed mb-4">
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
              className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Emoji</label>
            <input 
              type="text" 
              value={profileForm.emoji}
              onChange={(e) => setProfileForm({ ...profileForm, emoji: e.target.value })}
              className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none text-center"
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
              className="w-full h-8 p-1 bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl cursor-pointer"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[#9999B3] uppercase tracking-wider mb-1">Automatic Schedule Rules</label>
            <select
              value={profileForm.appliesTo}
              onChange={(e) => setProfileForm({ ...profileForm, appliesTo: e.target.value as ProfileAppliesTo })}
              className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
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
            className="w-full px-3 py-2 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs bg-white dark:bg-[var(--bg-card)] focus:ring-1 focus:ring-primary focus:outline-none"
          />
        </div>

        {/* INLINE BLOCKS MANAGEMENT */}
        <div className="border-t border-[var(--border)] dark:border-[var(--border)] pt-4 space-y-3">
          <h4 className="text-xs font-bold text-[var(--text-primary)] dark:text-[var(--text-primary)] uppercase tracking-wider">Profile Commitment Blocks</h4>
          
          {/* Blocks List */}
          {profileForm.blocks.length === 0 ? (
            <p className="text-[11px] text-[var(--text-tertiary)] italic">No blocks configured yet. Add some below.</p>
          ) : (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {profileForm.blocks.map(block => (
                <div key={block.id} className="p-2 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)]/60 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: block.color || "#E24B4A" }} />
                    <span className="font-semibold text-[var(--text-secondary)] dark:text-[var(--text-primary)]">{block.title}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-semibold">{block.start_time} - {block.end_time}</span>
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
          <div className="p-3 bg-[var(--bg-page)] border border-[var(--border-strong)] dark:border-[var(--border)]/60 rounded-2xl space-y-2.5">
            <span className="text-[10px] font-bold text-[#9999B3] uppercase tracking-wider block font-sans">Add Commitment Block</span>
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <input 
                  type="text" 
                  placeholder="Block Title (e.g. Gym, Classes)" 
                  value={profileBlockForm.title}
                  onChange={(e) => setProfileBlockForm({ ...profileBlockForm, title: e.target.value })}
                  className="w-full px-2.5 py-1.5 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)] focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label className="block text-[9px] text-[#9999B3] font-bold mb-0.5">Start Time</label>
                <input 
                  type="time" 
                  value={profileBlockForm.start_time}
                  onChange={(e) => setProfileBlockForm({ ...profileBlockForm, start_time: e.target.value })}
                  className="w-full px-2 py-1 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)] font-mono"
                />
              </div>
              <div>
                <label className="block text-[9px] text-[#9999B3] font-bold mb-0.5">End Time</label>
                <input 
                  type="time" 
                  value={profileBlockForm.end_time}
                  onChange={(e) => setProfileBlockForm({ ...profileBlockForm, end_time: e.target.value })}
                  className="w-full px-2 py-1 border border-[var(--border-strong)] dark:border-[var(--border)] rounded-lg text-xs bg-white dark:bg-[var(--bg-card)] font-mono"
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

      <div className="pt-4 border-t border-[var(--border)] dark:border-[var(--border)] flex gap-2 shrink-0">
        <button 
          type="button"
          onClick={onClose}
          className="flex-1 py-3 text-sm font-bold rounded-xl border border-[var(--border-strong)] dark:border-[var(--border)] transition-colors cursor-pointer text-[var(--text-secondary)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-center"
        >
          Discard
        </button>
        <button 
          type="button"
          onClick={handleSaveProfile}
          className="flex-1 py-3 text-sm font-bold rounded-xl bg-primary-gradient hover:opacity-90 text-white transition-colors cursor-pointer text-center font-display"
        >
          Save Profile
        </button>
      </div>
    </div>
  );
});
