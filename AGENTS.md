# Repo Instructions

This repo packages and distributes the **baseloop-gtm** Claude Code plugin: skills and the Baseloop MCP server declaration that together let users design, build, review, and diagnose automated GTM data workflows in Baseloop.

This file is the canonical contributor instruction file. `CLAUDE.md` is a one-line shim that includes this file via the `@AGENTS.md` directive. Both Claude Code and Codex resolve `@file.md` references at load time.

## Working Agreement

- **Branching:** create a feature branch for any non-trivial change. Use conventional-commit prefixes (`feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `test:`, `ci:`, `build:`, `perf:`, `revert:`) so release-please can classify changes correctly.
- **Releases:** release-please owns versions across `plugin.json`, `marketplace.json`, and `.codex-plugin/plugin.json` (when added). **Never hand-bump versions** in routine PRs.
- **Test before push:** run `bun test` and `bun run release:validate` locally. CI will fail otherwise.
- **Reference content:** edits to `pitfalls.md`, `error-patterns.md`, `workflow-patterns.md` go to `docs/reference-sources/<file>.md` first, then run `bun run references:sync`. Do not hand-edit per-skill copies under `plugins/baseloop-gtm/skills/*/references/<synced-file>.md`. CI fails on drift.
- **Safety:** never delete or overwrite user data. Avoid destructive commands.
- **Character encoding:** identifiers (file names, agent names, skill names) ASCII only. Markdown tables pipe-delimited. Prose may use Unicode.

## Directory Layout

```
.claude-plugin/marketplace.json     Marketplace catalog metadata.
docs/
  reference-sources/                Canonical source-of-truth for shared reference content.
  solutions/                        Captured workflow learnings (user-owned content; written by /baseloop-gtm:save-learning).
  plans/                            Authoring artifacts (gitignored — never ship).
plugins/baseloop-gtm/               The plugin itself (see plugin-level AGENTS.md).
scripts/
  references/sync.ts                Reference-duplication sync script.
  release/                          Release validation, preview, metadata-sync (Phase 3).
src/                                Bun/TypeScript converter CLI (Phase 4).
tests/                              Bun contract tests.
package.json                        Bun runtime + scripts.
```

## Testing

```bash
bun test                       # Run contract tests.
bun run references:check       # Reference-sync drift check (CI-gated).
bun run release:validate       # Release-config + metadata + reference-sync drift (CI-gated).
```

## Release Posture

- Versions live in three (eventually four) places: `plugin.json`, `.codex-plugin/plugin.json` (when added), `marketplace.json` (`.metadata.version` only — per-plugin version field is dropped), `package.json`.
- Release-please syncs them via `extra-files` in `.github/release-please-config.json`. Manual edits to any of these version fields trigger a release-please PR conflict on next run.
- Plugin description strings auto-sync from skill/MCP counts via `bun run release:sync-metadata --write`. Hand-editing description text drifts from disk reality and fails `release:validate`.

## Scratch Space

Default to `mktemp -d` for per-run throwaway artifacts; `tests/.tmp/` for test scratch. Use `.context/` only for repo-rooted, user-curated state (none today).

## Authoring vs Runtime Context

This file and `plugins/baseloop-gtm/AGENTS.md` shape **how contributors edit the plugin**. They do not ship with the installed plugin and have no effect at runtime — when a user runs a skill, their own AGENTS.md/CLAUDE.md is loaded, not this repo's.

Behavioral rules that govern skill runtime behavior must live inside the skill itself — in `SKILL.md` or files under `references/`. When two or more skills share a behavioral rule, duplicate the guidance via the sync mechanism in `docs/reference-sources/`.
