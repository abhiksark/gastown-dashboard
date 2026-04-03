import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

// GET /api/sessions — list all sessions
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["session", "list", "--json"], 3000);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/sessions/:rig/:name/health — health check for specific session
router.get("/:rig/:name/health", async (req, res) => {
  try {
    const data = await runCli("gt", ["session", "check", req.params.rig, "--json"], 3000);
    res.json(data ?? { status: "unknown" });
  } catch (err: any) {
    // session check may not support --json
    try {
      const text = await runCli("gt", ["session", "check", req.params.rig], 3000);
      res.json({ status: "checked", output: String(text) });
    } catch {
      res.json({ status: "unknown" });
    }
  }
});

// GET /api/polecats/:rig — list polecats in a rig
router.get("/polecats/:rig", async (req, res) => {
  try {
    const data = await runCli("gt", ["polecat", "list", req.params.rig, "--json"]);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/polecats/:rig/:name — detailed polecat status
router.get("/polecats/:rig/:name", async (req, res) => {
  try {
    const target = `${req.params.rig}/${req.params.name}`;
    const data = await runCli("gt", ["polecat", "status", target, "--json"]);
    res.json(data ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/witness/:rig — witness health for a rig
router.get("/witness/:rig", async (req, res) => {
  try {
    const data = await runCli("gt", ["witness", "status", req.params.rig, "--json"]);
    res.json(data ?? { running: false, rig_name: req.params.rig });
  } catch (err: any) {
    res.json({ running: false, rig_name: req.params.rig });
  }
});

export default router;
