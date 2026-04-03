import { useParams, Link } from "react-router";
import { useFetch } from "@/hooks/use-fetch";
import { useSSE } from "@/hooks/use-sse";
import { StatusBadge } from "@/components/status-badge";
import { cn } from "@/lib/utils";
import type { Agent, FeedEvent } from "@/lib/types";
import { ArrowLeft } from "lucide-react";
import { useState, useRef, useEffect, useMemo } from "react";

const eventColors: Record<string, string> = {
  session_start: "text-blue-400",
  slung: "text-purple-400",
  hooked: "text-cyan-400",
  nudge: "text-amber-400",
  completed: "text-emerald-400",
  done: "text-emerald-400",
  error: "text-red-400",
  mail: "text-orange-400",
  escalation: "text-red-300",
  dispatch: "text-indigo-400",
};

const eventDotColors: Record<string, string> = {
  session_start: "bg-blue-400",
  slung: "bg-purple-400",
  hooked: "bg-cyan-400",
  nudge: "bg-amber-400",
  completed: "bg-emerald-400",
  done: "bg-emerald-400",
  error: "bg-red-400",
  mail: "bg-orange-400",
  escalation: "bg-red-300",
  dispatch: "bg-indigo-400",
};

type TypeFilter = "all" | string;

export function AgentDetailPage() {
  const { name } = useParams<{ name: string }>();
  const { data: agents } = useFetch<Agent[]>("/agents", 10000);
  const { data: history } = useFetch<FeedEvent[]>(
    `/agents/${encodeURIComponent(name || "")}/feed?limit=200`,
    10000
  );
  const { events: liveEvents, connected } = useSSE("/api/feed/stream");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const scrollRef = useRef<HTMLDivElement>(null);

  const agent = agents?.find((a) => a.name === name);

  // Merge historical + live events for this agent, deduplicate by timestamp
  const allEvents = useMemo(() => {
    const agentLive = liveEvents.filter((e) => e.actor === name);
    if (!history) return agentLive;

    const seen = new Set(history.map((e) => e.ts));
    const merged = [...history];
    for (const e of agentLive) {
      if (!seen.has(e.ts)) {
        merged.push(e);
        seen.add(e.ts);
      }
    }
    return merged;
  }, [history, liveEvents, name]);

  const eventTypes = useMemo(() => {
    const types = new Set(allEvents.map((e) => e.type));
    return ["all", ...Array.from(types).sort()];
  }, [allEvents]);

  const filtered = typeFilter === "all"
    ? allEvents
    : allEvents.filter((e) => e.type === typeFilter);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [filtered]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/agents"
          className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex items-center gap-2">
          {agent && <span className="text-lg">{agent.icon}</span>}
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            {name}
          </h2>
        </div>
        {agent && (
          <div className="flex items-center gap-2">
            <StatusBadge status={agent.role} />
            {agent.rig && (
              <span className="text-xs text-zinc-500">{agent.rig}</span>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <span className={cn(
            "h-2 w-2 rounded-full",
            connected ? "bg-emerald-500" : "bg-red-500"
          )} />
          <span className="text-xs text-zinc-500">
            {filtered.length} event{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Type filters */}
      <div className="flex gap-1 flex-wrap">
        {eventTypes.map((type) => {
          const count = type === "all"
            ? allEvents.length
            : allEvents.filter((e) => e.type === type).length;
          return (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                typeFilter === type
                  ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
              )}
            >
              {type} ({count})
            </button>
          );
        })}
      </div>

      {/* Timeline */}
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-hidden">
        <div
          ref={scrollRef}
          className="overflow-y-auto p-4"
          style={{ maxHeight: "calc(100vh - 280px)" }}
        >
          {filtered.length === 0 ? (
            <p className="text-zinc-600 text-center py-12">
              No events found for this agent
            </p>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-800" />

              <div className="space-y-0">
                {filtered.map((evt, i) => {
                  const time = new Date(evt.ts);
                  const timeStr = time.toLocaleTimeString("en-US", {
                    hour12: false,
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  });
                  const dateStr = time.toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  });
                  const color = eventColors[evt.type] || "text-zinc-400";
                  const dotColor = eventDotColors[evt.type] || "bg-zinc-500";

                  // Show date separator when date changes
                  const prevDate = i > 0
                    ? new Date(filtered[i - 1].ts).toDateString()
                    : null;
                  const showDate = prevDate !== time.toDateString();

                  return (
                    <div key={`${evt.ts}-${i}`}>
                      {showDate && (
                        <div className="flex items-center gap-3 py-2 pl-6 mb-1">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-zinc-600">
                            {dateStr}
                          </span>
                        </div>
                      )}
                      <div className="flex items-start gap-3 py-1.5 pl-0 group">
                        {/* Dot */}
                        <div className="relative z-10 mt-1.5 shrink-0">
                          <div className={cn("h-[9px] w-[9px] rounded-full ring-2 ring-[var(--color-card)]", dotColor)} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className={cn("text-xs font-medium", color)}>
                              {evt.type}
                            </span>
                            <span className="text-[11px] text-zinc-600 tabular-nums">
                              {timeStr}
                            </span>
                          </div>
                          {evt.source && (
                            <span className="text-xs text-zinc-500 block mt-0.5">
                              {evt.source}
                            </span>
                          )}
                          {evt.payload && Object.keys(evt.payload).length > 0 && (
                            <div className="mt-1 text-xs text-zinc-500 bg-zinc-900/50 rounded px-2 py-1 font-mono max-w-2xl overflow-x-auto">
                              {Object.entries(evt.payload).map(([k, v]) => (
                                <div key={k} className="truncate">
                                  <span className="text-zinc-600">{k}:</span>{" "}
                                  <span className="text-zinc-400">
                                    {typeof v === "string" ? v : JSON.stringify(v)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
