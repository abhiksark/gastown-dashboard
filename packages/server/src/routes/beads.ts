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

    // Fetch real dependency data via bd dep list
    // Only beads with dependency_count > 0 have outgoing deps worth fetching
    const withDeps = capped.filter((b: any) => (b.dependency_count ?? 0) > 0);
    const edges: { from: string; to: string; type: string }[] = [];

    if (withDeps.length > 0) {
      const ids = withDeps.map((b: any) => b.id);
      try {
        // bd dep list returns different shapes for single vs batch:
        // Single: enriched bead objects with {id, dependency_type}
        // Batch: join-table records with {issue_id, depends_on_id, type}
        const depData = await runCli("bd", ["dep", "list", ...ids, "--json"]);
        if (Array.isArray(depData)) {
          for (const dep of depData) {
            let fromId: string | undefined;
            let toId: string | undefined;
            let depType: string;

            if (dep.depends_on_id && dep.issue_id) {
              // Batch format: join-table record
              // Arrow: dependency → dependent (A blocks B: arrow from A to B)
              fromId = dep.depends_on_id;
              toId = dep.issue_id;
              depType = dep.type || "blocks";
            } else if (dep.id && dep.dependency_type && ids.length === 1) {
              // Single-ID format: enriched bead (the dependency itself)
              // dep.id is the dependency, ids[0] is the dependent
              fromId = dep.id;
              toId = ids[0];
              depType = dep.dependency_type;
            } else {
              continue;
            }

            if (fromId && toId && nodeIds.has(fromId) && nodeIds.has(toId)) {
              edges.push({ from: fromId, to: toId, type: depType });
            }
          }
        }
      } catch {
        // dep list may fail if no deps exist
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
