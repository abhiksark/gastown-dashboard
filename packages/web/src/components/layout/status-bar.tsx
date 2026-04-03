import { useFetch } from "@/hooks/use-fetch";
import type { Overview } from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBar() {
  const { data } = useFetch<Overview>("/overview", 10000);

  const health = data
    ? data.rigs.items.every((r) => r.status === "operational") ? "healthy" : "degraded"
    : "loading";

  const healthColor: Record<string, string> = {
    healthy: "bg-emerald-500",
    degraded: "bg-amber-500",
    loading: "bg-zinc-500",
  };

  return (
    <footer className="flex items-center h-8 px-4 border-t border-[var(--color-border)] bg-[var(--color-surface)] text-xs text-zinc-500">
      <div className="flex items-center gap-2">
        <span className={cn("h-2 w-2 rounded-full", healthColor[health])} />
        <span className="capitalize">{health}</span>
      </div>
      {data && (
        <>
          <span className="mx-3 text-zinc-600">|</span>
          <span>{data.agents.total} agents</span>
          <span className="mx-3 text-zinc-600">|</span>
          <span>{data.rigs.total} rigs</span>
          <span className="mx-3 text-zinc-600">|</span>
          <span>{data.beads.total} beads</span>
        </>
      )}
    </footer>
  );
}
