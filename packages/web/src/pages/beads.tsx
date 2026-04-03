import { useState, useMemo, useCallback } from "react";
import { useTableKeyboard } from "@/hooks/use-keyboard";
import { Link } from "react-router";
import { useRealtime } from "@/hooks/use-realtime";
import { StatusBadge } from "@/components/status-badge";
import { CreateBeadDialog } from "@/components/create-bead-dialog";
import { SlingDialog } from "@/components/sling-dialog";
import { ContextMenu } from "@/components/context-menu";
import { DependencyGraph } from "@/components/dependency-graph";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { InlineStatus } from "@/components/inline-status";
import type { Bead } from "@/lib/types";
import { X, CircleDot, Plus, Zap, Copy, Eye, List, GitBranch } from "lucide-react";

type SortKey = "priority" | "updated_at" | "created_at" | "status";
type ViewMode = "list" | "graph";

interface GraphData {
  nodes: { id: string; title: string; status: string; priority: number; issue_type: string }[];
  edges: { from: string; to: string }[];
}

export function BeadsPage() {
  const { data, loading, error, refetch } = useRealtime<Bead[]>("/beads?all=true", 10000);
  const { data: graphData } = useRealtime<GraphData>("/beads/graph", 15000);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("priority");
  const [sortAsc, setSortAsc] = useState(true);
  const [selected, setSelected] = useState<Bead | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [slingOpen, setSlingOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [showCloseInput, setShowCloseInput] = useState(false);
  const [closing, setClosing] = useState(false);
  const [ctxMenu, setCtxMenu] = useState<{ pos: { x: number; y: number }; bead: Bead } | null>(null);
  const { addToast } = useToast();

  const closeCtxMenu = useCallback(() => setCtxMenu(null), []);

  const statuses = ["all", "open", "hooked", "closed"];

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

  // Compute filter counts
  const counts = useMemo(() => {
    if (!data) return {};
    const c: Record<string, number> = { all: data.length };
    for (const b of data) {
      c[b.status] = (c[b.status] || 0) + 1;
    }
    return c;
  }, [data]);

  useTableKeyboard({
    onMove: useCallback((delta: number) => {
      if (filtered.length === 0) return;
      const currentIdx = selected ? filtered.findIndex((b) => b.id === selected.id) : -1;
      const next = Math.max(0, Math.min(filtered.length - 1, currentIdx + delta));
      setSelected(filtered[next]);
    }, [filtered, selected]),
    onEscape: useCallback(() => {
      setSelected(null);
      setShowCloseInput(false);
    }, []),
    enabled: !createOpen && !slingOpen,
  });

  function handleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else { setSortKey(key); setSortAsc(true); }
  }

  function sortHeader(label: string, field: SortKey) {
    return (
      <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs cursor-pointer hover:text-zinc-200 select-none" onClick={() => handleSort(field)}>
        {label}{sortKey === field && <span className="ml-1">{sortAsc ? "\u2191" : "\u2193"}</span>}
      </th>
    );
  }

  const handleGraphSelect = useCallback(
    (id: string) => {
      const bead = data?.find((b) => b.id === id) ?? null;
      setSelected(bead);
    },
    [data]
  );

  if (error) return <div className="text-red-400 text-sm">Failed to load beads: {error}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Beads</h2>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-md bg-[var(--color-accent)] p-1.5 text-white hover:bg-blue-600 transition-colors"
            title="New Bead"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setSlingOpen(true)}
            className="rounded-md border border-[var(--color-border)] p-1.5 text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors"
            title="Sling"
          >
            <Zap className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 rounded-md border border-[var(--color-border)] p-0.5">
            <button
              onClick={() => setViewMode("list")}
              className={`rounded p-1.5 transition-colors ${viewMode === "list" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              title="List view"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode("graph")}
              className={`rounded p-1.5 transition-colors ${viewMode === "graph" ? "bg-zinc-800 text-zinc-100" : "text-zinc-500 hover:text-zinc-300"}`}
              title="Graph view"
            >
              <GitBranch className="h-3.5 w-3.5" />
            </button>
          </div>
          {viewMode === "list" && (
            <div className="flex gap-1">
              {statuses.map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${statusFilter === s ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"}`}>
                  {s}{counts[s] !== undefined ? ` (${counts[s]})` : ""}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-14 rounded-lg skeleton" />)}</div>
      ) : viewMode === "graph" ? (
        <div className="flex gap-4">
          <div className="flex-1">
            <DependencyGraph
              nodes={graphData?.nodes ?? []}
              edges={graphData?.edges ?? []}
              onSelectBead={handleGraphSelect}
              selectedId={selected?.id}
            />
          </div>
          {/* Detail panel (shared with list view) */}
          {selected && (
            <div className="w-96 shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
              {/* Header */}
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span className="font-mono text-xs text-zinc-500">{selected.id}</span>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 mt-2">{selected.title}</h3>
              </div>

              {/* Metadata */}
              <div className="px-5 py-3 border-b border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Priority</span>
                  <span className="text-xs text-zinc-300 tabular-nums">P{selected.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Type</span>
                  <span className="text-xs text-zinc-300">{selected.issue_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Assignee</span>
                  <span className="text-xs text-zinc-300">{selected.assignee || "\u2014"}</span>
                </div>
              </div>

              {/* Description */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Description</h4>
                {selected.description ? (
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{selected.description}</pre>
                ) : (
                  <p className="text-xs text-zinc-600">No description</p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex gap-4">
          {/* Table */}
          <div className="flex-1 rounded-lg border border-[var(--color-border)] overflow-hidden overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-card)]">
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">ID</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Title</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Status</th>
                  {sortHeader("Priority", "priority")}
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Assignee</th>
                  {sortHeader("Updated", "updated_at")}
                </tr>
              </thead>
              <tbody>
                {filtered.map((bead) => (
                  <tr
                    key={bead.id}
                    onClick={() => setSelected(bead)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setCtxMenu({ pos: { x: e.clientX, y: e.clientY }, bead });
                    }}
                    className={`border-b border-[var(--color-border)] cursor-pointer transition-colors ${
                      selected?.id === bead.id
                        ? "bg-blue-500/5"
                        : "hover:bg-[var(--color-card-hover)]"
                    }`}
                  >
                    <td className="px-4 py-2 font-mono text-xs text-zinc-500">{bead.id}</td>
                    <td className="px-4 py-2">
                      <div>
                        <p className="text-zinc-200 font-medium truncate max-w-md">{bead.title}</p>
                        {bead.labels && bead.labels.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {bead.labels.map((l) => <span key={l} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{l}</span>)}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2"><InlineStatus status={bead.status} /></td>
                    <td className="px-4 py-2 text-zinc-400 tabular-nums">P{bead.priority}</td>
                    <td className="px-4 py-2 text-xs">{bead.assignee ? <Link to="/agents" onClick={(e) => e.stopPropagation()} className="text-zinc-400 hover:text-zinc-100 underline decoration-zinc-700 hover:decoration-zinc-400 transition-colors">{bead.assignee}</Link> : <span className="text-zinc-400">{"\u2014"}</span>}</td>
                    <td className="px-4 py-2 text-zinc-500 text-xs">{new Date(bead.updated_at).toLocaleDateString()}</td>
                  </tr>
                ))}
                {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-600">No beads found</td></tr>}
              </tbody>
            </table>
          </div>

          {/* Detail panel */}
          {selected && (
            <div className="w-96 shrink-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden flex flex-col" style={{ maxHeight: "calc(100vh - 200px)" }}>
              {/* Header */}
              <div className="px-5 py-4 border-b border-[var(--color-border)]">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <CircleDot className="h-4 w-4 text-zinc-400 shrink-0" />
                    <span className="font-mono text-xs text-zinc-500">{selected.id}</span>
                  </div>
                  <button
                    onClick={() => setSelected(null)}
                    className="p-1 rounded-md text-zinc-500 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <h3 className="text-sm font-semibold text-zinc-100 mt-2">{selected.title}</h3>
              </div>

              {/* Metadata */}
              <div className="px-5 py-3 border-b border-[var(--color-border)] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Status</span>
                  <StatusBadge status={selected.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Priority</span>
                  <span className="text-xs text-zinc-300 tabular-nums">P{selected.priority}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Type</span>
                  <span className="text-xs text-zinc-300">{selected.issue_type}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Assignee</span>
                  <span className="text-xs text-zinc-300">{selected.assignee || "\u2014"}</span>
                </div>
                {selected.owner && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Owner</span>
                    <span className="text-xs text-zinc-300">{selected.owner}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Created</span>
                  <span className="text-xs text-zinc-300">{new Date(selected.created_at).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Updated</span>
                  <span className="text-xs text-zinc-300">{new Date(selected.updated_at).toLocaleString()}</span>
                </div>
                {selected.created_by && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Created by</span>
                    <span className="text-xs text-zinc-300">{selected.created_by}</span>
                  </div>
                )}
                {selected.dependency_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Dependencies</span>
                    <span className="text-xs text-zinc-300">{selected.dependency_count}</span>
                  </div>
                )}
                {selected.dependent_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Dependents</span>
                    <span className="text-xs text-zinc-300">{selected.dependent_count}</span>
                  </div>
                )}
                {selected.comment_count > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Comments</span>
                    <span className="text-xs text-zinc-300">{selected.comment_count}</span>
                  </div>
                )}
                {selected.labels && selected.labels.length > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Labels</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {selected.labels.map((l) => (
                        <span key={l} className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500 mb-2">Description</h4>
                {selected.description ? (
                  <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-sans leading-relaxed">{selected.description}</pre>
                ) : (
                  <p className="text-xs text-zinc-600">No description</p>
                )}
              </div>

              {/* Actions */}
              <div className="px-5 py-3 border-t border-[var(--color-border)] space-y-2">
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSlingOpen(true); }}
                    className="flex-1 rounded-md border border-[var(--color-border)] px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Zap className="h-3 w-3" /> Sling
                  </button>
                  {selected.status !== "closed" && (
                    <button
                      onClick={() => setShowCloseInput(!showCloseInput)}
                      className="flex-1 rounded-md border border-red-900/50 px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:border-red-700 transition-colors"
                    >
                      Close
                    </button>
                  )}
                </div>
                {showCloseInput && (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={closeReason}
                      onChange={(e) => setCloseReason(e.target.value)}
                      placeholder="Reason (optional)"
                      className="flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 outline-none focus:border-zinc-500"
                      autoFocus
                    />
                    <button
                      onClick={async () => {
                        setClosing(true);
                        try {
                          await apiPost(`/actions/beads/${selected.id}/close`, { reason: closeReason || undefined });
                          addToast("Bead closed", "success");
                          setShowCloseInput(false);
                          setCloseReason("");
                          setSelected(null);
                          refetch();
                        } catch (err: any) {
                          addToast(`Failed to close: ${err.message}`, "error");
                        } finally {
                          setClosing(false);
                        }
                      }}
                      disabled={closing}
                      className="rounded-md bg-red-600 px-3 py-1.5 text-xs text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                    >
                      {closing ? "..." : "Confirm"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <ContextMenu
        position={ctxMenu?.pos ?? null}
        onClose={closeCtxMenu}
        items={ctxMenu ? [
          { label: "View details", icon: <Eye className="h-3.5 w-3.5" />, onClick: () => setSelected(ctxMenu.bead) },
          { label: "Copy ID", icon: <Copy className="h-3.5 w-3.5" />, onClick: () => { navigator.clipboard.writeText(ctxMenu.bead.id); addToast("Copied ID", "success"); } },
        ] : []}
      />

      <CreateBeadDialog open={createOpen} onClose={() => setCreateOpen(false)} onCreated={refetch} />
      <SlingDialog open={slingOpen} onClose={() => setSlingOpen(false)} preselectedBead={selected?.id} />
    </div>
  );
}
