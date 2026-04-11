import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { Bead } from "@/lib/types";
import { ChevronDown, ChevronRight, CircleDot, Clock, User } from "lucide-react";

interface KanbanBoardProps {
  beads: Bead[];
  onSelectBead: (bead: Bead) => void;
  selectedId?: string;
  groupBy: "rig" | "assignee" | "priority";
}

const STATUS_COLUMNS = [
  { key: "open", label: "Open", color: "border-amber-500", dot: "bg-amber-500", bg: "bg-amber-500/5" },
  { key: "hooked", label: "In Progress", color: "border-blue-500", dot: "bg-blue-500", bg: "bg-blue-500/5" },
  { key: "closed", label: "Done", color: "border-emerald-500", dot: "bg-emerald-500", bg: "bg-emerald-500/5" },
];

const PRIORITY_STRIPE: Record<number, string> = {
  0: "bg-red-500",
  1: "bg-orange-400",
  2: "bg-amber-400",
  3: "bg-blue-400",
  4: "bg-zinc-500",
};

const PRIORITY_ICON: Record<number, { color: string; label: string }> = {
  0: { color: "text-red-400", label: "Urgent" },
  1: { color: "text-orange-400", label: "High" },
  2: { color: "text-amber-400", label: "Medium" },
  3: { color: "text-blue-400", label: "Low" },
  4: { color: "text-zinc-500", label: "Backlog" },
};

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const min = Math.floor(ms / 60000);
  if (min < 1) return "now";
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  const w = Math.floor(d / 7);
  return `${w}w`;
}

function getGroupKey(bead: Bead, groupBy: string): string {
  if (groupBy === "rig") {
    if (!bead.assignee) return "Unassigned";
    const parts = bead.assignee.split("/");
    return parts[0] || "Unassigned";
  }
  if (groupBy === "assignee") {
    if (!bead.assignee) return "Unassigned";
    return bead.assignee.split("/").pop() || bead.assignee;
  }
  if (groupBy === "priority") {
    return PRIORITY_ICON[bead.priority]?.label || `P${bead.priority}`;
  }
  return "all";
}

function getBeadStatus(bead: Bead): string {
  if (bead.status === "closed") return "closed";
  if (bead.status === "hooked") return "hooked";
  return "open";
}

