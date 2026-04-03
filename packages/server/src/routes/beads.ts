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
    const nodes = beads.map((b: any) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      priority: b.priority,
      issue_type: b.issue_type,
    }));
    const edges: { from: string; to: string }[] = [];
    for (const b of beads) {
      if (Array.isArray(b.dependencies)) {
        for (const dep of b.dependencies) {
          edges.push({ from: dep.depends_on_id, to: dep.issue_id });
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
