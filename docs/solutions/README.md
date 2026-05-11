# Solutions

Captured learnings from workflow-building sessions. Each file documents a problem solved once so future sessions don't have to re-derive the answer.

**These files are yours.** They live in your project repo, you own them, you commit them. The `/baseloop-gtm:save-learning` skill writes new entries; you're free to edit, organize, or delete them like any other doc. Treat the schema as a soft contract — the loader greps frontmatter, so as long as the fields are present and parseable, your edits are safe.

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

See [`plugins/baseloop-gtm/skills/save-learning/references/schema.md`](../../plugins/baseloop-gtm/skills/save-learning/references/schema.md) for the full schema.

## How to add an entry

Run `/baseloop-gtm:save-learning` after solving a non-obvious workflow problem. The skill walks through classification, captures the root cause and fix, and writes the file using `assets/learning-template.md` as the skeleton.

Don't hand-author files here. The schema is enforced by `/baseloop-gtm:save-learning` and the loader integrations in plan/build/review/diagnose.

## How learnings get used

When you run `/baseloop-gtm:plan`, `/baseloop-gtm:build`, `/baseloop-gtm:review`, or `/baseloop-gtm:diagnose`, the skill scans this directory at start. Entries whose `problem_type` and `modules` match the current task are surfaced as "applicable learnings" — short summaries Claude reads before doing the work.
