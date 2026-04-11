import { Link } from "react-router";
import type { Overview } from "@/lib/types";
import type { Escalation } from "@/lib/types";

type HealthLevel = "healthy" | "degraded" | "critical";

interface SystemHealthStripProps {
  data: Overview;
  escalations: Escalation[];
}

interface HealthIssue {
  text: string;
  link: string;
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

function determineHealth(data: Overview, escalations: Escalation[]): { level: HealthLevel; issues: HealthIssue[] } {
  const issues: HealthIssue[] = [];

  const criticalEscalations = escalations.filter(
    (e) => e.status === "open" && (e.severity === "critical" || e.severity === "high")
  );
  if (criticalEscalations.length > 0) {
    issues.push({
      text: `${criticalEscalations.length} critical escalation${criticalEscalations.length !== 1 ? "s" : ""}`,
      link: "/escalations",
    });
  }

  const degradedRigs = data.rigs.items.filter((r) => r.status !== "operational");
  if (degradedRigs.length > 0) {
    issues.push({
      text: `${degradedRigs.length} rig${degradedRigs.length !== 1 ? "s" : ""} degraded`,
      link: "/rigs",
    });
  }

  if (data.scheduler.paused) {
    issues.push({ text: "scheduler paused", link: "/settings" });
  }

  const openEscalations = escalations.filter(
    (e) => e.status === "open" && e.severity !== "critical" && e.severity !== "high"
  );
  if (openEscalations.length > 0) {
    issues.push({
      text: `${openEscalations.length} open escalation${openEscalations.length !== 1 ? "s" : ""}`,
      link: "/escalations",
    });
  }

  const level: HealthLevel =
    criticalEscalations.length > 0 ? "critical" :
    issues.length > 0 ? "degraded" : "healthy";

  return { level, issues };
}

export function SystemHealthStrip({ data, escalations }: SystemHealthStripProps) {
  const { level, issues } = determineHealth(data, escalations);
  const c = config[level];

  const totalPolecats = data.rigs.items.reduce((s, r) => s + r.polecats, 0);
  const totalCrew = data.rigs.items.reduce((s, r) => s + r.crew, 0);

  return (
    <div className={`rounded-lg border ${c.border} ${c.bg} px-5 py-3 flex items-center justify-between`}>
      <div className="flex items-center gap-3">
        <span className={`h-2.5 w-2.5 rounded-full ${c.dot} shrink-0`} />
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`text-sm font-medium ${c.text}`}>
            {level === "healthy" ? "All systems operational" :
             level === "degraded" ? "Attention needed" :
             "Critical alert"}
          </span>
          {issues.length > 0 && (
            <>
              <span className="text-xs text-zinc-600">—</span>
              {issues.map((issue, i) => (
                <span key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span className="h-3 w-px bg-zinc-700" />}
                  <Link
                    to={issue.link}
                    className="text-xs text-zinc-400 hover:text-zinc-200 underline decoration-zinc-700 hover:decoration-zinc-400 transition-colors"
                  >
                    {issue.text}
                  </Link>
                </span>
              ))}
            </>
          )}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 shrink-0 ml-3">
        <span>{totalPolecats}p</span>
        <span className="h-3 w-px bg-zinc-700" />
        <span>{totalCrew}c</span>
      </div>
    </div>
  );
}
