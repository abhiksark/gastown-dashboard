import { Router } from "express";
import { runCli, runAction } from "../cli.js";
import { parseAgentsList } from "../parsers.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const raw = await runCli("gt", ["agents", "list", "--all"]);
    const agents = typeof raw === "string" ? parseAgentsList(raw) : [];
    res.json(agents);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/:name/nudge", async (req, res) => {
  try {
    const { name } = req.params;
    const message = req.body.message || "Nudge from dashboard";
    const result = await runAction("gt", ["nudge", name, "--mode", "queue", message]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
