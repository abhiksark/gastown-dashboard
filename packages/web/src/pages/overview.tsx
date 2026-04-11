import { Link } from "react-router";
import { useRealtime } from "@/hooks/use-realtime";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { StatCard } from "@/components/stat-card";
import { SystemHealthStrip } from "@/components/system-health-strip";
import { LiveFeed } from "@/components/live-feed";
import { ActivityHeatmap } from "@/components/activity-heatmap";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Overview as OverviewData, Escalation, Anomaly, CostSummary } from "@/lib/types";
import { AlertTriangle, Bug, Zap, Ghost, Server, Users, CircleDot, CheckCircle, DollarSign } from "lucide-react";
import { useState } from "react";

export function OverviewPage() {
  const { data, loading, error } = useRealtime<OverviewData>("/overview", 5000);
  const { data: escalations } = useRealtime<Escalation[]>("/escalations", 10000);
  const { data: anomalies } = useRealtime<Anomaly[]>("/anomalies", 30000);
  const { data: todayCosts } = useFetch<CostSummary>("/costs/today", 30000);
  const { addToast } = useToast();
  const [acting, setActing] = useState<string | null>(null);

  const anomalyIcon = (type: Anomaly["type"]) => {
    switch (type) {
      case "stuck_agent": return Zap;
      case "high_error_rate": return Bug;
      case "zombie_session": return Ghost;
      case "overloaded_rig": return Server;
    }
  };

  const anomalySeverityColor = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "critical": return "border-red-500/20 bg-red-500/5";
      case "high": return "border-orange-500/20 bg-orange-500/5";
      case "medium": return "border-amber-500/20 bg-amber-500/5";
    }
  };

  const anomalyIconColor = (severity: Anomaly["severity"]) => {
    switch (severity) {
      case "critical": return "text-red-400";
      case "high": return "text-orange-400";
      case "medium": return "text-amber-400";
    }
  };

  const openEscalations = (escalations || []).filter((e) => e.status === "open");

  async function handleAck(id: string) {
    setActing(id);
    try {
      await apiPost(`/escalations/${id}/ack`);
      addToast("Escalation acknowledged", "success");
    } catch {
      addToast("Failed to acknowledge", "error");
    } finally {
      setActing(null);
    }
  }

  async function handleClose(id: string) {
    setActing(id);
    try {
      await apiPost(`/escalations/${id}/close`, { reason: "Resolved from dashboard" });
      addToast("Escalation resolved", "success");
    } catch {
      addToast("Failed to resolve", "error");
    } finally {
      setActing(null);
    }
  }

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load overview: {error}</div>;
  }

  if (loading || !data) {
    return (
      <div className="space-y-4">
        <div className="h-12 rounded-lg skeleton" />
        <div className="h-8 rounded-lg skeleton" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 rounded-lg skeleton" />
          <div className="h-72 rounded-lg skeleton" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. System Health Strip */}
      <SystemHealthStrip data={data} escalations={escalations || []} />

      {/* 2. Open Escalation Alerts (conditional, max 3) */}
      {openEscalations.length > 0 && (
        <div className="space-y-2">
          {openEscalations.slice(0, 3).map((esc) => (
            <div
              key={esc.id}
              className="flex items-center justify-between rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <AlertTriangle
                  className={`h-3.5 w-3.5 shrink-0 ${
                    esc.severity === "critical" ? "text-red-400" :
                    esc.severity === "high" ? "text-orange-400" :
                    "text-amber-400"
                  }`}
                />
                <span className="text-xs text-zinc-200 truncate">{esc.description}</span>
                <StatusBadge status={esc.severity} />
              </div>
              <div className="flex gap-2 shrink-0 ml-3">
                <button
                  onClick={() => handleAck(esc.id)}
                  disabled={acting === esc.id}
                  className="rounded-md border border-[var(--color-border)] px-2.5 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors active:scale-[0.98] disabled:opacity-50"
                >
                  Ack
                </button>
                <button
                  onClick={() => handleClose(esc.id)}
                  disabled={acting === esc.id}
                  className="rounded-md border border-emerald-500/20 px-2.5 py-1 text-xs text-emerald-400 hover:bg-emerald-500/10 transition-colors active:scale-[0.98] disabled:opacity-50"
                >
                  Resolve
                </button>
              </div>
            </div>
          ))}
          {openEscalations.length > 3 && (
            <Link to="/escalations" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              +{openEscalations.length - 3} more escalation{openEscalations.length - 3 !== 1 ? "s" : ""} →
            </Link>
          )}
        </div>
      )}

      {/* 3. Anomaly Alerts */}
      {anomalies && anomalies.length > 0 && (
        <div className="space-y-2">
          {anomalies.slice(0, 3).map((a) => {
            const Icon = anomalyIcon(a.type);
            return (
              <div
                key={a.id}
                className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${anomalySeverityColor(a.severity)}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className={`h-3.5 w-3.5 shrink-0 ${anomalyIconColor(a.severity)}`} />
                  <span className="text-xs text-zinc-200 truncate">{a.description}</span>
                  <StatusBadge status={a.severity} />
                </div>
                <span className="text-[10px] text-zinc-500 shrink-0 ml-3">{a.suggested_action}</span>
              </div>
            );
          })}
          {anomalies.length > 3 && (
            <Link to="/feed" className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors">
              +{anomalies.length - 3} more anomal{anomalies.length - 3 !== 1 ? "ies" : "y"} →
            </Link>
          )}
        </div>
      )}

      {/* 4. Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <StatCard label="Rigs" value={data.rigs.total} icon={Server} />
        <StatCard label="Agents" value={data.agents.total} icon={Users} />
        <StatCard label="Hooked" value={data.beads.hooked} icon={CircleDot} trend={data.beads.hooked > 0 ? "up" : "neutral"} />
        <StatCard label="Closed" value={data.beads.closed} icon={CheckCircle} trend="up" />
        <StatCard
          label="Today's Cost"
          value={todayCosts ? `$${todayCosts.total_usd.toFixed(2)}` : "\u2014"}
          icon={DollarSign}
        />
      </div>

      {/* 5. Activity Heatmap */}
      <ActivityHeatmap />

      {/* 6. Two-column: LiveFeed | Rig Health */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <LiveFeed />
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-zinc-200">Rig Health</h3>
          </div>
          <div className="p-3 space-y-1.5">
            {data.rigs.items.map((rig) => (
              <Link
                key={rig.name}
                to={`/rigs/${rig.name}`}
                className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-[var(--color-card-hover)] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      rig.status === "operational" ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                  />
                  <span className="text-sm text-zinc-200">{rig.name}</span>
                  <span className={`text-xs font-medium ${rig.polecats > 0 ? "text-blue-400" : "text-zinc-600"}`}>
                    {rig.polecats} {rig.polecats === 1 ? "polecat" : "polecats"}
                  </span>
                  <span className="text-xs text-zinc-600">{rig.crew}c</span>
                </div>
                <div className="flex gap-1.5">
                  <StatusBadge status={rig.witness} />
                  <StatusBadge status={rig.refinery} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
