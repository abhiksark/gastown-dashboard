import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const args = ["list", "--json"];
    if (req.query.all === "true") {
      args.push("--all");
    }
    if (req.query.status) {
      args.push("--status", req.query.status as string);
    }
    const data = await runCli("bd", args);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/graph", async (req, res) => {
  try {
    const raw = await runCli("bd", ["list", "--all", "--json"]);
    const beads = Array.isArray(raw) ? raw : [];

    // Filter: exclude ephemeral wisps and system beads to keep graph usable
    // Only include non-ephemeral beads, or beads that have dependencies
    const meaningful = beads.filter((b: any) => {
      if (b.ephemeral) return false;
      if (b.title?.startsWith("mol-")) return false;
      if (b.title?.includes("HANDOFF")) return false;
      if (b.title?.startsWith("dog-")) return false;
      // Include if it has deps, or is a real work bead
      return true;
    });

    // Cap at 200 nodes to keep d3 performant
    const capped = meaningful.slice(0, 200);
    const nodeIds = new Set(capped.map((b: any) => b.id));

    const nodes = capped.map((b: any) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      priority: b.priority,
      issue_type: b.issue_type,
    }));

    const edges: { from: string; to: string }[] = [];
    for (const b of capped) {
      if (Array.isArray(b.dependencies)) {
        for (const dep of b.dependencies) {
          // Only include edges where both nodes are in the graph
          if (nodeIds.has(dep.depends_on_id) && nodeIds.has(dep.issue_id)) {
            edges.push({ from: dep.depends_on_id, to: dep.issue_id });
          }
        }
      }
    }
    res.json({ nodes, edges });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const all = await runCli("bd", ["list", "--json"]);
    const beads = Array.isArray(all) ? all : [];
    const bead = beads.find((b: any) => b.id === req.params.id);
    res.json(bead ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
