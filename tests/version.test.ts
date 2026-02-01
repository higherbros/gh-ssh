import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { getPackageVersion } from '../src/lib/cli/version.js';

describe('getPackageVersion', () => {
  it('returns the package.json version', () => {
    const raw = readFileSync(
      new URL('../package.json', import.meta.url),
      'utf8'
    );
    const expected = JSON.parse(raw) as { version?: string };

    expect(getPackageVersion()).toBe(expected.version ?? null);
  });
});
