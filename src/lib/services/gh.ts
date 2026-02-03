import { runCommand } from './command.js';

export const isGhInstalled = (): boolean => runCommand('gh', ['--version']).ok;

export const isGhAuthenticated = (hostname: string): boolean =>
  runCommand('gh', ['auth', 'status', '--active', '--hostname', hostname]).ok;

export const runGhAuthLogin = (): boolean =>
  runCommand('gh', ['auth', 'login'], { inheritStdio: true }).ok;

export const addSshKeyViaGh = (publicKeyPath: string, title: string): boolean =>
  runCommand(
    'gh',
    [
      'ssh-key',
      'add',
      publicKeyPath,
      '--title',
      title,
      '--type',
      'authentication',
    ],
    { inheritStdio: true }
  ).ok;
