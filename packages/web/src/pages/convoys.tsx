import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import type { Convoy } from "@/lib/types";
import { Truck } from "lucide-react";

export function ConvoysPage() {
  const { data, loading, error } = useFetch<Convoy[]>("/convoys", 10000);

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load convoys: {error}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-zinc-100">Convoys</h2>
        <div className="grid grid-cols-2 gap-4">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-36 rounded-lg bg-[var(--color-card)] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-zinc-100">Convoys</h2>

      {!data || data.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <Truck className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm">No active convoys</p>
          <p className="text-zinc-600 text-xs mt-1">
            Create one with: gt convoy create "title" --beads bead-1,bead-2
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {data.map((convoy) => {
            const total = convoy.total || 0;
            const done = convoy.done || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            return (
              <div
                key={convoy.id}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-5 hover:bg-[var(--color-card-hover)] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-zinc-100">
                      {convoy.title}
                    </h3>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {convoy.id}
                    </p>
                  </div>
                  <StatusBadge status={convoy.status} />
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>{done}/{total} beads</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-accent)] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Stats row */}
                <div className="flex gap-3 text-xs">
                  {convoy.active > 0 && (
                    <span className="text-blue-400">{convoy.active} active</span>
                  )}
                  {convoy.blocked > 0 && (
                    <span className="text-red-400">{convoy.blocked} blocked</span>
                  )}
                  {convoy.pending > 0 && (
                    <span className="text-zinc-500">{convoy.pending} pending</span>
                  )}
                </div>

                {/* Bead list (if available) */}
                {convoy.beads && convoy.beads.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-[var(--color-border)] space-y-1.5">
                    {convoy.beads.map((b) => (
                      <div
                        key={b.id}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-400 truncate max-w-[60%]">
                          {b.title}
                        </span>
                        <StatusBadge status={b.status} />
                      </div>
                    ))}
                  </div>
                )}

                <p className="text-[10px] text-zinc-600 mt-3">
                  {new Date(convoy.created_at).toLocaleDateString()}
                  {convoy.owner && ` · ${convoy.owner}`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
