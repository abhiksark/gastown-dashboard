import { Router } from "express";
import { createReadStream, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import path from "node:path";
import { runCli, runAction } from "../cli.js";
import { parseAgentsList } from "../parsers.js";

const router = Router();

const EVENTS_FILE = path.join(
  process.env.GT_HOME || path.join(homedir(), "gt"),
  ".events.jsonl"
);

router.get("/", async (_req, res) => {
  try {
    const raw = await runCli("gt", ["agents", "list", "--all"]);
    const agents = typeof raw === "string" ? parseAgentsList(raw) : [];
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:name/feed", async (req, res) => {
  try {
    const agentName = req.params.name;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);

    if (!existsSync(EVENTS_FILE)) {
      return res.json([]);
    }

    const events: unknown[] = [];
    const stream = createReadStream(EVENTS_FILE, { encoding: "utf-8" });
    const rl = createInterface({ input: stream });

    for await (const line of rl) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line);
        if (event.actor === agentName) {
          events.push(event);
        }
      } catch {
        // skip malformed lines
      }
    }

    // Return the most recent events up to limit
    res.json(events.slice(-limit));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:name/hook", async (req, res) => {
  try {
    const data = await runCli("gt", ["hook", "show", req.params.name, "--json"]);
    res.json(data ?? { agent: req.params.name, status: "empty" });
  } catch (err: any) {
    res.json({ agent: req.params.name, status: "empty" });
  }
});

router.post("/:name/nudge", async (req, res) => {
  try {
    const { name } = req.params;
    const message = req.body.message || "Nudge from dashboard";
    const result = await runAction("gt", ["nudge", name, "--mode", "queue", message]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
