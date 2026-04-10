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

// POST /api/actions/hook — hook a bead to an agent
router.post("/hook", async (req, res) => {
  try {
    const { bead, target } = req.body;
    if (!bead || !target) {
      res.status(400).json({ error: "bead and target are required" });
      return;
    }
    const result = await runAction("gt", ["hook", bead, target]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/actions/unhook — clear an agent's hook
router.post("/unhook", async (req, res) => {
  try {
    const { target } = req.body;
    if (!target) {
      res.status(400).json({ error: "target is required" });
      return;
    }
    const result = await runAction("gt", ["hook", "clear", target]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/actions/assign — create bead and hook to crew
router.post("/assign", async (req, res) => {
  try {
    const { crew, title, description, priority, rig, labels } = req.body;
    if (!crew || !title) {
      res.status(400).json({ error: "crew and title are required" });
      return;
    }
    const args = ["assign", crew, title];
    if (description) args.push("-d", description);
    if (priority !== undefined) args.push("--priority", String(priority));
    if (rig) args.push("--rig", rig);
    if (labels) args.push("-l", labels);
    args.push("--force");
    const result = await runAction("gt", args);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/actions/handoff/:rig/:name — trigger handoff for an agent
router.post("/handoff/:rig/:name", async (req, res) => {
  try {
    const target = `${req.params.rig}/${req.params.name}`;
    const result = await runAction("gt", ["nudge", target, "--mode", "queue", "gt handoff"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/actions/done/:rig/:name — trigger done for a polecat
router.post("/done/:rig/:name", async (req, res) => {
  try {
    const target = `${req.params.rig}/${req.params.name}`;
    const result = await runAction("gt", ["nudge", target, "--mode", "queue", "gt done"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
