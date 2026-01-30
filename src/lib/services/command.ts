import { spawnSync } from "node:child_process";

export const runCommand = (
  command: string,
  argsList: string[],
  options?: {
    inheritStdio?: boolean;
    input?: string;
  }
): { ok: boolean; stdout?: string } => {
  const result = spawnSync(command, argsList, {
    stdio: options?.inheritStdio ? "inherit" : "pipe",
    encoding: options?.inheritStdio ? undefined : "utf8",
    input: options?.input
  });

  if (result.status === 0) {
    return { ok: true, stdout: typeof result.stdout === "string" ? result.stdout : undefined };
  }

  return { ok: false, stdout: typeof result.stdout === "string" ? result.stdout : undefined };
};
