import { useState, useEffect, useRef } from "react";
import type { FeedEvent } from "@/lib/types";

export function useSSE(url: string, maxEvents = 200) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource(url);
    esRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (e) => {
      try {
        const event: FeedEvent = JSON.parse(e.data);
        setEvents((prev) => {
          const next = [...prev, event];
          return next.length > maxEvents ? next.slice(-maxEvents) : next;
        });
      } catch {
        // Skip malformed events
      }
    };

    es.onerror = () => {
      setConnected(false);
    };

    return () => {
      es.close();
    };
  }, [url, maxEvents]);

  return { events, connected };
}
