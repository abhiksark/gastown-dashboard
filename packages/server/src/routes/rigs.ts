import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["rig", "list", "--json"]);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rigs/add
router.post("/add", async (req, res) => {
  try {
    const { path } = req.body;
    if (!path || typeof path !== "string") {
      res.status(400).json({ error: "path is required" });
      return;
    }
    const result = await runAction("gt", ["rig", "add", path], 120000);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/rigs/:name/remove
router.post("/:name/remove", async (req, res) => {
  try {
    const result = await runAction("gt", ["rig", "remove", req.params.name, "--force"]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
