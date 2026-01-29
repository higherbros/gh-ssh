import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { basename, isAbsolute, join, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { fileURLToPath } from "node:url";

type KeyType = "ed25519" | "rsa";

type CliOptions = {
  email?: string;
  type?: KeyType;
  keyName?: string;
  skipAgent: boolean;
  skipAdd: boolean;
  skipCopy: boolean;
  skipVerify: boolean;
  help: boolean;
  version: boolean;
};

const helpText = `gh-ssh
A simple, safe, one-command tool to generate and configure SSH keys for GitHub on macOS.

Usage:
  gh-ssh

Options:
  -h, --help           Show help
  -v, --version        Show version
  --email <email>      GitHub email for key comment
  --type <ed25519|rsa> Key type (default: ed25519)
  --key-name <name>    Key filename in ~/.ssh (default: id_ed25519 or id_rsa)
  --skip-agent         Skip starting ssh-agent
  --skip-add           Skip adding key to agent
  --skip-copy          Skip copying public key to clipboard
  --skip-verify        Skip ssh -T verification step
`;

const args = process.argv.slice(2);

const defaultOptions: CliOptions = {
  skipAgent: false,
  skipAdd: false,
  skipCopy: false,
  skipVerify: false,
  help: false,
  version: false
};

const parseArgs = (argv: string[]): { options: CliOptions; unknown: string[] } => {
  const options: CliOptions = { ...defaultOptions };
  const unknown: string[] = [];

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case "-h":
      case "--help":
        options.help = true;
        break;
      case "-v":
      case "--version":
        options.version = true;
        break;
      case "--email":
        if (argv[i + 1]) {
          options.email = argv[i + 1];
          i += 1;
        } else {
          unknown.push(arg);
        }
        break;
      case "--type": {
        const value = argv[i + 1];
        if (value === "ed25519" || value === "rsa") {
          options.type = value;
          i += 1;
        } else {
          unknown.push(arg, value ?? "");
          i += 1;
        }
        break;
      }
      case "--key-name":
        if (argv[i + 1]) {
          options.keyName = argv[i + 1];
          i += 1;
        } else {
          unknown.push(arg);
        }
        break;
      case "--skip-agent":
        options.skipAgent = true;
        break;
      case "--skip-add":
        options.skipAdd = true;
        break;
      case "--skip-copy":
        options.skipCopy = true;
        break;
      case "--skip-verify":
        options.skipVerify = true;
        break;
      default:
        unknown.push(arg);
        break;
    }
  }

  return { options, unknown };
};

const getPackageVersion = (): string | null => {
  try {
    const currentFile = fileURLToPath(import.meta.url);
    const rootPath = resolve(currentFile, "..", "..");
    const packageJsonPath = join(rootPath, "package.json");
    const raw = readFileSync(packageJsonPath, "utf8");
    const data = JSON.parse(raw) as { version?: string };
    return data.version ?? null;
  } catch {
    return null;
  }
};

const runCommand = (
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

const listPublicKeys = (sshDir: string): string[] => {
  if (!existsSync(sshDir)) {
    return [];
  }

  return readdirSync(sshDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".pub"))
    .map((entry) => join(sshDir, entry.name));
};

const getGitEmail = (): string | null => {
  const result = runCommand("git", ["config", "--get", "user.email"]);
  if (!result.ok || !result.stdout) {
    return null;
  }

  const value = result.stdout.trim();
  return value.length > 0 ? value : null;
};

const ensureSshDir = (sshDir: string): void => {
  if (!existsSync(sshDir)) {
    mkdirSync(sshDir, { recursive: true, mode: 0o700 });
  }
};

const parseAgentOutput = (output: string): { socket?: string; pid?: string } => {
  const socketMatch = output.match(/SSH_AUTH_SOCK=([^;]+);/);
  const pidMatch = output.match(/SSH_AGENT_PID=([0-9]+);/);

  return {
    socket: socketMatch?.[1],
    pid: pidMatch?.[1]
  };
};

