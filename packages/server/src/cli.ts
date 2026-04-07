import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { homedir } from "node:os";
import path from "node:path";

const exec = promisify(execFile);

// gt/bd need to run from the Gas Town home directory
const GT_HOME = process.env.GT_HOME || path.join(homedir(), "gt");
const BEADS_DIR = process.env.BEADS_DIR || path.join(GT_HOME, ".beads");

interface CacheEntry {
  data: unknown;
  expiresAt: number;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 15000; // 15 seconds — reads are fast from cache, background sync keeps it warm

export async function runCli(
  command: string,
  args: string[],
  ttl = DEFAULT_TTL
): Promise<unknown> {
  const key = `${command}:${args.join(":")}`;
  const now = Date.now();
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  const { stdout } = await exec(command, args, {
    timeout: 30000,
    maxBuffer: 10 * 1024 * 1024,
    cwd: GT_HOME,
    env: {
      ...process.env,
      NO_COLOR: "1",
      BEADS_DIR,
    },
  });

  let data: unknown;
  try {
    data = JSON.parse(stdout);
  } catch {
    // stdout may have warning lines before JSON — try to find the real JSON
    const arrayStart = stdout.indexOf("[{");
    const objStart = stdout.indexOf('{"');
    const fallbackArray = stdout.indexOf("[\n");
    const candidates = [arrayStart, objStart, fallbackArray].filter((i) => i >= 0);
    if (candidates.length > 0) {
      const start = Math.min(...candidates);
      try {
        data = JSON.parse(stdout.substring(start));
      } catch {
        data = stdout.trim();
      }
    } else {
      data = stdout.trim();
    }
  }

  cache.set(key, { data, expiresAt: now + ttl, fetchedAt: now });
  return data;
}

export async function runAction(
  command: string,
  args: string[],
  timeoutMs = 30000
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await exec(command, args, {
    timeout: timeoutMs,
    maxBuffer: 10 * 1024 * 1024,
    cwd: GT_HOME,
    env: {
      ...process.env,
      NO_COLOR: "1",
      BEADS_DIR,
    },
  });
  // Invalidate cache after write actions
  cache.clear();
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}

// Background sync — keeps hot data warm so page loads are instant
// Runs every 10 seconds, refreshing the most-used endpoints sequentially
const HOT_COMMANDS: [string, string[]][] = [
  ["gt", ["rig", "list", "--json"]],
  ["gt", ["agents", "list", "--all"]],
  ["gt", ["session", "list", "--json"]],
  ["gt", ["scheduler", "status", "--json"]],
  ["bd", ["list", "--all", "--json"]],
];

let syncRunning = false;

async function backgroundSync() {
  if (syncRunning) return;
  syncRunning = true;
  for (const [cmd, args] of HOT_COMMANDS) {
    try {
      await runCli(cmd, args, 20000); // 20s TTL for background-synced data
    } catch {
      // Ignore failures — cache retains stale data until next successful sync
    }
  }
  syncRunning = false;
}

// Start background sync after 2s startup delay, then every 10s
setTimeout(() => {
  backgroundSync();
  setInterval(backgroundSync, 10000);
}, 2000);
