import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, join } from "node:path";
import { CliOptions, KeyType } from "./types.js";
import { copyToClipboard } from "../services/clipboard.js";
import { getGitEmail } from "../services/git.js";
import {
  addKeyToAgent,
  ensureSshDir,
  generateKey,
  listPublicKeys,
  resolveKeyPath,
  startAgent,
} from "../services/ssh.js";
import { emoji } from "../ui/format.js";
import {
  logError,
  logInfo,
  logSuccess,
  logWarn,
  printList,
  printStep,
  waitForNextStep,
} from "../ui/output.js";
import { promptInput, promptYesNo, selectFromList } from "../ui/prompts.js";

const ensureUniqueKeyPath = async (
  sshDir: string,
  keyPath: string,
): Promise<string> => {
  let candidate = keyPath;

  while (existsSync(candidate) || existsSync(`${candidate}.pub`)) {
    const overwrite = await promptYesNo(
      `Key already exists at ${candidate}. Overwrite?`,
      false,
    );
    if (overwrite) {
      return candidate;
    }

    const nextName = (await promptInput("Enter a different key name")).trim();
    if (!nextName) {
      continue;
    }
    candidate = resolveKeyPath(sshDir, nextName);
  }

  return candidate;
};

export const runWorkflow = async (options: CliOptions): Promise<void> => {
  const sshDir = join(homedir(), ".ssh");
  let selectedKeyPath: string | null = null;

  printStep(1, "Check for existing SSH keys", emoji.step1);
  const publicKeys = listPublicKeys(sshDir);

  if (publicKeys.length > 0) {
    const keyNames = publicKeys.map((keyPath) => basename(keyPath));
    logInfo("Found existing public keys:");
    printList(keyNames);
    const reuse = await promptYesNo("Reuse an existing key", false);

    if (reuse) {
      const selectedName = await selectFromList("Select a key", keyNames);
      const publicPath = join(sshDir, selectedName);
      const privatePath = publicPath.replace(/\.pub$/, "");
      if (!existsSync(privatePath)) {
        logWarn(`Private key not found at ${privatePath}.`);
      } else {
        selectedKeyPath = privatePath;
        await waitForNextStep();
        printStep(2, "Use existing SSH key", emoji.step2);
        logSuccess(`Using ${basename(privatePath)}`);
      }
    }
  } else {
    logInfo("No existing public keys found in ~/.ssh.");
  }

  if (!selectedKeyPath) {
    await waitForNextStep();
    printStep(2, "Generate a new SSH key pair", emoji.step2);
    ensureSshDir(sshDir);

    const gitEmail = getGitEmail();
    const email =
      options.email ??
      (await promptInput("GitHub email", gitEmail ?? undefined));
    if (!email) {
      logError("Email is required to generate the key.");
      process.exit(1);
    }

    let keyType: KeyType = options.type ?? "ed25519";
    if (!options.type) {
      const typeInput = await promptInput(
        "Key type (ed25519 or rsa)",
        "ed25519",
      );
      if (typeInput === "ed25519" || typeInput === "rsa") {
        keyType = typeInput;
      }
    }

    const defaultKeyName =
      options.keyName ?? (keyType === "ed25519" ? "id_ed25519" : "id_rsa");
    const keyNameInput =
      options.keyName ?? (await promptInput("Key name", defaultKeyName));
    let keyPath = resolveKeyPath(sshDir, keyNameInput);
    keyPath = await ensureUniqueKeyPath(sshDir, keyPath);

    const created = generateKey(keyPath, email, keyType);
    if (!created && keyType === "ed25519") {
      const fallback = await promptYesNo(
        "ed25519 failed. Try rsa 4096 instead",
        true,
      );
      if (fallback) {
        const rsaCreated = generateKey(keyPath, email, "rsa");
        if (!rsaCreated) {
          logError("Failed to generate RSA key.");
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    } else if (!created) {
      logError("Failed to generate SSH key.");
      process.exit(1);
    }

    selectedKeyPath = keyPath;
    logSuccess(`Key ready: ${basename(keyPath)}`);
  }

  if (!selectedKeyPath) {
    logError("No SSH key selected. Exiting.");
    process.exit(1);
  }

  const publicKeyPath = `${selectedKeyPath}.pub`;
  if (!existsSync(publicKeyPath)) {
    logError(`Public key not found at ${publicKeyPath}.`);
    process.exit(1);
  }

  await waitForNextStep();
  printStep(3, "Start ssh-agent", emoji.step3);
  const agentResult = startAgent();
  if (!agentResult.ok) {
    if (agentResult.reason === "start_failed") {
      logWarn(
        "Failed to start ssh-agent. Run 'eval \"$(ssh-agent -s)\"' manually.",
      );
    }
    logWarn("Continuing without ssh-agent.");
  } else {
    logSuccess("ssh-agent is running.");
  }

  await waitForNextStep();
  printStep(4, "Add key to ssh-agent", emoji.step4);
  const added = addKeyToAgent(selectedKeyPath);
  if (!added) {
    logWarn(`ssh-add failed. Try: ssh-add ${selectedKeyPath}`);
  } else {
    logSuccess("Key added to ssh-agent.");
  }

  await waitForNextStep();
  printStep(5, "Add the public key to GitHub", emoji.step5);
  const publicKey = readFileSync(publicKeyPath, "utf8");
  const copied = copyToClipboard(publicKey);
  if (copied) {
    logSuccess("Public key copied to clipboard.");
  } else {
    logWarn("Copy failed. The public key is printed below:");
    console.log(publicKey.trim());
  }

  logInfo("Open https://github.com/settings/keys to add a new SSH key.");

  await waitForNextStep();
  printStep(6, "Verify your SSH connection", emoji.step6);
  const verify = await promptYesNo("Run 'ssh -T git@github.com' now", false);
  if (verify) {
    spawnSync("ssh", ["-T", "git@github.com"], { stdio: "inherit" });
  }
};
