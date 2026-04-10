import { useFetch } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { InlineStatus } from "@/components/inline-status";
import { useState } from "react";
import { Play, Pause, Power, PowerOff } from "lucide-react";
import type { Rig } from "@/lib/types";

interface SchedulerStatus {
  paused: boolean;
  queued: number;
  active_polecats: number;
  [key: string]: unknown;
}

interface AgentPreset {
  name: string;
  command: string;
  args?: string[];
  [key: string]: unknown;
}

interface TownInfo {
  gt_home?: string;
  beads_dir?: string;
  dolt_port?: number;
  [key: string]: unknown;
}

export function SettingsPage() {
  const { data: scheduler, refetch: refetchScheduler } = useFetch<SchedulerStatus>("/settings/scheduler", 5000);
  const { data: agents } = useFetch<AgentPreset[]>("/settings/agents", 30000);
  const { data: rigs } = useFetch<Rig[]>("/settings/rigs", 30000);
  const { data: info } = useFetch<TownInfo>("/settings/info", 60000);
  const [toggling, setToggling] = useState(false);
  const [shutdownText, setShutdownText] = useState("");
  const [showShutdown, setShowShutdown] = useState(false);
  const [townActing, setTownActing] = useState(false);
  const { addToast } = useToast();

  async function toggleScheduler() {
    if (!scheduler) return;
    setToggling(true);
    try {
      const action = scheduler.paused ? "resume" : "pause";
      await apiPost(`/settings/scheduler/${action}`);
      addToast(`Scheduler ${action}d`, "success");
      refetchScheduler();
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, "error");
    } finally {
      setToggling(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Settings</h2>

      {/* Scheduler */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-100">Scheduler</h3>
          {scheduler && (
            <button
              onClick={toggleScheduler}
              disabled={toggling}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
                scheduler.paused
                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                  : "bg-amber-600 text-white hover:bg-amber-500"
              }`}
            >
              {scheduler.paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
              {toggling ? "..." : scheduler.paused ? "Resume" : "Pause"}
            </button>
          )}
        </div>
        {scheduler ? (
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-md bg-zinc-900 p-3 text-center">
              <StatusBadge status={scheduler.paused ? "paused" : "running"} />
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Status</p>
            </div>
            <div className="rounded-md bg-zinc-900 p-3 text-center">
              <p className="text-lg font-semibold text-zinc-100 tabular-nums">{scheduler.queued ?? 0}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Queued</p>
            </div>
            <div className="rounded-md bg-zinc-900 p-3 text-center">
              <p className="text-lg font-semibold text-zinc-100 tabular-nums">{scheduler.active_polecats ?? 0}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Active Polecats</p>
            </div>
          </div>
        ) : (
          <div className="h-16 rounded-lg skeleton" />
        )}
      </div>

      {/* Agent Presets */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-zinc-100">Agent Presets</h3>
        </div>
        {agents && agents.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Name</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Command</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Args</th>
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.name} className="border-b border-[var(--color-border)]">
                  <td className="px-4 py-2 text-zinc-200 text-xs font-medium">{a.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">{a.command}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{(Array.isArray(a.args) ? a.args.join(" ") : a.args) || "\u2014"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : agents ? (
          <p className="px-5 py-6 text-xs text-zinc-600 text-center">No agent presets configured</p>
        ) : (
          <div className="h-24 skeleton" />
        )}
      </div>

      {/* Rig Configuration */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-zinc-100">Rig Configuration</h3>
        </div>
        {rigs && rigs.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Rig</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Prefix</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Polecats</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Crew</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Witness</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Refinery</th>
              </tr>
            </thead>
            <tbody>
              {rigs.map((r) => (
                <tr key={r.name} className="border-b border-[var(--color-border)]">
                  <td className="px-4 py-2 text-zinc-200 text-xs font-medium">{r.name}</td>
                  <td className="px-4 py-2 font-mono text-xs text-zinc-400">{r.beads_prefix}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs tabular-nums">{r.polecats}</td>
                  <td className="px-4 py-2 text-zinc-400 text-xs tabular-nums">{r.crew}</td>
                  <td className="px-4 py-2"><InlineStatus status={r.witness} /></td>
                  <td className="px-4 py-2"><InlineStatus status={r.refinery} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : rigs ? (
          <p className="px-5 py-6 text-xs text-zinc-600 text-center">No rigs configured</p>
        ) : (
          <div className="h-24 skeleton" />
        )}
      </div>

      {/* Town Info */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 space-y-3">
        <h3 className="text-sm font-semibold text-zinc-100">Town Info</h3>
        {info ? (
          <div className="space-y-2">
            {info.gt_home && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">GT_HOME</span>
                <span className="font-mono text-xs text-zinc-300">{info.gt_home}</span>
              </div>
            )}
            {info.beads_dir && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Beads Directory</span>
                <span className="font-mono text-xs text-zinc-300">{info.beads_dir}</span>
              </div>
            )}
            {info.dolt_port && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-500">Dolt Port</span>
                <span className="font-mono text-xs text-zinc-300">{info.dolt_port}</span>
              </div>
            )}
            {Object.entries(info)
              .filter(([k]) => !["gt_home", "beads_dir", "dolt_port"].includes(k))
              .map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">{k}</span>
                  <span className="font-mono text-xs text-zinc-300">{String(v)}</span>
                </div>
              ))}
          </div>
        ) : (
          <div className="h-16 rounded-lg skeleton" />
        )}
      </div>

      {/* Town Control */}
      <div className="rounded-lg border border-red-500/20 bg-[var(--color-card)] p-5 space-y-4">
        <h3 className="text-sm font-semibold text-zinc-100">Town Control</h3>
        <div className="flex gap-3">
          <button
            onClick={async () => {
              setTownActing(true);
              try {
                await apiPost("/town/start");
                addToast("Town starting — deacon and mayor launching", "success");
              } catch (err: any) {
                addToast(`Start failed: ${err.message}`, "error");
              } finally {
                setTownActing(false);
              }
            }}
            disabled={townActing}
            className="flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-2 text-xs font-medium text-white hover:bg-emerald-500 transition-colors disabled:opacity-50"
          >
            <Power className="h-3.5 w-3.5" /> Start Town
          </button>
          <button
            onClick={() => setShowShutdown(true)}
            disabled={townActing}
            className="flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            <PowerOff className="h-3.5 w-3.5" /> Shutdown Town
          </button>
        </div>
        <p className="text-[10px] text-zinc-600">
          Shutdown stops all agents and removes polecat worktrees. Start launches the deacon and mayor.
        </p>
      </div>

      {/* Shutdown confirmation dialog */}
      {showShutdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setShowShutdown(false); setShutdownText(""); }} />
          <div className="relative w-full max-w-sm rounded-lg border border-red-500/40 bg-[var(--color-surface)] p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-red-400">Confirm Shutdown</h3>
            <p className="text-xs text-zinc-400">This will stop all agents and remove polecat worktrees. Type <span className="font-mono text-zinc-200">SHUTDOWN</span> to confirm.</p>
            <input
              type="text"
              value={shutdownText}
              onChange={(e) => setShutdownText(e.target.value)}
              placeholder="Type SHUTDOWN"
              autoFocus
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-red-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowShutdown(false); setShutdownText(""); }}
                className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setTownActing(true);
                  try {
                    await apiPost("/town/shutdown");
                    addToast("Town shutting down", "success");
                  } catch (err: any) {
                    addToast(`Shutdown failed: ${err.message}`, "error");
                  } finally {
                    setTownActing(false);
                    setShowShutdown(false);
                    setShutdownText("");
                  }
                }}
                disabled={shutdownText !== "SHUTDOWN" || townActing}
                className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500 transition-colors disabled:opacity-50"
              >
                {townActing ? "..." : "Shutdown"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
