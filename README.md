# Baseloop GTM Plugin

A plugin for [Baseloop](https://baseloop.io), the GTM data workflow platform. Build automated GTM workflows — sourcing, enrichment, qualification, CRM sync, autonomous end-to-end runs — through conversation in Claude Code, Codex, or Gemini CLI.

**Includes 10 skills, CLI-ready instructions, and MCP compatibility.**

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

After install, run `/baseloop-gtm` to let the plugin choose setup, planning, building, review, or diagnosis. Run `/baseloop-gtm:setup` directly when you only want to verify CLI/MCP readiness and connected platforms.

### Codex

The repository includes native marketplace metadata for Codex plugin discovery.
The MCP server auto-registers from the plugin's `.mcp.json` and remains the deployable default until the Baseloop CLI is available. When the `baseloop` CLI is installed and its tool bridge is healthy, skills prefer CLI calls.

```bash
# 1. Register the marketplace.
codex plugin marketplace add baseloop-hq/baseloop-gtm-plugin

# 2. Install via the Codex TUI.
codex
# inside Codex: /plugins → find Baseloop GTM → Install → restart codex
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
| `/baseloop-gtm` | Root router — choose workflow and transport |
| `/baseloop-gtm:setup` | Diagnose CLI/MCP readiness + platform connections + workspace access |
| `/baseloop-gtm:plan` | Design a workflow architecture from a goal |
| `/baseloop-gtm:build` | Build a planned workflow step by step |
| `/baseloop-gtm:review` | Audit an existing workflow for pitfalls |
| `/baseloop-gtm:diagnose` | Investigate and fix a failing field |
| `/baseloop-gtm:lfg` | Plan + build + test autonomously (pauses before full scale) |
| `/baseloop-gtm:save-learning` | Capture a workflow learning to `docs/solutions/` |
| `/baseloop-gtm:update` | Check installed version against upstream (Claude Code only) |
| `/baseloop-gtm:help` | Skill + tool catalog |

`update` is Claude-Code-only by design; `setup` is available wherever the skill bundle is installed.

## Requirements

- A [Baseloop](https://baseloop.io) account with an active workspace.
- For Gemini installs: [Bun](https://bun.sh) (`curl -fsSL https://bun.sh/install | bash`).
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
