import { useState } from "react";
import { Breadcrumbs } from "./breadcrumbs";
import { useRealtime, useRealtimeStatus } from "@/hooks/use-realtime";
import { useFetch } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Overview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bell, BellOff, Menu, Sun, Moon, Octagon, Snowflake } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

const STATUS_CONFIG = {
  live: { color: "bg-emerald-500", label: "Live" },
  polling: { color: "bg-amber-500", label: "Polling" },
  offline: { color: "bg-red-500", label: "Offline" },
} as const;

interface TopbarProps {
  notificationsEnabled?: boolean;
  onToggleNotifications?: () => void;
  onMenuClick?: () => void;
}

export function Topbar({ notificationsEnabled, onToggleNotifications, onMenuClick }: TopbarProps) {
  const status = useRealtimeStatus();
  const { data } = useRealtime<Overview>("/overview", 10000);
  const { color, label } = STATUS_CONFIG[status];
  const { theme, toggle } = useTheme();
  const { data: townStatus, refetch: refetchTown } = useFetch<{ frozen: boolean }>("/town/status", 5000);
  const [estopConfirm, setEstopConfirm] = useState(false);
  const [acting, setActing] = useState(false);
  const { addToast } = useToast();

  async function handleEstop() {
    if (!estopConfirm) { setEstopConfirm(true); return; }
    setActing(true);
    try {
      await apiPost("/town/estop");
      addToast("E-STOP activated — all agents frozen", "success");
      refetchTown();
    } catch (err: any) {
      addToast(`E-STOP failed: ${err.message}`, "error");
    } finally {
      setActing(false);
      setEstopConfirm(false);
    }
  }

  async function handleThaw() {
    setActing(true);
    try {
      await apiPost("/town/thaw");
      addToast("Town thawed — agents resuming", "success");
      refetchTown();
    } catch (err: any) {
      addToast(`Thaw failed: ${err.message}`, "error");
    } finally {
      setActing(false);
    }
  }

  function openPalette() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true })
    );
  }

  return (
    <header className="flex items-center h-12 px-4 md:px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Hamburger for mobile */}
      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors md:hidden mr-2"
        >
          <Menu className="h-4 w-4" />
        </button>
      )}
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-3 md:gap-4">
        <div className="hidden sm:flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", color)} />
            {label}
          </span>
          {data && (
            <>
              <span className="text-zinc-600">|</span>
              <span>{data.scheduler.active_polecats} workers</span>
              <span className="text-zinc-600">|</span>
              <span>{data.beads.hooked} hooked</span>
            </>
          )}
        </div>
        <button
          onClick={toggle}
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        {onToggleNotifications && (
          <button
            onClick={onToggleNotifications}
            className={cn(
              "p-1.5 rounded-md transition-colors",
              notificationsEnabled
                ? "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
                : "text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800"
            )}
            title={notificationsEnabled ? "Disable notifications" : "Enable notifications"}
          >
            {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </button>
        )}
        <button
          onClick={openPalette}
          className="hidden sm:flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          <kbd className="font-mono">⌘K</kbd>
          <span>Search</span>
        </button>
        {townStatus?.frozen ? (
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-0.5">
              <Snowflake className="h-3 w-3" /> FROZEN
            </span>
            <button
              onClick={handleThaw}
              disabled={acting}
              className="rounded px-2 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-700 hover:bg-emerald-900/40 transition-colors disabled:opacity-50"
            >
              Thaw
            </button>
          </div>
        ) : (
          <button
            onClick={handleEstop}
            onBlur={() => setEstopConfirm(false)}
            disabled={acting}
            className={cn(
              "rounded px-2 py-1 text-[10px] font-bold transition-colors disabled:opacity-50",
              estopConfirm
                ? "bg-red-600 text-white animate-pulse"
                : "text-red-400 border border-red-900/50 hover:bg-red-900/30"
            )}
            title="Emergency Stop — freeze all agents"
          >
            <Octagon className="h-3 w-3 inline mr-0.5" />
            {estopConfirm ? "CONFIRM?" : "E-STOP"}
          </button>
        )}
        <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
          O
        </div>
      </div>
    </header>
  );
}
