import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { InlineStatus } from "@/components/inline-status";
import { Link } from "react-router";
import { Shield, Eye, Bot, Server } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FeedEvent } from "@/lib/types";

interface DeaconStatus {
  running: boolean;
  paused?: boolean;
  session?: string;
  heartbeat?: {
    timestamp: string;
    age_seconds: number;
    cycle: number;
    fresh: boolean;
    stale: boolean;
    very_stale: boolean;
  };
}

interface WitnessInfo {
  running: boolean;
  rig_name: string;
  session?: string;
  monitored_polecats?: string[];
}

interface PolecatInfo {
  name: string;
  state: string;
  issue?: string | null;
  session_running?: boolean;
}

interface RigHealth {
  rig: string;
  status: string;
  witness: WitnessInfo;
  polecats: PolecatInfo[];
}

interface HealthTree {
  deacon: DeaconStatus;
  rigs: RigHealth[];
}

function heartbeatLabel(hb: DeaconStatus["heartbeat"]): { text: string; color: string } {
  if (!hb) return { text: "unknown", color: "text-zinc-500" };
  if (hb.very_stale) return { text: "very stale", color: "text-red-400" };
  if (hb.stale) return { text: "stale", color: "text-amber-400" };
  if (hb.fresh) return { text: "fresh", color: "text-emerald-400" };
  const mins = Math.round(hb.age_seconds / 60);
  if (mins < 5) return { text: `${mins}m ago`, color: "text-emerald-400" };
  if (mins < 30) return { text: `${mins}m ago`, color: "text-amber-400" };
  return { text: `${mins}m ago`, color: "text-red-400" };
}

export function DeaconPage() {
  const { data: health, loading } = useFetch<HealthTree>("/deacon/health", 10000);
  const { data: events } = useFetch<FeedEvent[]>("/agents/deacon/feed?limit=20", 15000);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 rounded skeleton" />
        <div className="h-40 rounded-lg skeleton" />
        <div className="h-64 rounded-lg skeleton" />
      </div>
    );
  }

  const deacon = health?.deacon;
  const rigs = health?.rigs || [];
  const hb = deacon?.heartbeat;
  const hbInfo = heartbeatLabel(hb);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Deacon & Boot Control</h2>

      {/* Deacon status card */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="rounded-md bg-zinc-800 p-2.5">
            <Shield className="h-5 w-5 text-zinc-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">Deacon</h3>
            <p className="text-xs text-zinc-500">Town-level watchdog</p>
          </div>
          <div className="ml-auto">
            <StatusBadge status={deacon?.running ? "running" : "stopped"} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <span className={cn("h-2.5 w-2.5 rounded-full inline-block", deacon?.running ? "bg-emerald-500" : "bg-red-500")} />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Status</p>
          </div>
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <p className={cn("text-sm font-semibold", hbInfo.color)}>{hbInfo.text}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Heartbeat</p>
          </div>
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <p className="text-sm font-semibold text-zinc-100 tabular-nums">{hb?.cycle ?? "\u2014"}</p>
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Cycles</p>
          </div>
          <div className="rounded-md bg-zinc-900 p-3 text-center">
            <StatusBadge status={deacon?.paused ? "paused" : "active"} />
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Patrol</p>
          </div>
        </div>
      </div>

      {/* Health Tree: per-rig */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Health Tree</h3>
        <div className="space-y-3">
          {rigs.map((rig) => (
            <div
              key={rig.rig}
              className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden"
            >
              {/* Rig header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--color-border)]">
                <div className="flex items-center gap-2">
                  <Server className="h-4 w-4 text-zinc-400" />
                  <Link to={`/rigs/${rig.rig}`} className="text-sm font-medium text-zinc-200 hover:text-zinc-100 transition-colors">
                    {rig.rig}
                  </Link>
                </div>
                <InlineStatus status={rig.status} />
              </div>

              <div className="px-5 py-3 space-y-3">
                {/* Witness row */}
                <div className="flex items-center gap-3 pl-4 border-l-2 border-zinc-700">
                  <Eye className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                  <span className="text-xs text-zinc-400">Witness</span>
                  <StatusBadge status={rig.witness.running ? "running" : "stopped"} />
                  {rig.witness.session && (
                    <span className="text-xs text-zinc-600 font-mono ml-auto">{rig.witness.session}</span>
                  )}
                  {rig.witness.monitored_polecats && (
                    <span className="text-xs text-zinc-600 ml-2">
                      monitoring {rig.witness.monitored_polecats.length} polecats
                    </span>
                  )}
                </div>

                {/* Polecats */}
                {rig.polecats.length > 0 ? (
                  <div className="space-y-1.5 pl-4 border-l-2 border-zinc-800">
                    {rig.polecats.map((pc) => (
                      <div key={pc.name} className="flex items-center gap-3 pl-4 border-l-2 border-zinc-800">
                        <Bot className="h-3 w-3 text-zinc-600 shrink-0" />
                        <span className="text-xs text-zinc-300 font-medium">{pc.name}</span>
                        <InlineStatus status={pc.state} />
                        {pc.issue && (
                          <span className="text-xs text-zinc-600 font-mono ml-auto">{pc.issue}</span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600 pl-8">No polecats</p>
                )}
              </div>
            </div>
          ))}
          {rigs.length === 0 && (
            <p className="text-xs text-zinc-600 text-center py-6">No rigs found</p>
          )}
        </div>
      </div>

      {/* Recent deacon events */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-100 mb-3">Recent Deacon Events</h3>
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          {events && events.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Time</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Type</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Source</th>
                  <th className="text-left font-medium text-zinc-400 px-4 py-2 text-xs">Details</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt, i) => (
                  <tr key={`${evt.ts}-${i}`} className="border-b border-[var(--color-border)]">
                    <td className="px-4 py-2 text-xs text-zinc-500 tabular-nums whitespace-nowrap">
                      {new Date(evt.ts).toLocaleString("en-US", {
                        month: "short", day: "numeric",
                        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
                      })}
                    </td>
                    <td className="px-4 py-2"><InlineStatus status={evt.type} /></td>
                    <td className="px-4 py-2 text-xs text-zinc-400">{evt.source}</td>
                    <td className="px-4 py-2 text-xs text-zinc-500 truncate max-w-xs">
                      {evt.payload && Object.keys(evt.payload).length > 0
                        ? Object.entries(evt.payload).map(([k, v]) => `${k}: ${typeof v === "string" ? v : JSON.stringify(v)}`).join(", ")
                        : "\u2014"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="px-5 py-8 text-xs text-zinc-600 text-center">No recent deacon events</p>
          )}
        </div>
      </div>
    </div>
  );
}
