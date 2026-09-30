# Scaling Ladder — Rung 1 → Rung 2 → Rung 3

Never skip rungs. Never run a non-source action field without explicit `runAction`. Source import fields are not row-scoped like normal action fields; call `run_field` with only `tableId` and `fieldId` before entering the ladder. Formula and data-extraction fields are outside the run lifecycle: do not call `run_field` on them; verify them by previewing or inspecting row values after their referenced cells have data. The ladder is sequential and verification-gated.

## Source imports: size the import's own config first

`runAction` does not size an import: it imports as many records as its own config allows.

1. Set the input's own limit low for the first run: `maxContacts` or `maxEngagements` at 25 to 50, a record limit, or one list.
2. Verify the chain on those rows through the rungs below, then widen the limit.

- Paid LinkedIn imports bill 0.5 credits per imported row and cannot be canceled while processing. `maxContacts` defaults to 1,000 (500 credits) and `maxEngagements` to 500 (250 credits).
- Imports run 10 to 30+ minutes, and `processing` with 0 rows is normal. Never re-run one in flight: a second `run_field` returns `RUN_IN_PROGRESS` with the running `runId`.

## Rung 1 (`first_one`)

**Every non-source `run_field` in this step MUST use `runAction: "first_one"`. No exceptions for normal action fields.**

Run a single row through the **entire runnable chain** to validate autoRunCondition cascading and data flow through Send to Table. When a formula or data-extraction field sits between runnable fields, inspect its cell value before running the downstream field.

1. Run the first runnable field — `run_field` with `runAction: "first_one"`.
2. `wait_for_run`, then `get_row_details` to verify output.
3. Run the next runnable field on the same row — `run_field` with `runAction: "first_one"`.
4. Continue field by field on the same row, verifying each step.
5. After Send to Table runs, call `list_rows` on destination tables to confirm rows were created with correct data.
6. Follow data to the end — continue in destination tables until it reaches the final step (CRM sync, outreach, notification).

### Rung 1 verification checklist

Before scaling up, verify every table in the workflow:

1. **Row counts** — `list_rows` per table. Source → destination counts match expectations.
2. **No errors**: `get_row_details` on the test row in each table; no field shows "failed" status.
3. **Send to Table destinations** — `list_rows` confirms rows created with correct data.
4. **CRM sync responses** — for HubSpot create/update fields, `fullValue` shows successful API responses.
5. **autoRunConditions** — gated fields ran only on rows that met the condition.
6. **Every branch ran**: each gated step ran on at least one sample row that meets its condition, and each validator returned its negative once. When the sample lacks such a row, add one with `create_rows` or `send_webhook_data`.
7. **Counts make sense**: zero hits, one classifier value on every row, or a result count equal to the tool's cap is a bug, not a quiet result.

**Do NOT proceed to Rung 2 until Rung 1 passes.** Fix errors first using the active skill's diagnosis protocol.

## Rung 2 (`first_ten`)

Only after Rung 1 passes with zero errors:

A run of one field re-runs later action fields of the same table only when the table has `autoUpdateDependents` on; formulas and extractions always recompute. Rows arriving from another table run only when the receiving table has `autoRunOnNewRow` on. `autoRunEnabled` defaults to true.

1. Run a small batch: `run_fields` over the chain's runnable fields in dependency order (max 10 fields per call) with `runAction: "first_ten"`.
2. Wait for propagation: poll with `get_run_status` or `wait_for_run`.
3. Verify: `list_rows` on each table; `get_run_status` confirms 0 failures.

**Do NOT proceed to Rung 3 until Rung 2 passes AND user approves.**

## Rung 3 (full scale — requires user approval)

