import { useState, useEffect, useCallback, useRef } from "react";
import { apiFetch } from "@/lib/api";
import type { FeedEvent } from "@/lib/types";

// --- Shared SSE connection (singleton) ---

type SSEListener = (event: FeedEvent) => void;
type StatusListener = (connected: boolean) => void;

let sharedES: EventSource | null = null;
let refCount = 0;
const eventListeners = new Set<SSEListener>();
const statusListeners = new Set<StatusListener>();
let sseConnected = false;

function notifyStatus(connected: boolean) {
  sseConnected = connected;
  for (const l of statusListeners) l(connected);
}

function sseSubscribe(listener: SSEListener): () => void {
  eventListeners.add(listener);
  refCount++;

  if (!sharedES) {
    const es = new EventSource("/api/feed/stream");
    sharedES = es;

    es.onopen = () => notifyStatus(true);

    es.onmessage = (e) => {
      try {
        const event: FeedEvent = JSON.parse(e.data);
        for (const l of eventListeners) l(event);
      } catch {
        // skip malformed
      }
    };

    es.onerror = () => {
      notifyStatus(false);
      // EventSource auto-reconnects; onopen will fire again
    };
  }

  return () => {
    eventListeners.delete(listener);
    refCount--;
    if (refCount === 0 && sharedES) {
      sharedES.close();
      sharedES = null;
      notifyStatus(false);
    }
  };
}

// --- Event-to-path relevance mapping ---

type EventCategory = "bead" | "agent" | "session" | "escalation";

const EVENT_CATEGORIES: Record<string, EventCategory[]> = {
  slung: ["bead"],
  hooked: ["bead"],
  completed: ["bead", "agent"],
  done: ["bead", "agent", "session"],
  session_start: ["session", "agent"],
  nudge: ["agent"],
  error: ["escalation"],
  escalation: ["escalation"],
};

function pathCategories(path: string): EventCategory[] | null {
  if (path.includes("/beads")) return ["bead"];
  if (path.includes("/agents")) return ["agent"];
  if (path.includes("/sessions")) return ["session"];
  if (path.includes("/escalations")) return ["escalation"];
  // overview and rigs benefit from all events
  return null;
}

function isRelevant(event: FeedEvent, categories: EventCategory[] | null): boolean {
  if (!categories) return true; // null = refetch on any event
  const eventCats = EVENT_CATEGORIES[event.type];
  if (!eventCats) return true; // unknown event type = refetch to be safe
  return eventCats.some((c) => categories.includes(c));
}

// --- useRealtime hook ---

interface UseRealtimeResult<T> {
  data: T | null;
  error: string | null;
  loading: boolean;
  refetch: () => void;
}

export function useRealtime<T>(
  path: string,
  pollIntervalMs = 5000
): UseRealtimeResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const lastFetchRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectedRef = useRef(false);

  const fetchData = useCallback(async () => {
    try {
      const result = await apiFetch<T>(path);
      setData(result);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [path]);

  // Debounced refetch: max once per 2 seconds
  const debouncedRefetch = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastFetchRef.current;

    if (elapsed >= 2000) {
      lastFetchRef.current = now;
      fetchData();
    } else {
      // Schedule for later if not already scheduled
      if (!timerRef.current) {
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          lastFetchRef.current = Date.now();
          fetchData();
        }, 2000 - elapsed);
      }
    }
  }, [fetchData]);

  useEffect(() => {
    // Initial fetch
    fetchData();

    const categories = pathCategories(path);

    // Subscribe to SSE events
    const unsubEvents = sseSubscribe((event) => {
      if (isRelevant(event, categories)) {
        debouncedRefetch();
      }
    });

    // Track connection state for fallback polling
    const onStatus = (connected: boolean) => {
      connectedRef.current = connected;
      if (connected) {
        // SSE reconnected — stop polling, do one refetch
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
        debouncedRefetch();
      } else {
        // SSE disconnected — start fallback polling
        if (!pollRef.current) {
          pollRef.current = setInterval(fetchData, pollIntervalMs);
        }
      }
    };
    statusListeners.add(onStatus);

    // If SSE isn't connected yet, start polling immediately as fallback
    if (!sseConnected) {
      pollRef.current = setInterval(fetchData, pollIntervalMs);
    }

    return () => {
      unsubEvents();
      statusListeners.delete(onStatus);
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [path, pollIntervalMs, fetchData, debouncedRefetch]);

  return { data, error, loading, refetch: fetchData };
}

// --- useRealtimeStatus hook (for status bar) ---

export type ConnectionStatus = "live" | "polling" | "offline";

export function useRealtimeStatus(): ConnectionStatus {
  const [connected, setConnected] = useState(sseConnected);
  const [fetchOk, setFetchOk] = useState(true);

  useEffect(() => {
    const onStatus = (c: boolean) => setConnected(c);
    statusListeners.add(onStatus);
    return () => { statusListeners.delete(onStatus); };
  }, []);

  // Periodic health check when SSE is disconnected
  useEffect(() => {
    if (connected) {
      setFetchOk(true);
      return;
    }
    const check = async () => {
      try {
        const res = await fetch("/api/overview");
        setFetchOk(res.ok);
      } catch {
        setFetchOk(false);
      }
    };
    check();
    const id = setInterval(check, 10000);
    return () => clearInterval(id);
  }, [connected]);

  if (connected) return "live";
  if (fetchOk) return "polling";
  return "offline";
}
