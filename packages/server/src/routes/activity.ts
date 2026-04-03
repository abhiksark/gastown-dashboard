import { Router, Request, Response } from "express";
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import path from "node:path";

const router = Router();

const EVENTS_FILE = path.join(
  process.env.GT_HOME || path.join(homedir(), "gt"),
  ".events.jsonl"
);

interface SearchQuery {
  q?: string;
  actor?: string;
  type?: string;
  since?: string;
}

function parseSince(since: string): number {
  const now = Date.now();
  const match = since.match(/^(\d+)(m|h|d)$/);
  if (!match) return 0;
  const [, value, unit] = match;
  const ms: Record<string, number> = { m: 60_000, h: 3_600_000, d: 86_400_000 };
  return now - parseInt(value, 10) * (ms[unit] || 0);
}

router.get("/search", async (req: Request, res: Response) => {
  const { q, actor, type, since } = req.query as SearchQuery;

  if (!existsSync(EVENTS_FILE)) {
    res.json([]);
    return;
  }

  const sinceTs = since ? parseSince(since) : 0;
  let regex: RegExp | null = null;
  if (q) {
    try {
      regex = new RegExp(q, "i");
    } catch {
      res.status(400).json({ error: "Invalid regex pattern" });
      return;
    }
  }

  const results: unknown[] = [];
  const stream = createReadStream(EVENTS_FILE, { encoding: "utf-8" });
  const rl = createInterface({ input: stream });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      const event = JSON.parse(line);

      // Time filter
      if (sinceTs && new Date(event.ts).getTime() < sinceTs) continue;

      // Actor filter
      if (actor && event.actor !== actor) continue;

      // Type filter
      if (type && event.type !== type) continue;

      // Regex search across the full line
      if (regex && !regex.test(line)) continue;

      results.push(event);
    } catch {
      // Skip malformed lines
    }
  }

  res.json(results);
});

export default router;
