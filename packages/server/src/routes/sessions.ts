import { Router } from "express";
import { runCli, runAction } from "../cli.js";

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

// POST /api/sessions/:rig/:name/restart — restart a polecat session
router.post("/:rig/:name/restart", async (req, res) => {
  try {
    const target = `${req.params.rig}/polecats/${req.params.name}`;
    const data = await runCli("gt", ["session", "restart", target, "--json"], 10000);
    res.json(data ?? { status: "restarted" });
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

// GET /api/sessions/:rig/:name/output — capture terminal output
router.get("/:rig/:name/output", async (req, res) => {
  try {
    const lines = Math.min(Number(req.query.lines) || 100, 1000);
    const target = `${req.params.rig}/${req.params.name}`;
    const result = await runAction("gt", ["session", "capture", target, "-n", String(lines)]);
    res.json({ output: result.stdout, lines });
  } catch (err: any) {
    res.status(500).json({ error: err.message, output: "" });
  }
});

// GET /api/sessions/mayor/output — capture mayor session output
router.get("/mayor/output", async (req, res) => {
  try {
    const lines = Math.min(Number(req.query.lines) || 100, 1000);
    // Mayor session name pattern: hq-mayor
    const { execFile } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const exec = promisify(execFile);
    const { stdout } = await exec("tmux", [
      "capture-pane", "-t", "hq-mayor", "-p", "-S", `-${lines}`,
    ], { timeout: 5000 });
    res.json({ output: stdout, lines });
  } catch (err: any) {
    res.status(500).json({ error: "Mayor session not found or not running", output: "" });
  }
});

export default router;
