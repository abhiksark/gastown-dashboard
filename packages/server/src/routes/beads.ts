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

    // Filter using structured fields, not title string matching
    const meaningful = beads.filter((b: any) => {
      if (b.ephemeral) return false;
      if (b.issue_type === "message") return false;
      return true;
    });

    // Cap at 200 nodes for d3 performance
    const capped = meaningful.slice(0, 200);
    const nodeIds = new Set(capped.map((b: any) => b.id));

    const nodes = capped.map((b: any) => ({
      id: b.id,
      title: b.title,
      status: b.status,
      priority: b.priority,
      issue_type: b.issue_type,
    }));

    // Fetch real dependency data for beads that have deps
    const withDeps = capped.filter((b: any) => (b.dependency_count ?? 0) > 0 || (b.dependent_count ?? 0) > 0);
    const edges: { from: string; to: string; type: string }[] = [];

    if (withDeps.length > 0) {
      // Batch fetch deps for all beads with dependencies
      const ids = withDeps.map((b: any) => b.id);
      try {
        const depData = await runCli("bd", ["dep", "list", ...ids, "--json"]);
        if (Array.isArray(depData)) {
          for (const dep of depData) {
            const fromId = dep.depends_on_id || dep.id;
            const toId = dep.issue_id || dep.dependent_id;
            if (fromId && toId && nodeIds.has(fromId) && nodeIds.has(toId)) {
              edges.push({ from: fromId, to: toId, type: dep.dependency_type || "blocks" });
            }
          }
        }
      } catch {
        // dep list may fail if no deps exist — that's fine
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
