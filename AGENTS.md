# AGENTS.md

This file provides guidance for AI agents working with the gh-ssh codebase.

## Project Overview

**gh-ssh** is an interactive CLI that guides you through creating or reusing SSH keys and connecting them to GitHub. It provides a 7-step interactive workflow that:

1. Detect existing public keys in ~/.ssh and optionally reuse one.
2. Generate a new key pair if needed (ed25519 by default, rsa 4096 fallback).
3. Start ssh-agent if it is not already running.
4. Add the selected key to ssh-agent.
5. Optionally update ~/.ssh/config (with an optional GitHub host alias).
6. Copy the public key to clipboard (macOS) or print it to the terminal, then add it at https://github.com/settings/keys.
7. Prompt to verify with `ssh -T git@github.com` (or your alias).

**Key characteristics:**

- TypeScript with ES2022 target, ESM modules
- Node.js >= 20.0.0 required
- macOS optimized (clipboard uses `pbcopy`)
- Uses system commands (`ssh-keygen`, `ssh-agent`, `ssh-add`) directly

## Architecture

```
src/
├── cli.ts                    # Entry point - calls runCli() with error handling
└── lib/
    ├── cli/                  # CLI orchestration layer
    │   ├── types.ts          # CliOptions and KeyType definitions
    │   ├── args.ts           # Manual argument parser (no external deps)
    │   ├── help.ts           # Help text display
    │   ├── version.ts        # Version extraction from package.json
    │   ├── run.ts            # Main orchestrator - handles flags, calls workflow
    │   ├── workflow.ts       # Core 7-step SSH setup workflow
    │   └── constants.ts      # TOTAL_STEPS constant
    ├── services/             # System integration layer
    │   ├── ssh.ts            # SSH key operations (generate, list, agent)
    │   ├── clipboard.ts      # macOS clipboard via pbcopy
    │   ├── git.ts            # Git config reader
    │   └── command.ts        # Generic spawnSync wrapper
    └── ui/                   # User interface layer
        ├── format.ts         # ANSI colors, emoji, text styling
        ├── output.ts         # Structured logging (logInfo, logSuccess, etc.)
        └── prompts.ts        # @inquirer/prompts wrappers
tests/
├── args.test.ts              # CLI args parsing tests
├── command.test.ts           # runCommand wrapper tests
├── help.test.ts              # Help text tests
└── version.test.ts           # Version resolution tests
```

### Layer Responsibilities

- **cli/**: Argument parsing, workflow orchestration, user-facing logic
- **services/**: System command execution, file operations, external tool integration
- **ui/**: Console output formatting, interactive prompts, visual feedback

## Key Files

| File                          | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `src/cli.ts`                  | Entry point                             |
| `src/lib/cli/workflow.ts`     | Main business logic (7-step workflow)   |
| `src/lib/cli/args.ts`         | CLI argument parsing                    |
| `src/lib/services/ssh.ts`     | SSH key generation and agent management |
| `src/lib/services/command.ts` | Command execution wrapper               |
| `src/lib/cli/types.ts`        | Type definitions                        |

## Conventions

### Code Style

- Strict TypeScript mode enabled
- ESM modules with `.js` extensions in imports
- Functional approach - no classes, use standalone functions
- Export individual functions, not default exports

### Error Handling

- Top-level try-catch in `cli.ts` for graceful failures
- Service functions return `boolean` or `{ ok: boolean }` for success/failure
- Log warnings instead of throwing for recoverable errors
- Use `logError()` for user-facing error messages

### UI Patterns

- Use `printStep(n, message)` for workflow step headers
- Use `logInfo()`, `logSuccess()`, `logWarn()`, `logError()` for messages
- Use `promptYesNo()`, `promptInput()`, `selectFromList()` for user input
- Emoji are used for visual feedback (defined in `format.ts`)

### Command Execution

- Always use `runCommand()` from `services/command.ts`
- Set `inheritStdio: true` for commands that need terminal interaction
- Check `result.ok` before using `result.stdout`

## Common Tasks

### Adding a New CLI Flag

1. Add the flag to `CliOptions` in `src/lib/cli/types.ts`
2. Add parsing logic in `src/lib/cli/args.ts` (switch statement)
3. Update help text in `src/lib/cli/help.ts`
4. Use the flag in `workflow.ts` or `run.ts`

### Adding a New Workflow Step

1. Increment `TOTAL_STEPS` in `src/lib/cli/constants.ts`
2. Add step logic in `src/lib/cli/workflow.ts`
3. Use `printStep(stepNumber, description)` for the header
4. Consider adding a `--skip-*` flag if the step should be optional

### Adding a New Service Function

1. Add to appropriate file in `src/lib/services/`
2. Use `runCommand()` for shell commands
3. Return `boolean` or structured result with `ok` property
4. Handle errors gracefully - log and return false

### Adding New UI Elements

1. Add colors/emoji to `src/lib/ui/format.ts`
2. Add log functions to `src/lib/ui/output.ts`
3. Add prompt wrappers to `src/lib/ui/prompts.ts`

## Build & Development

```bash
# Development - run TypeScript directly
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build

# Run built version
npm start
```

### Build Output

- Single bundled file: `dist/cli.js`
- Includes shebang for direct execution
- ESM format targeting Node 20

## Dependencies

**Runtime:**

- `@inquirer/prompts` - Interactive CLI prompts

**Dev:**

- `typescript` - Type checking
- `tsx` - TypeScript execution
- `vite` - Bundling

**System commands used:**

- `ssh-keygen` - Key generation
- `ssh-agent` - Agent management
- `ssh-add` - Add keys to agent
- `pbcopy` - macOS clipboard (optional)
- `git` - Read user.email config

## Testing

Automated tests exist via Vitest. Run:

```bash
# Run the CLI interactively
npm run dev

# Test with flags
npm run dev -- --help
npm run dev -- --version
npm run dev -- --email test@example.com --type ed25519
```

## Platform Notes

- **macOS**: Full functionality including clipboard
- **Linux**: Works but clipboard step will be skipped with a warning
- Clipboard detection: `process.platform === "darwin"`
