import { useState, useEffect, useCallback, useMemo } from "react";
import { useTableKeyboard } from "@/hooks/use-keyboard";
import { Link } from "react-router";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { InlineStatus } from "@/components/inline-status";
import { apiPost, apiFetch } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ContextMenu, type ContextMenuItem } from "@/components/context-menu";
import type { Agent, Session } from "@/lib/types";
import { InlineConfirm } from "@/components/inline-confirm";
import { X, Zap, Eye, Server } from "lucide-react";

interface HookInfo {
  agent: string;
  status: string;
  bead?: string;
  title?: string;
}

export function AgentsPage() {
  const { data, loading, error, refetch } = useFetch<Agent[]>("/agents", 10000);
  const { data: sessions } = useFetch<Session[]>("/sessions", 10000);
  const [nudging, setNudging] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selected, setSelected] = useState<Agent | null>(null);
  const [hookInfo, setHookInfo] = useState<HookInfo | null>(null);
  const [hookLoading, setHookLoading] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ pos: { x: number; y: number }; agent: Agent } | null>(null);
  const { addToast } = useToast();

  const roles = ["all", "mayor", "deacon", "witness", "crew", "polecat"];

  const handleContextMenu = useCallback((e: React.MouseEvent, agent: Agent) => {
    e.preventDefault();
    setCtxMenu({ pos: { x: e.clientX, y: e.clientY }, agent });
  }, []);

  const ctxMenuItems: ContextMenuItem[] = ctxMenu
    ? [
        {
          label: "View details",
          icon: <Eye className="h-3.5 w-3.5" />,
          onClick: () => setSelected(ctxMenu.agent),
        },
        {
          label: "Nudge",
          icon: <Zap className="h-3.5 w-3.5" />,
          onClick: () => {
            const target = ctxMenu.agent.rig ? `${ctxMenu.agent.rig}/${ctxMenu.agent.name}` : ctxMenu.agent.name;
            handleNudge(target);
          },
        },
        ...(ctxMenu.agent.rig
          ? [{
              label: "View rig",
              icon: <Server className="h-3.5 w-3.5" />,
              onClick: () => { window.location.href = `/rigs/${ctxMenu.agent.rig}`; },
            }]
          : []),
      ]
    : [];

  const filtered = useMemo(() =>
    data ? (roleFilter === "all" ? data : data.filter((a) => a.role === roleFilter)) : [],
    [data, roleFilter]
  );

  useTableKeyboard({
    onMove: useCallback((delta: number) => {
      if (filtered.length === 0) return;
      const currentIdx = selected ? filtered.findIndex((a) => a.name === selected.name && a.rig === selected.rig) : -1;
      const next = Math.max(0, Math.min(filtered.length - 1, currentIdx + delta));
      setSelected(filtered[next]);
    }, [filtered, selected]),
    onEscape: useCallback(() => setSelected(null), []),
  });

  useEffect(() => {
    if (!selected) {
      setHookInfo(null);
      return;
    }
    const target = selected.rig ? `${selected.rig}/${selected.name}` : selected.name;
    setHookLoading(true);
    apiFetch<HookInfo>(`/agents/${encodeURIComponent(target)}/hook`)
      .then(setHookInfo)
      .catch(() => setHookInfo({ agent: target, status: "unknown" }))
      .finally(() => setHookLoading(false));
  }, [selected]);

  async function handleNudge(name: string) {
    setNudging(name);
    try {
      await apiPost(`/agents/${encodeURIComponent(name)}/nudge`, { message: "Nudge from Gas Town Dashboard" });
      addToast(`Nudged ${name}`, "success");
      refetch();
    } catch {
      addToast(`Failed to nudge ${name}`, "error");
    } finally {
      setNudging(null);
    }
  }

  if (error) return <div className="text-red-400 text-sm">Failed to load agents: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Agents</h2>
        <div className="flex gap-1">
          {roles.map((role) => (
            <button key={role} onClick={() => setRoleFilter(role)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                roleFilter === role ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}>{role}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg skeleton" />)}</div>
      ) : (
        <div className="flex gap-4">
          <div className="flex-1 rounded-lg border border-[var(--color-border)] overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Agent</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Role</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Rig</th>
                  <th className="text-right font-medium text-zinc-400 px-4 py-2 text-xs">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((agent) => {
                  const target = agent.rig ? `${agent.rig}/${agent.name}` : agent.name;
                  return (
                    <tr
                      key={`${agent.rig}-${agent.name}`}
                      onClick={() => setSelected(agent)}
                      onContextMenu={(e) => handleContextMenu(e, agent)}
                      className={`group border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                        selected?.name === agent.name && selected?.rig === agent.rig
                          ? "bg-blue-500/5"
                          : "hover:bg-[var(--color-card-hover)]"
                      }`}
                    >
                      <td className="px-4 py-2">
                        <Link
                          to={`/agents/${encodeURIComponent(agent.name)}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-2 hover:underline"
                        >
                          <span className="text-base">{agent.icon}</span>
                          <span className="text-zinc-200 font-medium">{agent.name}</span>
                        </Link>
                      </td>
                      <td className="px-4 py-2"><InlineStatus status={agent.role} /></td>
                      <td className="px-4 py-2">{agent.rig ? <Link to={`/rigs/${agent.rig}`} onClick={(e) => e.stopPropagation()} className="text-zinc-400 hover:text-zinc-100 underline decoration-zinc-700 hover:decoration-zinc-400 transition-colors">{agent.rig}</Link> : <span className="text-zinc-400">{"\u2014"}</span>}</td>
                      <td className="px-4 py-2 text-right">
                        <span className="inline-flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => { e.stopPropagation(); setSelected(agent); }}
                            className="rounded-md p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                            title="View details"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          <InlineConfirm
                            onConfirm={() => handleNudge(target)}
                            confirmLabel="Nudge?"
                            disabled={nudging === target}
                            className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors active:scale-[0.98] disabled:opacity-50"
                          >
                            {nudging === target ? "..." : <Zap className="h-3 w-3" />}
                          </InlineConfirm>
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600">No agents found</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-96 shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
              {/* Header */}
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selected.icon}</span>
                    <div>
                      <h3 className="text-sm font-semibold text-zinc-100">{selected.name}</h3>
                      <StatusBadge status={selected.role} className="mt-1" />
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Metadata */}
              <div className="px-5 py-3 border-b border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Role</span>
                  <StatusBadge status={selected.role} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Rig</span>
                  <span className="text-xs text-zinc-300">{selected.rig || "\u2014"}</span>
                </div>
              </div>

              {/* Session status */}
              {(() => {
                const session = sessions?.find(
                  (s) => s.rig === selected.rig && s.polecat === selected.name
                );
                if (!session) return null;
                return (
                  <div className="px-5 py-3 border-b border-[var(--color-border)] space-y-2">
                    <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Session</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Status</span>
                      <StatusBadge status={session.running ? "running" : "stopped"} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Session ID</span>
                      <span className="text-xs text-zinc-300 font-mono">{session.session_id}</span>
                    </div>
                  </div>
                );
              })()}

              {/* Hook status */}
              <div className="px-5 py-3 flex-1 overflow-y-auto">
                <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Hook Status</h4>
                {hookLoading ? (
                  <div className="h-12 rounded skeleton" />
                ) : hookInfo ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Status</span>
                      <StatusBadge status={hookInfo.status} />
                    </div>
                    {hookInfo.bead && (
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-zinc-500">Bead</span>
                        <span className="text-xs text-zinc-300 font-mono">{hookInfo.bead}</span>
                      </div>
                    )}
                    {hookInfo.title && (
                      <div className="mt-2">
                        <span className="text-xs text-zinc-500">Task</span>
                        <p className="text-xs text-zinc-300 mt-0.5">{hookInfo.title}</p>
                      </div>
                    )}
                    {hookInfo.status === "empty" && (
                      <p className="text-xs text-zinc-600 mt-1">No work currently hooked</p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">Unable to fetch hook status</p>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <ContextMenu
        items={ctxMenuItems}
        position={ctxMenu?.pos ?? null}
        onClose={() => setCtxMenu(null)}
      />
    </div>
  );
}
