import { runCommand } from "./command.js";

export const getGitEmail = (): string | null => {
  const result = runCommand("git", ["config", "--get", "user.email"]);
  if (!result.ok || !result.stdout) {
    return null;
  }

  const value = result.stdout.trim();
  return value.length > 0 ? value : null;
};
