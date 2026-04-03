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
}

const cache = new Map<string, CacheEntry>();
const DEFAULT_TTL = 7000;

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
    timeout: 15000,
    cwd: GT_HOME,
    env: {
      ...process.env,
      NO_COLOR: "1",
      BEADS_DIR,
    },
  });

  let data: unknown;
  try {
    // bd/gt may prefix warnings to stdout before JSON — find the JSON start
    const jsonStart = stdout.indexOf("[");
    const jsonObjStart = stdout.indexOf("{");
    const start = jsonStart === -1 ? jsonObjStart : jsonObjStart === -1 ? jsonStart : Math.min(jsonStart, jsonObjStart);
    const toParse = start > 0 ? stdout.substring(start) : stdout;
    data = JSON.parse(toParse);
  } catch {
    data = stdout.trim();
  }

  cache.set(key, { data, expiresAt: now + ttl });
  return data;
}

export async function runAction(
  command: string,
  args: string[]
): Promise<{ stdout: string; stderr: string }> {
  const { stdout, stderr } = await exec(command, args, {
    timeout: 15000,
    cwd: GT_HOME,
    env: {
      ...process.env,
      NO_COLOR: "1",
      BEADS_DIR,
    },
  });
  cache.clear();
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}
