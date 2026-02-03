export type KeyType = 'ed25519' | 'rsa';

export interface CliOptions {
  email?: string;
  type?: KeyType;
  keyName?: string;
  updateConfig?: boolean;
  skipConfig?: boolean;
  upload?: boolean;
  skipUpload?: boolean;
  keyTitle?: string;
  help: boolean;
  version: boolean;
}
