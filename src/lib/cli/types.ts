export type KeyType = "ed25519" | "rsa";

export type CliOptions = {
  email?: string;
  type?: KeyType;
  keyName?: string;
  skipAgent: boolean;
  skipAdd: boolean;
  skipCopy: boolean;
  skipVerify: boolean;
  help: boolean;
  version: boolean;
};
