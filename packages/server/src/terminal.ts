import { WebSocketServer, type WebSocket } from "ws";
import { spawn, type ChildProcess } from "node:child_process";
import { homedir } from "node:os";
import path from "node:path";
import type { Server } from "node:http";

const GT_HOME = process.env.GT_HOME || path.join(homedir(), "gt");
const SHELL = process.env.SHELL || "/bin/zsh";

export function attachTerminalWS(server: Server) {
  const wss = new WebSocketServer({ server, path: "/ws/terminal" });

  wss.on("connection", (ws: WebSocket) => {
    const shell = spawnShell();
    if (!shell) {
      ws.send("\r\nFailed to spawn shell\r\n");
      ws.close();
      return;
    }

    shell.stdout?.on("data", (data: Buffer) => {
      if (ws.readyState === ws.OPEN) ws.send(data);
    });

    shell.stderr?.on("data", (data: Buffer) => {
      if (ws.readyState === ws.OPEN) ws.send(data);
    });

    shell.on("exit", () => {
      if (ws.readyState === ws.OPEN) {
        ws.send("\r\n[shell exited]\r\n");
        ws.close();
      }
    });

    ws.on("message", (data: Buffer | string) => {
      if (shell.stdin?.writable) {
        shell.stdin.write(typeof data === "string" ? data : data.toString());
      }
    });

    ws.on("close", () => {
      shell.kill();
    });
  });
}

function spawnShell(): ChildProcess | null {
  try {
    return spawn(SHELL, ["-l"], {
      cwd: GT_HOME,
      env: {
        ...process.env,
        TERM: "xterm-256color",
        NO_COLOR: undefined, // allow color in terminal
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    return null;
  }
}
