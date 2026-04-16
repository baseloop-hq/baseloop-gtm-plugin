# Baseloop GTM Plugin

Build automated GTM data workflows with Claude Code. This plugin teaches Claude how to design, build, diagnose, and autonomously operate workflows that source, enrich, qualify, and route company and contact data using Baseloop tables, actions, and integrations.

## Prerequisites

- A [Baseloop](https://baseloop.com) account with an active workspace
- [Claude Code](https://claude.ai/claude-code) installed

## Setup

### Install the plugin

```
/plugin marketplace add baseloop-hq/baseloop-gtm-plugin
/plugin install baseloop-gtm@baseloop-gtm-plugin
```

The Baseloop MCP server is bundled with the plugin. After installing, connect via the plugin's OAuth flow when prompted.

## Development Setup

After cloning, activate the git hooks so marketplace.json stays in sync with plugin.json on every commit:

```bash
git config --local include.path .gitconfig
```

## What's Included

### Skill: GTM Engineering
Auto-loads when you work with Baseloop workflows. Provides the mental model, build protocol, and critical rules for designing data flows.

### Skills

| Skill | Description |
|---|---|
| `/baseloop-gtm:plan` | Design a workflow from a goal. Surveys your tables and integrations, then produces an architecture plan. Read-only. |
| `/baseloop-gtm:build` | Build a workflow step by step. Creates tables and fields, verifies each step before proceeding. Handles inline error diagnosis. |
| `/baseloop-gtm:diagnose` | Debug a failing field or workflow. Investigates the error, identifies root cause, applies a fix, and verifies the resolution. |
| `/baseloop-gtm:review` | Audit an existing workflow for known pitfalls, missing safeguards, and credit-wasting patterns. Read-only. |
| `/baseloop-gtm:lfg` | Autonomous end-to-end: plan, build, health check, diagnose, and deliver a working workflow with minimal intervention. |
| `/baseloop-gtm:help` | Show available capabilities, tool categories, and example workflows. |

### Agents

| Agent | Description |
|---|---|
| Workflow Cost Optimizer | Credit consumption analysis and savings recommendations |
| Data Quality Auditor | Row data inspection for nulls, extraction paths, and type coercion |
| CRM Integrity Checker | HubSpot sync integrity audit for duplicates, associations, and enums |

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
