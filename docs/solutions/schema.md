# Solutions Frontmatter Schema

Every learning file in `docs/solutions/` starts with YAML frontmatter that the workflow skills grep against to find applicable learnings.

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `title` | string | yes | Short imperative title. Used as document `# H1`. |
| `date` | YYYY-MM-DD | yes | Date the learning was captured. |
| `problem_type` | enum (see below) | yes | Single value. Used to bucket learnings during loader scan. |
| `modules` | array of enum | yes | Workflow modules touched. Used to match against the current task. |
| `tags` | array of string | yes | Free-text keywords. Searched by skills via grep. |
| `summary` | string | yes | One-sentence problem + fix synopsis. Shown in the loader's "applicable learnings" list. |
| `superseded_by` | filename | no | If this entry is replaced by a later one, point at it. The loader skips superseded entries. |

## `problem_type` enum

- `enrichment-failure` — enrichment field returned null/wrong values
- `hubspot-sync` — CRM sync issue (lookup, create, update, association, enum)
- `qualification` — AI qualification, scoring, or filtering
- `routing` — Send to Table, formula-based routing, campaign assignment
- `scaling` — performance, batch processing, rate limits, credit cost
- `other` — anything else; prefer a specific bucket when one fits

## `modules` enum

- `companies` — company-level table or fields
- `contacts` — contact-level table or fields
- `deals` — deal-level table or fields
- `hubspot` — any HubSpot-specific action
- `linkedin` — LinkedIn-specific action (Sales Navigator, find people)
- `webhooks` — webhook source or feedback POST
- `ai-agents` — Baseloop `custom_ai_agent`, web-research actions, and AI extraction fields; this does not mean standalone agent files
- `formulas` — formula fields, `preview_formula`
- `send-to-table` — Send to Table mode/mappings

## Adding a new enum value

1. Edit this file.
2. If the new value is a `problem_type`, make sure plan/build/review/diagnose can match it during their learning scan.
3. If the new value is a `modules` entry, update the loader's tag-match list in each consuming skill.

Don't add ad-hoc values without updating the schema — the loader greps against literal strings.
