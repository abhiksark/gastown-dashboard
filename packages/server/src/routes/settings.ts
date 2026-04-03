import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

// GET /api/settings/agents — agent presets
router.get("/agents", async (_req, res) => {
  try {
    const data = await runCli("gt", ["config", "agent", "list", "--json"]);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/scheduler — scheduler status
router.get("/scheduler", async (_req, res) => {
  try {
    const data = await runCli("gt", ["scheduler", "status", "--json"], 3000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/scheduler/pause
router.post("/scheduler/pause", async (_req, res) => {
  try {
    const result = await runAction("gt", ["scheduler", "pause"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/settings/scheduler/resume
router.post("/scheduler/resume", async (_req, res) => {
  try {
    const result = await runAction("gt", ["scheduler", "resume"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/rigs — rig configs
router.get("/rigs", async (_req, res) => {
  try {
    const data = await runCli("gt", ["rig", "list", "--json"]);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/settings/info — town info
router.get("/info", async (_req, res) => {
  try {
    const data = await runCli("gt", ["info", "--json"], 10000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