const startAgent = (): boolean => {
  if (process.env.SSH_AUTH_SOCK) {
    return true;
  }

  const result = runCommand("ssh-agent", ["-s"]);
  if (!result.ok || !result.stdout) {
    console.error("Failed to start ssh-agent. Run 'eval \"$(ssh-agent -s)\"' manually.");
    return false;
  }

  const parsed = parseAgentOutput(result.stdout);
  if (parsed.socket) {
    process.env.SSH_AUTH_SOCK = parsed.socket;
  }
  if (parsed.pid) {
    process.env.SSH_AGENT_PID = parsed.pid;
  }

  return Boolean(parsed.socket);
};

const addKeyToAgent = (keyPath: string): boolean => {
  const result = spawnSync("ssh-add", [keyPath], {
    stdio: "inherit",
    env: process.env
  });

  return result.status === 0;
};

const copyToClipboard = (text: string): boolean => {
  if (process.platform !== "darwin") {
    console.log(text);
    return false;
  }

  const result = spawnSync("pbcopy", [], {
    input: text,
    encoding: "utf8"
  });

  return result.status === 0;
};

const resolveKeyPath = (sshDir: string, keyName: string): string => {
  const sanitized = keyName.endsWith(".pub") ? keyName.slice(0, -4) : keyName;
  if (isAbsolute(sanitized)) {
    return sanitized;
  }

  if (sanitized.includes("/")) {
    return resolve(sanitized);
  }

  return join(sshDir, sanitized);
};

const ensureUniqueKeyPath = async (
  sshDir: string,
  keyPath: string,
  prompt: (question: string) => Promise<string>
): Promise<string> => {
  let candidate = keyPath;

  while (existsSync(candidate) || existsSync(`${candidate}.pub`)) {
    const answer = (await prompt(`Key already exists at ${candidate}. Overwrite? (y/N): `)).trim();
    if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
      return candidate;
    }

    const nextName = (await prompt("Enter a different key name: ")).trim();
    if (nextName.length === 0) {
      continue;
    }
    candidate = resolveKeyPath(sshDir, nextName);
  }

  return candidate;
};

const promptYesNo = async (
  prompt: (question: string) => Promise<string>,
  question: string,
  defaultValue: boolean
): Promise<boolean> => {
  const suffix = defaultValue ? " [Y/n]" : " [y/N]";
  const answer = (await prompt(`${question}${suffix}: `)).trim().toLowerCase();

  if (answer.length === 0) {
    return defaultValue;
  }

  return answer === "y" || answer === "yes";
};

const promptInput = async (
  prompt: (question: string) => Promise<string>,
  question: string,
  defaultValue?: string
): Promise<string> => {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = (await prompt(`${question}${suffix}: `)).trim();
  return answer.length > 0 ? answer : defaultValue ?? "";
};

const selectFromList = async (
  prompt: (question: string) => Promise<string>,
  items: string[]
): Promise<string> => {
  items.forEach((item, index) => {
    console.log(`  ${index + 1}) ${item}`);
  });

  while (true) {
    const answer = (await prompt(`Select a key [1-${items.length}]: `)).trim();
    const choice = Number.parseInt(answer, 10);
    if (!Number.isNaN(choice) && choice >= 1 && choice <= items.length) {
      return items[choice - 1];
    }
  }
};

const generateKey = (keyPath: string, email: string, type: KeyType): boolean => {
  const argsList = ["-t", type, "-C", email, "-f", keyPath];
  if (type === "rsa") {
    argsList.push("-b", "4096");
  }

  const result = spawnSync("ssh-keygen", argsList, { stdio: "inherit" });
  return result.status === 0;
};

