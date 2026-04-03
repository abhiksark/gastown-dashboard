import { useState, useMemo, useCallback } from "react";
import { useSSE } from "@/hooks/use-sse";
import { useFetch } from "@/hooks/use-fetch";
import { cn } from "@/lib/utils";
import type { FeedEvent } from "@/lib/types";
import { Search, ChevronDown, ChevronRight } from "lucide-react";

const EVENT_TYPES = [
  "session_start",
  "sling",
  "slung",
  "hook",
  "hooked",
  "nudge",
  "handoff",
  "completed",
  "done",
  "error",
] as const;

const TIME_RANGES = [
  { label: "1h", value: "1h" },
  { label: "6h", value: "6h" },
  { label: "24h", value: "24h" },
  { label: "All", value: "" },
] as const;

const eventColors: Record<string, string> = {
  session_start: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  sling: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  slung: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  hook: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  hooked: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  nudge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  handoff: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  done: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  error: "bg-red-500/15 text-red-400 border-red-500/30",
};

const defaultBadge = "bg-zinc-500/15 text-zinc-400 border-zinc-500/30";

function payloadSummary(payload: Record<string, unknown>): string {
  const keys = Object.keys(payload);
  if (keys.length === 0) return "";
  // Show first few meaningful values
  const parts: string[] = [];
  for (const key of keys.slice(0, 3)) {
    const val = payload[key];
    if (typeof val === "string") {
      parts.push(`${key}: ${val.length > 60 ? val.slice(0, 60) + "..." : val}`);
    } else if (typeof val === "number" || typeof val === "boolean") {
      parts.push(`${key}: ${val}`);
    }
  }
  return parts.join(" | ");
}

