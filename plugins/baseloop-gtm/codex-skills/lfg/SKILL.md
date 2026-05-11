---
name: lfg
description: This skill should be used when the user wants to plan, build, and debug an entire Baseloop workflow autonomously from a goal description, with minimal intervention.
argument-hint: "[workflow goal, e.g. 'Import HubSpot companies, qualify B2B SaaS, find founders, sync contacts back']"
---

# LFG — Autonomous Workflow Engineering

<!-- INTERACTION-METHOD-START -->

## Interaction Method

When asking the user a question, use the platform's blocking question tool: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex, `ask_user` in Gemini, `ask_user` in Pi (requires the `pi-ask-user` extension). Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

<!-- INTERACTION-METHOD-END -->


Build an entire GTM workflow end-to-end: plan the architecture, create all tables and fields, test each step, diagnose and fix errors, and deliver a working workflow.

## Goal

<workflow_goal>$ARGUMENTS</workflow_goal>

If the goal above is empty, ask: "What workflow do you want me to build? Describe the data flow you want to achieve."

---

## Step 1: Plan

Follow the `/baseloop-gtm:plan` workflow:

1. Survey the environment (`list_tables`, `get_connected_platforms`, `list_actions`).
2. Design the architecture (tables, field chains, autoRunConditions, data flow).
3. Present the plan to the user.
4. **Wait for user confirmation before building.** The plan defines what gets created — the user must approve it.

---

## Step 2: Build and Rung 1

Follow the `/baseloop-gtm:build` workflow (Steps 1 through 4.5) using the approved plan. Every `run_field` in this step MUST use `runAction: "first_one"`. Rung 1 must pass (all fields healthy on the test row) before proceeding.

---

## Step 3: Rung 2

Follow `/baseloop-gtm:build` Step 5 — Rung 2 (`first_ten`). Enable `autoRunEnabled`, run with `first_ten`, verify zero failures across the full chain. Rung 2 must pass before proceeding.

---

## Step 4: Diagnose and Fix

For each failing field found in Rung 1 or Rung 2, follow the `/baseloop-gtm:diagnose` workflow. After fixing a field, re-check downstream fields — the fix may unblock them. Repeat until all fields are healthy or escalate to the user.

---

## Step 5: Final Report and Rung 3 Approval

Present the completed workflow and **ask for user approval before full-scale execution**:

```
## Workflow Summary

**Tables:** [list with row counts]
**Fields:** [total fields across all tables]
**Health:** [X/Y fields healthy]

### Architecture
[Table-to-table data flow diagram]

### Verification Results
[Sample output from Rung 1 and Rung 2]

### Cost
[Credits used in testing so far]
[Estimated credits for full-scale run (Rung 3): N rows × cost per row]

### Errors Resolved
[List of errors found and fixed during build, if any]

### Rung 3: Ready to scale?
[Row count remaining] rows at ~[cost] credits each = ~[total] credits.
Approve to run on the full dataset, or adjust the plan first.
```

If "Errors Resolved" lists any non-trivial findings (config gotchas, upstream-data discoveries, platform quirks), suggest the user run `/baseloop-gtm:save-learning` to capture each as a learning. The end-to-end run is exactly when those rules are freshest.

**Do NOT run the full dataset without user approval.** LFG is autonomous through Rung 1 and Rung 2, but pauses at Rung 3.

After approval, for tables with >100 rows, use the batch processing pattern: `list_row_ids` (with `hasNotRun` filter) → chunk into batches of 100 → `run_fields` with `rowIds` → `wait_for_run` between batches. See SKILL.md "Batch processing with `list_row_ids`".
