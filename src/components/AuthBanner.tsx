import React, { useEffect, useState } from "react";
import { LogIn, LogOut, RefreshCw, Cloud, CloudOff, CloudLightning, ShieldAlert } from "lucide-react";
import { supabase } from "../utils/supabase";
import { getSyncStatus, subscribeToSyncStatus, triggerReplay } from "../utils/syncEngine";
import { SyncStatus } from "../types";

interface AuthBannerProps {
  user: any;
  onSignOut: () => void;
  isCollapsed?: boolean;
}

export const AuthBanner: React.FC<AuthBannerProps> = ({ user, onSignOut, isCollapsed = false }) => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(getSyncStatus());
  const [relativeTime, setRelativeTime] = useState<string>("just now");

  useEffect(() => {
    const unsubscribe = subscribeToSyncStatus((status) => {
      setSyncStatus(status);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!syncStatus.lastSuccessfulSync) {
      setRelativeTime("");
      return;
    }
    const updateTime = () => {
      const diffMs = Date.now() - new Date(syncStatus.lastSuccessfulSync!).getTime();
      const diffSec = Math.round(diffMs / 1000);
      if (diffSec < 10) {
        setRelativeTime("just now");
      } else if (diffSec < 60) {
        setRelativeTime(`${diffSec}s ago`);
      } else {
        const diffMin = Math.round(diffSec / 60);
        setRelativeTime(`${diffMin}m ago`);
      }
    };
    updateTime();
    const interval = setInterval(updateTime, 10000);
    return () => clearInterval(interval);
  }, [syncStatus.lastSuccessfulSync]);

  const handleSignIn = async () => {
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: window.location.origin
        }
      });
    } catch (err) {
      console.error("Auth error", err);
    }
  };

  const renderStatus = () => {
    if (user && !syncStatus.authenticated) {
      return (
        <div className="flex items-center gap-2 text-amber-500 font-semibold" title="Authentication status expired. Please sign in again.">
          <ShieldAlert className="w-3.5 h-3.5" />
          {!isCollapsed && <span>Sync paused (Auth)</span>}
        </div>
      );
    }

    switch (syncStatus.state) {
      case "syncing":
        return (
          <div className="flex items-center gap-2 text-blue-500 dark:text-blue-400 font-medium">
            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            {!isCollapsed && <span>Syncing...</span>}
          </div>
        );
      case "offline":
        return (
          <div className="flex items-center gap-2 text-amber-500 dark:text-amber-400 font-medium" title={`Offline • ${syncStatus.pending} pending updates`}>
            <CloudOff className="w-3.5 h-3.5" />
            {!isCollapsed && <span>Offline ({syncStatus.pending})</span>}
          </div>
        );
      case "error":
        return (
          <button
            onClick={triggerReplay}
            title={syncStatus.lastError || "Sync error"}
            className="flex items-center gap-2 text-red-500 dark:text-red-400 font-semibold hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            {!isCollapsed && <span>Sync error</span>}
          </button>
        );
      case "synced":
      default:
        return (
          <div className="flex items-center gap-2 text-emerald-500 dark:text-emerald-400 font-medium" title={relativeTime ? `Synced • ${relativeTime}` : "Synced"}>
            <Cloud className="w-3.5 h-3.5" />
            {!isCollapsed && <span>Synced {relativeTime ? `(${relativeTime})` : ""}</span>}
          </div>
        );
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-full mt-auto py-4 border-t border-[var(--border)] dark:border-zinc-800 flex flex-col items-center gap-4">
        {user ? (
          <div className="flex flex-col items-center gap-3">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-7 h-7 rounded-full border border-primary/20"
                title={user.user_metadata?.full_name || user.email}
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display text-xs"
                title={user.user_metadata?.full_name || user.email}
              >
                {user.email?.[0].toUpperCase() || "U"}
              </div>
            )}
            <div className="flex flex-col items-center gap-1.5">
              {renderStatus()}
              <button
                type="button"
                onClick={onSignOut}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleSignIn}
            className="p-2 bg-primary hover:bg-primary-hover text-white rounded-xl shadow-sm transition-all hover:scale-105 cursor-pointer flex items-center justify-center"
            title="Sign in with Google"
          >
            <LogIn className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="w-full mt-auto px-1 py-3 border-t border-[var(--border)] dark:border-zinc-800 flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 overflow-hidden flex-1">
        {user ? (
          <div className="flex items-center gap-2 overflow-hidden w-full">
            {user.user_metadata?.avatar_url ? (
              <img
                src={user.user_metadata.avatar_url}
                alt="Profile"
                className="w-7 h-7 rounded-full border border-primary/20 shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold font-display text-xs shrink-0">
                {user.email?.[0].toUpperCase() || "U"}
              </div>
            )}
            <div className="text-left overflow-hidden min-w-0 flex-1">
              <p className="font-semibold text-[var(--text-primary)] dark:text-[var(--text-primary)] leading-none mb-1 truncate">
                {user.user_metadata?.full_name || user.email || "Signed In"}
              </p>
              <div className="scale-95 origin-left">{renderStatus()}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[var(--text-secondary)]">
            <CloudLightning className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <div className="text-left leading-tight">
              <span className="font-semibold block text-[var(--text-primary)]">Guest Mode</span>
              <span className="text-[10px] text-[var(--text-tertiary)] block">Data local only</span>
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0">
        {user ? (
          <button
            type="button"
            onClick={onSignOut}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSignIn}
            className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-lg flex items-center gap-1 shadow-sm font-semibold transition-all hover:scale-[1.02] cursor-pointer"
            title="Sign in with Google"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </div>
  );
};
