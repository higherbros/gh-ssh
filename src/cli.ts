#!/usr/bin/env node

const helpText = `gh-ssh
A simple, safe, one-command tool to generate and configure SSH keys for GitHub on macOS.

Usage:
  gh-ssh [options]

Options:
  -h, --help     Show help
  -v, --version  Show version (coming soon)
`;

const args = process.argv.slice(2);

if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  console.log(helpText);
  process.exit(0);
}

console.log("gh-ssh scaffold ready. Implement commands in src/cli.ts.");
