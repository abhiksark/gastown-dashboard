import { Router } from "express";
import { runAction } from "../cli.js";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

const router = Router();
const GT_HOME = process.env.GT_HOME || path.join(homedir(), "gt");
const ESTOP_FILE = path.join(GT_HOME, ".estop");

// GET /api/town/status — check if town is frozen (estop active)
router.get("/status", (_req, res) => {
  const frozen = existsSync(ESTOP_FILE);
  res.json({ frozen });
});

// POST /api/town/estop — emergency stop all agents
router.post("/estop", async (_req, res) => {
  try {
    const result = await runAction("gt", ["estop"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/town/thaw — resume after estop
router.post("/thaw", async (_req, res) => {
  try {
    const result = await runAction("gt", ["thaw"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/town/shutdown — full town shutdown
router.post("/shutdown", async (_req, res) => {
  try {
    const result = await runAction("gt", ["shutdown"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/town/start — start town (deacon + mayor)
router.post("/start", async (_req, res) => {
  try {
    const result = await runAction("gt", ["start"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/town/broadcast — broadcast message to workers
router.post("/broadcast", async (req, res) => {
  try {
    const { message, rig, all } = req.body;
    if (!message) {
      res.status(400).json({ error: "message is required" });
      return;
    }
    const args = ["broadcast", message];
    if (rig) args.push("--rig", rig);
    if (all) args.push("--all");
    const result = await runAction("gt", args);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
