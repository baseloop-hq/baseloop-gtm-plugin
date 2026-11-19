<!-- SYNC SOURCE: docs/reference-sources/solutions-schema.md. Run `bun run references:sync` to refresh. Do not edit directly. -->

# Solutions Learning Schema

Use this schema only when the user explicitly asks to remember, save, or document a workflow learning.

## File Path

Create the learning in the current project at:

`docs/solutions/YYYY-MM-DD-<slug>.md`

Use today's date for `YYYY-MM-DD`. Keep the slug lowercase ASCII with hyphens.

## Frontmatter

Every learning file starts with YAML frontmatter:

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

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Short imperative title. Use the same text as the document H1. |
| `date` | YYYY-MM-DD | yes | Date the learning was captured. |
| `problem_type` | enum | yes | Single value. Used to bucket learnings during loader scan. |
| `modules` | array of enum | yes | Workflow modules touched. Used to match against the current task. |
| `tags` | array of string | yes | Free-text keywords. Searched by skills via grep. |
| `summary` | string | yes | One-sentence problem + fix synopsis. Shown in applicable-learning lists. |
| `superseded_by` | filename | no | If this entry is replaced by a later one, point at it. The loader skips superseded entries. |

## `problem_type` Values

- `enrichment-failure` — enrichment field returned null or wrong values
- `hubspot-sync` — CRM sync issue: lookup, create, update, association, or enum
- `qualification` — AI qualification, scoring, or filtering
- `routing` — Send to Table, formula-based routing, campaign assignment
- `scaling` — performance, batch processing, rate limits, credit cost
- `other` — anything else; prefer a specific bucket when one fits

## `modules` Values

- `companies` — company-level table or fields
- `contacts` — contact-level table or fields
- `deals` — deal-level table or fields
- `hubspot` — any HubSpot-specific action
- `linkedin` — LinkedIn-specific action: Sales Navigator, find people
- `webhooks` — webhook source or feedback POST
- `ai-agents` — Baseloop `custom_ai_agent`, web-research actions, and AI extraction fields; this does not mean standalone agent files
- `formulas` — formula fields, `preview_formula`
- `send-to-table` — Send to Table mode or mappings

## Body Template

After the frontmatter, write concise sections:

```markdown
# Resolve company domain before HubSpot lookup

## Context

What workflow or field exposed the problem.

## Root cause

Why it happened.

## Fix

What solved it. Include field/action configuration details that matter.

## General pattern

The reusable rule future workflows should apply.

## Verification

How the fix was checked.
```

The workflow skills read frontmatter plus targeted body sections. Keep entries practical, specific, and free of secrets or raw PII.