export function KanbanBoard({ beads, onSelectBead, selectedId, groupBy }: KanbanBoardProps) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, Bead[]>();
    for (const bead of beads) {
      if (bead.ephemeral) continue;
      const key = getGroupKey(bead, groupBy);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(bead);
    }
    return Array.from(map.entries()).sort((a, b) => {
      if (a[0] === "Unassigned") return 1;
      if (b[0] === "Unassigned") return -1;
      return a[0].localeCompare(b[0]);
    });
  }, [beads, groupBy]);

  // Overall stats
  const totalStats = useMemo(() => {
    const open = beads.filter(b => !b.ephemeral && getBeadStatus(b) === "open").length;
    const hooked = beads.filter(b => !b.ephemeral && getBeadStatus(b) === "hooked").length;
    const closed = beads.filter(b => !b.ephemeral && getBeadStatus(b) === "closed").length;
    return { open, hooked, closed, total: open + hooked + closed };
  }, [beads]);

  function toggleCollapse(group: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }

  return (
    <div className="space-y-3" style={{ minHeight: "calc(100vh - 240px)" }}>
      {/* Pipeline summary */}
      <div className="flex items-center gap-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-4 py-2">
        <div className="flex items-center gap-6 text-xs">
          {STATUS_COLUMNS.map(({ key, label, dot }) => {
            const count = totalStats[key as keyof typeof totalStats] || 0;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className={cn("h-2 w-2 rounded-full", dot)} />
                <span className="text-zinc-400">{label}</span>
                <span className="text-zinc-200 font-semibold tabular-nums">{count}</span>
              </div>
            );
          })}
        </div>
        {/* Progress bar */}
        <div className="flex-1 h-1.5 rounded-full bg-zinc-800 overflow-hidden flex">
          {totalStats.total > 0 && (
            <>
              <div
                className="bg-amber-500 transition-all duration-500"
                style={{ width: `${(totalStats.open / totalStats.total) * 100}%` }}
              />
              <div
                className="bg-blue-500 transition-all duration-500"
                style={{ width: `${(totalStats.hooked / totalStats.total) * 100}%` }}
              />
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${(totalStats.closed / totalStats.total) * 100}%` }}
              />
            </>
          )}
        </div>
        <span className="text-[10px] text-zinc-600 tabular-nums">{totalStats.total} total</span>
      </div>

      {/* Swim lanes */}
      {groups.map(([groupName, groupBeads]) => {
        const isCollapsed = collapsed.has(groupName);
        const columns: Record<string, Bead[]> = { open: [], hooked: [], closed: [] };
        for (const b of groupBeads) columns[getBeadStatus(b)].push(b);
        for (const col of Object.values(columns)) col.sort((a, b) => a.priority - b.priority);

        return (
          <div key={groupName} className="rounded-lg border border-[var(--color-border)] overflow-hidden">
            {/* Lane header */}
            <button
              onClick={() => toggleCollapse(groupName)}
              className="flex items-center gap-2.5 w-full px-4 py-2 text-left bg-[var(--color-card)] hover:bg-[var(--color-card-hover)] transition-colors"
            >
              {isCollapsed ? (
                <ChevronRight className="h-3 w-3 text-zinc-600" />
              ) : (
                <ChevronDown className="h-3 w-3 text-zinc-600" />
              )}
              <span className="text-xs font-semibold text-zinc-200">{groupName}</span>
              <span className="text-[10px] text-zinc-600">{groupBeads.length}</span>

              {/* Mini progress dots */}
              <div className="ml-auto flex items-center gap-0.5">
                {groupBeads.slice(0, 20).map((b) => (
                  <span
                    key={b.id}
                    className={cn(
                      "h-1.5 w-1.5 rounded-full",
                      getBeadStatus(b) === "closed" ? "bg-emerald-500" :
                      getBeadStatus(b) === "hooked" ? "bg-blue-500" : "bg-amber-500"
                    )}
                  />
                ))}
                {groupBeads.length > 20 && (
                  <span className="text-[9px] text-zinc-700 ml-1">+{groupBeads.length - 20}</span>
                )}
              </div>
            </button>

            {/* Columns grid */}
            {!isCollapsed && (
              <div className="grid grid-cols-3 divide-x divide-[var(--color-border)] border-t border-[var(--color-border)]">
                {STATUS_COLUMNS.map(({ key, label, color, dot, bg }) => (
                  <div key={key} className="min-h-[100px]">
                    {/* Column header */}
                    <div className={cn("flex items-center justify-between px-3 py-1.5 border-b border-[var(--color-border)]", bg)}>
                      <div className="flex items-center gap-1.5">
                        <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                          {label}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-600 tabular-nums font-medium">
                        {columns[key].length}
                      </span>
                    </div>

                    {/* Cards */}
                    <div className="p-2 space-y-1.5">
                      {columns[key].map((bead) => (
                        <button
                          key={bead.id}
                          onClick={() => onSelectBead(bead)}
                          className={cn(
                            "group w-full text-left rounded-md border transition-all duration-150",
                            selectedId === bead.id
                              ? "border-[var(--color-accent)] bg-blue-500/5 shadow-[0_0_0_1px_rgba(59,130,246,0.3)]"
                              : "border-[var(--color-border)] bg-[var(--color-card)] hover:border-zinc-600 hover:shadow-sm"
                          )}
                        >
                          <div className="flex">
                            {/* Priority stripe */}
                            <div className={cn("w-1 rounded-l-md shrink-0", PRIORITY_STRIPE[bead.priority] || PRIORITY_STRIPE[4])} />

                            {/* Content */}
                            <div className="flex-1 min-w-0 px-2.5 py-2">
                              <p className="text-[13px] font-medium text-zinc-200 leading-snug line-clamp-2">
                                {bead.title}
                              </p>

                              <div className="flex items-center gap-1.5 mt-2">
                                {/* Priority */}
                                <span className={cn("text-[10px] font-semibold", PRIORITY_ICON[bead.priority]?.color || "text-zinc-500")}>
                                  P{bead.priority}
                                </span>

                                {/* ID */}
                                <span className="text-[10px] font-mono text-zinc-700">{bead.id}</span>

                                {/* Spacer */}
                                <span className="flex-1" />

                                {/* Assignee */}
                                {bead.assignee && (
                                  <span className="flex items-center gap-0.5 text-[10px] text-zinc-500 truncate max-w-[80px]" title={bead.assignee}>
                                    <User className="h-2.5 w-2.5 shrink-0" />
                                    {bead.assignee.split("/").pop()}
                                  </span>
                                )}

                                {/* Time */}
                                <span className="flex items-center gap-0.5 text-[10px] text-zinc-700 shrink-0" title={new Date(bead.updated_at).toLocaleString()}>
                                  <Clock className="h-2.5 w-2.5" />
                                  {timeAgo(bead.updated_at)}
                                </span>
                              </div>

                              {/* Labels */}
                              {bead.labels && bead.labels.length > 0 && (
                                <div className="flex gap-1 mt-1.5 flex-wrap">
                                  {bead.labels.slice(0, 3).map((l) => (
                                    <span key={l} className="rounded-sm bg-zinc-800/80 px-1.5 py-0.5 text-[9px] text-zinc-500 leading-none">
                                      {l}
                                    </span>
                                  ))}
                                  {bead.labels.length > 3 && (
                                    <span className="text-[9px] text-zinc-700">+{bead.labels.length - 3}</span>
                                  )}
                                </div>
                              )}

                              {/* Dependency indicator */}
                              {(bead.dependency_count > 0 || bead.dependent_count > 0) && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  {bead.dependency_count > 0 && (
                                    <span className="text-[9px] text-amber-500/70">
                                      {bead.dependency_count} dep{bead.dependency_count > 1 ? "s" : ""}
                                    </span>
                                  )}
                                  {bead.dependent_count > 0 && (
                                    <span className="text-[9px] text-cyan-500/70">
                                      {bead.dependent_count} blocker{bead.dependent_count > 1 ? "s" : ""}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </button>
                      ))}

                      {columns[key].length === 0 && (
                        <div className="flex items-center justify-center py-6 text-[10px] text-zinc-700">
                          <CircleDot className="h-3 w-3 mr-1 opacity-50" />
                          Empty
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
        <div className="flex flex-col items-center justify-center h-64 text-zinc-600 gap-2">
          <CircleDot className="h-8 w-8 text-zinc-800" />
          <span className="text-sm">No beads to display</span>
        </div>
      )}
    </div>
  );
}
