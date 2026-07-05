import React, { useEffect, useState } from "react";
import { 
  Settings as SettingsIcon, 
  X, 
  User, 
  Clock, 
  Moon, 
  Shield, 
  Check, 
  AlertCircle, 
  Bell, 
  Download, 
  Upload, 
  Database, 
  Sparkles, 
  Trash2, 
  AlertTriangle,
  LogIn,
  LogOut
} from "lucide-react";
import { AppSettings } from "../../utils/storage";
import { supabase } from "../../utils/supabase";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  profileName: string;
  setProfileName: (name: string) => void;
  profileAge: string;
  setProfileAge: (age: string) => void;
  profileBio: string;
  setProfileBio: (bio: string) => void;
  profileEmoji: string;
  setProfileEmoji: (emoji: string) => void;
  appSettings: AppSettings;
  setAppSettings: (settings: AppSettings) => void;
  saveSettings: (settings: AppSettings) => void;
  notificationPermission: string;
  handleRequestNotifications: () => void;
  exportMyData: () => void;
  importMyData: (e: React.ChangeEvent<HTMLInputElement>) => void;
  showDevTools: boolean;
  handleInjectMockMLData: () => void;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  deleteConfirmText: string;
  setDeleteConfirmText: (text: string) => void;
  performDataWipe: () => void;
  currentPath: string;
  navigate: (path: string) => void;
  showToast: (msg: string, type?: "success" | "info" | "warning") => void;
  triggerHaptic: (p: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = React.memo(({
  isOpen,
  onClose,
  profileName,
  setProfileName,
  profileAge,
  setProfileAge,
  profileBio,
  setProfileBio,
  profileEmoji,
  setProfileEmoji,
  appSettings,
  setAppSettings,
  saveSettings,
  notificationPermission,
  handleRequestNotifications,
  exportMyData,
  importMyData,
  showDevTools,
  handleInjectMockMLData,
  showDeleteConfirm,
  setShowDeleteConfirm,
  deleteConfirmText,
  setDeleteConfirmText,
  performDataWipe,
  currentPath,
  navigate,
  showToast,
  triggerHaptic
}) => {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!isOpen) return;

    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [isOpen]);

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
    } catch (err: any) {
      console.error("Auth error", err);
      showToast(err.message || "Failed to initiate sign in", "warning");
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      showToast("Signed out successfully", "success");
    } catch (err: any) {
      console.error("Sign out error", err);
      showToast(err.message || "Failed to sign out", "warning");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-neutral-900/40 backdrop-blur-xs animate-fade-in text-left">
      <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-strong)] dark:border-[var(--border)]">
          <div className="flex items-center gap-2 text-primary font-bold font-display">
            <SettingsIcon className="w-5 h-5" />
            <span className="text-sm uppercase tracking-wider font-extrabold">App Settings</span>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 text-neutral-455 hover:text-[var(--text-secondary)] dark:text-[var(--text-primary)] cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Scrollable Content wrapper */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col gap-6 md:gap-8 max-w-2xl mx-auto w-full">

            {/* Form Container */}
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                localStorage.setItem("dayflow_profile_name", profileName);
                localStorage.setItem("dayflow_profile_age", profileAge);
                localStorage.setItem("dayflow_profile_bio", profileBio);
                localStorage.setItem("dayflow_profile_emoji", profileEmoji);
                showToast("Profile settings saved!", "success");
                triggerHaptic(20);
              }} 
              className="space-y-6 text-left"
            >
              {/* Section 1: User Profile */}
              <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-6 shadow-3xs space-y-4">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 font-display">
                  <User className="w-4 h-4 text-primary" /> Profile Details
                </h3>
                
                <div className="grid grid-cols-4 gap-4">
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5 font-sans">Your Name</label>
                    <input 
                      type="text" 
                      value={profileName}
                      onChange={(e) => setProfileName(e.target.value)}
                      placeholder="e.g. Alex Mercer"
                      className="w-full px-3 py-2 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none font-sans font-medium"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5 text-center font-sans">Emoji</label>
                    <input 
                      type="text" 
                      value={profileEmoji}
                      onChange={(e) => setProfileEmoji(e.target.value)}
                      placeholder="👨‍💻"
                      className="w-full px-3 py-2 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none text-center"
                      maxLength={2}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5 text-center font-sans">Age</label>
                    <input 
                      type="number" 
                      value={profileAge}
                      onChange={(e) => setProfileAge(e.target.value)}
                      placeholder="25"
                      min="0"
                      max="120"
                      className="w-full px-3 py-2 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none text-center"
                      required
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-[10px] font-bold text-neutral-455 uppercase tracking-wider mb-1.5 font-sans">Biography / Bio</label>
                    <input 
                      type="text" 
                      value={profileBio}
                      onChange={(e) => setProfileBio(e.target.value)}
                      placeholder="Productivity creator. Tracking daily flows."
                      className="w-full px-3 py-2 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-xl text-xs focus:ring-1 focus:ring-primary focus:outline-none font-sans font-medium"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-primary-gradient hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-primary/20 cursor-pointer"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </div>
            </form>

            {/* Section 2: Active Hours */}
            <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-6 shadow-3xs space-y-4 text-left">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 font-display">
                <Clock className="w-4 h-4 text-primary" /> Active Scheduling Hours
              </h3>
              <p className="text-neutral-550 dark:text-[var(--text-secondary)] text-[11px] leading-relaxed">
                Tasks sequence and slots are automatically computed within this time framework.
              </p>
              <div className="flex items-center gap-3 max-w-xs">
                <input 
                  type="time" 
                  value={appSettings.day_start} 
                  onChange={(e) => {
                    const settings = { ...appSettings, day_start: e.target.value };
                    setAppSettings(settings);
                    saveSettings(settings);
                    showToast("Active hours start updated!", "info");
                  }}
                  className="bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] text-center rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-secondary)] dark:text-[var(--text-primary)] w-full focus:outline-none focus:border-primary"
                />
                <span className="text-xs text-[var(--text-tertiary)] font-mono font-bold">to</span>
                <input 
                  type="time" 
                  value={appSettings.day_end} 
                  onChange={(e) => {
                    const settings = { ...appSettings, day_end: e.target.value };
                    setAppSettings(settings);
                    saveSettings(settings);
                    showToast("Active hours end updated!", "info");
                  }}
                  className="bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] text-center rounded-xl px-3 py-2 text-xs font-mono text-[var(--text-secondary)] dark:text-[var(--text-primary)] w-full focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Section: Appearance */}
            <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-6 shadow-3xs space-y-4 text-left">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 font-display">
                <Moon className="w-4 h-4 text-primary" /> Appearance
              </h3>
              <p className="text-neutral-550 dark:text-[var(--text-secondary)] text-[11px] leading-relaxed">
                Choose a visual theme or sync it automatically with your system.
              </p>
              <div className="flex bg-[var(--bg-card-hover)] p-1.5 rounded-xl border border-[var(--border-strong)] dark:border-[var(--border)]/60 shadow-inner">
                {(["light", "dark", "system"] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => {
                      const settings = { ...appSettings, themeMode: mode };
                      setAppSettings(settings);
                      saveSettings(settings);
                    }}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg capitalize transition-all ${ appSettings.themeMode === mode ? "bg-white dark:bg-[var(--bg-card)] text-primary shadow-sm" : "text-neutral-500 dark:text-[var(--text-secondary)] hover:text-neutral-700 dark:text-[var(--text-primary)]" }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            {/* Section 3: Data & Privacy */}
            <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-6 shadow-3xs space-y-4 text-left">
              <h3 className="text-sm font-bold text-[var(--text-secondary)] dark:text-[var(--text-primary)] uppercase tracking-wider flex items-center gap-2 font-display">
                <Shield className="w-4 h-4 text-primary" /> Data, Privacy & Notifications
              </h3>
              <p className="text-neutral-550 dark:text-[var(--text-secondary)] text-[11px] leading-relaxed font-sans">
                Control offline local storage and browser notification states. All task flow computation runs strictly inside your private browser space.
              </p>

              <div className="space-y-3 max-w-md">
                {notificationPermission === "granted" ? (
                  <div className="flex items-center justify-between text-[11px] bg-emerald-50 border border-emerald-250/20 px-3 py-2.5 rounded-xl text-emerald-700 font-semibold">
                    <span className="flex items-center gap-1 font-sans">
                      <Check className="w-3.5 h-3.5" /> Notifications Active
                    </span>
                  </div>
                ) : notificationPermission === "denied" ? (
                  <div className="flex items-center justify-between text-[11px] bg-rose-50 border border-rose-250/20 px-3 py-2.5 rounded-xl text-rose-700 font-semibold">
                    <span className="flex items-center gap-1 font-sans">
                      <AlertCircle className="w-3.5 h-3.5" /> Notifications Blocked by Browser
                    </span>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleRequestNotifications}
                    className="w-full py-2.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 font-display"
                  >
                    <Bell className="w-3.5 h-3.5" /> Enable Notifications
                  </button>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={exportMyData}
                    className="flex-1 py-2.5 px-3 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-neutral-750 dark:text-[var(--text-primary)] text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 font-display"
                  >
                    <Download className="w-3.5 h-3.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" /> Export Data (JSON)
                  </button>

                  <label
                    className="flex-1 py-2.5 px-3 bg-[var(--bg-page)] dark:bg-[var(--bg-card-hover)] border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-card-hover)] dark:hover:bg-zinc-700 dark:bg-[var(--bg-card-hover)] text-neutral-750 dark:text-[var(--text-primary)] text-xs font-bold rounded-xl transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 font-display"
                  >
                    <Upload className="w-3.5 h-3.5 text-[var(--text-tertiary)] dark:text-[var(--text-secondary)]" /> Import Data
                    <input
                      type="file"
                      accept=".json"
                      onChange={importMyData}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Section 4: Developer Options */}
            {showDevTools && (
              <div className="bg-white dark:bg-[var(--bg-card)] border border-[#E0D9FF]/40 rounded-3xl p-6 shadow-3xs space-y-4 text-left animate-fade-in">
                <h3 className="text-sm font-bold text-[#5A4DC2] uppercase tracking-wider flex items-center gap-2 font-display">
                  <Database className="w-4 h-4 text-[#8B7EFF]" /> Developer Sandbox
                </h3>
                <p className="text-neutral-550 dark:text-[var(--text-secondary)] text-[11px] leading-relaxed font-sans">
                  Populate temporary demonstration datasets for schedule calibration and metrics testing.
                </p>
                <button
                  type="button"
                  onClick={handleInjectMockMLData}
                  className="w-full py-2.5 px-3 bg-[#F6F5FF] border border-[#E0D9FF] hover:bg-[#EFEBFF] text-[#5A4DC2] rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-sm font-display max-w-xs"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#8B7EFF] fill-[#8B7EFF]/10" /> Populate Demo History
                </button>
              </div>
            )}

            {/* Section 4.5: Cloud Synchronization */}
            <div className="bg-white dark:bg-[var(--bg-card)] border border-[var(--border-strong)] dark:border-[var(--border)] rounded-3xl p-6 shadow-3xs space-y-4 text-left">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider flex items-center gap-2 font-display">
                <Database className="w-4 h-4 text-primary" /> Cloud Synchronization
              </h3>
              <p className="text-neutral-550 dark:text-[var(--text-secondary)] text-[11px] leading-relaxed font-sans">
                {user ? `Signed in as ${user.email}. Your tasks, projects, routines, and goals are automatically backed up and synced.` : "Sync your tasks, projects, routines, and goals across all your devices securely by logging in with Google."}
              </p>
              {user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="py-2.5 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out of DayFlow</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSignIn}
                  className="py-2.5 px-4 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>

            {/* Section 5: Danger Zone */}
            <div className="bg-rose-50/20 border border-rose-150 rounded-3xl p-6 space-y-4 text-left">
              <h3 className="text-sm font-bold text-rose-600 uppercase tracking-wider flex items-center gap-2 font-display">
                <Trash2 className="w-4 h-4 text-rose-550" /> Danger Zone
              </h3>
              <p className="text-neutral-550 dark:text-[var(--text-secondary)] text-[11px] leading-relaxed font-sans">
                Permanently erase all custom fixed blocks, completed tasks telemetry history, habits, milestones, and settings. This cannot be undone.
              </p>
              
              {/* Data Deletion safety confirmation panel (friction) */}
              <div className="space-y-3 max-w-md">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(true);
                    triggerHaptic(15);
                  }}
                  className="py-2.5 px-4 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 font-display"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                  <span>Clear All Data</span>
                </button>

                {showDeleteConfirm && (
                  <div className="bg-white dark:bg-[var(--bg-card)] border border-rose-200 rounded-2xl p-4.5 space-y-3.5 shadow-sm animate-scale-up">
                    <div className="flex gap-2.5 items-start">
                      <AlertTriangle className="w-4.5 h-4.5 text-rose-550 shrink-0 mt-0.5 animate-pulse" />
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-rose-800 font-display">Are you absolutely sure?</h4>
                        <p className="text-[10px] text-[var(--text-tertiary)] dark:text-[var(--text-secondary)] font-sans leading-relaxed">
                          Please type <span className="font-extrabold text-[var(--text-primary)] dark:text-[var(--text-primary)] font-mono">DELETE ALL DATA</span> in the input below to confirm the wipeout.
                        </p>
                      </div>
                    </div>

                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      placeholder="Type confirmation here..."
                      className="w-full px-3 py-2 bg-rose-50/30 border border-rose-200 rounded-xl text-xs font-mono focus:outline-none focus:border-rose-500 text-rose-800 animate-fade-in"
                    />

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        className="flex-1 py-2 text-xs font-bold border border-[var(--border-strong)] dark:border-[var(--border)] hover:bg-[var(--bg-page)] dark:hover:bg-zinc-800 dark:bg-[var(--bg-card-hover)] text-[var(--text-secondary)] dark:text-[var(--text-primary)] rounded-xl transition-all cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={deleteConfirmText !== "DELETE ALL DATA"}
                        onClick={() => {
                          performDataWipe();
                          setShowDeleteConfirm(false);
                          setDeleteConfirmText("");
                        }}
                        className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all text-center cursor-pointer ${ deleteConfirmText === "DELETE ALL DATA" ? "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20" : "bg-neutral-100 dark:bg-[var(--bg-card-hover)] text-neutral-400 border border-neutral-200 dark:border-[var(--border)]/50 cursor-not-allowed" }`}
                      >
                        Wipe All Data
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
});

SettingsModal.displayName = "SettingsModal";
