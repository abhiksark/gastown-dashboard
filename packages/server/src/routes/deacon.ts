import { Router } from "express";
import { runCli } from "../cli.js";

const router = Router();

// GET /api/deacon/status — deacon process status
router.get("/status", async (_req, res) => {
  try {
    const data = await runCli("gt", ["deacon", "status", "--json"], 5000);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deacon/boot — boot session status
router.get("/boot", async (_req, res) => {
  try {
    const sessions = (await runCli("gt", ["session", "list", "--json"], 5000)) as any[];
    const boot = Array.isArray(sessions)
      ? sessions.find(
          (s) => s.polecat === "boot" || s.session_id?.includes("boot")
        )
      : null;
    res.json(boot || { running: false, polecat: "boot" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/deacon/health — aggregate health tree
router.get("/health", async (_req, res) => {
  try {
    // Deacon status
    let deacon: any = null;
    try {
      deacon = await runCli("gt", ["deacon", "status", "--json"], 5000);
    } catch {
      deacon = { running: false };
    }

    // Rig list
    const rigs = (await runCli("gt", ["rig", "list", "--json"], 5000)) as any[];

    // Witness + polecat status per rig
    const rigHealth = await Promise.all(
      (Array.isArray(rigs) ? rigs : []).map(async (rig: any) => {
        let witness: any = null;
        try {
          witness = await runCli(
            "gt",
            ["witness", "status", rig.name, "--json"],
            5000
          );
        } catch {
          witness = { running: false, rig_name: rig.name };
        }

        let polecats: any[] = [];
        try {
          polecats = (await runCli(
            "gt",
            ["polecat", "list", rig.name, "--json"],
            5000
          )) as any[];
        } catch {
          // no polecats
        }

        return {
          rig: rig.name,
          status: rig.status,
          witness,
          polecats: Array.isArray(polecats) ? polecats : [],
        };
      })
    );

    res.json({
      deacon,
      rigs: rigHealth,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
