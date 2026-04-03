import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import type { TimelineConvoy, TimelineBead } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";

const STATUS_COLORS: Record<string, string> = {
  open: "#3b82f6",
  in_progress: "#3b82f6",
  hooked: "#8b5cf6",
  blocked: "#ef4444",
  closed: "#22c55e",
  deferred: "#71717a",
};

function statusColor(status: string): string {
  return STATUS_COLORS[status] || "#71717a";
}

function formatTime(d: Date): string {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function ConvoyTimeline() {
  const { data, loading, error } = useFetch<TimelineConvoy[]>("/convoys/timeline", 15000);
  const [hoveredBead, setHoveredBead] = useState<TimelineBead | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const { minTime, maxTime, lanes } = useMemo(() => {
    if (!data || data.length === 0) return { minTime: 0, maxTime: 1, lanes: [] };

    let min = Infinity;
    let max = -Infinity;

    const lanes = data.map((convoy) => {
      const beads = (convoy.beads || []).map((b) => {
        const start = new Date(b.created_at).getTime();
        const end = new Date(b.updated_at).getTime();
        if (start < min) min = start;
        if (end > max) max = end;
        if (start > max) max = start;
        return { ...b, start, end: Math.max(end, start + 60000) };
      });
      return { convoy, beads };
    });

    // Add some padding
    const range = max - min || 3600000;
    min -= range * 0.02;
    max += range * 0.02;

    return { minTime: min, maxTime: max, lanes };
  }, [data]);

  if (error) return <div className="text-red-400 text-sm">Failed to load timeline: {error}</div>;
  if (loading) return <div className="h-48 rounded-lg skeleton" />;
  if (!data || data.length === 0) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-8 text-center">
        <p className="text-zinc-500 text-sm">No convoy data for timeline</p>
      </div>
    );
  }

  const totalRange = maxTime - minTime;
  const laneHeight = 36;
  const headerHeight = 28;
  const labelWidth = 160;
  const chartWidth = 800;
  const totalHeight = headerHeight + lanes.length * laneHeight + 8;

  // Time axis ticks (4-8 ticks)
  const tickCount = 6;
  const ticks: number[] = [];
  for (let i = 0; i <= tickCount; i++) {
    ticks.push(minTime + (totalRange * i) / tickCount);
  }

  function toX(time: number): number {
    return ((time - minTime) / totalRange) * chartWidth;
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-x-auto relative">
      <svg
        width={labelWidth + chartWidth + 16}
        height={totalHeight}
        className="block"
      >
        {/* Time axis */}
        {ticks.map((t, i) => (
          <g key={i}>
            <line
              x1={labelWidth + toX(t)}
              y1={headerHeight}
              x2={labelWidth + toX(t)}
              y2={totalHeight}
              stroke="var(--color-border)"
              strokeDasharray="2,4"
            />
            <text
              x={labelWidth + toX(t)}
              y={headerHeight - 6}
              className="fill-zinc-500 text-[10px]"
              textAnchor="middle"
            >
              {formatTime(new Date(t))}
            </text>
          </g>
        ))}

        {/* Swim lanes */}
        {lanes.map(({ convoy, beads }, laneIdx) => {
          const y = headerHeight + laneIdx * laneHeight;
          return (
            <g key={convoy.id}>
              {/* Lane background (alternating) */}
              {laneIdx % 2 === 1 && (
                <rect
                  x={0}
                  y={y}
                  width={labelWidth + chartWidth + 16}
                  height={laneHeight}
                  fill="var(--color-card-hover)"
                  opacity={0.3}
                />
              )}

              {/* Convoy label */}
              <text
                x={8}
                y={y + laneHeight / 2 + 4}
                className="fill-zinc-300 text-[11px] font-medium"
              >
                {convoy.title.length > 18 ? convoy.title.slice(0, 18) + "..." : convoy.title}
              </text>

              {/* Bead bars */}
              {beads.map((bead) => {
                const barX = labelWidth + toX(bead.start);
                const barW = Math.max(toX(bead.end) - toX(bead.start), 4);
                return (
                  <rect
                    key={bead.id}
                    x={barX}
                    y={y + 6}
                    width={barW}
                    height={laneHeight - 12}
                    rx={4}
                    fill={statusColor(bead.status)}
                    opacity={0.85}
                    className="cursor-pointer transition-opacity hover:opacity-100"
                    onMouseEnter={(e) => {
                      setHoveredBead(bead);
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseMove={(e) => {
                      setTooltipPos({ x: e.clientX, y: e.clientY });
                    }}
                    onMouseLeave={() => setHoveredBead(null)}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {hoveredBead && (
        <div
          className="fixed z-50 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 shadow-lg pointer-events-none"
          style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 40 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono text-zinc-500">{hoveredBead.id}</span>
            <StatusBadge status={hoveredBead.status} />
          </div>
          <p className="text-xs text-zinc-200 mb-1">{hoveredBead.title}</p>
          {hoveredBead.assignee && (
            <p className="text-[10px] text-zinc-500">Assignee: {hoveredBead.assignee}</p>
          )}
          <p className="text-[10px] text-zinc-600">
            {formatTime(new Date(hoveredBead.created_at))} — {formatTime(new Date(hoveredBead.updated_at))}
          </p>
        </div>
      )}
    </div>
  );
}
