import { CliOptions } from './types.js';

const defaultOptions: CliOptions = {
  help: false,
  version: false,
};

export const parseArgs = (
  argv: string[]
): { options: CliOptions; unknown: string[] } => {
  const options: CliOptions = { ...defaultOptions };
  const unknown: string[] = [];
  const hasValue = (value?: string): value is string =>
    typeof value === 'string' && value.length > 0 && !value.startsWith('-');

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    switch (arg) {
      case '-h':
      case '--help':
        options.help = true;
        break;
      case '-v':
      case '--version':
        options.version = true;
        break;
      case '--email':
        if (hasValue(argv[i + 1])) {
          options.email = argv[i + 1];
          i += 1;
        } else {
          unknown.push(arg);
        }
        break;
      case '--type': {
        const value = argv[i + 1];
        if (!hasValue(value)) {
          unknown.push(arg);
          break;
        }
        if (value === 'ed25519' || value === 'rsa') {
          options.type = value;
          i += 1;
        } else {
          unknown.push(arg, value ?? '');
          i += 1;
        }
        break;
      }
      case '--key-name':
        if (hasValue(argv[i + 1])) {
          options.keyName = argv[i + 1];
          i += 1;
        } else {
          unknown.push(arg);
        }
        break;
      case '--update-config':
        options.updateConfig = true;
        break;
      case '--skip-config':
        options.skipConfig = true;
        break;
      case '--upload':
        options.upload = true;
        break;
      case '--skip-upload':
        options.skipUpload = true;
        break;
      case '--key-title':
        if (hasValue(argv[i + 1])) {
          options.keyTitle = argv[i + 1];
          i += 1;
        } else {
          unknown.push(arg);
        }
        break;
      default:
        unknown.push(arg);
        break;
    }
  }

  return { options, unknown };
};
