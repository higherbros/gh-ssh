# gh-ssh

An interactive CLI that guides you through creating or reusing an SSH key and connecting it to GitHub in a 7-step workflow. Optimized for macOS with clipboard support, but works on Linux by printing the key when clipboard isn’t available.

## Installation

Requirements:

- Node.js >= 20

Install globally:

- `npm install -g gh-ssh`

Run without installing:

- `npx gh-ssh`

## Usage

Run interactive setup:

- `gh-ssh`

Show help/version:

- `gh-ssh --help`
- `gh-ssh --version`

Provide options up front:

- `gh-ssh --email you@example.com`
- `gh-ssh --type ed25519`
- `gh-ssh --key-name id_github_work`
- `gh-ssh --update-config`
- `gh-ssh --skip-config`

Options:

- `-h, --help`
- `-v, --version`
- `--email <email>` GitHub email for key comment
- `--type <ed25519|rsa>` Key type (default: ed25519)
- `--key-name <name>` Key filename in ~/.ssh (default: id_ed25519 or id_rsa)
- `--update-config` Update ~/.ssh/config with the selected key
- `--skip-config` Skip updating ~/.ssh/config

## How it works

1. Detect existing public keys in ~/.ssh and optionally reuse one.
2. Generate a new key pair if needed (ed25519 by default, rsa 4096 fallback).
3. Start ssh-agent if it is not already running.
4. Add the selected key to ssh-agent.
5. Optionally update ~/.ssh/config (with an optional GitHub host alias).
6. Copy the public key to clipboard (macOS) or print it to the terminal, then add it at https://github.com/settings/keys.
7. Prompt to verify with `ssh -T git@github.com` (or your alias).

## Platform notes

- macOS: full workflow, clipboard uses `pbcopy`.
- Linux/Windows: clipboard step prints the key to the terminal instead.
- Requires `ssh-keygen`, `ssh-agent`, and `ssh-add` to be available in PATH.

## Development

- Install dependencies: `npm install`
- Run locally (TypeScript): `npm run dev`
- Type check: `npm run typecheck`
- Build CLI: `npm run build`
- Run built CLI: `npm start`

## Manual testing

- `npm run dev -- --help`
- `npm run dev -- --version`
- `npm run dev -- --email test@example.com --type ed25519`
