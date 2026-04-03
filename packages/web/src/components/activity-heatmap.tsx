import { useRealtime } from "@/hooks/use-realtime";
import type { HeatmapDay } from "@/lib/types";

const ROWS = 7; // days of week (Mon–Sun)
const DAY_LABELS = ["Mon", "", "Wed", "", "Fri", "", "Sun"];

function intensityClass(count: number, max: number): string {
  if (count === 0) return "bg-zinc-800";
  const ratio = count / max;
  if (ratio <= 0.25) return "bg-emerald-900";
  if (ratio <= 0.5) return "bg-emerald-700";
  if (ratio <= 0.75) return "bg-emerald-500";
  return "bg-emerald-400";
}

export function ActivityHeatmap() {
  const { data, loading, error } = useRealtime<HeatmapDay[]>("/anomalies/heatmap?weeks=12", 60000);

  if (error) {
    return <div className="text-xs text-red-400">Failed to load heatmap</div>;
  }

  if (loading || !data) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="h-24 skeleton rounded" />
      </div>
    );
  }

  const max = Math.max(1, ...data.map((d) => d.count));
  const weeks = Math.ceil(data.length / ROWS);

  // Organize data into a grid: columns = weeks, rows = day of week (0=Mon, 6=Sun)
  const grid: (HeatmapDay | null)[][] = Array.from({ length: ROWS }, () =>
    Array.from({ length: weeks }, () => null)
  );

  for (const day of data) {
    const d = new Date(day.date + "T12:00:00"); // noon to avoid TZ issues
    const dayOfWeek = (d.getDay() + 6) % 7; // 0=Mon, 6=Sun
    // Find which week column this belongs to
    const firstDate = new Date(data[0].date + "T12:00:00");
    const daysSinceStart = Math.round((d.getTime() - firstDate.getTime()) / (24 * 60 * 60 * 1000));
    const weekCol = Math.floor(daysSinceStart / 7);
    if (weekCol >= 0 && weekCol < weeks && dayOfWeek >= 0 && dayOfWeek < ROWS) {
      grid[dayOfWeek][weekCol] = day;
    }
  }

  // Month labels
  const monthLabels: { col: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weeks; w++) {
    // Find first non-null day in this week column
    for (let r = 0; r < ROWS; r++) {
      const cell = grid[r][w];
      if (cell) {
        const month = new Date(cell.date + "T12:00:00").getMonth();
        if (month !== lastMonth) {
          monthLabels.push({
            col: w,
            label: new Date(cell.date + "T12:00:00").toLocaleString("en", { month: "short" }),
          });
          lastMonth = month;
        }
        break;
      }
    }
  }

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-medium text-zinc-200">Activity</h3>
      </div>
      <div className="p-4 overflow-x-auto">
        {/* Month labels */}
        <div className="flex ml-8 mb-1" style={{ gap: 0 }}>
          {monthLabels.map((m, i) => {
            const nextCol = i + 1 < monthLabels.length ? monthLabels[i + 1].col : weeks;
            const span = nextCol - m.col;
            return (
              <span
                key={`${m.label}-${m.col}`}
                className="text-[10px] text-zinc-500"
                style={{ width: `${span * 14}px`, flexShrink: 0 }}
              >
                {m.label}
              </span>
            );
          })}
        </div>
        {/* Grid */}
        <div className="flex gap-0">
          {/* Day labels */}
          <div className="flex flex-col shrink-0" style={{ gap: "2px", width: "28px" }}>
            {DAY_LABELS.map((label, i) => (
              <div key={i} className="text-[10px] text-zinc-500 h-[12px] leading-[12px]">
                {label}
              </div>
            ))}
          </div>
          {/* Cells */}
          <div className="flex" style={{ gap: "2px" }}>
            {Array.from({ length: weeks }, (_, w) => (
              <div key={w} className="flex flex-col" style={{ gap: "2px" }}>
                {Array.from({ length: ROWS }, (_, r) => {
                  const cell = grid[r][w];
                  return (
                    <div
                      key={r}
                      className={`w-[12px] h-[12px] rounded-[2px] ${cell ? intensityClass(cell.count, max) : "bg-zinc-800/30"}`}
                      title={cell ? `${cell.date}: ${cell.count} events` : ""}
                    />
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-1.5 mt-3 ml-8">
          <span className="text-[10px] text-zinc-500">Less</span>
          <div className="w-[12px] h-[12px] rounded-[2px] bg-zinc-800" />
          <div className="w-[12px] h-[12px] rounded-[2px] bg-emerald-900" />
          <div className="w-[12px] h-[12px] rounded-[2px] bg-emerald-700" />
          <div className="w-[12px] h-[12px] rounded-[2px] bg-emerald-500" />
          <div className="w-[12px] h-[12px] rounded-[2px] bg-emerald-400" />
          <span className="text-[10px] text-zinc-500">More</span>
        </div>
      </div>
    </div>
  );
}
