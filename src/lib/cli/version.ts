import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const findPackageJson = (startDir: string): string | null => {
  let current = startDir;

  while (true) {
    const candidate = join(current, "package.json");
    if (existsSync(candidate)) {
      return candidate;
    }

    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
};

export const getPackageVersion = (): string | null => {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const startDir = dirname(currentFile);
    const packageJsonPath = findPackageJson(startDir);
    if (!packageJsonPath) {
      return null;
    }
    const raw = readFileSync(packageJsonPath, "utf8");
    const data = JSON.parse(raw) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
};
