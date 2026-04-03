import { useSSE } from "@/hooks/use-sse";
import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const eventColors: Record<string, string> = {
  session_start: "text-blue-400",
  slung: "text-purple-400",
  hooked: "text-cyan-400",
  nudge: "text-amber-400",
  completed: "text-emerald-400",
  done: "text-emerald-400",
  error: "text-red-400",
};

export function LiveFeed() {
  const { events, connected } = useSSE("/api/feed/stream");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-medium text-zinc-200">Live Feed</h3>
        <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500" : "bg-red-500")} />
      </div>
      <div ref={scrollRef} className="h-72 overflow-y-auto p-3 font-mono text-xs space-y-0.5">
        {events.length === 0 && (
          <p className="text-zinc-600 text-center py-8">Waiting for events...</p>
        )}
        {events.map((evt, i) => {
          const time = new Date(evt.ts).toLocaleTimeString("en-US", {
            hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit",
          });
          const color = eventColors[evt.type] || "text-zinc-400";
          return (
            <div key={`${evt.ts}-${i}`} className="flex gap-2">
              <span className="text-zinc-600 shrink-0">{time}</span>
              <span className={cn("shrink-0", color)}>{evt.type}</span>
              <span className="text-zinc-400 truncate">{evt.actor}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
