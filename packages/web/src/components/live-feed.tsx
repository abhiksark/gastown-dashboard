import { useSSE } from "@/hooks/use-sse";
import { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import type { FeedEvent } from "@/lib/types";

const eventColors: Record<string, string> = {
  session_start: "text-blue-400",
  slung: "text-purple-400",
  hooked: "text-cyan-400",
  nudge: "text-amber-400",
  completed: "text-emerald-400",
  done: "text-emerald-400",
  error: "text-red-400",
};

function payloadPreview(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload);
  if (keys.length === 0) return "";
  const parts: string[] = [];
  for (const key of keys.slice(0, 2)) {
    const val = payload[key];
    if (typeof val === "string") {
      parts.push(val.length > 40 ? val.slice(0, 40) + "…" : val);
    } else if (typeof val === "number" || typeof val === "boolean") {
      parts.push(String(val));
    }
  }
  return parts.join(" · ");
}

function EventRow({ event }: { event: FeedEvent }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(event.ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const color = eventColors[event.type] || "text-zinc-400";
  const preview = payloadPreview(event.payload);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex gap-2 px-2 py-1 text-left rounded transition-colors",
          "hover:bg-zinc-800/60",
          expanded && "bg-zinc-800/40"
        )}
      >
        <span className="text-zinc-600 shrink-0">{time}</span>
        <span className={cn("shrink-0", color)}>{event.type}</span>
        <span className="text-zinc-400 truncate">{event.actor}</span>
        {preview && (
          <span className="text-zinc-600 truncate ml-auto">{preview}</span>
        )}
      </button>
      {expanded && (
        <pre className="mx-2 mb-1 rounded bg-zinc-900/60 border border-zinc-800 p-2 text-[10px] text-zinc-500 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(event.payload, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function LiveFeed() {
  const { events, connected } = useSSE("/api/feed/stream");
  const scrollRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [missedCount, setMissedCount] = useState(0);
  const prevEventCount = useRef(events.length);

  // Track whether user has scrolled away from the bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 30;
    if (atBottom && paused) {
      setPaused(false);
      setMissedCount(0);
    } else if (!atBottom && !paused) {
      setPaused(true);
      setMissedCount(0);
    }
  }, [paused]);

  // Auto-scroll only when not paused
  useEffect(() => {
    const newEvents = events.length - prevEventCount.current;
    prevEventCount.current = events.length;

    if (paused) {
      if (newEvents > 0) {
        setMissedCount((c) => c + newEvents);
      }
      return;
    }
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events, paused]);

  const resumeScroll = useCallback(() => {
    setPaused(false);
    setMissedCount(0);
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, []);

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <h3 className="text-sm font-medium text-zinc-200">Live Feed</h3>
        <div className="flex items-center gap-2">
          {paused && (
            <button
              onClick={resumeScroll}
              className="flex items-center gap-1.5 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[11px] font-medium text-amber-400 hover:bg-amber-500/25 transition-colors"
            >
              Paused{missedCount > 0 && ` · ${missedCount} new`}
            </button>
          )}
          <span className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500" : "bg-red-500")} />
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-72 overflow-y-auto p-2 font-mono text-xs space-y-0"
      >
        {events.length === 0 && (
          <p className="text-zinc-600 text-center py-8">Waiting for events...</p>
        )}
        {events.map((evt, i) => (
          <EventRow key={`${evt.ts}-${i}`} event={evt} />
        ))}
      </div>
    </div>
  );
}
