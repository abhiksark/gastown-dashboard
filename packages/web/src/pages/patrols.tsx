import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { PatrolScan, PatrolEvent } from "@/lib/types";
import { ShieldCheck, AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

const PATROL_COLORS: Record<string, { border: string; bg: string; text: string; dot: string }> = {
  deacon: {
    border: "border-orange-500/20",
    bg: "bg-orange-500/5",
    text: "text-orange-400",
    dot: "bg-orange-400",
  },
  witness: {
    border: "border-cyan-500/20",
    bg: "bg-cyan-500/5",
    text: "text-cyan-400",
    dot: "bg-cyan-400",
  },
  refinery: {
    border: "border-purple-500/20",
    bg: "bg-purple-500/5",
    text: "text-purple-400",
    dot: "bg-purple-400",
  },
};

function detectPatrolRole(actor: string): string {
  const lower = actor.toLowerCase();
  if (lower.includes("witness")) return "witness";
  if (lower.includes("refinery")) return "refinery";
  if (lower.includes("deacon") || lower === "deacon") return "deacon";
  return "witness"; // default
}

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatTime(ts: string): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(ts: string): string {
  return new Date(ts).toLocaleDateString([], { month: "short", day: "numeric" });
}

export function PatrolsPage() {
  const { data: scanMap, loading: scanLoading, error: scanError } = useFetch<Record<string, PatrolScan>>("/patrols/active", 15000);

  // Aggregate scan results across all rigs
  const scan = scanMap ? (() => {
    const rigs = Object.values(scanMap).filter((v) => v && typeof v === "object" && "zombies" in v);
    if (rigs.length === 0) return null;
    return {
      timestamp: rigs.reduce((latest, r) => r.timestamp > latest ? r.timestamp : latest, ""),
      zombies: { checked: rigs.reduce((s, r) => s + (r.zombies?.checked ?? 0), 0), found: rigs.reduce((s, r) => s + (r.zombies?.found ?? 0), 0) },
      stalls: {
        checked: rigs.reduce((s, r) => s + (r.stalls?.checked ?? 0), 0),
        found: rigs.reduce((s, r) => s + (r.stalls?.found ?? 0), 0),
        stalls: rigs.flatMap((r) => r.stalls?.stalls ?? []),
      },
      completions: { checked: rigs.reduce((s, r) => s + (r.completions?.checked ?? 0), 0), found: rigs.reduce((s, r) => s + (r.completions?.found ?? 0), 0) },
    };
  })() : null;
  const { data: events, loading: eventsLoading } = useFetch<PatrolEvent[]>("/patrols/events?limit=100", 10000);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filteredEvents = useMemo(() => {
    if (!events) return [];
    if (typeFilter === "all") return events;
    return events.filter((e) => detectPatrolRole(e.actor) === typeFilter);
  }, [events, typeFilter]);

  // Group events by date
  const groupedEvents = useMemo(() => {
    const groups: Record<string, PatrolEvent[]> = {};
    for (const event of filteredEvents) {
      const date = formatDate(event.ts);
      if (!groups[date]) groups[date] = [];
      groups[date].push(event);
    }
    return groups;
  }, [filteredEvents]);

  // Count events by role
  const roleCounts = useMemo(() => {
    if (!events) return { all: 0, deacon: 0, witness: 0, refinery: 0 };
    const counts = { all: events.length, deacon: 0, witness: 0, refinery: 0 };
    for (const e of events) {
      const role = detectPatrolRole(e.actor);
      if (role in counts) counts[role as keyof typeof counts]++;
    }
    return counts;
  }, [events]);

  if (scanError) {
    return <div className="text-red-400 text-sm">Failed to load patrol data: {scanError}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Patrol Cycles</h2>
        {scan && (
          <span className="text-xs text-zinc-500">
            Last scan: {formatTimestamp(scan.timestamp)}
          </span>
        )}
      </div>

      {/* Scan summary cards */}
      {scanLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg skeleton" />
          ))}
        </div>
      ) : scan ? (
        <div className="grid grid-cols-3 gap-4">
          <ScanCard
            label="Zombies"
            icon={XCircle}
            checked={scan.zombies.checked}
            found={scan.zombies.found}
            variant={scan.zombies.found > 0 ? "danger" : "ok"}
            index={0}
          />
          <ScanCard
            label="Stalls"
            icon={AlertTriangle}
            checked={scan.stalls.checked}
            found={scan.stalls.found}
            variant={scan.stalls.found > 0 ? "warn" : "ok"}
            detail={scan.stalls.stalls?.map(
              (s) => `${s.polecat}: ${s.stall_type} (${s.action})`
            )}
            index={1}
          />
          <ScanCard
            label="Completions"
            icon={CheckCircle}
            checked={scan.completions.checked}
            found={scan.completions.found}
            variant={scan.completions.found > 0 ? "info" : "ok"}
            index={2}
          />
        </div>
      ) : null}

      {/* Filter tabs */}
      <div className="flex gap-1">
        {(["all", "deacon", "witness", "refinery"] as const).map((t) => {
          const color = t === "all" ? null : PATROL_COLORS[t];
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                typeFilter === t
                  ? `bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600`
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {color && (
                <span className={`inline-block w-2 h-2 rounded-full ${color.dot} mr-1.5`} />
              )}
              {t} ({roleCounts[t as keyof typeof roleCounts] ?? 0})
            </button>
          );
        })}
      </div>

      {/* Event timeline */}
      <div className="space-y-6">
        {eventsLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-lg skeleton" />
            ))}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
            <ShieldCheck className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
            <p className="text-zinc-500 text-sm">No patrol events found</p>
          </div>
        ) : (
          Object.entries(groupedEvents).map(([date, dayEvents]) => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-3.5 w-3.5 text-zinc-500" />
                <span className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
                  {date}
                </span>
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>
              <div className="space-y-1.5">
                {dayEvents.map((event, i) => {
                  const role = detectPatrolRole(event.actor);
                  const color = PATROL_COLORS[role] || PATROL_COLORS.witness;
                  const subject = event.payload?.subject || event.type;
                  const shortActor = event.actor.split("/").pop() || event.actor;

                  return (
                    <div
                      key={`${event.ts}-${i}`}
                      className={`flex items-center gap-3 rounded-md border ${color.border} ${color.bg} px-3 py-2 transition-colors hover:brightness-125`}
                    >
                      <span className={`w-2 h-2 rounded-full shrink-0 ${color.dot}`} />
                      <span className="text-xs text-zinc-500 tabular-nums w-14 shrink-0">
                        {formatTime(event.ts)}
                      </span>
                      <StatusBadge status={role} />
                      <span className="text-sm text-zinc-200 truncate flex-1">
                        {subject}
                      </span>
                      <span className="text-xs text-zinc-500 shrink-0">
                        {shortActor}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ScanCard({
  label,
  icon: Icon,
  checked,
  found,
  variant,
  detail,
  index = 0,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  checked: number;
  found: number;
  variant: "ok" | "warn" | "danger" | "info";
  detail?: string[];
  index?: number;
}) {
  const variantStyles = {
    ok: { border: "border-emerald-500/20", bg: "bg-emerald-500/5", icon: "text-emerald-400", count: "text-emerald-400", hoverBorder: "hover:border-emerald-500/40" },
    warn: { border: "border-amber-500/20", bg: "bg-amber-500/5", icon: "text-amber-400", count: "text-amber-400", hoverBorder: "hover:border-amber-500/40" },
    danger: { border: "border-red-500/20", bg: "bg-red-500/5", icon: "text-red-400", count: "text-red-400", hoverBorder: "hover:border-red-500/40" },
    info: { border: "border-blue-500/20", bg: "bg-blue-500/5", icon: "text-blue-400", count: "text-blue-400", hoverBorder: "hover:border-blue-500/40" },
  };

  const style = variantStyles[variant];

  return (
    <div
      className={`rounded-lg border ${style.border} ${style.bg} ${style.hoverBorder} p-4 animate-fade-in-up transition-[border-color,transform] duration-200 hover:-translate-y-0.5`}
      style={{ animationDelay: `${index * 75}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${style.icon}`} />
          <span className="text-sm font-medium text-zinc-100">{label}</span>
        </div>
        <span className={`text-lg font-semibold tabular-nums ${style.count}`}>
          {found}
        </span>
      </div>
      <span className="text-xs text-zinc-500">
        {checked} checked
      </span>
      {detail && detail.length > 0 && (
        <div className="mt-2 space-y-1">
          {detail.map((d, i) => (
            <div key={i} className="text-xs text-zinc-400 font-mono truncate">
              {d}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
