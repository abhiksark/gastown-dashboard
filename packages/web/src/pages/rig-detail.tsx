import { useParams, Link } from "react-router";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Rig, Agent, Bead } from "@/lib/types";
import { Server, ArrowLeft } from "lucide-react";

export function RigDetailPage() {
  const { name } = useParams<{ name: string }>();
  const { data: rigs, loading: rigsLoading } = useFetch<Rig[]>("/rigs", 10000);
  const { data: agents, loading: agentsLoading } = useFetch<Agent[]>("/agents", 10000);
  const { data: beads, loading: beadsLoading } = useFetch<Bead[]>("/beads", 10000);

  const rig = rigs?.find((r) => r.name === name);
  const rigAgents = agents?.filter((a) => a.rig === name) || [];
  const rigBeads = beads?.filter((b) => b.assignee?.includes(name || "")) || [];
  const loading = rigsLoading || agentsLoading || beadsLoading;

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
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <StatusBadge status={rig.witness} />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Witness</p>
          </div>
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <StatusBadge status={rig.refinery} />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Refinery</p>
          </div>
        </div>
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
                    <td className="px-4 py-2"><StatusBadge status={agent.role} /></td>
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
                    <td className="px-4 py-2"><StatusBadge status={bead.status} /></td>
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
