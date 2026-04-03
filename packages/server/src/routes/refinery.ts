import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

// GET /api/refinery/:rig — merge queue for a specific rig
router.get("/:rig", async (req, res) => {
  try {
    const data = await runCli("gt", ["mq", "list", req.params.rig, "--json"]);
    // gt mq list returns null when empty
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/refinery — merge queues for ALL rigs
router.get("/", async (_req, res) => {
  try {
    // First get the list of rigs, then fetch MQ for each
    const rigsRaw = await runCli("gt", ["rig", "list", "--json"]);
    const rigs = Array.isArray(rigsRaw) ? rigsRaw : [];
    const results: Record<string, unknown[]> = {};
    for (const rig of rigs) {
      try {
        const data = await runCli("gt", ["mq", "list", rig.name, "--json"]);
        results[rig.name] = Array.isArray(data) ? data : [];
      } catch {
        results[rig.name] = [];
      }
    }
    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
