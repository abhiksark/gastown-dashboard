import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Bead } from "@/lib/types";

type SortKey = "priority" | "updated_at" | "created_at" | "status";

export function BeadsPage() {
  const { data, loading, error } = useFetch<Bead[]>("/beads", 10000);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);

  const statuses = ["all", "open", "hooked", "in_progress", "completed", "done"];

  const filtered = useMemo(() => {
    if (!data) return [];
    let result = statusFilter === "all" ? data : data.filter((b) => b.status === statusFilter);
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "priority") cmp = a.priority - b.priority;
      else if (sortKey === "updated_at" || sortKey === "created_at") cmp = new Date(a[sortKey]).getTime() - new Date(b[sortKey]).getTime();
      else if (sortKey === "status") cmp = a.status.localeCompare(b.status);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [data, statusFilter, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  function sortHeader(label: string, field: SortKey) {
    return (
      <th className="text-left font-medium text-zinc-400 px-4 py-3 cursor-pointer hover:text-zinc-200 select-none" onClick={() => handleSort(field)}>
        {label}{sortKey === field && <span className="ml-1">{sortAsc ? "\u2191" : "\u2193"}</span>}
      </th>
    );
  }

  if (error) return <div className="text-red-400 text-sm">Failed to load beads: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Beads</h2>
        <div className="flex gap-1">
          {statuses.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? "bg-zinc-700 text-zinc-100" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>{s}</button>
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
                <th className="text-left font-medium text-zinc-400 px-4 py-3">ID</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-3">Title</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-3">Status</th>
                {sortHeader("Priority", "priority")}
                <th className="text-left font-medium text-zinc-400 px-4 py-3">Assignee</th>
                {sortHeader("Updated", "updated_at")}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bead) => (
                <tr key={bead.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">{bead.id}</td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-zinc-200 font-medium truncate max-w-md">{bead.title}</p>
                      {bead.labels && bead.labels.length > 0 && (
                        <div className="flex gap-1 mt-1">
                          {bead.labels.map((l) => <span key={l} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{l}</span>)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3"><StatusBadge status={bead.status} /></td>
                  <td className="px-4 py-3 text-zinc-400 tabular-nums">P{bead.priority}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{bead.assignee || "\u2014"}</td>
                  <td className="px-4 py-3 text-zinc-500 text-xs">{new Date(bead.updated_at).toLocaleDateString()}</td>
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">No beads found</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
