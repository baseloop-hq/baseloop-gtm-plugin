# Baseloop Plugin Marketplace

Claude Code plugins for [Baseloop](https://baseloop.io), the GTM data workflow platform.

## Install

In Claude Desktop (Cowork tab):

1. Go to **Customize** > **Browse plugins**
2. Click **Personal** > **+** > **Add marketplace by URL**
3. Paste: `https://github.com/baseloop-hq/baseloop-gtm-plugin`
4. Click **Sync**, then install the **baseloop-gtm** plugin

In Claude Code (Terminal):

```bash
claude plugin marketplace add baseloop-hq/baseloop-gtm-plugin
claude plugin install baseloop-gtm
```

## Plugins

### baseloop-gtm

Build automated GTM data workflows through conversation. Source, enrich, qualify, and route company and contact data using Baseloop tables, actions, and integrations.

**Includes:** 1 skill, 6 commands, 3 agents

| Command | Description |
|---|---|
| `/plan` | Design a workflow from a goal |
| `/build` | Build a workflow step by step |
| `/diagnose` | Debug a failing field or workflow |
| `/lfg` | Autonomous end-to-end build |
| `/review` | Review a workflow for issues |
| `/help` | Show available commands |

**Requires:** A [Baseloop](https://baseloop.io) account. The plugin includes an MCP server that connects to your Baseloop workspace.

## License

Proprietary. Copyright Baseloop.
