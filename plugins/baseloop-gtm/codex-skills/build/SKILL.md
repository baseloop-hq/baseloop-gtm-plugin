---
name: build
description: This skill should be used when a workflow plan is ready and needs to be built step by step. It creates tables and fields, runs and verifies each step, and handles inline error diagnosis before proceeding.
argument-hint: "[plan description or reference to a previous /baseloop-gtm:plan output]"
---

# Build a GTM Workflow

<!-- INTERACTION-METHOD-START -->

## Interaction Method

When asking the user a question, use the platform's blocking question tool: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex, `ask_user` in Gemini, `ask_user` in Pi (requires the `pi-ask-user` extension). Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

<!-- INTERACTION-METHOD-END -->


## Input

<build_plan>$ARGUMENTS</build_plan>

If the plan above is empty, check the conversation for a recent `/baseloop-gtm:plan` output. If none found, ask: "What workflow do you want to build? Run `/baseloop-gtm:plan` first to design the architecture, or describe what you want."

## Phase 0: Load Applicable Learnings

If `docs/solutions/` exists in the current working directory, scan it for entries that match this build. Match logic:

1. Read every `*.md` file's YAML frontmatter (skip files with `superseded_by:` set).
2. A learning is applicable when at least one `modules` value overlaps with modules in the build plan (e.g. plan touches HubSpot → match entries whose `modules` includes `hubspot`).
3. For each applicable learning, read the body sections "Fix" and "General pattern" and apply the rule during the build.

Surface them to the user as a short bullet list before the pre-flight check:

> Loaded 2 applicable learnings from `docs/solutions/`:
> - 2026-04-25-resolve-domain-before-hubspot-lookup — Resolve company domain before HubSpot lookup
> - 2026-04-12-hubspot-enum-mismatch — Convert lifecyclestage enum before HubSpot update

If no learnings match or `docs/solutions/` doesn't exist, skip silently.

## Pre-flight Check

Before building, verify:

1. **MCP connection** — Call `list_tables` to confirm the Baseloop MCP server is connected. If it fails, tell the user to set up the MCP connection first.
2. **Connected platforms** — Call `get_connected_platforms` to verify needed integrations are connected (e.g. HubSpot OAuth, Slack).
3. **Runtime action metadata** — Read [platform-discovery.md](./references/platform-discovery.md), then call `list_actions` and inspect `provider`, `creationMethod`, `requiresConnection`, `connectionStatus`, `creditCostHint`, `isBeta`, `deprecationNotice`, and `hasDetailedGuide` for the actions in the plan.
4. **Existing tables** — Call `list_tables` to check if any tables from the plan already exist. If so, ask whether to reuse or create new ones.
5. **Workspace** — Identify the target workspace. If none exists, create one with `create_workspace`.

## Build Protocol

For each table in the plan, follow this sequence.

Do not configure actions from plugin examples alone. The backend response is authoritative: use `list_actions` before selecting action keys, `get_action_schema` before configuring source/action fields, `get_table_schema` before writing field references, and `resolve_action_options` for dynamic options. Avoid disconnected, legacy, or deprecated actions unless the user explicitly accepts the setup or migration tradeoff. Prefer stable actions and `creditCostHint: "free"` alternatives when behavior is equivalent.

### Step 1: Create the table

- **Source tables:** `create_table` with `sourceField` configuration (action type + actionKey + input). Always include an `emoji` (emoji-mart shortcode, e.g. `":rocket:"`).
- **Send to Table destinations:** `create_table` with NO fields and an `emoji`. Send to Table auto-creates them. Pre-creating fields here causes duplicate/mismatched fields.
- **Other tables:** `create_table` with a name, workspace, and `emoji`.

### Step 2: Trigger source import (if source table)

**For action-based sources** (HubSpot import, LinkedIn import):
1. Check `get_action_schema` for a source-specific sample/test path or sample import mode.
2. If the source supports sample data, run the source with realistic sample input first and verify the resulting row with `list_rows` or `get_row_details`.
3. Only if the source requires a row trigger and has no sample/test path, `create_rows` with `[{}]` to create a temporary placeholder row, then `run_field` on the source field with `skipCellsWithData: false`.
4. `wait_for_run`.
5. `list_rows` to verify data was imported. Report row count to user.
6. Clean up temporary placeholder rows after validation if they remain in the table.

