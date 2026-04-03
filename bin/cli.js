#!/usr/bin/env node

import { existsSync } from "node:fs";
import { execSync, execFileSync, fork } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GT_HOME = process.env.GT_HOME || path.join(homedir(), "gt");

const args = process.argv.slice(2);
const command = args[0] || "start";

if (command === "help" || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command === "doctor") {
  runDoctor();
  process.exit(0);
}

if (command === "start") {
  runStart(args.slice(1));
} else {
  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

function printHelp() {
  console.log(`
gastown-dashboard — Gas Town Dashboard

Usage:
  gastown-dashboard start [options]   Start the dashboard server
  gastown-dashboard doctor            Check system dependencies
  gastown-dashboard help              Show this help

Start options:
  --port <port>   Port to listen on (default: 7667)
  --open          Open browser after starting
`);
}

function parseFlag(flagArgs, flag, defaultValue) {
  const idx = flagArgs.indexOf(flag);
  if (idx === -1) return defaultValue;
  if (typeof defaultValue === "boolean") return true;
  return flagArgs[idx + 1] || defaultValue;
}

function runStart(startArgs) {
  const port = parseFlag(startArgs, "--port", "7667");
  const shouldOpen = startArgs.includes("--open");

  const publicDir = path.join(ROOT, "dist", "public");
  if (!existsSync(path.join(publicDir, "index.html"))) {
    console.error("Error: dist/public/index.html not found. Run 'pnpm build' first.");
    process.exit(1);
  }

  const serverEntry = path.join(ROOT, "packages", "server", "src", "index.ts");
  const tsxBin = path.join(ROOT, "node_modules", ".bin", "tsx");

  // Fork the server via tsx so TypeScript imports work
  const child = fork(serverEntry, [], {
    execPath: process.execPath,
    execArgv: ["--import", "tsx"],
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(port),
      GASTOWN_PUBLIC_DIR: publicDir,
    },
    stdio: "pipe",
  });

  child.stdout?.on("data", (data) => {
    const msg = data.toString();
    process.stdout.write(msg);

    // Once server prints its listening message, open browser
    if (shouldOpen && msg.includes("listening")) {
      const url = `http://localhost:${port}`;
      try {
        execSync(`open ${url}`, { stdio: "ignore" });
      } catch {
        try {
          execSync(`xdg-open ${url}`, { stdio: "ignore" });
        } catch {
          // User opens manually
        }
      }
    }
  });

  child.stderr?.on("data", (data) => process.stderr.write(data));

  child.on("exit", (code) => process.exit(code || 0));

  // Forward signals
  process.on("SIGINT", () => child.kill("SIGINT"));
  process.on("SIGTERM", () => child.kill("SIGTERM"));

  console.log(`\n  Gas Town Dashboard starting on http://localhost:${port}\n`);
}

function runDoctor() {
  console.log("\nGas Town Dashboard — Doctor\n");
  let allOk = true;

  allOk = checkBinary("gt", "gt") && allOk;
  allOk = checkBinary("bd", "bd") && allOk;

  if (existsSync(GT_HOME)) {
    console.log(`  \x1b[32m✓\x1b[0m Gas Town home found at ${GT_HOME}`);
  } else {
    console.log(`  \x1b[31m✗\x1b[0m Gas Town home not found at ${GT_HOME}`);
    allOk = false;
  }

  const beadsDir = path.join(GT_HOME, ".beads");
  if (existsSync(beadsDir)) {
    console.log(`  \x1b[32m✓\x1b[0m Beads directory found at ${beadsDir}`);
  } else {
    console.log(`  \x1b[31m✗\x1b[0m No .beads directory found (run bd init)`);
    allOk = false;
  }

  const eventsFile = path.join(GT_HOME, ".events.jsonl");
  if (existsSync(eventsFile)) {
    console.log(`  \x1b[32m✓\x1b[0m Events file exists at ${eventsFile}`);
  } else {
    console.log(`  \x1b[31m✗\x1b[0m No events file at ${eventsFile}`);
    allOk = false;
  }

  const publicIndex = path.join(ROOT, "dist", "public", "index.html");
  if (existsSync(publicIndex)) {
    console.log(`  \x1b[32m✓\x1b[0m Built frontend found`);
  } else {
    console.log(`  \x1b[31m✗\x1b[0m Frontend not built (run pnpm build)`);
    allOk = false;
  }

  console.log(allOk ? "\n  All checks passed.\n" : "\n  Some checks failed.\n");
}

function checkBinary(name, command) {
  try {
    const out = execFileSync("which", [command], { encoding: "utf-8" }).trim();
    console.log(`  \x1b[32m✓\x1b[0m ${name} binary found at ${out}`);
    return true;
  } catch {
    console.log(`  \x1b[31m✗\x1b[0m ${name} binary not found on PATH`);
    return false;
  }
}
