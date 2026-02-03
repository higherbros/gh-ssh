import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/services/command.js', () => ({
  runCommand: vi.fn(),
}));

import { runCommand } from '../src/lib/services/command.js';
import {
  addSshKeyViaGh,
  isGhAuthenticated,
  isGhInstalled,
  runGhAuthLogin,
} from '../src/lib/services/gh.js';

const runCommandMock = vi.mocked(runCommand);

describe('gh service', () => {
  beforeEach(() => {
    runCommandMock.mockReset();
  });

  it('detects whether gh is installed', () => {
    runCommandMock.mockReturnValue({ ok: true });

    expect(isGhInstalled()).toBe(true);
    expect(runCommandMock).toHaveBeenCalledWith('gh', ['--version']);
  });

  it('checks authentication for a hostname', () => {
    runCommandMock.mockReturnValue({ ok: false });

    expect(isGhAuthenticated('github.com')).toBe(false);
    expect(runCommandMock).toHaveBeenCalledWith('gh', [
      'auth',
      'status',
      '--active',
      '--hostname',
      'github.com',
    ]);
  });

  it('runs gh auth login interactively', () => {
    runCommandMock.mockReturnValue({ ok: true });

    expect(runGhAuthLogin()).toBe(true);
    expect(runCommandMock).toHaveBeenCalledWith(
      'gh',
      ['auth', 'login'],
      { inheritStdio: true }
    );
  });

  it('adds an SSH key via gh', () => {
    runCommandMock.mockReturnValue({ ok: true });

    expect(addSshKeyViaGh('/tmp/test.pub', 'My key')).toBe(true);
    expect(runCommandMock).toHaveBeenCalledWith(
      'gh',
      [
        'ssh-key',
        'add',
        '/tmp/test.pub',
        '--title',
        'My key',
        '--type',
        'authentication',
      ],
      { inheritStdio: true }
    );
  });
});
