import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/lib/services/command.js', () => ({
  runCommand: vi.fn(),
}));

import { runCommand } from '../src/lib/services/command.js';
import { startAgent } from '../src/lib/services/ssh.js';

const runCommandMock = vi.mocked(runCommand);
const originalAuthSock = process.env.SSH_AUTH_SOCK;
const originalAgentPid = process.env.SSH_AGENT_PID;

describe('startAgent', () => {
  beforeEach(() => {
    runCommandMock.mockReset();
    delete process.env.SSH_AUTH_SOCK;
    delete process.env.SSH_AGENT_PID;
  });

  afterEach(() => {
    if (originalAuthSock === undefined) {
      delete process.env.SSH_AUTH_SOCK;
    } else {
      process.env.SSH_AUTH_SOCK = originalAuthSock;
    }

    if (originalAgentPid === undefined) {
      delete process.env.SSH_AGENT_PID;
    } else {
      process.env.SSH_AGENT_PID = originalAgentPid;
    }
  });

  it('returns ok when SSH_AUTH_SOCK already set', () => {
    process.env.SSH_AUTH_SOCK = '/tmp/agent.sock';

    const result = startAgent();

    expect(result).toEqual({ ok: true });
    expect(runCommandMock).not.toHaveBeenCalled();
  });

  it('returns start_failed when agent command fails', () => {
    runCommandMock.mockReturnValue({ ok: false });

    const result = startAgent();

    expect(result).toEqual({ ok: false, reason: 'start_failed' });
    expect(runCommandMock).toHaveBeenCalledWith('ssh-agent', ['-s']);
  });

  it('sets environment variables when agent starts', () => {
    runCommandMock.mockReturnValue({
      ok: true,
      stdout:
        'SSH_AUTH_SOCK=/tmp/agent.sock; export SSH_AUTH_SOCK;\n' +
        'SSH_AGENT_PID=12345; export SSH_AGENT_PID;\n',
    });

    const result = startAgent();

    expect(result).toEqual({ ok: true });
    expect(process.env.SSH_AUTH_SOCK).toBe('/tmp/agent.sock');
    expect(process.env.SSH_AGENT_PID).toBe('12345');
  });

  it('returns no_socket when agent output lacks socket', () => {
    runCommandMock.mockReturnValue({
      ok: true,
      stdout: 'SSH_AGENT_PID=12345; export SSH_AGENT_PID;\n',
    });

    const result = startAgent();

    expect(result).toEqual({ ok: false, reason: 'no_socket' });
    expect(process.env.SSH_AUTH_SOCK).toBeUndefined();
    expect(process.env.SSH_AGENT_PID).toBe('12345');
  });
});