const main = async (): Promise<void> => {
  const { options, unknown } = parseArgs(args);

  if (unknown.length > 0) {
    console.error(`Unknown arguments: ${unknown.join(" ")}`);
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

  console.log("gh-ssh: GitHub SSH key setup");
  console.log("This tool will guide you through each step.\n");

  if (process.platform !== "darwin") {
    console.log("Note: This workflow is optimized for macOS.");
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (question: string) => rl.question(question);

  const sshDir = join(homedir(), ".ssh");
  let selectedKeyPath: string | null = null;

  try {
    console.log("Step 1: Check for existing SSH keys");
    const publicKeys = listPublicKeys(sshDir);

    if (publicKeys.length > 0) {
      const keyNames = publicKeys.map((keyPath) => basename(keyPath));
      console.log("Found existing public keys:");
      const reuse = await promptYesNo(ask, "Reuse an existing key", false);

      if (reuse) {
        const selectedName = await selectFromList(ask, keyNames);
        const publicPath = join(sshDir, selectedName);
        const privatePath = publicPath.replace(/\.pub$/, "");
        if (!existsSync(privatePath)) {
          console.log(`Private key not found at ${privatePath}.`);
        } else {
          selectedKeyPath = privatePath;
        }
      }
    } else {
      console.log("No existing public keys found in ~/.ssh.");
    }

    if (!selectedKeyPath) {
      console.log("\nStep 2: Generate a new SSH key pair");
      ensureSshDir(sshDir);

      const gitEmail = getGitEmail();
      const email = options.email ?? (await promptInput(ask, "GitHub email", gitEmail ?? undefined));
      if (!email) {
        console.error("Email is required to generate the key.");
        process.exit(1);
      }

      let keyType: KeyType = options.type ?? "ed25519";
      if (!options.type) {
        const typeInput = await promptInput(ask, "Key type (ed25519 or rsa)", "ed25519");
        if (typeInput === "ed25519" || typeInput === "rsa") {
          keyType = typeInput;
        }
      }

      const defaultKeyName = options.keyName ?? (keyType === "ed25519" ? "id_ed25519" : "id_rsa");
      const keyNameInput = options.keyName ?? (await promptInput(ask, "Key name", defaultKeyName));
      let keyPath = resolveKeyPath(sshDir, keyNameInput);
      keyPath = await ensureUniqueKeyPath(sshDir, keyPath, ask);

      const created = generateKey(keyPath, email, keyType);
      if (!created && keyType === "ed25519") {
        const fallback = await promptYesNo(
          ask,
          "ed25519 failed. Try rsa 4096 instead",
          true
        );
        if (fallback) {
          const rsaCreated = generateKey(keyPath, email, "rsa");
          if (!rsaCreated) {
            console.error("Failed to generate RSA key.");
            process.exit(1);
          }
        } else {
          process.exit(1);
        }
      } else if (!created) {
        console.error("Failed to generate SSH key.");
        process.exit(1);
      }

      selectedKeyPath = keyPath;
    }

    if (!selectedKeyPath) {
      console.error("No SSH key selected. Exiting.");
      process.exit(1);
    }

    const publicKeyPath = `${selectedKeyPath}.pub`;
    if (!existsSync(publicKeyPath)) {
      console.error(`Public key not found at ${publicKeyPath}.`);
      process.exit(1);
    }

    console.log("\nStep 3: Start ssh-agent");
    if (!options.skipAgent) {
      const agentReady = startAgent();
      if (!agentReady) {
        console.log("Continuing without ssh-agent.");
      }
    } else {
      console.log("Skipped starting ssh-agent.");
    }

    console.log("\nStep 4: Add key to ssh-agent");
    if (!options.skipAdd) {
      const added = addKeyToAgent(selectedKeyPath);
      if (!added) {
        console.log(`ssh-add failed. Try: ssh-add ${selectedKeyPath}`);
      }
    } else {
      console.log("Skipped adding key to agent.");
    }

    console.log("\nStep 5: Add the public key to GitHub");
    const publicKey = readFileSync(publicKeyPath, "utf8");
    if (!options.skipCopy) {
      const copied = copyToClipboard(publicKey);
      if (copied) {
        console.log("Public key copied to clipboard.");
      } else {
        console.log("Copy failed. The public key is printed below:");
        console.log(publicKey.trim());
      }
    } else {
      console.log("Skipping clipboard copy. Public key:");
      console.log(publicKey.trim());
    }

    console.log("Open https://github.com/settings/keys and add a new SSH key.");

    console.log("\nStep 6: Verify your SSH connection");
    if (!options.skipVerify) {
      const verify = await promptYesNo(ask, "Run 'ssh -T git@github.com' now", false);
      if (verify) {
        spawnSync("ssh", ["-T", "git@github.com"], { stdio: "inherit" });
      }
    } else {
      console.log("Skipped verification.");
    }
  } finally {
    rl.close();
  }
};

main().catch((error) => {
  console.error("Unexpected error:", error instanceof Error ? error.message : error);
  process.exit(1);
});
