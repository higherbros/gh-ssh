export const helpText = `gh-ssh
A simple, safe, one-command tool to generate and configure SSH keys for GitHub on macOS.

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
`;
