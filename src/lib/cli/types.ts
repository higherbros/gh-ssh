export type KeyType = "ed25519" | "rsa";

export type CliOptions = {
  email?: string;
  type?: KeyType;
  keyName?: string;
  help: boolean;
  version: boolean;
};
