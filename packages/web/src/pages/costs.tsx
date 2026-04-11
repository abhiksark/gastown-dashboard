import { useMemo, useState } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { CostEntry, CostSummary } from "@/lib/types";
import { DollarSign, TrendingUp, Cpu, Calendar } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import { cn } from "@/lib/utils";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function fmt(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

interface HistoryData {
  total_usd: number;
  by_role: Record<string, number>;
  by_rig: Record<string, number>;
  by_day: Record<string, number>;
  days: number;
  records: number;
}

interface DailyData {
  daily: { date: string; cost: number }[];
  total_usd: number;
}

export function CostsPage() {
  const [dayFilter, setDayFilter] = useState(7);
  const { data: live } = useFetch<CostSummary>("/costs", 10000);
  const { data: today } = useFetch<HistoryData>("/costs/today", 30000);
  const { data: history } = useFetch<HistoryData>(`/costs/history?days=${dayFilter}`, 30000);
  const { data: daily } = useFetch<DailyData>(`/costs/daily?days=${dayFilter}`, 30000);

  const sessions: CostEntry[] = live?.sessions || [];
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.cost_usd - a.cost_usd),
    [sessions]
  );
  const totalLive = useMemo(
    () => sessions.reduce((s, e) => s + e.cost_usd, 0),
    [sessions]
  );
  const runningCount = sessions.filter((s) => s.running).length;

  // By-rig chart data from history
  const rigChartData = useMemo(() => {
    if (!history?.by_rig) return [];
    return Object.entries(history.by_rig)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [history]);

  // By-role pie data from history
  const roleChartData = useMemo(() => {
    if (!history?.by_role) return [];
    return Object.entries(history.by_role)
      .map(([name, cost]) => ({ name, value: cost }))
      .sort((a, b) => b.value - a.value);
  }, [history]);

  const dayOptions = [1, 3, 7, 14, 30];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Costs</h2>
        {/* Day filter */}
        <div className="flex gap-1">
          {dayOptions.map((d) => (
            <button
              key={d}
              onClick={() => setDayFilter(d)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                dayFilter === d
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              {d === 1 ? "Today" : `${d}d`}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Live Sessions</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">{fmt(totalLive)}</p>
          <p className="text-xs text-zinc-500 mt-1">{runningCount} running</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Today</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">{today ? fmt(today.total_usd) : "\u2014"}</p>
          <p className="text-xs text-zinc-500 mt-1">{today ? `${today.records} sessions` : ""}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Last {dayFilter === 1 ? "day" : `${dayFilter} days`}</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">{history ? fmt(history.total_usd) : "\u2014"}</p>
          <p className="text-xs text-zinc-500 mt-1">{history ? `${history.records} sessions` : ""}</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Top Spender</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
            {fmt(sessions.find(s => s.role === "mayor")?.cost_usd ?? 0)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">mayor (live)</p>
        </div>
      </div>

      {/* Daily cost trend chart */}
      {daily && daily.daily.length > 1 && (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">Daily Spend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={daily.daily} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
              <XAxis
                dataKey="date"
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickFormatter={(d) => {
                  const date = new Date(d + "T00:00:00");
                  return date.toLocaleDateString([], { month: "short", day: "numeric" });
                }}
              />
              <YAxis
                tick={{ fill: "#71717a", fontSize: 10 }}
                tickFormatter={(v) => `$${v.toFixed(0)}`}
                width={60}
              />
              <Tooltip
                contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                labelStyle={{ color: "#e4e4e7" }}
                formatter={(v: number) => [fmt(v), "Cost"]}
                labelFormatter={(d) => {
                  const date = new Date(d + "T00:00:00");
                  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
                }}
              />
              <Area type="monotone" dataKey="cost" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* By-rig bar chart */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">Cost by Rig ({dayFilter === 1 ? "today" : `${dayFilter}d`})</h3>
          {rigChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={rigChartData} layout="vertical" margin={{ left: 10, right: 20, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis type="number" tickFormatter={(v) => `$${v.toFixed(0)}`} tick={{ fill: "#71717a", fontSize: 11 }} />
                <YAxis type="category" dataKey="name" tick={{ fill: "#a1a1aa", fontSize: 11 }} width={120} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                  labelStyle={{ color: "#e4e4e7" }}
                  formatter={(v: number) => [fmt(v), "Cost"]}
                />
                <Bar dataKey="cost" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-xs text-zinc-600">No data</div>
          )}
        </div>

        {/* By-role pie chart */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">Cost by Role ({dayFilter === 1 ? "today" : `${dayFilter}d`})</h3>
          {roleChartData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="60%" height={250}>
                <PieChart>
                  <Pie
                    data={roleChartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {roleChartData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: 8 }}
                    formatter={(v: number) => [fmt(v), "Cost"]}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {roleChartData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-xs text-zinc-300">{d.name}</span>
                    <span className="text-xs text-zinc-500 ml-auto tabular-nums">{fmt(d.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-[250px] flex items-center justify-center text-xs text-zinc-600">No data</div>
          )}
        </div>
      </div>

      {/* Per-session table */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--color-border)]">
          <h3 className="text-sm font-semibold text-zinc-100">Live Sessions ({sessions.length})</h3>
        </div>
        {sortedSessions.length > 0 ? (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Session</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Role</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Rig</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Worker</th>
                <th className="text-right font-medium text-zinc-400 px-4 py-2 text-xs">Cost</th>
                <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Status</th>
              </tr>
            </thead>
            <tbody>
              {sortedSessions.map((s) => (
                <tr key={s.session} className="border-b border-[var(--color-border)] hover:bg-[var(--color-card-hover)] transition-colors">
                  <td className="px-4 py-2 font-mono text-xs text-zinc-300">{s.session}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{s.role}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{s.rig}</td>
                  <td className="px-4 py-2 text-xs text-zinc-400">{s.worker || "\u2014"}</td>
                  <td className="px-4 py-2 text-xs text-zinc-200 text-right tabular-nums font-medium">{fmt(s.cost_usd)}</td>
                  <td className="px-4 py-2">
                    <StatusBadge status={s.running ? "running" : "stopped"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        ) : (
          <p className="px-5 py-8 text-xs text-zinc-600 text-center">No session cost data</p>
        )}
      </div>
    </div>
  );
}
