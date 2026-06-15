# Baseloop GTM Plugin

Build automated GTM data workflows through conversation. This plugin teaches your coding agent how to design, build, diagnose, audit, and autonomously operate Baseloop workflows that source, enrich, qualify, and route company and contact data.

**10 skills, CLI-ready instructions, and MCP compatibility.**

## Prerequisites

- A [Baseloop](https://baseloop.io) account with an active workspace.
- One of: [Claude Code](https://claude.ai/claude-code), Codex, or Gemini CLI.

## Install

The repo-root [`README.md`](../../README.md) has install instructions for all three platforms. The summary:

- **Claude Code:** native install — `/plugin marketplace add baseloop-hq/baseloop-gtm-plugin` then `/plugin install baseloop-gtm`. Start with `/baseloop-gtm`.
- **Codex:** native install end-to-end (`codex plugin marketplace add` + `/plugins` in the TUI). Start with `/baseloop-gtm:baseloop-gtm`. Skills + MCP compatibility wire up through the repo's native marketplace metadata; CLI is used only when installed and healthy.
- **Gemini CLI:** Bun converter (`bun run src/index.ts install --to gemini`) — installs skills and merges MCP config into `~/.gemini/settings.json`.

## Skills

| Skill | Description |
|---|---|
| `/baseloop-gtm` (Claude/Gemini)<br>`/baseloop-gtm:baseloop-gtm` (Codex) | Root router — choose workflow and transport. Start here on a fresh install. |
| `/baseloop-gtm:setup` | Diagnose CLI/MCP readiness + connected platforms + workspace access. |
| `/baseloop-gtm:plan` | Design a workflow from a goal. Surveys tables and integrations, produces an architecture plan. Read-only. |
| `/baseloop-gtm:build` | Build a workflow step by step. Creates tables and fields, verifies each step before proceeding. Inline error diagnosis. |
| `/baseloop-gtm:diagnose` | Debug a failing field or workflow. Traces upstream, identifies root cause, applies a fix, verifies resolution. |
| `/baseloop-gtm:review` | Audit an existing workflow for known pitfalls, missing safeguards, low-value work, and data-quality risks. Read-only. |
| `/baseloop-gtm:lfg` | Autonomous end-to-end: plan → build → test → diagnose. Pauses for cost approval before full-scale runs. |
| `/baseloop-gtm:save-learning` | Capture a non-obvious workflow learning to `docs/solutions/` so the next session inherits it. |
| Installed version check | Claude Code has a dedicated update skill; on other hosts, use the host's plugin manager or compare the installed package with upstream release metadata. |
| `/baseloop-gtm:help` | Skill + tool catalog. |

## Examples

Codex users should replace root-router examples that start with `/baseloop-gtm` with `/baseloop-gtm:baseloop-gtm`. Subcommands such as `/baseloop-gtm:build` and `/baseloop-gtm:review` are the same across hosts.

### Plan → build

```
> /baseloop-gtm Import HubSpot companies, qualify B2B SaaS, find founders on LinkedIn, sync contacts back

[Surveys tables/integrations/actions, produces a workflow architecture]

> /baseloop-gtm:build

[Creates tables and fields one at a time, runs and verifies each step]
```

### Debugging

```
> /baseloop-gtm diagnose The enrichment field on Companies is returning errors

[Investigates, traces upstream, identifies root cause, fixes the config, verifies]
```

### Autonomous

```
> /baseloop-gtm autonomously import HubSpot companies, qualify B2B SaaS, find founders, sync contacts back

[Plans, builds, tests Rung 1 + 2, diagnoses errors. Pauses with cost estimate before Rung 3.]
```

### Capture a learning

```
> /baseloop-gtm:save-learning HubSpot enum mismatch on lifecycle stage

[Walks the user through classifying + writing a docs/solutions/ entry that future sessions will read.]
```

## Structure

- `skills/<name>/SKILL.md` — each skill is self-contained with its own `references/` and (optionally) `assets/`.
- `skills/baseloop-gtm/SKILL.md` — root router, transport selection, domain mental model, design principles, and critical rules.
- `.claude-plugin/plugin.json` — Claude Code plugin manifest with `mcpServers.baseloop`.
- `.codex-plugin/plugin.json` — Codex plugin manifest with `interface` block for native install.
- `.mcp.json` — Codex MCP server config referenced by the Codex manifest.

See [`AGENTS.md`](./AGENTS.md) (this directory) for plugin-development conventions.

## License

[Baseloop Source-Available License](../../LICENSE)
