import { useEffect } from "react";
import { sseSubscribe } from "./use-realtime";
import type { FeedEvent } from "@/lib/types";

/**
 * Watches SSE events and fires browser notifications for critical events.
 * Must be called at App level to stay mounted.
 */
export function useNotificationWatcher(
  sendNotification: (title: string, body?: string) => void
) {
  useEffect(() => {
    const handler = (event: FeedEvent) => {
      // Escalation with critical severity
      if (
        event.type === "escalation" &&
        (event.payload?.severity === "critical" || event.payload?.severity === "high")
      ) {
        const desc = (event.payload?.description as string) || "New escalation";
        sendNotification(
          `Escalation: ${event.payload?.severity}`,
          `${desc} — ${event.actor || event.source}`
        );
        return;
      }

      // Convoy completed
      if (event.type === "completed" && event.source?.includes("convoy")) {
        sendNotification(
          "Convoy completed",
          `${event.payload?.title || event.source} finished`
        );
        return;
      }

      // Error events (agent stuck, failures)
      if (event.type === "error") {
        const msg = (event.payload?.message as string) || (event.payload?.error as string) || "Error occurred";
        sendNotification(
          `Error: ${event.actor || event.source}`,
          msg
        );
        return;
      }
    };

    return sseSubscribe(handler);
  }, [sendNotification]);
}
