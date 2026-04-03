import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

// GET /api/costs — all session costs (live)
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["costs", "--json"], 5000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/by-agent — costs grouped by worker/role
router.get("/by-agent", async (_req, res) => {
  try {
    const data = await runCli("gt", ["costs", "--by-role", "--json"], 5000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/by-rig — costs grouped by rig
router.get("/by-rig", async (_req, res) => {
  try {
    const data = await runCli("gt", ["costs", "--by-rig", "--json"], 5000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/today — today's costs
router.get("/today", async (_req, res) => {
  try {
    const data = await runCli("gt", ["costs", "--today", "--json"], 5000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/week — this week's costs
router.get("/week", async (_req, res) => {
  try {
    const data = await runCli("gt", ["costs", "--week", "--json"], 5000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
