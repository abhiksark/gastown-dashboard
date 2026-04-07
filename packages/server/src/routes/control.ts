import { Router } from "express";
import { runAction } from "../cli.js";

const router = Router();

// POST /api/control/witness/:rig/start
router.post("/witness/:rig/start", async (req, res) => {
  try {
    const result = await runAction("gt", ["witness", "start", req.params.rig]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/control/witness/:rig/stop
router.post("/witness/:rig/stop", async (req, res) => {
  try {
    const result = await runAction("gt", ["witness", "stop", req.params.rig]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/control/witness/:rig/restart
router.post("/witness/:rig/restart", async (req, res) => {
  try {
    const result = await runAction("gt", ["witness", "restart", req.params.rig]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/control/session/:rig/:name/restart
router.post("/session/:rig/:name/restart", async (req, res) => {
  try {
    const target = `${req.params.rig}/${req.params.name}`;
    const result = await runAction("gt", ["session", "restart", target]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/control/polecat/:rig/:name/nuke
router.post("/polecat/:rig/:name/nuke", async (req, res) => {
  try {
    if (!req.body.confirm) {
      res.status(400).json({ error: "confirmation required" });
      return;
    }
    const target = `${req.params.rig}/${req.params.name}`;
    const result = await runAction("gt", ["polecat", "nuke", target]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/control/refinery/:rig/start
router.post("/refinery/:rig/start", async (req, res) => {
  try {
    const result = await runAction("gt", ["refinery", "start", req.params.rig]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/control/refinery/:rig/stop
router.post("/refinery/:rig/stop", async (req, res) => {
  try {
    const result = await runAction("gt", ["refinery", "stop", req.params.rig]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/control/crew/:rig/:name/start
router.post("/crew/:rig/:name/start", async (req, res) => {
  try {
    const target = `${req.params.rig}/${req.params.name}`;
    const result = await runAction("gt", ["start", "crew", target]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
