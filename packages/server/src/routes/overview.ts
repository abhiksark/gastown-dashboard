import { Router } from "express";
import { runCli } from "../cli.js";
import { parseAgentsList } from "../parsers.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const [rigsRaw, agentsRaw, beadsRaw, schedulerRaw] = await Promise.all([
      runCli("gt", ["rig", "list", "--json"]),
      runCli("gt", ["agents", "list", "--all"]),
      runCli("bd", ["list", "--json"]),
      runCli("gt", ["scheduler", "status", "--json"]),
    ]);

    const rigs = Array.isArray(rigsRaw) ? rigsRaw : [];
    const agents = typeof agentsRaw === "string" ? parseAgentsList(agentsRaw) : [];
    const beads = Array.isArray(beadsRaw) ? beadsRaw : [];
    const scheduler = schedulerRaw ?? {};

    const completed = beads.filter((b: any) => b.status === "completed" || b.status === "done");

    res.json({
      rigs: { total: rigs.length, items: rigs },
      agents: { total: agents.length, items: agents },
      beads: {
        total: beads.length,
        open: beads.filter((b: any) => b.status === "open").length,
        in_progress: beads.filter((b: any) => b.status === "in_progress" || b.status === "hooked").length,
        completed: completed.length,
      },
      scheduler,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
