import { useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { apiPost } from "@/lib/api";
import type { Agent } from "@/lib/types";

export function AgentsPage() {
  const { data, loading, error, refetch } = useFetch<Agent[]>("/agents", 10000);
  const [nudging, setNudging] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const roles = ["all", "mayor", "deacon", "witness", "crew", "polecat"];

  const filtered = data
    ? roleFilter === "all" ? data : data.filter((a) => a.role === roleFilter)
    : [];

  async function handleNudge(name: string) {
    setNudging(name);
    try {
      await apiPost(`/agents/${encodeURIComponent(name)}/nudge`, { message: "Nudge from Gas Town Dashboard" });
      refetch();
    } catch { /* nudge may fail for agents without session */ }
    finally { setNudging(null); }
  }

  if (error) return <div className="text-red-400 text-sm">Failed to load agents: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Agents</h2>
        <div className="flex gap-1">
          {roles.map((role) => (
            <button key={role} onClick={() => setRoleFilter(role)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                roleFilter === role ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}>{role}</button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg bg-[var(--color-card)] animate-pulse" />)}</div>
      ) : (
        <div className="rounded-lg border border-[var(--color-border)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
                <th className="text-left font-medium text-zinc-400 px-4 py-3">Agent</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-3">Role</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-3">Rig</th>
                <th className="text-right font-medium text-zinc-400 px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((agent) => {
                const target = agent.rig ? `${agent.rig}/${agent.name}` : agent.name;
                return (
                  <tr key={`${agent.rig}-${agent.name}`} className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors">
                    <td className="px-4 py-3"><div className="flex items-center gap-2"><span className="text-base">{agent.icon}</span><span className="text-zinc-200 font-medium">{agent.name}</span></div></td>
                    <td className="px-4 py-3"><StatusBadge status={agent.role} /></td>
                    <td className="px-4 py-3 text-zinc-400">{agent.rig || "\u2014"}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleNudge(target)} disabled={nudging === target}
                        className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors disabled:opacity-50">
                        {nudging === target ? "Nudging..." : "Nudge"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-zinc-600">No agents found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
