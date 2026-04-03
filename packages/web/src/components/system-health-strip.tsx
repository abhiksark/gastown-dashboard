import type { Overview } from "@/lib/types";
import type { Escalation } from "@/lib/types";

type HealthLevel = "healthy" | "degraded" | "critical";

interface SystemHealthStripProps {
  data: Overview;
  escalations: Escalation[];
}

const config: Record<HealthLevel, { border: string; bg: string; dot: string; text: string }> = {
  healthy: {
    border: "border-emerald-500/30",
    bg: "bg-emerald-500/5",
    dot: "bg-emerald-500",
    text: "text-emerald-400",
  },
  degraded: {
    border: "border-amber-500/30",
    bg: "bg-amber-500/5",
    dot: "bg-amber-500",
    text: "text-amber-400",
  },
  critical: {
    border: "border-red-500/30",
    bg: "bg-red-500/5",
    dot: "bg-red-500",
    text: "text-red-400",
  },
};

function determineHealth(data: Overview, escalations: Escalation[]): { level: HealthLevel; issues: string[] } {
  const issues: string[] = [];

  // Critical: open critical/high escalations
  const criticalEscalations = escalations.filter(
    (e) => e.status === "open" && (e.severity === "critical" || e.severity === "high")
  );
  if (criticalEscalations.length > 0) {
    issues.push(`${criticalEscalations.length} critical escalation${criticalEscalations.length !== 1 ? "s" : ""}`);
  }

  // Degraded: non-operational rigs
  const degradedRigs = data.rigs.items.filter((r) => r.status !== "operational");
  if (degradedRigs.length > 0) {
    issues.push(`${degradedRigs.length} rig${degradedRigs.length !== 1 ? "s" : ""} degraded`);
  }

  // Degraded: scheduler paused
  if (data.scheduler.paused) {
    issues.push("scheduler paused");
  }

  // Degraded: open medium/low escalations
  const openEscalations = escalations.filter(
    (e) => e.status === "open" && e.severity !== "critical" && e.severity !== "high"
  );
  if (openEscalations.length > 0) {
    issues.push(`${openEscalations.length} open escalation${openEscalations.length !== 1 ? "s" : ""}`);
  }

  const level: HealthLevel =
    criticalEscalations.length > 0 ? "critical" :
    issues.length > 0 ? "degraded" : "healthy";

  return { level, issues };
}

export function SystemHealthStrip({ data, escalations }: SystemHealthStripProps) {
  const { level, issues } = determineHealth(data, escalations);
  const c = config[level];

  const totalWorkers = data.rigs.items.reduce((sum, r) => sum + r.polecats + r.crew, 0);

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} px-5 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot} shrink-0`} />
        <div>
          <span className={`text-sm font-medium ${c.text}`}>
            {level === "healthy" ? "All systems operational" :
             level === "degraded" ? "Attention needed" :
             "Critical alert"}
          </span>
          {issues.length > 0 && (
            <span className="text-xs text-zinc-500 ml-2">
              — {issues.join(", ")}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 text-xs text-zinc-500">
        <span>{data.rigs.total} rig{data.rigs.total !== 1 ? "s" : ""}</span>
        <span className="text-zinc-700">|</span>
        <span>{data.agents.total} agent{data.agents.total !== 1 ? "s" : ""}</span>
        <span className="text-zinc-700">|</span>
        <span>{totalWorkers} worker{totalWorkers !== 1 ? "s" : ""}</span>
      </div>
    </div>
  );
}
