export const helpText = `gh-ssh
Interactive CLI that guides you through creating or reusing SSH keys and connecting them to GitHub.

Usage:
  gh-ssh

Options:
  -h, --help           Show help
  -v, --version        Show version
  --email <email>      GitHub email for key comment
  --type <ed25519|rsa> Key type (default: ed25519)
  --key-name <name>    Key filename in ~/.ssh (default: id_ed25519 or id_rsa)
  --update-config      Update ~/.ssh/config with the selected key
  --skip-config        Skip updating ~/.ssh/config
  --upload             Upload the public key to GitHub via gh
  --skip-upload        Skip uploading via gh and show the manual flow
  --key-title <title>  Title to use when uploading via gh
`;
