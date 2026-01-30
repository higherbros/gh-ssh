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
  --skip-agent         Skip starting ssh-agent
  --skip-add           Skip adding key to agent
  --skip-copy          Skip copying public key to clipboard
  --skip-verify        Skip ssh -T verification step
`;
