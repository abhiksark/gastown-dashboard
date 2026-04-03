import { useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { CostEntry, CostSummary } from "@/lib/types";
import { DollarSign, TrendingUp, Cpu, Server } from "lucide-react";
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
} from "recharts";

const COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
  "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1",
];

function fmt(usd: number): string {
  return `$${usd.toFixed(2)}`;
}

export function CostsPage() {
  const { data: live } = useFetch<CostSummary>("/costs", 10000);
  const { data: byRig } = useFetch<CostSummary>("/costs/by-rig", 10000);
  const { data: byAgent } = useFetch<CostSummary>("/costs/by-agent", 10000);
  const { data: today } = useFetch<CostSummary>("/costs/today", 30000);
  const { data: week } = useFetch<CostSummary>("/costs/week", 30000);

  const sessions: CostEntry[] = live?.sessions || [];

  // Per-session table sorted by cost descending
  const sortedSessions = useMemo(
    () => [...sessions].sort((a, b) => b.cost_usd - a.cost_usd),
    [sessions]
  );

  const totalLive = useMemo(
    () => sessions.reduce((s, e) => s + e.cost_usd, 0),
    [sessions]
  );

  const runningCount = sessions.filter((s) => s.running).length;

  // By-rig chart data
  const rigChartData = useMemo(() => {
    if (!byRig?.by_rig) return [];
    return Object.entries(byRig.by_rig)
      .map(([name, cost]) => ({ name, cost }))
      .sort((a, b) => b.cost - a.cost);
  }, [byRig]);

  // By-role pie data
  const roleChartData = useMemo(() => {
    if (!byAgent?.by_role) return [];
    return Object.entries(byAgent.by_role)
      .map(([name, cost]) => ({ name, value: cost }))
      .sort((a, b) => b.value - a.value);
  }, [byAgent]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Costs</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Live Sessions</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
            {fmt(totalLive)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">{runningCount} running</p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">Today</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
            {today ? fmt(today.total_usd) : "\u2014"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Cpu className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">This Week</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
            {week ? fmt(week.total_usd) : "\u2014"}
          </p>
        </div>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
          <div className="flex items-center gap-2 mb-2">
            <Server className="h-4 w-4 text-zinc-400" />
            <span className="text-xs text-zinc-500">All Time</span>
          </div>
          <p className="text-2xl font-semibold text-zinc-100 tabular-nums">
            {byRig ? fmt(byRig.total_usd) : "\u2014"}
          </p>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-4">
        {/* By-rig bar chart */}
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">Cost by Rig</h3>
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
          <h3 className="text-sm font-semibold text-zinc-100 mb-4">Cost by Role</h3>
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
          <h3 className="text-sm font-semibold text-zinc-100">Sessions ({sessions.length})</h3>
        </div>
        {sortedSessions.length > 0 ? (
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
        ) : (
          <p className="px-5 py-8 text-xs text-zinc-600 text-center">No session cost data</p>
        )}
      </div>
    </div>
  );
}
