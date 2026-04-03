import { useNavigate } from "react-router";
import { useRealtime } from "@/hooks/use-realtime";
import { StatusBadge } from "@/components/status-badge";
import type { Rig } from "@/lib/types";
import { Server } from "lucide-react";

export function RigsPage() {
  const { data, loading, error } = useRealtime<Rig[]>("/rigs", 10000);
  const navigate = useNavigate();

  if (error) return <div className="text-red-400 text-sm">Failed to load rigs: {error}</div>;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Rigs</h2>
      {loading ? (
        <div className="grid grid-cols-2 gap-4">{[...Array(2)].map((_, i) => <div key={i} className="h-40 rounded-lg skeleton" />)}</div>
      ) : data && data.length > 0 ? (
        <div className="grid grid-cols-2 gap-4">
          {data.map((rig) => (
            <div key={rig.name} onClick={() => navigate(`/rigs/${rig.name}`)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:bg-[var(--color-card-hover)] transition-colors cursor-pointer">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-zinc-800 p-2"><Server className="h-4 w-4 text-zinc-400" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">{rig.name}</h3>
                    <p className="text-xs text-zinc-500 mt-0.5">prefix: {rig.beads_prefix}</p>
                  </div>
                </div>
                <StatusBadge status={rig.status} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-100 tabular-nums">{rig.polecats}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Polecats</p>
                </div>
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-100 tabular-nums">{rig.crew}</p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">Crew</p>
                </div>
                <div className="rounded-md bg-zinc-900 p-2.5 text-center">
                  <StatusBadge status={rig.witness} />
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-1">Witness</p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                <span className="text-zinc-500">Refinery: <span className={rig.refinery === "running" ? "text-emerald-400" : "text-zinc-600"}>{rig.refinery}</span></span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-zinc-600">No rigs found</div>
      )}
    </div>
  );
}
