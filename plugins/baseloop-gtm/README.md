# Baseloop GTM Plugin

Build automated GTM data workflows through conversation. This plugin teaches your coding agent how to design, build, diagnose, audit, and autonomously operate Baseloop workflows that source, enrich, qualify, and route company and contact data.

**5 skills, CLI-ready instructions, and MCP compatibility.**

## Prerequisites

- A [Baseloop](https://baseloop.io) account with an active workspace.
- One of: [Claude Code](https://claude.ai/claude-code), Codex, or Gemini CLI.

## Install

The repo-root [`README.md`](../../README.md) has install instructions for all three platforms. The summary:

- **Claude Code:** native install — `/plugin marketplace add baseloop-hq/baseloop-gtm-plugin` then `/plugin install baseloop-gtm`. Start with `/baseloop-gtm`.
- **Codex:** native install end-to-end (`codex plugin marketplace add` + `/plugins` in the TUI). Start from the Baseloop GTM `baseloop-gtm` skill. The Codex marketplace points at `codex/`, a Codex-only package root with one `skills/` tree, so Claude-compatible skills are not double-discovered. CLI is used only when installed and healthy.
- **Gemini CLI:** Bun converter (`bun run src/index.ts install --to gemini`) — installs skills and merges MCP config into `~/.gemini/settings.json`.

## Skills

| Skill | Description |
|---|---|
| `/baseloop-gtm` | Root router — choose workflow and transport. Start here on a fresh install. |
| `/baseloop-gtm-plan` | Design a workflow from a goal. Surveys tables and integrations, produces an architecture plan. Read-only. |
| `/baseloop-gtm-build` | Build a workflow step by step. Creates tables and fields, verifies each step before proceeding. Inline error diagnosis. |
| `/baseloop-gtm-diagnose` | Debug a failing field or workflow. Traces upstream, identifies root cause, applies a fix, verifies resolution. |
| `/baseloop-gtm-review` | Audit an existing workflow for known pitfalls, missing safeguards, low-value work, and data-quality risks. Read-only. |

## Examples

Claude Code and Gemini show these commands directly. Codex may present them under the Baseloop GTM plugin namespace.

### Plan → build

```
> /baseloop-gtm Import HubSpot companies, qualify B2B SaaS, find founders on LinkedIn, sync contacts back

[Surveys tables/integrations/actions, produces a workflow architecture]

> /baseloop-gtm-build

[Creates tables and fields one at a time, runs and verifies each step]
```

### Debugging

```
> /baseloop-gtm diagnose The enrichment field on Companies is returning errors

[Investigates, traces upstream, identifies root cause, fixes the config, verifies]
```

## Structure

- `skills/<name>/SKILL.md` — Claude/Gemini canonical skills. Each skill is self-contained with its own `references/` and (optionally) `assets/`.
- `skills/baseloop-gtm/SKILL.md` — root router, transport selection, domain mental model, design principles, and critical rules.
- `codex/skills/<name>/SKILL.md` — generated Codex mirror with plugin-local skill names. Do not edit directly; run `bun run references:sync`.
- `.claude-plugin/plugin.json` — Claude Code plugin manifest with `mcpServers.baseloop`.
- `codex/.codex-plugin/plugin.json` — Codex plugin manifest with `interface` block for native install.
- `codex/.mcp.json` — Codex MCP server config referenced by the Codex manifest.

See [`AGENTS.md`](./AGENTS.md) (this directory) for plugin-development conventions.

## License

[Baseloop Source-Available License](../../LICENSE)
