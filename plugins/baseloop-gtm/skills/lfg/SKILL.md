---
name: baseloop-gtm:lfg
description: This skill should be used when the user wants to plan, build, and debug an entire Baseloop workflow autonomously from a goal description, with minimal intervention.
argument-hint: "[workflow goal, e.g. 'Import HubSpot companies, qualify B2B SaaS, find founders, sync contacts back']"
---

# LFG — Autonomous Workflow Engineering

<!-- INTERACTION-METHOD-START -->

## Interaction Method

When asking the user a question, use the platform's blocking question tool when it is available in the current harness: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex when exposed by the active mode, or `ask_user` in Gemini. Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

<!-- INTERACTION-METHOD-END -->


Build an entire GTM workflow end-to-end: plan the architecture, create all tables and fields, test each step, diagnose and fix errors, and deliver a working workflow.

## Goal

<workflow_goal>$ARGUMENTS</workflow_goal>

If the goal above is empty, ask: "What workflow do you want me to build? Describe the data flow you want to achieve."

Before Step 1, read [transport.md](./references/transport.md). If CLI or MCP was already used successfully earlier in this workflow, continue using that transport. Otherwise select whichever transport is available and healthy for the autonomous run. Plan, build, diagnose, and verification steps must all use that same transport unless it fails and the user approves fallback.

---

## Step 1: Plan

Follow the `/baseloop-gtm:plan` workflow:

1. Survey the environment (`list_tables`, `get_connected_platforms`, `list_actions`).
2. Design the architecture (tables, field chains, autoRunConditions, data flow).
3. Present the plan to the user.
4. **Wait for user confirmation before building.** The plan defines what gets created — the user must approve it.

---

## Step 2: Build and Rung 1

Follow the `/baseloop-gtm:build` protocol for pre-flight checks, table creation, source import, pre-Rung-1 field configuration, and Scaling Ladder Rung 1. Every non-source `run_field` in this step MUST use `runAction: "first_one"`. The source import is the exception: call it with only `tableId` and `fieldId` (omit `runAction`), per the build protocol.

If Rung 1 finds a failing field, immediately follow the `/baseloop-gtm:diagnose` protocol on that field, apply the fix if confidence is high or medium, then retry Rung 1. Do not proceed to Rung 2 until Rung 1 passes with all fields healthy on the test row.

---

## Step 3: Rung 2

Follow `/baseloop-gtm:build` Scaling Ladder Rung 2 (`first_ten`). Enable `autoRunEnabled`, run with `first_ten`, and verify zero failures across the full chain.

If Rung 2 finds a failing field, immediately follow the `/baseloop-gtm:diagnose` protocol on that field. After fixing a field, re-check downstream fields because the fix may unblock them. Retry Rung 2 until all fields are healthy or escalate to the user after two failed fix attempts on the same field.

---

## Step 4: Final Report and Rung 3 Approval

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

After approval, follow `/baseloop-gtm:build` Scaling Ladder Rung 3. For tables with >100 rows, use the batch processing pattern from [scaling-ladder.md](./references/scaling-ladder.md): `list_row_ids` (with `hasNotRun` filter) → chunk into batches of 100 → `run_fields` with `rowIds` → `wait_for_run` between batches.
