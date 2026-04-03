import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["rig", "list", "--json"]);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
