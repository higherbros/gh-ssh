import { afterEach, describe, expect, it, vi } from 'vitest';
import * as cp from 'node:child_process';
import { copyToClipboard } from '../src/lib/services/clipboard.js';

type SpawnSyncReturnType = ReturnType<typeof cp.spawnSync>;

// Mock child_process
vi.mock('node:child_process', () => ({
  spawnSync: vi.fn(),
}));

describe('copyToClipboard', () => {
  const originalPlatform = process.platform;

  afterEach(() => {
    // Restore platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    });
    vi.clearAllMocks();
  });

  it('should use wl-copy on Linux (Wayland) when available', () => {
    // Mock platform to linux
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });

    // Mock spawnSync to succeed for wl-copy
    vi.mocked(cp.spawnSync).mockImplementation((command) => {
      if (command === 'wl-copy') {
        return { status: 0, error: undefined } as SpawnSyncReturnType;
      }
      return {
        status: 127,
        error: new Error('not found'),
      } as SpawnSyncReturnType;
    });

    const result = copyToClipboard('secret-key');

    expect(result).toBe(true);
    expect(cp.spawnSync).toHaveBeenCalledWith(
      'wl-copy',
      [],
      expect.objectContaining({ input: 'secret-key' })
    );
  });

  it('should fall back to xclip on Linux if wl-copy fails', () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });

    // wl-copy fails, xclip succeeds
    vi.mocked(cp.spawnSync).mockImplementation((command) => {
      if (command === 'wl-copy') {
        return {
          status: 127,
          error: new Error('not found'),
        } as SpawnSyncReturnType;
      }
      if (command === 'xclip') {
        return { status: 0, error: undefined } as SpawnSyncReturnType;
      }
      return { status: 127 } as SpawnSyncReturnType;
    });

    const result = copyToClipboard('secret-key');

    expect(result).toBe(true);
    expect(cp.spawnSync).toHaveBeenCalledWith(
      'wl-copy',
      [],
      expect.objectContaining({ input: 'secret-key' })
    );
    expect(cp.spawnSync).toHaveBeenCalledWith(
      'xclip',
      ['-selection', 'clipboard'],
      expect.objectContaining({ input: 'secret-key' })
    );
  });

  it('should fall back to xsel on Linux if xclip fails', () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });

    // wl-copy and xclip fail, xsel succeeds
    vi.mocked(cp.spawnSync).mockImplementation((command) => {
      if (command === 'wl-copy' || command === 'xclip') {
        return { status: 127 } as SpawnSyncReturnType;
      }
      if (command === 'xsel') {
        return { status: 0 } as SpawnSyncReturnType;
      }
      return { status: 1 } as SpawnSyncReturnType;
    });

    const result = copyToClipboard('secret-key');

    expect(result).toBe(true);
    expect(cp.spawnSync).toHaveBeenCalledTimes(3);
    expect(cp.spawnSync).toHaveBeenLastCalledWith(
      'xsel',
      ['--clipboard', '--input'],
      expect.objectContaining({ input: 'secret-key' })
    );
  });

  it('should return false if all Linux tools fail', () => {
    Object.defineProperty(process, 'platform', {
      value: 'linux',
    });

    vi.mocked(cp.spawnSync).mockReturnValue({
      status: 127,
    } as SpawnSyncReturnType);

    const result = copyToClipboard('secret-key');

    expect(result).toBe(false);
  });

  it('should use pbcopy on Darwin', () => {
    Object.defineProperty(process, 'platform', {
      value: 'darwin',
    });

    vi.mocked(cp.spawnSync).mockReturnValue({
      status: 0,
    } as SpawnSyncReturnType);

    const result = copyToClipboard('secret-key');

    expect(result).toBe(true);
    expect(cp.spawnSync).toHaveBeenCalledWith(
      'pbcopy',
      [],
      expect.objectContaining({ input: 'secret-key' })
    );
  });
});
