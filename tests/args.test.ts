import { describe, expect, it } from 'vitest';
import { parseArgs } from '../src/lib/cli/args.js';

describe('parseArgs', () => {
  it('returns defaults for empty argv', () => {
    const { options, unknown } = parseArgs([]);

    expect(options).toEqual({ help: false, version: false });
    expect(unknown).toEqual([]);
  });

  it('parses flags and values', () => {
    const { options, unknown } = parseArgs([
      '--help',
      '-v',
      '--email',
      'test@example.com',
      '--type',
      'rsa',
      '--key-name',
      'id_rsa_custom',
      '--update-config',
      '--skip-config',
      '--upload',
      '--key-title',
      'My key title',
    ]);

    expect(options.help).toBe(true);
    expect(options.version).toBe(true);
    expect(options.email).toBe('test@example.com');
    expect(options.type).toBe('rsa');
    expect(options.keyName).toBe('id_rsa_custom');
    expect(options.updateConfig).toBe(true);
    expect(options.skipConfig).toBe(true);
    expect(options.upload).toBe(true);
    expect(options.keyTitle).toBe('My key title');
    expect(unknown).toEqual([]);
  });

  it('collects unknown flags and invalid values', () => {
    const { options, unknown } = parseArgs(['--type', 'dsa', '--nope']);

    expect(options.type).toBeUndefined();
    expect(unknown).toEqual(['--type', 'dsa', '--nope']);
  });

  it('tracks missing values without consuming next flag', () => {
    const { options, unknown } = parseArgs(['--type', '--help', '--email']);

    expect(options.help).toBe(true);
    expect(unknown).toEqual(['--type', '--email']);
  });

  it('tracks missing key title without consuming next flag', () => {
    const { options, unknown } = parseArgs(['--key-title', '--upload']);

    expect(options.upload).toBe(true);
    expect(options.keyTitle).toBeUndefined();
    expect(unknown).toEqual(['--key-title']);
  });
});