1. Report Rung 2 results — sample output, error count, credits used so far.
2. State the cost and expected outcome — row count remaining, estimated credit cost for the full run, and the observed quality, coverage, confidence, or CRM-safety benefit from the higher-confidence steps.
3. Before the full run of any write onto a live CRM, review the data with the user: read the current CRM values into columns, show up to 10 rows with the value to write beside the CRM's value, state how many records and which properties change, and wait for approval. Gate each property on the CRM value being empty or wrong, map with `ignoreBlanks: true`, and never overwrite description, website or industry with AI text.
4. Ask for approval before running on the full dataset.
5. Only after explicit approval:
   - **The user asked to run all rows, the table has `autoUpdateDependents` on and every destination table auto-runs (`autoRunOnNewRow`):** `run_field` on the first field with `runAction: "entire_set"` and `confirmedRowCount`, the count from `list_row_ids` total or `get_table_schema` `table.rowCount`, never `list_tables`. It skips cells that already have data.
   - **<=100 rows:** `run_fields` with `runAction: "first_hundred"` covers everything. `wait_for_run` on the returned `runIds` before treating the batch as complete.
   - **>100 rows:** batch processing pattern:
     1. `list_row_ids` with filters (e.g. `hasNotRun` on the target field) to get only unprocessed row IDs. Use `limit: 500`, paginate via `page` if needed.
     2. Chunk IDs into batches of 100.
     3. For each batch: `run_fields` with `rowIds` set to the batch.
     4. `wait_for_run` on each batch's `runIds` before starting the next.
     5. Repeat until all rows are processed.

## `run_fields` vs `run_field`

Use `run_field` (single field) with explicit `runAction` when first testing each field individually. Once fields are validated, use `run_fields` to re-run multiple fields together:

- **Dependency ordering:** fields referencing others via `{{fieldName}}` run in the correct order — independent fields run in parallel, dependent fields wait for their upstream to finish.
- **`skipCellsWithData` defaults to `true`** — only empty/failed cells are processed. Set `false` to force a re-run, and only on rows you name: `run_field` refuses `false` with `first_ten` or `first_hundred` (use `custom_range`), and `run_fields` refuses it without `rowIds` unless `runAction` is `first_one`, because a range re-run pays again for every cell in it that already has data.
- **Row selection:** use `rowIds` for a specific batch or `runAction` (`first_one`, `first_ten`, `first_hundred`) to auto-select. **Max 10 fields, 100 rows per call.**
- **Async:** returns immediately. Use `wait_for_run` or `get_run_status` to monitor progress.
- **Per-field `runIds`:** each field in a `run_fields` batch gets its own `runId` — monitor each separately.
- **Skipped fields:** fields with unmet `autoRunCondition`s show status `"skipped"` (not `"failed"`) — this is expected behavior, not an error.
- **Source fields excluded:** `run_fields` rejects source action fields — use `run_field` for source imports (they must be run individually).
- **When to use which:** sequential `run_field` for Rung 1 (manual inspection of each step), `run_fields` for Rungs 2 and 3 (automatic dependency ordering + parallel execution).

## Critical rules

- **NEVER call `run_field` on formula or data-extraction fields.** They are not runnable and evaluate automatically from referenced cells.
- **NEVER call `run_field` on non-source runnable fields without `runAction`.** Omitting it defaults to `first_ten` — relying on defaults is fragile. Treat a bare `run_field` on normal action fields as a bug.
- **Small datasets:** if a table has < 100 rows, `"first_hundred"` runs everything. Use `"first_ten"` or `"first_one"` instead when you intend a partial run.
- **`run_fields` without `rowIds` defaults to `first_hundred`.** Pass `runAction` or `rowIds` every time.
- **Completed rows are paid for.** After a config change on a field that already ran on a batch, re-run only the test row (`custom_range` with its row id, or `first_one`, with `skipCellsWithData: false`). Re-run completed rows only when the user asks, after stating how many rows will be charged again.
- **NEVER skip from Rung 1 to Rung 3.** The ladder is sequential.
- **AI fields are non-deterministic.** Never re-run an upstream AI field to fix a downstream config issue. Re-run only the field whose *configuration* changed.
