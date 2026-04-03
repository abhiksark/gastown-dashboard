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
