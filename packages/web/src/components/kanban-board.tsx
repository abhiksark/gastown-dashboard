import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Bead } from "@/lib/types";
import { ChevronDown, ChevronRight } from "lucide-react";

interface KanbanBoardProps {
  beads: Bead[];
  onSelectBead: (bead: Bead) => void;
  selectedId?: string;
  groupBy: "rig" | "assignee" | "priority";
}

const STATUS_COLUMNS = [
  { key: "open", label: "Open", color: "border-amber-500" },
  { key: "hooked", label: "Hooked", color: "border-blue-500" },
  { key: "closed", label: "Closed", color: "border-emerald-500" },
];

const PRIORITY_COLORS: Record<number, string> = {
  0: "bg-red-500",
  1: "bg-orange-500",
  2: "bg-amber-500",
  3: "bg-blue-500",
  4: "bg-zinc-500",
};

function priorityLabel(p: number): string {
  return `P${p}`;
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  return `${d}d`;
}

function getGroupKey(bead: Bead, groupBy: string): string {
  if (groupBy === "rig") {
    if (!bead.assignee) return "unassigned";
    const parts = bead.assignee.split("/");
    return parts[0] || "unassigned";
  }
  if (groupBy === "assignee") {
    return bead.assignee || "unassigned";
  }
  if (groupBy === "priority") {
    return priorityLabel(bead.priority);
  }
  return "all";
}

function getBeadStatus(bead: Bead): string {
  if (bead.status === "closed") return "closed";
  if (bead.status === "hooked") return "hooked";
  return "open"; // open, waiting, blocked, deferred → all show in open column
}

export function KanbanBoard({ beads, onSelectBead, selectedId, groupBy }: KanbanBoardProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  // Group beads by the groupBy dimension
  const groups = useMemo(() => {
    const map = new Map<string, Bead[]>();
    for (const bead of beads) {
      if (bead.ephemeral) continue;
      const key = getGroupKey(bead, groupBy);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(bead);
    }
    // Sort groups: non-empty first, then alphabetically
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "unassigned") return 1;
      if (b[0] === "unassigned") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [beads, groupBy]);

  function toggleCollapse(group: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <div className="space-y-1" style={{ minHeight: "calc(100vh - 240px)" }}>
      {groups.map(([groupName, groupBeads]) => {
        const isCollapsed = collapsed.has(groupName);

        // Split beads into status columns
        const columns: Record<string, Bead[]> = { open: [], hooked: [], closed: [] };
        for (const b of groupBeads) {
          const status = getBeadStatus(b);
          columns[status].push(b);
        }
        // Sort each column by priority
        for (const col of Object.values(columns)) {
          col.sort((a, b) => a.priority - b.priority);
        }

        const totalCount = groupBeads.length;
        const openCount = columns.open.length;
        const hookedCount = columns.hooked.length;
        const closedCount = columns.closed.length;

        return (
          <div key={groupName} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
            {/* Swimlane header */}
            <button
              onClick={() => toggleCollapse(groupName)}
              className="flex items-center gap-2 w-full px-4 py-2.5 text-left hover:bg-[var(--color-card-hover)] transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              )}
              <span className="text-sm font-medium text-zinc-200">{groupName}</span>
              <span className="text-xs text-zinc-600 ml-1">{totalCount}</span>
              <div className="ml-auto flex gap-3 text-[10px] text-zinc-600">
                {openCount > 0 && <span className="text-amber-500/70">{openCount} open</span>}
                {hookedCount > 0 && <span className="text-blue-500/70">{hookedCount} hooked</span>}
                {closedCount > 0 && <span className="text-emerald-500/70">{closedCount} closed</span>}
              </div>
            </button>

            {/* Columns */}
            {!isCollapsed && (
              <div className="grid grid-cols-3 gap-px bg-[var(--color-border)]">
                {STATUS_COLUMNS.map(({ key, label, color }) => (
                  <div key={key} className="bg-[var(--color-surface)] min-h-[80px]">
                    {/* Column header */}
                    <div className={cn("px-3 py-1.5 border-t-2", color)}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
                          {label}
                        </span>
                        <span className="text-[10px] text-zinc-600 tabular-nums">
                          {columns[key].length}
                        </span>
                      </div>
                    </div>

                    {/* Cards */}
                    <div className="p-1.5 space-y-1">
                      {columns[key].map((bead) => (
                        <button
                          key={bead.id}
                          onClick={() => onSelectBead(bead)}
                          className={cn(
                            "w-full text-left rounded-md border px-3 py-2 transition-all",
                            selectedId === bead.id
                              ? "border-[var(--color-accent)] bg-blue-500/5 shadow-sm"
                              : "border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-hover)] hover:border-zinc-600"
                          )}
                        >
                          <div className="flex items-start gap-2">
                            {/* Priority stripe */}
                            <span
                              className={cn("w-1 rounded-full self-stretch shrink-0", PRIORITY_COLORS[bead.priority] || PRIORITY_COLORS[4])}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-zinc-200 leading-snug line-clamp-2">
                                {bead.title}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-mono text-zinc-600">{bead.id}</span>
                                <span className="text-[10px] text-zinc-600">{priorityLabel(bead.priority)}</span>
                                {bead.assignee && (
                                  <span className="text-[10px] text-zinc-500 truncate max-w-[100px]">
                                    {bead.assignee.split("/").pop()}
                                  </span>
                                )}
                                <span className="text-[10px] text-zinc-700 ml-auto shrink-0">
                                  {timeAgo(bead.updated_at)}
                                </span>
                              </div>
                              {bead.labels && bead.labels.length > 0 && (
                                <div className="flex gap-1 mt-1 flex-wrap">
                                  {bead.labels.slice(0, 3).map((l) => (
                                    <span key={l} className="rounded bg-zinc-800 px-1 py-0.5 text-[9px] text-zinc-500">
                                      {l}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}
                      {columns[key].length === 0 && (
                        <div className="text-center py-4 text-[10px] text-zinc-700">
                          No items
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {groups.length === 0 && (
        <div className="flex items-center justify-center h-64 text-zinc-600 text-sm">
          No beads to display
        </div>
      )}
    </div>
  );
}
