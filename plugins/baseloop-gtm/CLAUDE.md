# Baseloop GTM Plugin Development

## Structure
- `skills/gtm-engineering/SKILL.md` — Core workflow-building and debugging expertise
- `skills/gtm-engineering/references/` — Detailed reference docs (loaded on demand)
  - `action-catalog.md` — All available actions by workflow stage
  - `workflow-patterns.md` — Common end-to-end workflow recipes
  - `pitfalls.md` — Known failure modes and how to avoid them
  - `error-patterns.md` — Error signatures mapped to root causes and fixes
- `commands/workflows/plan.md` — Workflow design workflow (read-only)
- `commands/workflows/build.md` — Workflow execution workflow (with inline diagnosis)
- `commands/workflows/diagnose.md` — 3-phase debugging workflow (investigate → diagnose → fix)
- `commands/lfg.md` — Autonomous plan→build→diagnose chain

## Updating

When modifying:
1. Bump version in BOTH `.claude-plugin/plugin.json` AND `../../.claude-plugin/marketplace.json` — they must stay in sync (name, version, description, author, tags)
2. Keep SKILL.md under 500 lines — move detail to `references/`
3. Verify frontmatter fields match the plugin spec
4. Test commands by invoking them: `/baseloop-gtm:plan`, `/baseloop-gtm:build`

## MCP Server

The Baseloop MCP server is NOT bundled with this plugin. Users must configure
it separately using one of:
- OAuth: `claude mcp add --transport http baseloop-gtm https://api-v2.baseloop.io/v1/mcp`
- API key: `claude mcp add --transport http --header "x-api-key: $BASELOOP_API_KEY" baseloop-gtm https://api-v2.baseloop.io/v1/mcp`

**Important:** The server MUST be registered with the name `baseloop-gtm`. All command
`allowed-tools` lists use the `mcp__baseloop-gtm__` prefix, so a different server name
will cause all commands to fail.

The skill and commands assume the MCP server is already connected.

## Content Philosophy

Every line in the skill should change Claude's behavior when building workflows.
If it wouldn't cause Claude to make a different decision, cut it.

Reference files provide depth on demand. SKILL.md provides the decision framework.