**For webhook sources:**
1. `get_table_schema` to find the webhook field ID (type=webhook).
2. `send_webhook_data` with the webhook field's `fieldId` and sample JSON.
3. `list_rows` to verify.

### Step 3: Add all fields (configuration only — DO NOT RUN)

Create all fields for the table before running anything. This lets you set up the full chain with autoRunConditions so a single row can flow end-to-end during testing.

**Do NOT run any field until ALL fields for this table are created.** Running one at a time prevents end-to-end testing.

**Extraction fields are the exception — create them AFTER observing action output at Rung 1.** See [extraction-fields.md](./references/extraction-fields.md) for the full rule, including why this matters and why `type: "text"` is mandatory.

For each field:

1. **Read the action guide** — `get_action_schema` for the `aiDescription`. Pass the current `tableId` (and `viewId` when working in a specific view) so Baseloop can return auto-mapped defaults for field selectors. Read the guide fully before configuring.
2. **Resolve field names** — `get_table_schema` for current field names (never guess).
3. **Resolve dynamic options** — `resolve_action_options` for HubSpot/Salesforce properties, campaign IDs, list IDs, Send to Table array paths, and any other dropdowns. Pass `tableId`/`viewId` when options depend on table fields.
4. **Create the field** — `create_field` with full configuration including `autoRunCondition`. Set `autoRunEnabled: false` for now — test with explicit runs first.

Action input field references must be explicit `{{field_name}}` tokens using field `name` values from `get_table_schema`; Baseloop no longer auto-wraps bare field names. Send to Table fieldMappings are the exception: they intentionally use plain field names.

For Send to Table fields:
1. Create the destination table first (empty, no fields).
2. `get_action_schema` for `send_to_table`, passing the source `tableId`.
3. Configure `fieldMappings` using plain field names (NOT `{{field_name}}`).
4. For `send_for_each_item`: set `sourceConfig.sourceColumnField` (plain name) and `sourceConfig.sourceArrayPath`. Use `resolve_action_options` for `sourceConfig.sourceArrayPath` when unsure.
5. For parent row data: use `column:field_name` prefix in mapping values.

Report the full field chain to the user before proceeding to testing.

### Step 4 & 5: Scaling Ladder

Run the chain through the **Scaling Ladder**: Rung 1 (`first_one`) → Rung 2 (`first_ten`) → Rung 3 (full scale, user approval required). Full procedure, verification checklist, and batch-processing pattern for >100-row tables in [scaling-ladder.md](./references/scaling-ladder.md).

If a field fails during Rung 1, follow [inline-diagnosis.md](./references/inline-diagnosis.md) — up to 2 fix attempts, then escalate to `/baseloop-gtm:diagnose`.

**Critical rules** (enforced in scaling-ladder.md):
- Every `run_field` must pass `runAction` explicitly.
- Never skip rungs.
- Never re-run upstream fields that already have correct data (AI fields are non-deterministic).
- Rung 3 requires explicit user approval with cost estimate.

## Progress Tracking

After each step, provide a brief status:
- What was just built and verified.
- What comes next.
- Any issues encountered and how they were resolved.

## Completion

When the full workflow is built and verified:

1. **Summarize the architecture** — list all tables and their field chains.
2. **Show verification results** — sample output from each step.
3. **Note the cost** — approximate credits used in testing, projected cost per row at scale.
4. **Handoff options:**
   - **Scale up (Rung 3):** run on full dataset — state row count and estimated credit cost, wait for user approval.
   - **Diagnose:** if any fields still have issues, run `/baseloop-gtm:diagnose`.
   - **Save learning:** if the build surfaced a non-obvious gotcha (a config edge case, an unintuitive autoRunCondition, a HubSpot quirk), run `/baseloop-gtm:save-learning` to capture the rule. Skip for routine builds.
   - **Schedule:** set up recurring imports (`update_table` or `update_field` with schedule config).
   - **Adjust:** modify the plan and rebuild specific steps.
