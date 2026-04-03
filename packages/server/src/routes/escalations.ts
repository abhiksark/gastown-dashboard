import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

// GET /api/escalations — list all escalations (including closed)
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["escalate", "list", "--all", "--json"]);
    // gt escalate list --json returns null when empty
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/escalations/:id/ack — acknowledge an escalation
router.post("/:id/ack", async (req, res) => {
  try {
    const result = await runAction("gt", ["escalate", "ack", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/escalations/:id/close — close an escalation
router.post("/:id/close", async (req, res) => {
  try {
    const reason = req.body.reason || "Closed from dashboard";
    const result = await runAction("gt", [
      "escalate", "close", req.params.id, "--reason", reason,
    ]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
