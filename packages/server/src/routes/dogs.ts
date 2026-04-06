import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

// GET /api/dogs — list all dogs
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["dog", "list", "--json"]);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dogs/health — health check (zombie/hung/orphan detection)
router.get("/health", async (_req, res) => {
  try {
    const data = await runCli("gt", ["dog", "health-check", "--json"]);
    res.json(data ?? { dogs: [], needs_attention: 0 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/dogs/:name — detailed dog status
router.get("/:name", async (req, res) => {
  try {
    const data = await runCli("gt", ["dog", "status", req.params.name, "--json"]);
    res.json(data ?? {});
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dogs/:name/call — wake idle dog
router.post("/:name/call", async (req, res) => {
  try {
    const result = await runAction("gt", ["dog", "call", req.params.name]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/dogs/:name/clear — reset stuck dog
router.post("/:name/clear", async (req, res) => {
  try {
    const result = await runAction("gt", ["dog", "clear", req.params.name]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
