import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Bead } from "@/lib/types";
import { Filter, ZoomIn, ZoomOut } from "lucide-react";

interface BeadFlowGraphProps {
  beads: Bead[];
  onSelectBead: (bead: Bead) => void;
  selectedId?: string;
}

const STATUS_COLORS: Record<string, { bg: string; border: string; ring: string }> = {
  open: { bg: "bg-amber-500", border: "border-amber-500/50", ring: "ring-amber-500/30" },
  hooked: { bg: "bg-blue-500", border: "border-blue-500/50", ring: "ring-blue-500/30" },
  in_progress: { bg: "bg-violet-500", border: "border-violet-500/50", ring: "ring-violet-500/30" },
  closed: { bg: "bg-emerald-500", border: "border-emerald-500/50", ring: "ring-emerald-500/30" },
  blocked: { bg: "bg-red-500", border: "border-red-500/50", ring: "ring-red-500/30" },
};

function getColor(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.closed;
}

function timeAgo(ts: string): string {
  const ms = Date.now() - new Date(ts).getTime();
  const d = Math.floor(ms / 86400000);
  if (d === 0) return "today";
  if (d === 1) return "yesterday";
  if (d < 7) return `${d}d ago`;
  return `${Math.floor(d / 7)}w ago`;
}

type ViewFilter = "all" | "recent" | "active" | "by-worker";