function EventRow({ event }: { event: FeedEvent }) {
  const [expanded, setExpanded] = useState(false);
  const time = new Date(event.ts).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const badge = eventColors[event.type] || defaultBadge;
  const summary = payloadSummary(event.payload);

  return (
    <div
      className="border-b border-[var(--color-border)] last:border-b-0 hover:bg-[var(--color-card-hover)] transition-colors"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
      >
        <span className="text-zinc-600 font-mono text-xs shrink-0">{time}</span>
        <span
          className={cn(
            "rounded-md border px-2 py-0.5 text-[11px] font-medium shrink-0",
            badge
          )}
        >
          {event.type}
        </span>
        <span className="text-zinc-300 text-xs font-medium shrink-0">
          {event.actor}
        </span>
        <span className="text-zinc-600 text-xs truncate flex-1">
          {summary}
        </span>
        {expanded ? (
          <ChevronDown className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
        )}
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-0">
          <pre className="rounded-md bg-zinc-900/50 border border-[var(--color-border)] p-3 text-xs text-zinc-400 font-mono overflow-x-auto whitespace-pre-wrap">
            {JSON.stringify(event.payload, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export function FeedPage() {
  const { events: sseEvents, connected } = useSSE("/api/feed/stream", 500);
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
  const [actorFilter, setActorFilter] = useState("");
  const [timeRange, setTimeRange] = useState("");
  const [useSearchEndpoint, setUseSearchEndpoint] = useState(false);

  // Build search URL for backend search
  const searchUrl = useMemo(() => {
    if (!useSearchEndpoint) return null;
    const params = new URLSearchParams();
    if (activeSearch) params.set("q", activeSearch);
    if (actorFilter) params.set("actor", actorFilter);
    if (typeFilters.size === 1) params.set("type", [...typeFilters][0]);
    if (timeRange) params.set("since", timeRange);
    const qs = params.toString();
    return `/feed/search${qs ? `?${qs}` : ""}`;
  }, [useSearchEndpoint, activeSearch, actorFilter, typeFilters, timeRange]);

  const { data: searchResults } = useFetch<FeedEvent[]>(
    searchUrl || "/feed/search?since=1h",
    useSearchEndpoint ? 0 : 999999
  );

  // Toggle type filter
  const toggleType = useCallback((type: string) => {
    setTypeFilters((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  }, []);

  // Handle search submission
  const handleSearch = useCallback(() => {
    setActiveSearch(searchInput);
    if (searchInput) {
      setUseSearchEndpoint(true);
    }
  }, [searchInput]);

  // Filter events client-side (from SSE stream)
  const filteredEvents = useMemo(() => {
    const source = useSearchEndpoint && searchResults ? searchResults : sseEvents;
    let filtered = source;

    // Type filter
    if (typeFilters.size > 0) {
      filtered = filtered.filter((e) => typeFilters.has(e.type));
    }

    // Actor filter (client-side, only when not using search endpoint)
    if (actorFilter && !useSearchEndpoint) {
      filtered = filtered.filter((e) =>
        e.actor.toLowerCase().includes(actorFilter.toLowerCase())
      );
    }

    // Time range (client-side, only when not using search endpoint)
    if (timeRange && !useSearchEndpoint) {
      const match = timeRange.match(/^(\d+)(h)$/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const cutoff = Date.now() - hours * 3_600_000;
        filtered = filtered.filter((e) => new Date(e.ts).getTime() >= cutoff);
      }
    }

    // Regex search (client-side when not using backend)
    if (activeSearch && !useSearchEndpoint) {
      try {
        const re = new RegExp(activeSearch, "i");
        filtered = filtered.filter(
          (e) =>
            re.test(e.type) ||
            re.test(e.actor) ||
            re.test(JSON.stringify(e.payload))
        );
      } catch {
        // Invalid regex, skip filtering
      }
    }

    return filtered;
  }, [
    sseEvents,
    searchResults,
    useSearchEndpoint,
    typeFilters,
    actorFilter,
    timeRange,
    activeSearch,
  ]);

  // Collect unique actors from visible events
  const actors = useMemo(() => {
    const set = new Set<string>();
    for (const e of sseEvents) set.add(e.actor);
    return [...set].sort();
  }, [sseEvents]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchInput("");
    setActiveSearch("");
    setTypeFilters(new Set());
    setActorFilter("");
    setTimeRange("");
    setUseSearchEndpoint(false);
  }, []);

  const hasFilters =
    typeFilters.size > 0 || actorFilter || activeSearch || timeRange;

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
            Feed
          </h2>
          <span
            className={cn(
              "h-2 w-2 rounded-full",
              connected ? "bg-emerald-500" : "bg-red-500"
            )}
          />
          <span className="text-xs text-zinc-600">
            {filteredEvents.length} events
          </span>
        </div>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Filter bar */}
      <div className="space-y-3">
        {/* Search + actor */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-600" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                if (!e.target.value) {
                  setActiveSearch("");
                  setUseSearchEndpoint(false);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSearch();
              }}
              placeholder="Search events (regex)..."
              className="w-full rounded-md border border-[var(--color-border)] bg-[var(--color-card)] pl-9 pr-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)] focus:border-[var(--color-accent)]"
            />
          </div>
          <select
            value={actorFilter}
            onChange={(e) => setActorFilter(e.target.value)}
            className="rounded-md border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:ring-1 focus:ring-[var(--color-accent)]"
          >
            <option value="">All actors</option>
            {actors.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Type pills + time range */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1 flex-wrap">
            {EVENT_TYPES.map((type) => {
              const active = typeFilters.has(type);
              const colors = eventColors[type] || defaultBadge;
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[11px] font-medium transition-colors",
                    active ? colors : "border-transparent text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/50"
                  )}
                >
                  {type}
                </button>
              );
            })}
          </div>
          <div className="flex gap-1 shrink-0 ml-2">
            {TIME_RANGES.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setTimeRange(timeRange === value ? "" : value)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  timeRange === value
                    ? "bg-zinc-800 text-zinc-100 ring-1 ring-zinc-600"
                    : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Event stream */}
      <div className="flex-1 min-h-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] overflow-y-auto">
        {filteredEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-12">
              <p className="text-zinc-500 text-sm">No events match filters</p>
              {hasFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-zinc-600 hover:text-zinc-400 mt-2 transition-colors"
                >
                  Clear all filters
                </button>
              )}
            </div>
          </div>
        ) : (
          [...filteredEvents].reverse().map((evt, i) => (
            <EventRow key={`${evt.ts}-${i}`} event={evt} />
          ))
        )}
      </div>
    </div>
  );
}
