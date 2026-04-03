import { Breadcrumbs } from "./breadcrumbs";
import { useSSE } from "@/hooks/use-sse";
import { useFetch } from "@/hooks/use-fetch";
import type { Overview } from "@/lib/types";
import { cn } from "@/lib/utils";

export function Topbar() {
  const { connected } = useSSE("/api/feed/stream");
  const { data } = useFetch<Overview>("/overview", 10000);

  function openPalette() {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "k", metaKey: true })
    );
  }

  return (
    <header className="flex items-center h-12 px-6 border-b border-[var(--color-border)] bg-[var(--color-surface)]">
      <Breadcrumbs />
      <div className="ml-auto flex items-center gap-4">
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-2 w-2 rounded-full",
                connected ? "bg-emerald-500" : "bg-red-500"
              )}
            />
            {connected ? "Live" : "Offline"}
          </span>
          {data && (
            <>
              <span className="text-zinc-600">|</span>
              <span>{data.scheduler.active_polecats} workers</span>
              <span className="text-zinc-600">|</span>
              <span>{data.beads.hooked} hooked</span>
            </>
          )}
        </div>
        <button
          onClick={openPalette}
          className="flex items-center gap-2 rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-1.5 text-xs text-zinc-500 hover:text-zinc-300 hover:border-zinc-500 transition-colors"
        >
          <kbd className="font-mono">⌘K</kbd>
          <span>Search</span>
        </button>
        <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs font-medium text-zinc-300">
          O
        </div>
      </div>
    </header>
  );
}
