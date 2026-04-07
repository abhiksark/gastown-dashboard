import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

// GET /api/mountains — list active mountains with progress
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["mountain", "status", "--json"]);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mountains/:id — detailed mountain with waves
router.get("/:id", async (req, res) => {
  try {
    const data = await runCli("gt", ["mountain", "status", req.params.id, "--json"]);
    res.json(data ?? {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mountains/:id/pause — pause a mountain
router.post("/:id/pause", async (req, res) => {
  try {
    const result = await runAction("gt", ["mountain", "pause", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mountains/:id/resume — resume a paused mountain
router.post("/:id/resume", async (req, res) => {
  try {
    const result = await runAction("gt", ["mountain", "resume", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mountains/activate — activate a mountain from an epic
router.post("/activate", async (req, res) => {
  try {
    const { epic } = req.body;
    if (!epic) {
      res.status(400).json({ error: "epic id is required" });
      return;
    }
    const result = await runAction("gt", ["mountain", epic, "--force"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mountains/:id/cancel — cancel a mountain
router.post("/:id/cancel", async (req, res) => {
  try {
    const result = await runAction("gt", ["mountain", "cancel", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
