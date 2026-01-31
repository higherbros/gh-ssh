import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { KeyType } from '../cli/types.js';
import { runCommand } from './command.js';

type AgentStartResult =
  | { ok: true }
  | { ok: false; reason: 'start_failed' | 'no_socket' };

const parseAgentOutput = (
  output: string
): { socket?: string; pid?: string } => {
  const socketMatch = output.match(/SSH_AUTH_SOCK=([^;]+);/);
  const pidMatch = output.match(/SSH_AGENT_PID=([0-9]+);/);

  return {
    socket: socketMatch?.[1],
    pid: pidMatch?.[1],
  };
};

export const listPublicKeys = (sshDir: string): string[] => {
  if (!existsSync(sshDir)) {
    return [];
  }

  return readdirSync(sshDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.pub'))
    .map((entry) => join(sshDir, entry.name));
};

export const ensureSshDir = (sshDir: string): void => {
  if (!existsSync(sshDir)) {
    mkdirSync(sshDir, { recursive: true, mode: 0o700 });
  }
};

export const resolveKeyPath = (sshDir: string, keyName: string): string => {
  const sanitized = keyName.endsWith('.pub') ? keyName.slice(0, -4) : keyName;
  if (sanitized === '~') {
    return homedir();
  }

  if (sanitized.startsWith('~/')) {
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

  const result = runCommand('ssh-agent', ['-s']);
  if (!result.ok || !result.stdout) {
    return { ok: false, reason: 'start_failed' };
  }

  const parsed = parseAgentOutput(result.stdout);
  if (parsed.socket) {
    process.env.SSH_AUTH_SOCK = parsed.socket;
  }
  if (parsed.pid) {
    process.env.SSH_AGENT_PID = parsed.pid;
  }

  return parsed.socket ? { ok: true } : { ok: false, reason: 'no_socket' };
};

export const addKeyToAgent = (keyPath: string): boolean => {
  const result = spawnSync('ssh-add', [keyPath], {
    stdio: 'inherit',
    env: process.env,
  });

  return result.status === 0;
};

export const generateKey = (
  keyPath: string,
  email: string,
  type: KeyType
): boolean => {
  const argsList = ['-t', type, '-C', email, '-f', keyPath];
  if (type === 'rsa') {
    argsList.push('-b', '4096');
  }

  const result = spawnSync('ssh-keygen', argsList, { stdio: 'inherit' });
  return result.status === 0;
};

type HostBlock = {
  start: number;
  end: number;
};

type SshConfigHostInfo = {
  exists: boolean;
  identityFile?: string;
};

type SshConfigHostInfoResult =
  | { ok: true; info: SshConfigHostInfo }
  | { ok: false; reason: 'read_failed' };

type SshConfigUpdateOptions = {
  host: string;
  identityFile: string;
  hostName?: string;
  useKeychain: boolean;
};

type SshConfigUpdateResult =
  | { ok: true; changed: boolean }
  | { ok: false; reason: 'read_failed' | 'write_failed' };

const splitLines = (content: string): string[] => {
  if (!content) {
    return [];
  }

  const lines = content.split('\n');
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }

  return lines;
};

const parseHostPatterns = (line: string): string[] =>
  line
    .replace(/^\s*Host\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const findHostBlock = (lines: string[], host: string): HostBlock | null => {
  let start = -1;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const match = line.match(/^\s*Host\s+(.+)$/i);
    if (!match) {
      continue;
    }

    if (start !== -1) {
      return { start, end: i };
    }

    const patterns = parseHostPatterns(line);
    if (patterns.includes(host)) {
      start = i;
    }
  }

  if (start === -1) {
    return null;
  }

  return { start, end: lines.length };
};

const stripInlineComment = (value: string): string =>
  value.replace(/\s+#.*$/, '').trim();

const stripQuotes = (value: string): string => value.replace(/^"(.*)"$/, '$1');

const quoteIfNeeded = (value: string): string =>
  /\s/.test(value) ? `"${value}"` : value;

const getDirectiveValue = (line: string, directive: string): string | null => {
  const match = line.match(new RegExp(`^\\s*${directive}\\s+(.+)$`, 'i'));
  if (!match) {
    return null;
  }

  return stripInlineComment(match[1]);
};

const findDirectiveInBlock = (
  lines: string[],
  start: number,
  end: number,
  directive: string
): string | undefined => {
  for (let i = start + 1; i < end; i += 1) {
    const value = getDirectiveValue(lines[i], directive);
    if (value) {
      return value;
    }
  }

  return undefined;
};

const normalizeIdentityFileValue = (value: string): string => {
  const stripped = stripQuotes(stripInlineComment(value));
  if (stripped === '~') {
    return homedir();
  }
  if (stripped.startsWith('~/')) {
    return join(homedir(), stripped.slice(2));
  }

  return stripped;
};

const formatIdentityFileValue = (value: string): string => {
  const home = homedir();
  if (value === home) {
    return quoteIfNeeded('~');
  }

  const prefix = `${home}/`;
  if (value.startsWith(prefix)) {
    return quoteIfNeeded(`~/${value.slice(prefix.length)}`);
  }

  return quoteIfNeeded(value);
};

const readSshConfig = (
  sshDir: string
):
  | { ok: true; content: string; lines: string[]; configPath: string }
  | {
      ok: false;
      reason: 'read_failed';
      configPath: string;
    } => {
  const configPath = join(sshDir, 'config');
  if (!existsSync(configPath)) {
    return { ok: true, content: '', lines: [], configPath };
  }

  try {
    const content = readFileSync(configPath, 'utf8');
    return { ok: true, content, lines: splitLines(content), configPath };
  } catch {
    return { ok: false, reason: 'read_failed', configPath };
  }
};

export const getSshConfigHostInfo = (
  sshDir: string,
  host: string
): SshConfigHostInfoResult => {
  const result = readSshConfig(sshDir);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  const hostBlock = findHostBlock(result.lines, host);
  if (!hostBlock) {
    return { ok: true, info: { exists: false } };
  }

  const identityFile = findDirectiveInBlock(
    result.lines,
    hostBlock.start,
    hostBlock.end,
    'IdentityFile'
  );

  return { ok: true, info: { exists: true, identityFile } };
};

export const isSameIdentityFile = (
  existingValue: string,
  desiredPath: string
): boolean =>
  normalizeIdentityFileValue(existingValue) ===
  normalizeIdentityFileValue(desiredPath);

export const upsertSshConfigHost = (
  sshDir: string,
  options: SshConfigUpdateOptions
): SshConfigUpdateResult => {
  ensureSshDir(sshDir);
  const result = readSshConfig(sshDir);
  if (!result.ok) {
    return { ok: false, reason: result.reason };
  }

  const { lines, content, configPath } = result;
  const hostBlock = findHostBlock(lines, options.host);
  const indent = '  ';
  const identityFileValue = formatIdentityFileValue(options.identityFile);

  const insertLines: string[] = [];
  if (options.hostName) {
    insertLines.push(`${indent}HostName ${options.hostName}`);
  }
  insertLines.push(`${indent}IdentityFile ${identityFileValue}`);
  insertLines.push(`${indent}IdentitiesOnly yes`);
  if (options.useKeychain) {
    insertLines.push(`${indent}UseKeychain yes`);
  }

  if (hostBlock) {
    const blockLines = lines.slice(hostBlock.start, hostBlock.end);
    const hostLine = blockLines[0];
    const directiveRegexes: RegExp[] = [
      /^\s*IdentityFile\s+/i,
      /^\s*IdentitiesOnly\s+/i,
      ...(options.useKeychain ? [/^\s*UseKeychain\s+/i] : []),
      ...(options.hostName ? [/^\s*HostName\s+/i] : []),
    ];
    const filteredLines = blockLines
      .slice(1)
      .filter((line) => !directiveRegexes.some((regex) => regex.test(line)));
    const updatedBlock = [hostLine, ...insertLines, ...filteredLines];
    lines.splice(
      hostBlock.start,
      hostBlock.end - hostBlock.start,
      ...updatedBlock
    );
  } else {
    if (lines.length > 0 && lines[lines.length - 1].trim() !== '') {
      lines.push('');
    }
    lines.push(`Host ${options.host}`, ...insertLines);
  }

  const updatedContent = `${lines.join('\n')}\n`;
  const normalizedOriginal = content.endsWith('\n') ? content : `${content}\n`;
  if (updatedContent === normalizedOriginal) {
    return { ok: true, changed: false };
  }

  try {
    writeFileSync(configPath, updatedContent, { mode: 0o600 });
    chmodSync(configPath, 0o600);
  } catch {
    return { ok: false, reason: 'write_failed' };
  }

  return { ok: true, changed: true };
};
