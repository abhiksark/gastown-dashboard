import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

// GET /api/convoys — list all convoys
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["convoy", "list", "--json"]);
    // gt convoy list --json returns null when empty, or an array
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/convoys/timeline — convoy data with bead timestamps for Gantt rendering
router.get("/timeline", async (_req, res) => {
  try {
    const convoys = await runCli("gt", ["convoy", "list", "--json"]);
    const list = Array.isArray(convoys) ? convoys : [];
    // For each convoy, enrich beads with timestamps from bd list
    const enriched = await Promise.all(
      list.map(async (convoy: any) => {
        const beadIds = (convoy.beads || []).map((b: any) => b.id);
        const beadDetails: any[] = [];
        for (const id of beadIds) {
          try {
            const detail = await runCli("bd", ["show", id, "--json"]);
            if (detail && typeof detail === "object") {
              beadDetails.push(detail);
            }
          } catch {
            // bead may have been deleted
          }
        }
        return {
          id: convoy.id,
          title: convoy.title,
          status: convoy.status,
          created_at: convoy.created_at,
          updated_at: convoy.updated_at,
          beads: beadDetails.map((b: any) => ({
            id: b.id,
            title: b.title,
            status: b.status,
            assignee: b.assignee || "",
            created_at: b.created_at,
            updated_at: b.updated_at,
          })),
        };
      })
    );
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/convoys/:id — show convoy detail
router.get("/:id", async (req, res) => {
  try {
    const data = await runCli("gt", ["convoy", "show", req.params.id, "--json"]);
    res.json(data ?? null);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
