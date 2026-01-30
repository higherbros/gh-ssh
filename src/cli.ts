import { runCli } from "./lib/cli/run.js";
import { logError } from "./lib/ui/output.js";

runCli().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  logError(`Unexpected error: ${message}`);
  process.exit(1);
});
