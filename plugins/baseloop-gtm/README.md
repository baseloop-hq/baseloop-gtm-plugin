# Baseloop GTM Plugin

Build automated GTM data workflows through conversation. This plugin teaches your coding agent how to design, build, diagnose, audit, and autonomously operate Baseloop workflows that source, enrich, qualify, and route company and contact data.

**10 skills, 3 read-only audit agents, 1 MCP server.**

## Prerequisites

- A [Baseloop](https://baseloop.io) account with an active workspace.
- One of: [Claude Code](https://claude.ai/claude-code), Codex, or Gemini CLI.

## Install

The repo-root [`README.md`](../../README.md) has install instructions for all three platforms. The summary:

- **Claude Code:** native install — `/plugin marketplace add baseloop-hq/baseloop-gtm-plugin` then `/plugin install baseloop-gtm`. Run `/baseloop-gtm:setup` after.
- **Codex:** native install end-to-end (`codex plugin marketplace add` + `/plugins` in the TUI). Skills + MCP wire up automatically through the repo's native marketplace metadata. The Bun converter is optional, only for installing standalone audit agents.
- **Gemini CLI:** Bun converter (`bun run src/index.ts install --to gemini`) — installs skills and merges MCP config into `~/.gemini/settings.json`.

## Skills

| Skill | Description |
|---|---|
| `/baseloop-gtm:setup` | Diagnose MCP auth + connected platforms + workspace access (Claude Code only). Always run this first on a fresh install. |
| `/baseloop-gtm:plan` | Design a workflow from a goal. Surveys tables and integrations, produces an architecture plan. Read-only. |
| `/baseloop-gtm:build` | Build a workflow step by step. Creates tables and fields, verifies each step before proceeding. Inline error diagnosis. |
| `/baseloop-gtm:diagnose` | Debug a failing field or workflow. Traces upstream, identifies root cause, applies a fix, verifies resolution. |
| `/baseloop-gtm:review` | Audit an existing workflow for known pitfalls, missing safeguards, and credit-wasting patterns. Read-only. |
| `/baseloop-gtm:lfg` | Autonomous end-to-end: plan → build → test → diagnose. Pauses for cost approval before full-scale runs. |
| `/baseloop-gtm:engineering` | Mental model, design principles, and critical rules behind every workflow. |
| `/baseloop-gtm:save-learning` | Capture a non-obvious workflow learning to `docs/solutions/` so the next session inherits it. |
| `/baseloop-gtm:update` | Check installed plugin version against upstream main (Claude Code only). |
| `/baseloop-gtm:help` | Skill + tool catalog. |

## Agents

Read-only auditors available for direct invocation when a workflow needs a deeper pass. `/baseloop-gtm:review` performs the core audit inline and uses the same severity conventions; invoke these agents directly when you want row-level data quality, cost, or CRM-specific review. See [`agents/README.md`](./agents/README.md) for the persona catalog.

## Examples

### Plan → build

```
> /baseloop-gtm:plan Import HubSpot companies, qualify B2B SaaS, find founders on LinkedIn, sync contacts back

[Surveys tables/integrations/actions, produces a workflow architecture]

> /baseloop-gtm:build

[Creates tables and fields one at a time, runs and verifies each step]
```

### Debugging

```
> /baseloop-gtm:diagnose The enrichment field on Companies is returning errors

[Investigates, traces upstream, identifies root cause, fixes the config, verifies]
```

### Autonomous

```
> /baseloop-gtm:lfg Import HubSpot companies, qualify B2B SaaS, find founders, sync contacts back

[Plans, builds, tests Rung 1 + 2, diagnoses errors. Pauses with cost estimate before Rung 3.]
```

### Capture a learning

```
> /baseloop-gtm:save-learning HubSpot enum mismatch on lifecycle stage

[Walks the user through classifying + writing a docs/solutions/ entry that future sessions will read.]
```

## Structure

- `skills/<name>/SKILL.md` — each skill is self-contained with its own `references/` and (optionally) `assets/`.
- `skills/engineering/SKILL.md` — domain mental model + design principles + critical rules. Other skills load relevant pieces on demand.
- `agents/<name>.agent.md` — read-only auditors with TOML-/markdown-style frontmatter.
- `.claude-plugin/plugin.json` — Claude Code plugin manifest with `mcpServers.baseloop`.
- `.codex-plugin/plugin.json` — Codex plugin manifest with `interface` block for native install.
- `.mcp.json` — Codex MCP server config referenced by the Codex manifest.

See [`AGENTS.md`](./AGENTS.md) (this directory) for plugin-development conventions.

## License

[Baseloop Source-Available License](../../LICENSE)
