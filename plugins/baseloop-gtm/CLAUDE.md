# Baseloop GTM Plugin Development

## Structure
- `skills/gtm-engineering/SKILL.md` — Core workflow-building and debugging expertise
- `skills/gtm-engineering/references/` — Detailed reference docs (loaded on demand)
  - `action-catalog.md` — All available actions by workflow stage
  - `workflow-patterns.md` — Common end-to-end workflow recipes
  - `pitfalls.md` — Known failure modes and how to avoid them
  - `error-patterns.md` — Error signatures mapped to root causes and fixes
- `skills/plan/SKILL.md` — Workflow design (prompt-enforced read-only)
- `skills/build/SKILL.md` — Workflow execution (with inline diagnosis)
- `skills/review/SKILL.md` — Proactive workflow audit (prompt-enforced read-only)
- `skills/diagnose/SKILL.md` — 3-phase debugging (investigate → diagnose → fix)
- `skills/lfg/SKILL.md` — Autonomous plan→build→diagnose chain
- `skills/help/SKILL.md` — Capabilities overview and quick start examples
- `agents/workflow/` — Specialized agents (read-only auditors)
  - `workflow-cost-optimizer.md` — Credit consumption analysis and savings recommendations
  - `crm-integrity-checker.md` — HubSpot sync integrity audit (duplicates, associations, enums)
  - `data-quality-auditor.md` — Row data inspection (nulls, extraction paths, type coercion)

## Updating

When modifying:
1. Bump version in `.claude-plugin/plugin.json` — the pre-commit hook syncs `marketplace.json` automatically. **Never change `metadata.version`** in marketplace.json — it is always `1.0.0`.
2. Keep SKILL.md under 500 lines — move detail to `references/`
3. Verify frontmatter fields match the plugin spec
4. Test skills by invoking them: `/baseloop-gtm:plan`, `/baseloop-gtm:build`, `/baseloop-gtm:review`

## MCP Server

The Baseloop MCP server is bundled with this plugin via the `mcpServers` entry
in `plugin.json` (key: `baseloop`). Users authenticate through the plugin's
connector flow (OAuth).

**Tool naming:** MCP tool prefixes are runtime-generated (UUID-based in Cowork,
name-based in CLI) and cannot be hardcoded. Skills reference MCP tools by
their short names (e.g., `list_tables`, `create_field`) in prompt body text.
Read-only vs. mutation boundaries are enforced through prompt instructions,
not tool permissions.

## Content Philosophy

Every line in the skill should change Claude's behavior when building workflows.
If it wouldn't cause Claude to make a different decision, cut it.

Reference files provide depth on demand. SKILL.md provides the decision framework.
