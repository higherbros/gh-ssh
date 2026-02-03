# gh-ssh

An interactive CLI that guides you through creating or reusing an SSH key and connecting it to GitHub in a 7-step workflow. Supports macOS and Linux with clipboard integration.

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
- `gh-ssh --upload`
- `gh-ssh --skip-upload`
- `gh-ssh --key-title "My MacBook (work)"`

Options:

- `-h, --help`
- `-v, --version`
- `--email <email>` GitHub email for key comment
- `--type <ed25519|rsa>` Key type (default: ed25519)
- `--key-name <name>` Key filename in ~/.ssh (default: id_ed25519 or id_rsa)
- `--update-config` Update ~/.ssh/config with the selected key
- `--skip-config` Skip updating ~/.ssh/config
- `--upload` Upload the public key to GitHub via gh (errors if not possible)
- `--skip-upload` Skip uploading via gh and show the manual flow
- `--key-title <title>` Title to use when uploading via gh

## How it works

1. Detect existing public keys in ~/.ssh and optionally reuse one.
2. Generate a new key pair if needed (ed25519 by default, rsa 4096 fallback).
3. Start ssh-agent if it is not already running.
4. Add the selected key to ssh-agent.
5. Optionally update ~/.ssh/config (with an optional GitHub host alias).
6. Copy the public key to clipboard (macOS/Linux) or print it to the terminal, then add it at [GitHub Settings](https://github.com/settings/keys).
7. Prompt to verify with `ssh -T git@github.com` (or your alias).

## Platform notes

- macOS: full workflow, clipboard uses `pbcopy`.
- Linux: full workflow, clipboard uses `wl-copy`, `xclip`, or `xsel` (if available).
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

## Conventional Commits

We use Conventional Commit–style PR titles and squash merges to drive automated versioning and changelogs. Always use a semantic PR title and squash-merge so the PR title becomes the commit message used for releases.

Examples:

- `feat: add support for multiple GitHub hosts`
- `fix: handle missing ssh-agent`
- `feat!: change default key type` (breaking change)
- `chore: update dev dependencies` (no release)
