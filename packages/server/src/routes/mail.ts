import { Router } from "express";
import { runCli, runAction } from "../cli.js";

const router = Router();

// GET /api/mail/directory — list all valid mail addresses
router.get("/directory", async (_req, res) => {
  try {
    const raw = await runCli("gt", ["mail", "directory", "--json"]);
    res.json(Array.isArray(raw) ? raw : []);
  } catch (err: any) {
    // directory may not support --json, parse text output
    try {
      const text = await runCli("gt", ["mail", "directory"]);
      if (typeof text !== "string") {
        res.json([]);
        return;
      }
      const lines = text.split("\n").filter((l: string) => l.trim() && !l.startsWith("ADDRESS"));
      const addresses = lines.map((line: string) => {
        const parts = line.trim().split(/\s+/);
        return { address: parts[0], type: parts[1] || "unknown" };
      });
      res.json(addresses);
    } catch {
      res.json([]);
    }
  }
});

// GET /api/mail/inbox?address=mayor/&unread=true — get inbox for an address
router.get("/inbox", async (req, res) => {
  try {
    const address = (req.query.address as string) || "mayor/";
    const args = ["mail", "inbox", address, "--json"];
    if (req.query.unread === "true") {
      args.push("--unread");
    } else {
      args.push("--all");
    }
    const data = await runCli("gt", args);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/mail/read/:id — read a specific message
router.get("/read/:id", async (req, res) => {
  try {
    const data = await runCli("gt", ["mail", "read", req.params.id, "--json"]);
    res.json(data ?? null);
  } catch (err: any) {
    // mail read may not support --json, try without
    try {
      const text = await runCli("gt", ["mail", "read", req.params.id]);
      res.json({ id: req.params.id, body: text });
    } catch (innerErr: any) {
      res.status(500).json({ error: innerErr.message });
    }
  }
});

// GET /api/mail/search?q=pattern&from=sender — search messages
router.get("/search", async (req, res) => {
  try {
    const query = (req.query.q as string) || ".*";
    const args = ["mail", "search", query, "--json"];
    if (req.query.from) {
      args.push("--from", req.query.from as string);
    }
    if (req.query.archive === "true") {
      args.push("--archive");
    }
    const data = await runCli("gt", args);
    res.json(Array.isArray(data) ? data : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mail/send — send a message
router.post("/send", async (req, res) => {
  try {
    const { to, subject, body, type, priority } = req.body;
    if (!to || !subject || !body) {
      res.status(400).json({ error: "to, subject, and body are required" });
      return;
    }
    const args = ["mail", "send", to, "-s", subject, "-m", body];
    if (type && type !== "notification") {
      args.push("--type", type);
    }
    if (priority !== undefined && priority !== 2) {
      args.push("--priority", String(priority));
    }
    const result = await runAction("gt", args);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mail/archive/:id — archive a message
router.post("/archive/:id", async (req, res) => {
  try {
    const result = await runAction("gt", ["mail", "archive", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mail/mark-read/:id — mark message as read
router.post("/mark-read/:id", async (req, res) => {
  try {
    const result = await runAction("gt", ["mail", "mark-read", req.params.id]);
    res.json({ ok: true, output: result.stdout });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
