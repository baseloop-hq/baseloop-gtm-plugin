# Solutions

Captured learnings from workflow-building sessions. Each file documents a problem solved once so future sessions don't have to re-derive the answer.

**These files are yours.** They live in your project repo, you own them, you commit them. You're free to write, edit, organize, or delete them like any other doc. Treat the schema as a soft contract — the loader greps frontmatter, so as long as the fields are present and parseable, your edits are safe.

## Structure

Files are named `YYYY-MM-DD-<slug>.md` and start with YAML frontmatter:

```yaml
---
title: "Resolve company domain before HubSpot lookup"
date: 2026-04-25
problem_type: hubspot-sync
modules: [companies, hubspot]
tags: [domain-resolution, hubspot-lookup, companyWebsite]
summary: "When enrichment returns null companyWebsite, an AI domain resolution step must run before HubSpot company lookup."
---
```

Schema fields:

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Short imperative title. Used as document `# H1`. |
| `date` | YYYY-MM-DD | yes | Date the learning was captured. |
| `problem_type` | enum | yes | Single value. Used to bucket learnings during loader scan. |
| `modules` | array of enum | yes | Workflow modules touched. Used to match against the current task. |
| `tags` | array of string | yes | Free-text keywords. Searched by skills via grep. |
| `summary` | string | yes | One-sentence problem + fix synopsis. Shown in the loader's "applicable learnings" list. |
| `superseded_by` | filename | no | If this entry is replaced by a later one, point at it. The loader skips superseded entries. |

Supported `problem_type` values: `enrichment-failure`, `hubspot-sync`, `qualification`, `routing`, `scaling`, `other`.

Supported `modules` values: `companies`, `contacts`, `deals`, `hubspot`, `linkedin`, `webhooks`, `ai-agents`, `formulas`, `send-to-table`.

## How to add an entry

Create a new `YYYY-MM-DD-<slug>.md` file after solving a non-obvious workflow problem. Include the frontmatter fields from the schema, then write the practical details a future workflow session should reuse: context, root cause, fix, verification, and any caveats.

Keep entries concise and specific. The loader integrations in plan/build/review/diagnose scan frontmatter and named sections; they do not require a generated file.

## How learnings get used

When you run `/baseloop-gtm-plan`, `/baseloop-gtm-build`, `/baseloop-gtm-review`, or `/baseloop-gtm-diagnose`, the skill scans this directory at start. Entries whose `problem_type` and `modules` match the current task are surfaced as "applicable learnings" — short summaries Claude reads before doing the work.
