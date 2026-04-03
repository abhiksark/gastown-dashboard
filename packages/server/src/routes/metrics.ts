import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

interface BeadRecord {
  id: string;
  status: string;
  assignee: string;
  created_at: string;
  closed_at?: string;
  updated_at: string;
  labels?: string[];
  [key: string]: unknown;
}

// GET /api/metrics/agents — per-agent performance
router.get("/agents", async (_req, res) => {
  try {
    const beads = (await runCli("bd", ["list", "--all", "--json"], 10000)) as BeadRecord[];
    if (!Array.isArray(beads)) {
      res.json([]);
      return;
    }

    // Group by assignee
    const byAgent: Record<string, BeadRecord[]> = {};
    for (const b of beads) {
      if (!b.assignee) continue;
      (byAgent[b.assignee] ??= []).push(b);
    }

    const metrics = Object.entries(byAgent).map(([agent, agentBeads]) => {
      const completed = agentBeads.filter((b) => b.status === "closed" && b.closed_at);
      const open = agentBeads.filter((b) => b.status !== "closed");

      // Avg completion time in hours
      const completionTimes = completed
        .filter((b) => b.created_at && b.closed_at)
        .map((b) => {
          const created = new Date(b.created_at).getTime();
          const closed = new Date(b.closed_at!).getTime();
          return (closed - created) / (1000 * 60 * 60);
        })
        .filter((t) => t > 0 && t < 720); // filter out bogus values (>30 days)

      const avgCompletionHours =
        completionTimes.length > 0
          ? completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length
          : null;

      // Current streak: consecutive completed beads from most recent
      let streak = 0;
      const sorted = [...agentBeads].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      for (const b of sorted) {
        if (b.status === "closed") streak++;
        else break;
      }

      const successRate =
        agentBeads.length > 0 ? completed.length / agentBeads.length : 0;

      return {
        agent,
        total: agentBeads.length,
        completed: completed.length,
        open: open.length,
        avg_completion_hours: avgCompletionHours,
        streak,
        success_rate: successRate,
      };
    });

    // Sort by completed desc
    metrics.sort((a, b) => b.completed - a.completed);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/metrics/rigs — per-rig throughput
router.get("/rigs", async (_req, res) => {
  try {
    const beads = (await runCli("bd", ["list", "--all", "--json"], 10000)) as BeadRecord[];
    if (!Array.isArray(beads)) {
      res.json([]);
      return;
    }

    // Extract rig from assignee (format: rig/role/name or rig/name)
    function rigFromAssignee(assignee: string): string {
      const parts = assignee.split("/");
      return parts[0] || assignee;
    }

    const byRig: Record<string, BeadRecord[]> = {};
    for (const b of beads) {
      if (!b.assignee) continue;
      const rig = rigFromAssignee(b.assignee);
      (byRig[rig] ??= []).push(b);
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

    const metrics = Object.entries(byRig).map(([rig, rigBeads]) => {
      const completed = rigBeads.filter((b) => b.status === "closed" && b.closed_at);

      // Beads completed in last 7 days
      const recentCompleted = completed.filter(
        (b) => new Date(b.closed_at!).getTime() > sevenDaysAgo
      );

      // Daily breakdown for last 7 days
      const daily: { date: string; count: number }[] = [];
      for (let d = 6; d >= 0; d--) {
        const dayStart = new Date(now - d * 24 * 60 * 60 * 1000);
        dayStart.setHours(0, 0, 0, 0);
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        const count = recentCompleted.filter((b) => {
          const t = new Date(b.closed_at!).getTime();
          return t >= dayStart.getTime() && t <= dayEnd.getTime();
        }).length;
        daily.push({
          date: dayStart.toISOString().slice(0, 10),
          count,
        });
      }

      const beadsPerDay = recentCompleted.length / 7;

      // Unique active workers
      const workers = new Set(rigBeads.filter((b) => b.status !== "closed").map((b) => b.assignee));

      return {
        rig,
        total: rigBeads.length,
        completed: completed.length,
        recent_completed: recentCompleted.length,
        beads_per_day: beadsPerDay,
        active_workers: workers.size,
        daily,
      };
    });

    metrics.sort((a, b) => b.completed - a.completed);
    res.json(metrics);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