export function BeadFlowGraph({ beads, onSelectBead, selectedId }: BeadFlowGraphProps) {
  const [filter, setFilter] = useState<ViewFilter>("recent");
  const [scale, setScale] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Filter and limit beads
  const displayBeads = useMemo(() => {
    const nonEph = beads.filter(b => !b.ephemeral);

    switch (filter) {
      case "recent":
        // Last 30 beads by updated_at
        return [...nonEph]
          .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
          .slice(0, 30);
      case "active":
        // Only open + hooked
        return nonEph.filter(b => b.status !== "closed");
      case "by-worker":
        // Group by assignee, show top 5 per worker
        const byWorker = new Map<string, Bead[]>();
        for (const b of nonEph) {
          const key = b.assignee?.split("/").pop() || "unassigned";
          if (!byWorker.has(key)) byWorker.set(key, []);
          byWorker.get(key)!.push(b);
        }
        const result: Bead[] = [];
        for (const [, workerBeads] of byWorker) {
          result.push(...workerBeads.slice(0, 8));
        }
        return result;
      default:
        return nonEph.slice(0, 50);
    }
  }, [beads, filter]);

  // Group by date for timeline
  const timeline = useMemo(() => {
    const groups = new Map<string, Bead[]>();
    for (const b of displayBeads) {
      const day = b.created_at.slice(0, 10);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day)!.push(b);
    }
    return Array.from(groups.entries())
      .sort((a, b) => b[0].localeCompare(a[0])); // newest first
  }, [displayBeads]);

  // Group by worker for the worker view
  const workerGroups = useMemo(() => {
    if (filter !== "by-worker") return [];
    const map = new Map<string, Bead[]>();
    for (const b of displayBeads) {
      const key = b.assignee?.split("/").pop() || "unassigned";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return Array.from(map.entries())
      .sort((a, b) => b[1].length - a[1].length);
  }, [displayBeads, filter]);

  const filters: { key: ViewFilter; label: string; count: number }[] = [
    { key: "recent", label: "Recent 30", count: Math.min(30, beads.filter(b => !b.ephemeral).length) },
    { key: "active", label: "Active", count: beads.filter(b => !b.ephemeral && b.status !== "closed").length },
    { key: "by-worker", label: "By Worker", count: new Set(beads.filter(b => !b.ephemeral && b.assignee).map(b => b.assignee)).size },
    { key: "all", label: "All", count: beads.filter(b => !b.ephemeral).length },
  ];

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <Filter className="h-3 w-3 text-zinc-600 mr-1" />
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                filter === f.key
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              {f.label} <span className="text-zinc-600 ml-0.5">{f.count}</span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
            className="rounded p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10px] text-zinc-600 w-8 text-center">{Math.round(scale * 100)}%</span>
          <button
            onClick={() => setScale(s => Math.min(2, s + 0.1))}
            className="rounded p-1 text-zinc-600 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Graph area */}
      <div
        className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] overflow-auto"
        style={{ maxHeight: "calc(100vh - 280px)" }}
      >
        <div style={{ transform: `scale(${scale})`, transformOrigin: "top left", minWidth: "100%" }}>
          {filter === "by-worker" ? (
            /* Worker swim lanes */
            <div className="p-4 space-y-4">
              {workerGroups.map(([worker, workerBeads]) => (
                <div key={worker}>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-5 w-5 rounded-full bg-zinc-800 flex items-center justify-center text-[9px] font-semibold text-zinc-400">
                      {worker[0]?.toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-zinc-300">{worker}</span>
                    <span className="text-[10px] text-zinc-600">{workerBeads.length} beads</span>
                    <div className="flex-1 h-px bg-zinc-800" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap pl-7">
                    {workerBeads.map(bead => (
                      <BeadNode
                        key={bead.id}
                        bead={bead}
                        isSelected={selectedId === bead.id}
                        isHovered={hoveredId === bead.id}
                        onSelect={() => onSelectBead(bead)}
                        onHover={() => setHoveredId(bead.id)}
                        onLeave={() => setHoveredId(null)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Timeline view */
            <div className="p-4 space-y-3">
              {timeline.map(([date, dayBeads]) => (
                <div key={date}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-medium text-zinc-500 w-20 shrink-0">
                      {new Date(date + "T12:00:00").toLocaleDateString([], { month: "short", day: "numeric", weekday: "short" })}
                    </span>
                    <span className="text-[10px] text-zinc-700">{dayBeads.length}</span>
                    <div className="flex-1 h-px bg-zinc-800/50" />
                  </div>
                  <div className="flex gap-1.5 flex-wrap pl-[88px]">
                    {dayBeads.map(bead => (
                      <BeadNode
                        key={bead.id}
                        bead={bead}
                        isSelected={selectedId === bead.id}
                        isHovered={hoveredId === bead.id}
                        onSelect={() => onSelectBead(bead)}
                        onHover={() => setHoveredId(bead.id)}
                        onLeave={() => setHoveredId(null)}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px]">
        {Object.entries(STATUS_COLORS).map(([status, { bg }]) => (
          <div key={status} className="flex items-center gap-1">
            <span className={cn("h-2 w-2 rounded-full", bg)} />
            <span className="text-zinc-500">{status}</span>
          </div>
        ))}
        <span className="text-zinc-700 ml-2">|</span>
        <span className="text-zinc-600">size = priority (larger = higher)</span>
      </div>
    </div>
  );
}

function BeadNode({
  bead,
  isSelected,
  isHovered,
  onSelect,
  onHover,
  onLeave,
}: {
  bead: Bead;
  isSelected: boolean;
  isHovered: boolean;
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
}) {
  const color = getColor(bead.status);
  // Size based on priority: P0=40px, P1=36px, P2=32px, P3=28px, P4=24px
  const size = 40 - bead.priority * 4;

  return (
    <div className="relative">
      <button
        onClick={onSelect}
        onMouseEnter={onHover}
        onMouseLeave={onLeave}
        className={cn(
          "rounded-md transition-all duration-150 flex items-center justify-center",
          color.border,
          isSelected ? `ring-2 ${color.ring} border-2` : "border",
          isHovered ? "scale-110 z-10" : ""
        )}
        style={{ width: size, height: size }}
        title={`${bead.id}: ${bead.title}`}
      >
        <span className={cn("rounded-sm", color.bg)} style={{ width: size - 8, height: size - 8, opacity: 0.8 }} />
      </button>

      {/* Hover card */}
      {isHovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <div className="rounded-md bg-zinc-900/95 border border-zinc-700 px-3 py-2 shadow-lg backdrop-blur-sm whitespace-nowrap max-w-xs">
            <p className="font-mono text-[10px] text-zinc-500">{bead.id}</p>
            <p className="text-xs text-zinc-200 mt-0.5 leading-snug" style={{ whiteSpace: "normal" }}>
              {bead.title.length > 60 ? bead.title.slice(0, 58) + "..." : bead.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", color.bg)} />
              <span className="text-[10px] text-zinc-400">{bead.status}</span>
              <span className="text-[10px] text-zinc-600">P{bead.priority}</span>
              {bead.assignee && (
                <span className="text-[10px] text-zinc-500">{bead.assignee.split("/").pop()}</span>
              )}
              <span className="text-[10px] text-zinc-700">{timeAgo(bead.updated_at)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
