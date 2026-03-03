# Baseloop GTM Plugin

Build automated GTM data workflows with Claude Code. This plugin teaches Claude how to design, build, diagnose, and autonomously operate workflows that source, enrich, qualify, and route company and contact data using Baseloop tables, actions, and integrations.

## Prerequisites

- A [Baseloop](https://baseloop.com) account with an active workspace
- [Claude Code](https://claude.ai/claude-code) installed
- Baseloop MCP server connected (see Setup below)

## Setup

### Install the plugin

```
/plugin marketplace add baseloop-hq/baseloop-gtm-plugin
/plugin install baseloop-gtm@baseloop-gtm-plugin
```

### Connect the MCP server

The plugin requires a connection to your Baseloop MCP server. Choose one:

**OAuth (recommended):**
```bash
claude mcp add --transport http baseloop-gtm https://api-v2.baseloop.io/v1/mcp
```

**API key:**
```bash
claude mcp add --transport http --header "x-api-key: $BASELOOP_API_KEY" baseloop-gtm https://api-v2.baseloop.io/v1/mcp
```

> **Note:** Using an environment variable (`$BASELOOP_API_KEY`) avoids persisting the key in your shell history. Set it with `export BASELOOP_API_KEY=<your-key>` first.

> **Important:** The server must be registered with the name `baseloop-gtm` (the last argument before the URL). The plugin's commands depend on this exact name.

Find your API key in Baseloop under Settings > API Keys.

## What's Included

### Skill: GTM Engineering
Auto-loads when you work with Baseloop workflows. Provides the mental model, build protocol, and critical rules for designing data flows.

### Commands

| Command | Description |
|---|---|
| `/baseloop-gtm:plan` | Design a workflow from a goal. Surveys your tables and integrations, then produces an architecture plan. Read-only — creates nothing. |
| `/baseloop-gtm:build` | Build a workflow step by step. Creates tables and fields, verifies each step before proceeding. Handles inline error diagnosis. |
| `/baseloop-gtm:diagnose` | Debug a failing field or workflow. Investigates the error, identifies root cause, applies a fix, and verifies the resolution. |
| `/baseloop-gtm:lfg` | Autonomous end-to-end: plan, build, health check, diagnose, and deliver a working workflow with minimal intervention. |

## Examples

### Step-by-step workflow
```
> /baseloop-gtm:plan Import HubSpot companies, qualify which are B2B SaaS, find their founders on LinkedIn, and sync contacts back to HubSpot

[Claude surveys your tables, integrations, and actions, then produces a workflow architecture]

> /baseloop-gtm:build

[Claude creates tables and fields one at a time, running and verifying each step]
```

### Debugging a failing field
```
> /baseloop-gtm:diagnose The enrichment field on the Companies table is returning errors

[Claude investigates the error, traces upstream, identifies root cause, fixes the config, and verifies]
```

### Fully autonomous
```
> /baseloop-gtm:lfg Import HubSpot companies, qualify B2B SaaS, find founders, sync contacts back

[Claude plans, builds, tests, diagnoses errors, and delivers a working workflow end-to-end]
```
