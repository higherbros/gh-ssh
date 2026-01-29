# gh-ssh
A simple, safe, one-command tool to generate and configure SSH keys for GitHub on macOS.

## Usage
- Run the interactive setup: `gh-ssh`
- Show help: `gh-ssh --help`
- Provide email upfront: `gh-ssh --email you@example.com`

Steps handled:
- Check for existing SSH keys in `~/.ssh`
- Generate a new key pair (ed25519 by default, rsa fallback)
- Start `ssh-agent` and add the key
- Copy the public key to your clipboard
- Optionally verify with `ssh -T git@github.com`

Options:
- `--email <email>`
- `--type <ed25519|rsa>`
- `--key-name <name>`
- `--skip-agent`
- `--skip-add`
- `--skip-copy`
- `--skip-verify`

## Development
- Install dependencies: `npm install`
- Run locally (TypeScript): `npm run dev -- --help`
- Build CLI: `npm run build`
- Run built CLI: `node dist/cli.js --help`
