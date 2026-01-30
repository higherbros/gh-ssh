import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { KeyType } from "../cli/types.js";
import { runCommand } from "./command.js";

type AgentStartResult =
  | { ok: true }
  | { ok: false; reason: "start_failed" | "no_socket" };

const parseAgentOutput = (output: string): { socket?: string; pid?: string } => {
  const socketMatch = output.match(/SSH_AUTH_SOCK=([^;]+);/);
  const pidMatch = output.match(/SSH_AGENT_PID=([0-9]+);/);

  return {
    socket: socketMatch?.[1],
    pid: pidMatch?.[1]
  };
};

export const listPublicKeys = (sshDir: string): string[] => {
  if (!existsSync(sshDir)) {
    return [];
  }

  return readdirSync(sshDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".pub"))
    .map((entry) => join(sshDir, entry.name));
};

export const ensureSshDir = (sshDir: string): void => {
  if (!existsSync(sshDir)) {
    mkdirSync(sshDir, { recursive: true, mode: 0o700 });
  }
};

export const resolveKeyPath = (sshDir: string, keyName: string): string => {
  const sanitized = keyName.endsWith(".pub") ? keyName.slice(0, -4) : keyName;
  if (sanitized === "~") {
    return homedir();
  }

  if (sanitized.startsWith("~/")) {
    return join(homedir(), sanitized.slice(2));
  }

  if (isAbsolute(sanitized)) {
    return sanitized;
  }

  return join(sshDir, sanitized);
};

export const startAgent = (): AgentStartResult => {
  if (process.env.SSH_AUTH_SOCK) {
    return { ok: true };
  }

  const result = runCommand("ssh-agent", ["-s"]);
  if (!result.ok || !result.stdout) {
    return { ok: false, reason: "start_failed" };
  }

  const parsed = parseAgentOutput(result.stdout);
  if (parsed.socket) {
    process.env.SSH_AUTH_SOCK = parsed.socket;
  }
  if (parsed.pid) {
    process.env.SSH_AGENT_PID = parsed.pid;
  }

  return parsed.socket ? { ok: true } : { ok: false, reason: "no_socket" };
};

export const addKeyToAgent = (keyPath: string): boolean => {
  const result = spawnSync("ssh-add", [keyPath], {
    stdio: "inherit",
    env: process.env
  });

  return result.status === 0;
};

export const generateKey = (keyPath: string, email: string, type: KeyType): boolean => {
  const argsList = ["-t", type, "-C", email, "-f", keyPath];
  if (type === "rsa") {
    argsList.push("-b", "4096");
  }

  const result = spawnSync("ssh-keygen", argsList, { stdio: "inherit" });
  return result.status === 0;
};
