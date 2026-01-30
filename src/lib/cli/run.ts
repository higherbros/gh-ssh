import { parseArgs } from "./args.js";
import { TOTAL_STEPS } from "./constants.js";
import { helpText } from "./help.js";
import { getPackageVersion } from "./version.js";
import { runWorkflow } from "./workflow.js";
import { logError, logInfo, logWarn, printHeader } from "../ui/output.js";

export const runCli = async (): Promise<void> => {
  const { options, unknown } = parseArgs(process.argv.slice(2));

  if (unknown.length > 0) {
    logError(`Unknown arguments: ${unknown.join(" ")}`);
    console.log(helpText);
    process.exit(1);
  }

  if (options.help) {
    console.log(helpText);
    return;
  }

  if (options.version) {
    const version = getPackageVersion();
    console.log(version ?? "unknown");
    return;
  }

  printHeader();
  logInfo(`This tool will guide you through ${TOTAL_STEPS} steps.`);

  if (process.platform !== "darwin") {
    logWarn("This workflow is optimized for macOS.");
  }

  await runWorkflow(options);
};
