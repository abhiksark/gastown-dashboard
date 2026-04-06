import { Router, Request, Response } from "express";
import { runCli } from "../cli.js";
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import path from "node:path";

const router = Router();

const EVENTS_FILE = path.join(
  process.env.GT_HOME || path.join(homedir(), "gt"),
  ".events.jsonl"
);

// GET /api/patrols/active — latest patrol scan results per rig
router.get("/active", async (_req: Request, res: Response) => {
  try {
    const data = await runCli("gt", ["patrol", "scan", "--json"]);
    res.json(data ?? { zombies: { checked: 0, found: 0 }, stalls: { checked: 0, found: 0 }, completions: { checked: 0, found: 0 } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/patrols/events — recent patrol-related events from .events.jsonl
router.get("/events", async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 100;

  if (!existsSync(EVENTS_FILE)) {
    res.json([]);
    return;
  }

  const results: unknown[] = [];
  const stream = createReadStream(EVENTS_FILE, { encoding: "utf-8" });
  const rl = createInterface({ input: stream });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);
      // Match patrol events by:
      // 1. subject containing "patrol" (handoff events)
      // 2. topic being "patrol" (session_start events)
      // 3. actor being a witness/refinery/deacon role
      const subject = (event.payload?.subject || "").toLowerCase();
      const topic = (event.payload?.topic || "").toLowerCase();
      const actor = (event.actor || "").toLowerCase();

      const isPatrol =
        subject.includes("patrol") ||
        topic === "patrol" ||
        (actor.includes("witness") && (event.type === "handoff" || event.type === "session_start")) ||
        (actor.includes("refinery") && (event.type === "handoff" || event.type === "session_start")) ||
        (actor === "deacon" && (event.type === "handoff" || event.type === "session_start"));

      if (isPatrol) {
        results.push(event);
      }
    } catch {
      // Skip malformed lines
    }
  }

  // Return most recent events first, limited
  res.json(results.reverse().slice(0, limit));
});

// GET /api/patrols/digest?date=YYYY-MM-DD — preview patrol digest for a date
router.get("/digest", async (req: Request, res: Response) => {
  const date = req.query.date as string;
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    res.status(400).json({ error: "date parameter required (YYYY-MM-DD)" });
    return;
  }

  try {
    const data = await runCli("gt", ["patrol", "digest", "--date", date, "--dry-run"]);
    res.json(data ?? { date, digests: [] });
  } catch (err: any) {
    // "No patrol digests found" is not an error — return empty
    if (err.message?.includes("No patrol digests")) {
      res.json({ date, digests: [] });
      return;
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
