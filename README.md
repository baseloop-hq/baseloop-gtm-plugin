# Baseloop GTM Plugin

A plugin for [Baseloop](https://baseloop.io), the GTM data workflow platform. Build automated GTM workflows — sourcing, enrichment, qualification, CRM sync, autonomous end-to-end runs — through conversation in Claude Code, Codex, or Gemini CLI.

**Includes 10 skills, 3 read-only audit agents, and 1 MCP server.**

## Install

### Claude Code

In Claude Desktop (Cowork tab):

1. **Customize** → **Browse plugins** → **Personal** → **+** → **Add marketplace by URL**
2. Paste: `https://github.com/baseloop-hq/baseloop-gtm-plugin`
3. **Sync**, then install **baseloop-gtm**.

In the Claude Code CLI:

```bash
claude plugin marketplace add baseloop-hq/baseloop-gtm-plugin
claude plugin install baseloop-gtm
```

After install, run `/baseloop-gtm:setup` to verify your MCP connection and connected platforms.

### Codex

The repository includes native marketplace metadata for Codex plugin discovery.
The MCP server auto-registers from the plugin's `.mcp.json`; first invocation triggers OAuth.

```bash
# 1. Register the marketplace.
codex plugin marketplace add baseloop-hq/baseloop-gtm-plugin

# 2. Install via the Codex TUI.
codex
# inside Codex: /plugins → find Baseloop GTM → Install → restart codex
```

#### Optional: install standalone audit agents

`/baseloop-gtm:review` runs its audit inline, so the standalone agents (`crm-integrity-checker`, `data-quality-auditor`, `workflow-cost-optimizer`) are **not required** for the review flow. Install them only if you want to invoke them directly as Codex subagents:

```bash
git clone https://github.com/baseloop-hq/baseloop-gtm-plugin.git
cd baseloop-gtm-plugin
bun install
bun run src/index.ts install --to codex
```

### Gemini CLI

Gemini has no native plugin spec; everything flows through the converter:

```bash
git clone https://github.com/baseloop-hq/baseloop-gtm-plugin.git
cd baseloop-gtm-plugin
bun install
bun run src/index.ts install --to gemini
```

This writes:
- Skills to `~/.gemini/skills/<skill-name>/`
- MCP server config merged into `~/.gemini/settings.json` (existing config preserved)
- Standalone audit agents to `~/.gemini/agents/` (optional — `/baseloop-gtm:review` runs the audit inline; agents are only needed if you want to invoke them directly)

If your MCP server config has env-var keys that look like secrets (`API_KEY`, `TOKEN`, etc.), the installer prints a warning so you can review before committing `settings.json` to version control.

### Install both at once

```bash
bun run src/index.ts install --to all
```

Detects which CLIs are installed under `~/.codex` and `~/.gemini`; skips missing targets gracefully.

### Cleanup

The Bun converter records every file it writes in an install manifest. Use `cleanup` to remove a previous install without touching unrelated files:

```bash
bun run src/index.ts cleanup --target codex
bun run src/index.ts cleanup --target gemini

# Preview what would be removed:
bun run src/index.ts cleanup --target codex --dry-run
```

## Skills

| Skill | Purpose |
|---|---|
| `/baseloop-gtm:setup` | Diagnose MCP auth + platform connections + workspace access (Claude Code only) |
| `/baseloop-gtm:plan` | Design a workflow architecture from a goal |
| `/baseloop-gtm:build` | Build a planned workflow step by step |
| `/baseloop-gtm:review` | Audit an existing workflow for pitfalls |
| `/baseloop-gtm:diagnose` | Investigate and fix a failing field |
| `/baseloop-gtm:lfg` | Plan + build + test autonomously (pauses before full scale) |
| `/baseloop-gtm:engineering` | Mental model, design principles, critical rules |
| `/baseloop-gtm:save-learning` | Capture a workflow learning to `docs/solutions/` |
| `/baseloop-gtm:update` | Check installed version against upstream (Claude Code only) |
| `/baseloop-gtm:help` | Skill + tool catalog |

`setup` and `update` are Claude-Code-only by design; the Bun converter excludes them from Codex and Gemini installs automatically.

## Agents

Read-only auditors invoked from `/baseloop-gtm:review` or directly:

- `crm-integrity-checker` — HubSpot sync integrity (duplicates, associations, enums)
- `data-quality-auditor` — Row data inspection (nulls, extraction paths, type coercion)
- `workflow-cost-optimizer` — Credit consumption analysis

See [`plugins/baseloop-gtm/agents/README.md`](./plugins/baseloop-gtm/agents/README.md) for the persona catalog.

## Requirements

- A [Baseloop](https://baseloop.io) account with an active workspace.
- For Codex standalone audit-agent installs and Gemini installs: [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`).
- For Claude Code: only the plugin install steps above.

## Local Development

```bash
bun install
bun test                  # contract tests
bun run release:validate  # release-config + metadata + reference-sync drift
bun run references:sync   # apply edits to docs/reference-sources/ across consuming skills
```

See [`AGENTS.md`](./AGENTS.md) for the contributor working agreement.

## License

[Baseloop Source-Available License](./LICENSE)
