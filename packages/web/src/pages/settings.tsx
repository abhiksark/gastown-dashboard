import { useFetch } from "@/hooks/use-fetch";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { StatusBadge } from "@/components/status-badge";
import { InlineStatus } from "@/components/inline-status";
import { useState } from "react";
import { Play, Pause } from "lucide-react";
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
                  <td className="px-4 py-2 font-mono text-xs text-zinc-500">{a.args?.join(" ") || "\u2014"}</td>
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
    </div>
  );
}
