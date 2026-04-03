import { Router } from "express";
import { readAuditLog } from "../audit.js";

const router = Router();

// GET /api/audit?limit=100&action=nudge
router.get("/", async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 200, 1000);
    const action = (req.query.action as string) || undefined;
    const entries = await readAuditLog({ limit, action });
    res.json(entries);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
