# Baseloop GTM Plugin Development

## Structure

### Skills
Each canonical skill is a directory under `skills/` with `SKILL.md` and its own `references/` (and optionally `assets/`). No cross-skill reference paths — every skill is self-contained. `codex/skills/` is a generated runtime mirror for Codex native plugin discovery; do not edit it directly. Run `bun run references:sync` after canonical skill/reference edits so the mirror stays in sync and excludes Claude-only skills.

Codex installs from `codex/`, not this parent directory. Keep the Codex manifest at `codex/.codex-plugin/plugin.json` and point the Codex marketplace source at `./plugins/baseloop-gtm/codex`; otherwise Codex will also discover this directory's Claude-compatible `skills/` tree and show duplicate, double-prefixed skills.

- `skills/baseloop-gtm/SKILL.md` — Root router, transport selection, domain mental model, design principles, critical rules. Shared foundation; `name: baseloop-gtm`.
- `skills/baseloop-gtm/references/` — Loaded on demand by the root skill itself.
  - `cost-estimation.md` — Runtime credit-cost hinting and rung-based estimates
  - `platform-discovery.md` — Runtime source-of-truth rules for action metadata and schemas
  - `tool-classifications.md` — Read-only / mutation / destructive categories
- `skills/baseloop-gtm-plan/SKILL.md` — Workflow design (prompt-enforced read-only)
- `skills/baseloop-gtm-build/SKILL.md` — Workflow execution (with inline diagnosis)
- `skills/baseloop-gtm-review/SKILL.md` — Proactive workflow audit (prompt-enforced read-only)
- `skills/baseloop-gtm-diagnose/SKILL.md` — 3-phase debugging (investigate → diagnose → fix)

Shared reference content (`pitfalls.md`, `error-patterns.md`, `workflow-patterns.md`) is duplicated per consuming skill via a sync mechanism — see `docs/reference-sources/README.md` at the repo root.

## Runtime vs Authoring Context

**This file and the repo-root `AGENTS.md` are authoring context — they do not ship with the installed plugin.** Skills are packaged and installed into end-user environments where they run against *the user's* CLAUDE.md/AGENTS.md, not this repo's.

Consequences:
- Behavioral rules that govern skill runtime behavior must live inside the skill itself — in `SKILL.md` or files under its `references/`.
- When two or more skills share a behavioral principle, duplicate the guidance into each skill (via the sync mechanism in `docs/reference-sources/`).
- Rules in this file only shape how contributors edit the plugin.

## Updating

When modifying:
1. **Never hand-bump versions.** Release-please owns versions across `.claude-plugin/plugin.json`, `codex/.codex-plugin/plugin.json`, `marketplace.json`, and `package.json`.
2. Keep each `SKILL.md` focused on the decision framework. Move long-form detail to `references/`.
3. When editing a shared reference (pitfalls, error-patterns, workflow-patterns), edit `docs/reference-sources/<name>.md` first, then run `bun run references:sync`.
4. Verify frontmatter fields match the plugin spec.
5. Test skills by invoking them: `/baseloop-gtm`, `/baseloop-gtm-plan`, `/baseloop-gtm-build`, `/baseloop-gtm-review`, `/baseloop-gtm-diagnose`.

## MCP Server

The Baseloop MCP server is bundled with this plugin via the `mcpServers` entry in `plugin.json` (key: `baseloop`). Users authenticate through the plugin's connector flow (OAuth).

**Tool naming:** MCP tool prefixes are runtime-generated (UUID-based in Cowork, name-based in CLI) and cannot be hardcoded. Skills reference MCP tools by their short names (e.g., `list_tables`, `create_field`) in prompt body text. Read-only vs. mutation boundaries are enforced through prompt instructions, not tool permissions.

## Content Philosophy

Every line in a skill should change Claude's behavior when building workflows. If it wouldn't cause Claude to make a different decision, cut it.

Reference files provide depth on demand. SKILL.md provides the decision framework.
