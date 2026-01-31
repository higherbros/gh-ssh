import { spawnSync } from 'node:child_process';

export const copyToClipboard = (text: string): boolean => {
  if (process.platform !== 'darwin') {
    return false;
  }

  const result = spawnSync('pbcopy', [], {
    input: text,
    encoding: 'utf8',
  });

  return result.status === 0;
};
