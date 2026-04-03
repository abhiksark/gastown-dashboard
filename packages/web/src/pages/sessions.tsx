import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { InlineStatus } from "@/components/inline-status";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Session } from "@/lib/types";
import { Terminal, Activity, CircleOff, RotateCw, Bomb } from "lucide-react";

export function SessionsPage() {
  const { data, loading, error, refetch } = useFetch<Session[]>("/sessions", 5000);
  const [restarting, setRestarting] = useState<string | null>(null);
  const [nuking, setNuking] = useState<string | null>(null);
  const { addToast } = useToast();

  async function handleRestartSession(rig: string, polecat: string) {
    const key = `${rig}/${polecat}`;
    setRestarting(key);
    try {
      await apiPost(`/control/session/${encodeURIComponent(rig)}/${encodeURIComponent(polecat)}/restart`);
      addToast(`Restarted session for ${polecat}`, "success");
      refetch();
    } catch (err: any) {
      addToast(`Restart failed: ${err.message}`, "error");
    } finally {
      setRestarting(null);
    }
  }

  async function handleNuke(rig: string, polecat: string) {
    if (!window.confirm(`Nuke polecat ${polecat}? This is destructive and cannot be undone.`)) return;
    const key = `${rig}/${polecat}`;
    setNuking(key);
    try {
      await apiPost(`/control/polecat/${encodeURIComponent(rig)}/${encodeURIComponent(polecat)}/nuke`, { confirm: true });
      addToast(`Nuked ${polecat}`, "success");
      refetch();
    } catch (err: any) {
      addToast(`Nuke failed: ${err.message}`, "error");
    } finally {
      setNuking(null);
    }
  }

  const stats = useMemo(() => {
    if (!data) return { total: 0, running: 0, stopped: 0 };
    const running = data.filter((s) => s.running).length;
    return { total: data.length, running, stopped: data.length - running };
  }, [data]);

  const grouped = useMemo(() => {
    if (!data) return {};
    const groups: Record<string, Session[]> = {};
    for (const s of data) {
      (groups[s.rig] ??= []).push(s);
    }
    return groups;
  }, [data]);

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load sessions: {error}</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Sessions</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Terminal className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Total Sessions</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
            {loading ? "\u2014" : stats.total}
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-400/70">Running</span>
          </div>
          <p className="text-2xl font-semibold text-emerald-400 tabular-nums">
            {loading ? "\u2014" : stats.running}
          </p>
        </div>
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CircleOff className="h-4 w-4 text-red-400" />
            <span className="text-xs text-red-400/70">Stopped</span>
          </div>
          <p className="text-2xl font-semibold text-red-400 tabular-nums">
            {loading ? "\u2014" : stats.stopped}
          </p>
        </div>
      </div>

      {/* Sessions grouped by rig */}
      {loading ? (
        <div className="space-y-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-40 rounded-lg skeleton" />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <Terminal className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No active sessions</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([rig, sessions]) => {
            const runningCount = sessions.filter((s) => s.running).length;
            return (
              <div
                key={rig}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
                  <div className="flex items-center gap-2">
                    <Terminal className="h-4 w-4 text-zinc-400" />
                    <h3 className="text-sm font-medium text-zinc-200">{rig}</h3>
                    <span className="text-xs text-zinc-500">
                      {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-400">{runningCount} running</span>
                    {sessions.length - runningCount > 0 && (
                      <span className="text-red-400">
                        {sessions.length - runningCount} stopped
                      </span>
                    )}
                  </div>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--color-border)]">
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                        Agent
                      </th>
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                        Session ID
                      </th>
                      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">
                        Status
                      </th>
                      <th className="text-right font-medium text-zinc-400 px-4 py-2 text-xs">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessions.map((session) => {
                      const key = `${session.rig}/${session.polecat}`;
                      return (
                      <tr
                        key={session.session_id}
                        className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors"
                      >
                        <td className="px-4 py-2 text-zinc-200 text-xs font-medium">
                          {session.polecat}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-zinc-500">
                          {session.session_id}
                        </td>
                        <td className="px-4 py-2">
                          <InlineStatus status={session.running ? "running" : "stopped"} />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => handleRestartSession(session.rig, session.polecat)}
                              disabled={restarting === key}
                              className="rounded px-2 py-0.5 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                              title="Restart session"
                            >
                              <RotateCw className={`h-3 w-3 inline ${restarting === key ? "animate-spin" : ""}`} />
                            </button>
                            <button
                              onClick={() => handleNuke(session.rig, session.polecat)}
                              disabled={nuking === key}
                              className="rounded px-2 py-0.5 text-[11px] text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                              title="Nuke polecat"
                            >
                              <Bomb className="h-3 w-3 inline" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
