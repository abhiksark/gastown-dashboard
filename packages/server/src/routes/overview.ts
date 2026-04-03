import { Router } from "express";
import { runCli } from "../cli.js";
import { parseAgentsList } from "../parsers.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const [rigsRaw, agentsRaw, beadsRaw, schedulerRaw] = await Promise.all([
      runCli("gt", ["rig", "list", "--json"]),
      runCli("gt", ["agents", "list", "--all"]),
      runCli("bd", ["list", "--all", "--json"]),
      runCli("gt", ["scheduler", "status", "--json"]),
    ]);

    const rigs = Array.isArray(rigsRaw) ? rigsRaw : [];
    const agents = typeof agentsRaw === "string" ? parseAgentsList(agentsRaw) : [];
    const beads = Array.isArray(beadsRaw) ? beadsRaw : [];
    const scheduler = schedulerRaw ?? {};

    // Filter out ephemeral wisps for the count
    const workBeads = beads.filter((b: any) => !b.ephemeral);

    res.json({
      rigs: { total: rigs.length, items: rigs },
      agents: { total: agents.length, items: agents },
      beads: {
        total: workBeads.length,
        open: workBeads.filter((b: any) => b.status === "open").length,
        hooked: workBeads.filter((b: any) => b.status === "hooked").length,
        closed: workBeads.filter((b: any) => b.status === "closed").length,
      },
      scheduler,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
