import { Router } from "express";
import { runAction } from "../cli.js";

const router = Router();

// POST /api/beads/create — create a new bead
router.post("/beads/create", async (req, res) => {
  try {
    const { title, description, priority, assignee, labels } = req.body;
    if (!title) {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const args = ["create", title];
    if (description) args.push("-d", description);
    if (priority !== undefined) args.push("-p", String(priority));
    if (assignee) args.push("-a", assignee);
    if (labels) args.push("-l", labels);
    const result = await runAction("bd", args);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sling — sling a bead to a target
router.post("/sling", async (req, res) => {
  try {
    const { beadId, target, merge } = req.body;
    if (!beadId || !target) {
      res.status(400).json({ error: "beadId and target are required" });
      return;
    }
    const args = ["sling", beadId, target];
    if (merge) args.push(`--merge=${merge}`);
    const result = await runAction("gt", args);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/beads/:id/close — close a bead
router.post("/beads/:id/close", async (req, res) => {
  try {
    const reason = req.body.reason || "Closed from dashboard";
    const result = await runAction("bd", ["close", req.params.id, "--reason", reason]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
