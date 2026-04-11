import { Router } from "express";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import { runCli } from "../cli.js";

const router = Router();

const COSTS_FILE = path.join(
  process.env.GT_HOME || homedir(),
  ".gt",
  "costs.jsonl"
);

interface CostRecord {
  session_id: string;
  role: string;
  worker: string;
  rig?: string;
  cost_usd: number;
  ended_at: string;
}

async function readCostLog(): Promise<CostRecord[]> {
  try {
    const content = await readFile(COSTS_FILE, "utf-8");
    return content
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => {
        try {
          return JSON.parse(line) as CostRecord;
        } catch {
          return null;
        }
      })
      .filter((r): r is CostRecord => r !== null);
  } catch {
    return [];
  }
}

function filterByDays(records: CostRecord[], days: number): CostRecord[] {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  cutoff.setHours(0, 0, 0, 0);
  return records.filter((r) => new Date(r.ended_at) >= cutoff);
}

function filterToday(records: CostRecord[]): CostRecord[] {
  const today = new Date().toISOString().slice(0, 10);
  return records.filter((r) => r.ended_at.slice(0, 10) === today);
}

function aggregate(records: CostRecord[]) {
  let total = 0;
  const byRole: Record<string, number> = {};
  const byRig: Record<string, number> = {};
  const byDay: Record<string, number> = {};

  for (const r of records) {
    total += r.cost_usd;
    byRole[r.role] = (byRole[r.role] || 0) + r.cost_usd;
    const rig = r.rig || extractRig(r.session_id);
    if (rig) byRig[rig] = (byRig[rig] || 0) + r.cost_usd;
    const day = r.ended_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + r.cost_usd;
  }

  return { total_usd: total, by_role: byRole, by_rig: byRig, by_day: byDay };
}

function extractRig(sessionId: string): string | null {
  // Session IDs like "gd-crew-dev" → rig prefix "gd" → need full rig name
  // "ap-witness" → "ap"
  // "hq-mayor" → null (town level)
  if (sessionId.startsWith("hq-")) return null;
  const prefix = sessionId.split("-")[0];
  // Map common prefixes — this is approximate
  return prefix || null;
}

// GET /api/costs — live session costs (from gt costs)
router.get("/", async (_req, res) => {
  try {
    const data = await runCli("gt", ["costs", "--json"], 5000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/history?days=7 — historical costs from JSONL log
router.get("/history", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const all = await readCostLog();
    const filtered = filterByDays(all, days);
    const agg = aggregate(filtered);
    res.json({ ...agg, days, records: filtered.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/today — today's costs from JSONL log
router.get("/today", async (_req, res) => {
  try {
    const all = await readCostLog();
    const today = filterToday(all);
    const agg = aggregate(today);
    res.json({ ...agg, period: "today", records: today.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/week — last 7 days from JSONL log
router.get("/week", async (_req, res) => {
  try {
    const all = await readCostLog();
    const week = filterByDays(all, 7);
    const agg = aggregate(week);
    res.json({ ...agg, period: "this week", records: week.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/by-rig — all time by rig
router.get("/by-rig", async (_req, res) => {
  try {
    const all = await readCostLog();
    const agg = aggregate(all);
    res.json({ total_usd: agg.total_usd, by_rig: agg.by_rig });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/by-agent — all time by role
router.get("/by-agent", async (_req, res) => {
  try {
    const all = await readCostLog();
    const agg = aggregate(all);
    res.json({ total_usd: agg.total_usd, by_role: agg.by_role });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/costs/daily — per-day breakdown for charts
router.get("/daily", async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const all = await readCostLog();
    const filtered = filterByDays(all, days);
    const agg = aggregate(filtered);

    // Convert by_day to sorted array for charts
    const daily = Object.entries(agg.by_day)
      .map(([date, cost]) => ({ date, cost }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.json({ daily, total_usd: agg.total_usd });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
