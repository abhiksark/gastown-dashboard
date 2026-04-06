import { useState, useMemo } from "react";
import { useFetch } from "@/hooks/use-fetch";
import { StatusBadge } from "@/components/status-badge";
import { apiPost } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { Mountain } from "@/lib/types";
import { Mountain as MountainIcon, Pause, Play, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const STALL_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

function isStalled(mountain: Mountain): boolean {
  if (!mountain.last_progress) return false;
  if (mountain.status === "paused" || mountain.status === "done") return false;
  return Date.now() - new Date(mountain.last_progress).getTime() > STALL_THRESHOLD_MS;
}

export function MountainsPage() {
  const { data, loading, error, refetch } = useFetch<Mountain[]>("/mountains", 10000);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const { addToast } = useToast();

  const filtered = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data;
    if (filter === "stalled") return data.filter(isStalled);
    return data.filter((m) => m.status === filter);
  }, [data, filter]);

  function toggleExpand(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handlePauseResume(mountain: Mountain) {
    const action = mountain.status === "paused" ? "resume" : "pause";
    setActing(mountain.id);
    try {
      await apiPost(`/mountains/${encodeURIComponent(mountain.id)}/${action}`);
      addToast(`Mountain ${action}d`, "success");
      refetch();
    } catch (err: any) {
      addToast(`Failed: ${err.message}`, "error");
    } finally {
      setActing(null);
    }
  }

  if (error) {
    return <div className="text-red-400 text-sm">Failed to load mountains: {error}</div>;
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Mountains</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 rounded-lg skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const stalledCount = data ? data.filter(isStalled).length : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight text-zinc-100">Mountains</h2>
        <div className="flex gap-1">
          {["all", "active", "paused", "stalled"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors capitalize",
                filter === s
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              {s}
              {s === "stalled" && stalledCount > 0 && (
                <span className="ml-1 text-red-400">({stalledCount})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {!data || filtered.length === 0 ? (
        <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] p-12 text-center">
          <MountainIcon className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-zinc-500 text-sm font-medium">
            {filter !== "all" ? `No ${filter} mountains` : "No active mountains"}
          </p>
          <p className="text-zinc-600 text-xs mt-1">
            Use <code className="text-zinc-500">gt mountain &lt;epic-id&gt;</code> to start one.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((mountain) => {
            const total = mountain.total || 0;
            const done = mountain.done || 0;
            const pct = total > 0 ? Math.round((done / total) * 100) : 0;
            const stalled = isStalled(mountain);
            const isExpanded = expanded.has(mountain.id);

            return (
              <div
                key={mountain.id}
                className={cn(
                  "rounded-lg border bg-[var(--color-card)] p-5 transition-colors",
                  stalled
                    ? "border-red-500/40 hover:border-red-500/60"
                    : "border-[var(--color-border)] hover:bg-[var(--color-card-hover)]"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MountainIcon className="h-4 w-4 text-zinc-400 shrink-0" />
                      <h3 className="text-sm font-semibold text-zinc-100 truncate">
                        {mountain.title}
                      </h3>
                    </div>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {mountain.id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {stalled && (
                      <span className="flex items-center gap-1 text-xs text-red-400" title="No progress in >30min">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        Stalled
                      </span>
                    )}
                    <StatusBadge status={mountain.status} />
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-zinc-500 mb-1">
                    <span>{done}/{total} beads</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all",
                        stalled ? "bg-red-500" : "bg-[var(--color-accent)]"
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Wave indicator + stats */}
                <div className="flex items-center justify-between text-xs mb-3">
                  <span className="text-zinc-400">
                    Wave {mountain.current_wave}/{mountain.total_waves}
                  </span>
                  <div className="flex gap-3">
                    {mountain.active > 0 && (
                      <span className="text-blue-400">{mountain.active} active</span>
                    )}
                    {mountain.blocked > 0 && (
                      <span className="text-red-400">{mountain.blocked} blocked</span>
                    )}
                    {mountain.pending > 0 && (
                      <span className="text-zinc-500">{mountain.pending} pending</span>
                    )}
                    {mountain.skipped > 0 && (
                      <span className="text-yellow-400">{mountain.skipped} skipped</span>
                    )}
                  </div>
                </div>

                {/* Expand/Collapse + Pause/Resume */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--color-border)]">
                  <button
                    onClick={() => toggleExpand(mountain.id)}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5" />
                    )}
                    {isExpanded ? "Hide" : "Show"} waves
                  </button>
                  <button
                    onClick={() => handlePauseResume(mountain)}
                    disabled={acting === mountain.id}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50",
                      mountain.status === "paused"
                        ? "border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        : "border-[var(--color-border)] text-zinc-400 hover:text-zinc-100 hover:border-zinc-500"
                    )}
                  >
                    {mountain.status === "paused" ? (
                      <>
                        <Play className="h-3 w-3" />
                        Resume
                      </>
                    ) : (
                      <>
                        <Pause className="h-3 w-3" />
                        Pause
                      </>
                    )}
                  </button>
                </div>

                {/* Expanded wave breakdown */}
                {isExpanded && mountain.waves && mountain.waves.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {mountain.waves.map((wave) => (
                      <div key={wave.wave} className="rounded-md bg-zinc-900/50 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-medium text-zinc-300">
                            Wave {wave.wave}
                          </span>
                          <StatusBadge status={wave.status} />
                        </div>
                        {wave.beads && wave.beads.length > 0 && (
                          <div className="space-y-1">
                            {wave.beads.map((b) => (
                              <div
                                key={b.id}
                                className="flex items-center justify-between text-xs"
                              >
                                <span className="text-zinc-400 truncate max-w-[50%]">
                                  {b.title}
                                </span>
                                <div className="flex items-center gap-2">
                                  <span className="font-mono text-zinc-600">{b.id}</span>
                                  <StatusBadge status={b.status} />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {isExpanded && (!mountain.waves || mountain.waves.length === 0) && (
                  <p className="mt-3 text-xs text-zinc-600 italic">
                    Wave details not available. Click the mountain ID for detail view.
                  </p>
                )}

                <p className="text-[10px] text-zinc-600 mt-3">
                  {new Date(mountain.created_at).toLocaleDateString()}
                  {mountain.last_progress && (
                    <> · last progress {new Date(mountain.last_progress).toLocaleTimeString()}</>
                  )}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
