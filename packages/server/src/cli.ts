import { execFile } from "node:child_process";
import { promisify } from "node:util";

const exec = promisify(execFile);

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
    env: { ...process.env, NO_COLOR: "1" },
  });

  let data: unknown;
  try {
    data = JSON.parse(stdout);
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
    env: { ...process.env, NO_COLOR: "1" },
  });
  cache.clear();
  return { stdout: stdout.trim(), stderr: stderr.trim() };
}
