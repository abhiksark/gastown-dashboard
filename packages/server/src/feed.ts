import { Router, Request, Response } from "express";
import { createReadStream, watchFile, unwatchFile, statSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { homedir } from "node:os";
import path from "node:path";

const router = Router();

const EVENTS_FILE = path.join(
  process.env.GT_HOME || path.join(homedir(), "gt"),
  ".events.jsonl"
);

const recentEvents: string[] = [];
const MAX_RECENT = 100;

function addEvent(line: string) {
  recentEvents.push(line);
  if (recentEvents.length > MAX_RECENT) {
    recentEvents.shift();
  }
}

function seedRecentEvents() {
  if (!existsSync(EVENTS_FILE)) return;
  const stream = createReadStream(EVENTS_FILE, { encoding: "utf-8" });
  stream.on("error", () => {}); // guard against race
  const rl = createInterface({ input: stream });
  const buffer: string[] = [];
  rl.on("line", (line) => {
    buffer.push(line);
    if (buffer.length > MAX_RECENT) buffer.shift();
  });
  rl.on("close", () => {
    buffer.forEach(addEvent);
  });
}

seedRecentEvents();

const clients = new Set<Response>();

let lastSize = 0;
try {
  lastSize = statSync(EVENTS_FILE).size;
} catch {
  // File may not exist
}

watchFile(EVENTS_FILE, { interval: 1000 }, (curr) => {
  if (curr.size < lastSize) {
    // File was truncated (log rotation) — reset and read from start
    lastSize = 0;
  }
  if (curr.size <= lastSize) {
    return;
  }

  const stream = createReadStream(EVENTS_FILE, {
    start: lastSize,
    encoding: "utf-8",
  });
  stream.on("error", () => {}); // guard against ENOENT race
  const rl = createInterface({ input: stream });

  rl.on("line", (line) => {
    if (!line.trim()) return;
    addEvent(line);
    for (const client of clients) {
      client.write(`data: ${line}\n\n`);
    }
  });

  lastSize = curr.size;
});

router.get("/stream", (req: Request, res: Response) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  for (const event of recentEvents) {
    res.write(`data: ${event}\n\n`);
  }

  clients.add(res);

  req.on("close", () => {
    clients.delete(res);
  });
});

export default router;

process.on("SIGTERM", () => {
  unwatchFile(EVENTS_FILE);
});
