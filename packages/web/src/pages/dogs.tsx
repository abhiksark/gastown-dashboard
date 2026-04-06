import { useState, useMemo } from "react";
import { useRealtime } from "@/hooks/use-realtime";
import { StatusBadge } from "@/components/status-badge";
import { InlineConfirm } from "@/components/inline-confirm";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useFetch } from "@/hooks/use-fetch";
import type { Dog, DogHealthCheck } from "@/lib/types";
import { Dog as DogIcon, AlertTriangle, CheckCircle } from "lucide-react";

const stateColors: Record<string, string> = {
  idle: "text-emerald-400",
  working: "text-blue-400",
  stuck: "text-red-400",
};

export function DogsPage() {
  const { data: dogs, loading, error, refetch } = useRealtime<Dog[]>("/dogs", 10000);
  const { data: health } = useFetch<DogHealthCheck>("/dogs/health", 15000);
  const [acting, setActing] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<string>("all");
  const { addToast } = useToast();

  const states = ["all", "idle", "working", "stuck"];

  const filtered = useMemo(() => {
    if (!dogs) return [];
    if (stateFilter === "all") return dogs;
    return dogs.filter((d) => d.state === stateFilter);
  }, [dogs, stateFilter]);

  const healthIssues = useMemo(() => {
    if (!health) return [];
    return health.dogs.filter((d) => d.needs_attention);
  }, [health]);

  async function handleCall(name: string) {
    setActing(name);
    try {
      await apiPost(`/dogs/${encodeURIComponent(name)}/call`);
      addToast(`Called ${name}`, "success");
      refetch();
    } catch {
      addToast(`Failed to call ${name}`, "error");
    } finally {
      setActing(null);
    }
  }

  async function handleClear(name: string) {
    setActing(name);
    try {
      await apiPost(`/dogs/${encodeURIComponent(name)}/clear`);
      addToast(`Cleared ${name}`, "success");
      refetch();
    } catch {
      addToast(`Failed to clear ${name}`, "error");
    } finally {
      setActing(null);
    }
  }

  if (error) {
    return (
      <div className="text-red-400 text-sm">Failed to load dogs: {error}</div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
          Dogs Kennel
        </h2>
        <div className="flex gap-1">
          {states.map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                stateFilter === s
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {healthIssues.length > 0 && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <span className="text-sm font-medium text-red-400">
              {healthIssues.length} dog{healthIssues.length !== 1 ? "s" : ""} need
              attention
            </span>
          </div>
          <div className="space-y-1">
            {healthIssues.map((d) => (
              <div
                key={d.name}
                className="flex items-center gap-2 text-xs text-zinc-400"
              >
                <span className="font-medium text-zinc-200">{d.name}</span>
                <StatusBadge status={d.state} />
                <span className="text-zinc-500">
                  session: {d.session_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-40 rounded-lg skeleton" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <DogIcon className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-400 text-sm font-medium">
            All dogs idle in the kennel
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            No dogs match the current filter
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((dog) => {
            const worktreeEntries = Object.entries(dog.worktrees);
            return (
              <div
                key={dog.name}
                className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-4 hover:bg-[var(--color-card-hover)] transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <DogIcon
                      className={`h-5 w-5 ${stateColors[dog.state] || "text-zinc-400"}`}
                    />
                    <span className="text-sm font-semibold text-zinc-100">
                      {dog.name}
                    </span>
                  </div>
                  <StatusBadge status={dog.state} />
                </div>

                <div className="text-xs text-zinc-500 mb-3">
                  Last active:{" "}
                  {new Date(dog.last_active).toLocaleString()}
                </div>

                {worktreeEntries.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600 mb-1">
                      Worktrees ({worktreeEntries.length})
                    </div>
                    <div className="space-y-0.5">
                      {worktreeEntries.map(([rig]) => (
                        <div
                          key={rig}
                          className="text-xs text-zinc-400 font-mono truncate"
                        >
                          {rig}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-3 border-t border-[var(--color-border)]">
                  {dog.state === "idle" && (
                    <InlineConfirm
                      onConfirm={() => handleCall(dog.name)}
                      confirmLabel="Wake?"
                      disabled={acting === dog.name}
                      className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-zinc-400 hover:text-zinc-100 hover:border-zinc-500 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      {acting === dog.name ? "..." : "Call"}
                    </InlineConfirm>
                  )}
                  {dog.state === "stuck" && (
                    <InlineConfirm
                      onConfirm={() => handleClear(dog.name)}
                      confirmLabel="Reset?"
                      variant="danger"
                      disabled={acting === dog.name}
                      className="rounded-md border border-red-500/20 px-3 py-1 text-xs text-red-400 hover:bg-red-500/10 transition-colors active:scale-[0.98] disabled:opacity-50"
                    >
                      {acting === dog.name ? "..." : "Clear"}
                    </InlineConfirm>
                  )}
                  {dog.state === "working" && (
                    <span className="text-xs text-blue-400 py-1">
                      Working...
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
