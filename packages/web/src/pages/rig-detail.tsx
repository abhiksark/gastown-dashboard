import { useState } from "react";
import { useParams, Link } from "react-router";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { InlineStatus } from "@/components/inline-status";
import { apiPost } from "@/lib/api";
import type { Rig, Agent, Bead, PolecatStatus, Session } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { Server, ArrowLeft, RotateCw, Play, Square, Bomb } from "lucide-react";
import { cn } from "@/lib/utils";

export function RigDetailPage() {
  const { name } = useParams<{ name: string }>();
  const { data: rigs, loading: rigsLoading } = useFetch<Rig[]>("/rigs", 10000);
  const { data: agents, loading: agentsLoading } = useFetch<Agent[]>("/agents", 10000);
  const { data: beads, loading: beadsLoading } = useFetch<Bead[]>("/beads", 10000);
  const { data: polecats, loading: polecatsLoading, refetch: refetchPolecats } = useFetch<PolecatStatus[]>(
    `/sessions/polecats/${encodeURIComponent(name || "")}`,
    10000
  );
  const { data: sessions, refetch: refetchSessions } = useFetch<Session[]>("/sessions", 10000);
  const [restartingPolecat, setRestartingPolecat] = useState<string | null>(null);
  const [nukingPolecat, setNukingPolecat] = useState<string | null>(null);
  const [witnessAction, setWitnessAction] = useState<string | null>(null);
  const { addToast } = useToast();

  const rig = rigs?.find((r) => r.name === name);
  const rigAgents = agents?.filter((a) => a.rig === name) || [];
  const rigBeads = beads?.filter((b) => b.assignee?.includes(name || "")) || [];
  const rigSessions = sessions?.filter((s) => s.rig === name) || [];
  const loading = rigsLoading || agentsLoading || beadsLoading;

  function getSessionForPolecat(polecatName: string): Session | undefined {
    return rigSessions.find((s) => s.polecat === polecatName);
  }

  async function handleRestart(polecatName: string) {
    setRestartingPolecat(polecatName);
    try {
      await apiPost(`/sessions/${encodeURIComponent(name || "")}/${encodeURIComponent(polecatName)}/restart`);
      addToast("Session restarted", "success");
      refetchPolecats();
      refetchSessions();
    } catch (err: any) {
      addToast(`Restart failed: ${err.message}`, "error");
    } finally {
      setRestartingPolecat(null);
    }
  }

  async function handleWitness(action: "start" | "stop" | "restart") {
    setWitnessAction(action);
    try {
      await apiPost(`/control/witness/${encodeURIComponent(name || "")}/${action}`);
      addToast(`Witness ${action}ed`, "success");
    } catch (err: any) {
      addToast(`Witness ${action} failed: ${err.message}`, "error");
    } finally {
      setWitnessAction(null);
    }
  }

  async function handleNuke(polecatName: string) {
    if (!window.confirm(`Nuke polecat ${polecatName}? This is destructive and cannot be undone.`)) return;
    setNukingPolecat(polecatName);
    try {
      await apiPost(`/control/polecat/${encodeURIComponent(name || "")}/${encodeURIComponent(polecatName)}/nuke`, { confirm: true });
      addToast(`Nuked ${polecatName}`, "success");
      refetchPolecats();
      refetchSessions();
    } catch (err: any) {
      addToast(`Nuke failed: ${err.message}`, "error");
    } finally {
      setNukingPolecat(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded skeleton" />
        <div className="h-40 rounded-lg skeleton" />
        <div className="h-64 rounded-lg skeleton" />
      </div>
    );
  }

  if (!rig) {
    return (
      <div className="space-y-4">
        <Link to="/rigs" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
          <ArrowLeft className="h-3 w-3" /> Back to rigs
        </Link>
        <p className="text-zinc-500">Rig "{name}" not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link to="/rigs" className="flex items-center gap-1 text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
        <ArrowLeft className="h-3 w-3" /> Back to rigs
      </Link>

      {/* Header card */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-md bg-zinc-800 p-2.5">
              <Server className="h-5 w-5 text-zinc-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-zinc-100">{rig.name}</h2>
              <p className="text-xs text-zinc-500 mt-0.5">prefix: {rig.beads_prefix}</p>
            </div>
          </div>
          <StatusBadge status={rig.status} />
        </div>

        <div className="mt-5 grid grid-cols-4 gap-3">
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <p className="text-lg font-semibold text-zinc-100 tabular-nums">{rig.polecats}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Polecats</p>
          </div>
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <p className="text-lg font-semibold text-zinc-100 tabular-nums">{rig.crew}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Crew</p>
          </div>
          <div className="rounded-md bg-zinc-900 p-3 text-center space-y-2">
            <StatusBadge status={rig.witness} />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">Witness</p>
            <div className="flex justify-center gap-1">
              {rig.witness !== "running" && (
                <button
                  onClick={() => handleWitness("start")}
                  disabled={!!witnessAction}
                  className="rounded px-1.5 py-0.5 text-[10px] text-emerald-400 border border-emerald-800 hover:bg-emerald-900/50 transition-colors disabled:opacity-50"
                >
                  <Play className="h-2.5 w-2.5 inline" /> Start
                </button>
              )}
              {rig.witness === "running" && (
                <button
                  onClick={() => handleWitness("stop")}
                  disabled={!!witnessAction}
                  className="rounded px-1.5 py-0.5 text-[10px] text-red-400 border border-red-900 hover:bg-red-900/50 transition-colors disabled:opacity-50"
                >
                  <Square className="h-2.5 w-2.5 inline" /> Stop
                </button>
              )}
              <button
                onClick={() => handleWitness("restart")}
                disabled={!!witnessAction}
                className="rounded px-1.5 py-0.5 text-[10px] text-zinc-400 border border-zinc-700 hover:bg-zinc-800 transition-colors disabled:opacity-50"
              >
                <RotateCw className={cn("h-2.5 w-2.5 inline", witnessAction === "restart" && "animate-spin")} /> Restart
              </button>
            </div>
          </div>
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <StatusBadge status={rig.refinery} />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Refinery</p>
          </div>
        </div>
      </div>

      {/* Polecats on this rig */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Polecats ({polecats?.length ?? 0})</h3>
        {polecatsLoading ? (
          <div className="h-24 rounded-lg skeleton" />
        ) : !polecats || polecats.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
            <p className="text-xs text-zinc-600">No polecats spawned. Sling work to this rig to auto-spawn one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {polecats.map((pc) => {
              const session = getSessionForPolecat(pc.name);
              const sessionRunning = session?.running ?? pc.session_running;
              const isRestarting = restartingPolecat === pc.name;
              return (
                <div
                  key={pc.name}
                  className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 space-y-3"
                >
                  {/* Polecat header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        sessionRunning ? "bg-emerald-500" : "bg-red-500"
                      )} />
                      <span className="text-sm font-medium text-zinc-200">{pc.name}</span>
                    </div>
                    <StatusBadge status={pc.state} />
                  </div>

                  {/* Details */}
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Assigned bead</span>
                      {pc.assigned_bead ? (
                        <Link to="/beads" className="text-blue-400 hover:text-blue-300 font-mono transition-colors">
                          {pc.assigned_bead}
                        </Link>
                      ) : (
                        <span className="text-zinc-600">&mdash;</span>
                      )}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-500">Session</span>
                      <span className={sessionRunning ? "text-emerald-400" : "text-red-400"}>
                        {sessionRunning ? "running" : "stopped"}
                      </span>
                    </div>
                    {pc.last_activity && (
                      <div className="flex justify-between">
                        <span className="text-zinc-500">Last activity</span>
                        <span className="text-zinc-400">{new Date(pc.last_activity).toLocaleTimeString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-1 border-t border-[var(--color-border)]">
                    <button
                      onClick={() => handleRestart(pc.name)}
                      disabled={isRestarting}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-50"
                    >
                      <RotateCw className={cn("h-3 w-3", isRestarting && "animate-spin")} />
                      {isRestarting ? "Restarting\u2026" : "Restart Session"}
                    </button>
                    <button
                      onClick={() => handleNuke(pc.name)}
                      disabled={nukingPolecat === pc.name}
                      className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium text-red-400 hover:text-red-300 hover:bg-red-900/30 transition-colors disabled:opacity-50"
                    >
                      <Bomb className="h-3 w-3" />
                      {nukingPolecat === pc.name ? "Nuking\u2026" : "Nuke"}
                    </button>
                    {session && (
                      <Link
                        to="/sessions"
                        className="ml-auto text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                      >
                        View session
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Agents on this rig */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Agents ({rigAgents.length})</h3>
        {rigAgents.length === 0 ? (
          <p className="text-xs text-zinc-600">No agents assigned to this rig</p>
        ) : (
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Agent</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Role</th>
                </tr>
              </thead>
              <tbody>
                {rigAgents.map((agent) => (
                  <tr key={agent.name} className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors">
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <span className="text-base">{agent.icon}</span>
                        <span className="text-zinc-200 text-xs font-medium">{agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2"><InlineStatus status={agent.role} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Beads on this rig */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Beads ({rigBeads.length})</h3>
        {rigBeads.length === 0 ? (
          <p className="text-xs text-zinc-600">No beads assigned to agents on this rig</p>
        ) : (
          <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">ID</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Title</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Status</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {rigBeads.map((bead) => (
                  <tr key={bead.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors">
                    <td className="px-4 py-2 font-mono text-xs text-zinc-500">{bead.id}</td>
                    <td className="px-4 py-2 text-zinc-200 text-xs truncate max-w-xs">{bead.title}</td>
                    <td className="px-4 py-2"><InlineStatus status={bead.status} /></td>
                    <td className="px-4 py-2 text-zinc-400 text-xs">{bead.assignee || "\u2014"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
