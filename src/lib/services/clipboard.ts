import { spawnSync } from 'node:child_process';

interface ClipboardCommand {
  command: string;
  args: string[];
}

export const copyToClipboard = (text: string): boolean => {
  const platform = process.platform;
  const candidates: ClipboardCommand[] = [];

  if (platform === 'darwin') {
    candidates.push({ command: 'pbcopy', args: [] });
  } else if (platform === 'linux') {
    // Wayland
    candidates.push({ command: 'wl-copy', args: [] });
    // X11 - xclip
    candidates.push({ command: 'xclip', args: ['-selection', 'clipboard'] });
    // X11 - xsel
    candidates.push({ command: 'xsel', args: ['--clipboard', '--input'] });
  }

  for (const { command, args } of candidates) {
    try {
      const result = spawnSync(command, args, {
        input: text,
        encoding: 'utf8',
        stdio: ['pipe', 'ignore', 'ignore'],
      });

      if (!result.error && result.status === 0) {
        return true;
      }
    } catch {
      // Ignore errors and try the next candidate
      continue;
    }
  }

  return false;
};
