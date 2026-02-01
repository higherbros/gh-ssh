import { describe, expect, it } from 'vitest';
import { helpText } from '../src/lib/cli/help.js';

describe('helpText', () => {
  it('includes key options and usage', () => {
    expect(helpText).toContain('Usage:');
    expect(helpText).toContain('--email <email>');
    expect(helpText).toContain('--type <ed25519|rsa>');
    expect(helpText).toContain('--update-config');
    expect(helpText).toContain('--skip-config');
  });
});
