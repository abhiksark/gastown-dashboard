import { useFetch } from "@/hooks/use-fetch";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { LiveFeed } from "@/components/live-feed";
import type { Overview as OverviewData } from "@/lib/types";
import { Server, Users, CircleDot, CheckCircle } from "lucide-react";

export function OverviewPage() {
  const { data, loading, error } = useFetch<OverviewData>("/overview", 5000);

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load overview: {error}</div>;
  }

  if (loading || !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-lg skeleton" />
          ))}
        </div>
        <div className="h-72 rounded-lg skeleton" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Rigs" value={data.rigs.total} icon={Server} />
        <StatCard label="Agents" value={data.agents.total} icon={Users} />
        <StatCard label="Hooked" value={data.beads.hooked} icon={CircleDot} />
        <StatCard label="Closed" value={data.beads.closed} icon={CheckCircle} />
      </div>

      <div className="grid grid-cols-2 gap-6">
        <LiveFeed />
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-medium text-zinc-200">Rig Health</h3>
          </div>
          <div className="p-4 space-y-3">
            {data.rigs.items.map((rig) => (
              <div key={rig.name} className="flex items-center justify-between rounded-md border border-[var(--color-border)] p-3">
                <div>
                  <p className="text-sm font-medium text-zinc-200">{rig.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{rig.beads_prefix} prefix &middot; {rig.crew} crew &middot; {rig.polecats} polecats</p>
                </div>
                <div className="flex gap-2">
                  <StatusBadge status={rig.witness} />
                  <StatusBadge status={rig.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4">
        <div className="flex items-center gap-4 text-sm">
          <span className="text-zinc-400">Scheduler:</span>
          <StatusBadge status={data.scheduler.paused ? "paused" : "running"} />
          <span className="text-zinc-500">{data.scheduler.queued_total} queued &middot; {data.scheduler.active_polecats} active polecats</span>
        </div>
      </div>
    </div>
  );
}
