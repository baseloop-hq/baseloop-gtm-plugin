---
title: "<Imperative title — what the rule is>"
date: <YYYY-MM-DD>
problem_type: <enrichment-failure | hubspot-sync | qualification | routing | scaling | other>
modules: [<companies, contacts, deals, hubspot, linkedin, webhooks, ai-agents, formulas, send-to-table>]
tags: [<comma-separated keywords>]
summary: "<One-sentence problem + fix synopsis>"
---

# <Imperative title>

## Problem

What was happening. Symptoms the user (or future Claude) would observe. Blast radius — how many rows / which downstream steps were affected.

## Root cause

Why it happened. Reference specific actions, field configs, or platform behavior. Be concrete — name the action keys, property names, or formula fragments involved.

## Fix

The exact change that resolved it. If applicable, include the corrected configuration:

```
<config snippet>
```

Steps the user took, in order.

## General pattern

The rule a future workflow should follow to avoid this problem. **This is the most valuable section** — it's what makes the doc reusable when the next session faces a different-but-related problem.

Phrase as: "When [condition], [do this]" or "Before [action], always [check]."

## Related

- `docs/solutions/<other-doc>.md` — if this builds on or relates to another learning.
- `docs/reference-sources/<file>.md` — if the rule belongs in shared reference material (consider opening a PR to update the source-of-truth).
