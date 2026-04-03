import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

// GET /api/formulas — list all formulas
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["formula", "list", "--json"]);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/formulas/:name — show formula detail with steps
router.get("/:name", async (req, res) => {
  try {
    const data = await runCli("gt", ["formula", "show", req.params.name, "--json"]);
    res.json(data ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/molecules/status — get current molecule status for all known agents
router.get("/molecules/status", async (_req, res) => {
  try {
    // Get list of agents first
    const agentsRaw = await runCli("gt", ["agents", "list", "--all", "--json"]);
    // For now, return the current agent's mol status
    // Individual agent mol status requires target flag
    const current = await runCli("gt", ["mol", "current", "--json"]);
    res.json(current ?? { status: "naked", steps_complete: 0, steps_total: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
