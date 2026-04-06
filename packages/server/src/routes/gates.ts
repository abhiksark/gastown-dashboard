import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

// GET /api/gates — beads that are blocked or have unresolved dependencies
router.get("/", async (_req, res) => {
  try {
    const raw = await runCli("bd", ["list", "--all", "--json"]);
    const beads = Array.isArray(raw) ? raw : [];
    const blocked = beads.filter(
      (b: any) =>
        b.status === "blocked" ||
        b.status === "deferred" ||
        (b.dependency_count > 0 && b.status !== "closed")
    );
    res.json(blocked);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/gates/:id/resolve — manually unblock a bead
router.post("/:id/resolve", async (req, res) => {
  try {
    const result = await runAction("bd", [
      "update",
      req.params.id,
      "--status",
      "open",
    ]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
