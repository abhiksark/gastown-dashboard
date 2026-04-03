import { Breadcrumbs } from "./breadcrumbs";
import { useRealtime, useRealtimeStatus } from "@/hooks/use-realtime";
import type { Overview } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Bell, BellOff, Menu, Sun, Moon } from "lucide-react";
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
        <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
          O
        </div>
      </div>
    </header>
  );
}
