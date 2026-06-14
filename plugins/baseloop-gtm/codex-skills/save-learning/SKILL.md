---
name: save-learning
description: |
  Capture a workflow-building learning to docs/solutions/ so future plan/build/review/diagnose
  invocations can reuse it. Use after solving a non-obvious workflow problem — debugging
  a tricky enrichment, figuring out a HubSpot edge case, finding the right gating pattern.
  The next person (or session) hitting the same problem reads the doc instead of re-deriving the answer.
argument-hint: "[brief context: what the problem was, what the fix was]"
---

# Save Learning

<!-- INTERACTION-METHOD-START -->

## Interaction Method

When asking the user a question, use the platform's blocking question tool when it is available in the current harness: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex when exposed by the active mode, or `ask_user` in Gemini. Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

<!-- INTERACTION-METHOD-END -->


Document a recently solved workflow problem so the next session benefits.

> **Run this from your project root.** The output file path (`docs/solutions/...`) is relative to your current working directory. Run it from somewhere that has — or should have — a `docs/solutions/` folder. The four workflow skills (`plan`, `build`, `review`, `diagnose`) load learnings from the same relative path, so the project root is the natural home.

> **The output is yours.** Every file in `docs/solutions/` is user-owned content meant to be committed alongside your code. Edit, reorganize, supersede, or delete them like any other doc you write. This skill produces a starting point — your judgment owns what survives.

## Input

<context>$ARGUMENTS</context>

If `<context>` is empty, ask the user (blocking question tool): "What problem did you just solve? Describe it in one sentence — I'll dig into the details."

## Phase 1: Classify

Read [references/schema.md](./references/schema.md) for the frontmatter fields and enum values. Then ask the user (blocking question tool, one at a time) to fill in:

1. **`problem_type`** — pick from `enrichment-failure | hubspot-sync | qualification | routing | scaling | other`.
2. **`modules`** — multi-select from `companies | contacts | deals | hubspot | linkedin | webhooks | ai-agents | formulas | send-to-table`. List the modules the fix touched.
3. **`tags`** — free-text comma-separated keywords for search (e.g. `enum-mismatch, hubspot-property-internal-name, lifecycle-stage`).
4. **`title`** — short imperative title (e.g. "Resolve company domain before HubSpot lookup").
5. **`summary`** — one-sentence summary of the fix.

## Phase 2: Compose

Read [assets/learning-template.md](./assets/learning-template.md) and use it as the body skeleton.

Fill in:
- **Problem** — what was happening, observed symptom, blast radius.
- **Root cause** — why it happened, with reference to specific actions/fields/configs.
- **Fix** — exact change that resolved it. If applicable, include a redacted corrected configuration as a code block. Do not include secrets, tokens, API keys, auth headers, raw API bodies, emails, phone numbers, or customer/person names.
- **General pattern** — the rule a future workflow should follow to avoid the same problem. This is the most valuable section — it's what makes the doc reusable.
- **Related** — link to other `docs/solutions/*.md` entries that describe similar patterns, or name the canonical reference topic that should be updated via `docs/reference-sources/`.

## Phase 3: Write the file

Path: `docs/solutions/YYYY-MM-DD-<slug>.md` where `<slug>` is a kebab-cased version of the title.

Frontmatter format:

```yaml
---
title: "Resolve company domain before HubSpot lookup"
date: 2026-04-25
problem_type: hubspot-sync
modules: [companies, hubspot]
tags: [domain-resolution, hubspot-lookup, companyWebsite]
summary: "When enrichment returns null companyWebsite, an AI domain resolution step must run before HubSpot company lookup, or all subsequent contact-company associations break."
---
```

Body follows the template.

## Phase 4: Confirm

Show the final file path and frontmatter to the user. Ask them (blocking tool): "Write this to `docs/solutions/<filename>`?"

On confirm, write the file. Done.

On reject, ask what to adjust and loop back to Phase 2.

---

## Why this matters

`/baseloop-gtm:plan`, `/baseloop-gtm:build`, `/baseloop-gtm:review`, and `/baseloop-gtm:diagnose` each scan `docs/solutions/` for applicable learnings before doing their work. A single well-written learning entry can save the next session 10+ minutes of re-investigation.

The first time you solve a problem takes research. The second time should take a `grep` and a paragraph of context.
