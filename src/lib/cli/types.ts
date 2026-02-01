export type KeyType = 'ed25519' | 'rsa';

export interface CliOptions {
  email?: string;
  type?: KeyType;
  keyName?: string;
  updateConfig?: boolean;
  skipConfig?: boolean;
  help: boolean;
  version: boolean;
}
