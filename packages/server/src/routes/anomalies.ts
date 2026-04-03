import { Router, Request, Response } from "express";
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import path from "node:path";
import { runCli } from "../cli.js";

const router = Router();

const GT_HOME = process.env.GT_HOME || path.join(homedir(), "gt");
const EVENTS_FILE = path.join(GT_HOME, ".events.jsonl");

interface Anomaly {
  id: string;
  type: "stuck_agent" | "high_error_rate" | "zombie_session" | "overloaded_rig";
  severity: "critical" | "high" | "medium";
  description: string;
  affected: string;
  detected_at: string;
  suggested_action: string;
}

interface EventLine {
  ts: string;
  source?: string;
  type?: string;
  actor?: string;
  payload?: Record<string, unknown>;
}

async function readRecentEvents(sinceMs: number): Promise<EventLine[]> {
  if (!existsSync(EVENTS_FILE)) return [];
  const cutoff = Date.now() - sinceMs;
  const events: EventLine[] = [];
  const stream = createReadStream(EVENTS_FILE, { encoding: "utf-8" });
  const rl = createInterface({ input: stream });
  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const ev = JSON.parse(line) as EventLine;
      if (new Date(ev.ts).getTime() >= cutoff) {
        events.push(ev);
      }
    } catch {
      // skip malformed
    }
  }
  return events;
}

// GET /api/anomalies — detect and return current anomalies
router.get("/", async (_req: Request, res: Response) => {
  try {
    const anomalies: Anomaly[] = [];
    const now = new Date();
    let counter = 0;

    // Fetch data in parallel
    const [recentEvents, beadsRaw, sessionsRaw, rigsRaw] = await Promise.all([
      readRecentEvents(60 * 60 * 1000), // last hour
      runCli("bd", ["list", "--all", "--json"]).catch(() => []),
      runCli("gt", ["session", "list", "--json"]).catch(() => []),
      runCli("gt", ["rig", "list", "--json"]).catch(() => []),
    ]);

    const beads = Array.isArray(beadsRaw) ? beadsRaw : [];
    const sessions = Array.isArray(sessionsRaw) ? sessionsRaw : [];
    const rigs = Array.isArray(rigsRaw) ? rigsRaw : [];

    // --- Stuck agents: hooked bead + no events from that agent in 30min ---
    const hookedBeads = beads.filter((b: any) => b.status === "hooked" && b.assignee);
    const thirtyMinAgo = Date.now() - 30 * 60 * 1000;

    for (const bead of hookedBeads) {
      const assignee = (bead as any).assignee as string;
      const agentEvents = recentEvents.filter(
        (e) => (e.actor === assignee || e.source === assignee) &&
               new Date(e.ts).getTime() > thirtyMinAgo
      );
      if (agentEvents.length === 0) {
        anomalies.push({
          id: `anomaly-stuck-${++counter}`,
          type: "stuck_agent",
          severity: "high",
          description: `${assignee} has hooked bead ${(bead as any).id} but no activity in 30min`,
          affected: assignee,
          detected_at: now.toISOString(),
          suggested_action: "Check agent session health or nudge the agent",
        });
      }
    }

    // --- High error rate: >5 errors in last hour ---
    const errorEvents = recentEvents.filter((e) => e.type === "error");
    if (errorEvents.length > 5) {
      // Group by actor/source
      const bySource: Record<string, EventLine[]> = {};
      for (const ev of errorEvents) {
        const key = ev.actor || ev.source || "unknown";
        (bySource[key] ??= []).push(ev);
      }
      for (const [source, events] of Object.entries(bySource)) {
        if (events.length > 5) {
          anomalies.push({
            id: `anomaly-errors-${++counter}`,
            type: "high_error_rate",
            severity: "critical",
            description: `${events.length} errors from ${source} in the last hour`,
            affected: source,
            detected_at: now.toISOString(),
            suggested_action: "Check error logs and escalation history",
          });
        }
      }
      // Also flag if total errors > 5 even if no single source exceeds threshold
      if (anomalies.filter((a) => a.type === "high_error_rate").length === 0) {
        anomalies.push({
          id: `anomaly-errors-${++counter}`,
          type: "high_error_rate",
          severity: "high",
          description: `${errorEvents.length} errors across the system in the last hour`,
          affected: "system",
          detected_at: now.toISOString(),
          suggested_action: "Review recent error events in the feed",
        });
      }
    }

    // --- Zombie sessions: session running but no recent activity ---
    for (const session of sessions) {
      const s = session as any;
      if (!s.running) continue;
      const agent = s.polecat ? `${s.rig}/polecats/${s.polecat}` : s.rig;
      const agentEvents = recentEvents.filter(
        (e) => (e.actor === agent || e.source === agent || e.actor?.includes(s.polecat || "")) &&
               new Date(e.ts).getTime() > thirtyMinAgo
      );
      if (agentEvents.length === 0) {
        anomalies.push({
          id: `anomaly-zombie-${++counter}`,
          type: "zombie_session",
          severity: "medium",
          description: `Session ${s.session_id?.slice(0, 8) || "unknown"} for ${agent} is running but idle`,
          affected: agent,
          detected_at: now.toISOString(),
          suggested_action: "Check if session is stuck or needs restart",
        });
      }
    }

    // --- Overloaded rigs: >3 active polecats ---
    for (const rig of rigs) {
      const r = rig as any;
      if (r.polecats > 3) {
        anomalies.push({
          id: `anomaly-overload-${++counter}`,
          type: "overloaded_rig",
          severity: "medium",
          description: `Rig ${r.name} has ${r.polecats} active polecats (threshold: 3)`,
          affected: r.name,
          detected_at: now.toISOString(),
          suggested_action: "Consider load balancing or deferring new work",
        });
      }
    }

    // Sort by severity: critical > high > medium
    const sevOrder: Record<string, number> = { critical: 0, high: 1, medium: 2 };
    anomalies.sort((a, b) => (sevOrder[a.severity] ?? 9) - (sevOrder[b.severity] ?? 9));

    res.json(anomalies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/anomalies/heatmap — activity heatmap data (daily event counts)
router.get("/heatmap", async (req: Request, res: Response) => {
  try {
    const weeks = Math.min(parseInt(req.query.weeks as string) || 12, 52);
    const days = weeks * 7;
    const sinceMs = days * 24 * 60 * 60 * 1000;
    const events = await readRecentEvents(sinceMs);

    // Bucket events by day
    const buckets: Record<string, number> = {};
    const now = new Date();

    // Pre-fill all days with 0
    for (let d = days - 1; d >= 0; d--) {
      const date = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      buckets[key] = 0;
    }

    for (const ev of events) {
      const key = ev.ts.slice(0, 10);
      if (key in buckets) {
        buckets[key]++;
      }
    }

    // Convert to sorted array
    const heatmap = Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date, count }));

    res.json(heatmap);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
