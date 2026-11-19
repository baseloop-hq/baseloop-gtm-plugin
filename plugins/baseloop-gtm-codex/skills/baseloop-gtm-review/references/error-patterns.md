<!-- SYNC SOURCE: docs/reference-sources/error-patterns.md. Run `bun run references:sync` to refresh. Do not edit directly. -->

# Error Patterns and Diagnosis

Error signatures observed in Baseloop workflow runs, mapped to root causes and fix procedures. Each entry shows what Baseloop tool calls reveal, why it happened, and how to resolve it.

**For preventive guidance** (how to avoid errors when building), see [pitfalls.md](./pitfalls.md).

---

## Action receives display output ("Found", "Sent") instead of actual data

**Seen in:** HubSpot Update rejects recordId. HTTP Request sends `"Found"` or `"Sent"` in the body. Downstream action receives a status string instead of a data value.

**Root cause:** `{{field_name}}` resolves to display output, not `fullValue`. See SKILL.md "Action output vs fullValue" for the full explanation.

**Diagnosis:**
1. `get_row_details` with fieldId on the failing field — check what value was received
2. If the value is `"Found"`, `"Sent"`, `"Created"`, or similar status string — the template resolved to display output
3. Trace the `{{field_name}}` reference back — is it a bare action-field reference with no path and no extraction field?

**Fix:**
1. `get_row_details` on the source action field — inspect the real `fullValue` shape
2. `update_field` on the failing downstream field, replacing `{{action_field_name}}` with an inline path derived from that data (e.g. `{{action_field_name.results[0].id}}`). Use an extraction field instead (`create_field` with `extractorFieldId` + `extractionPath`, then reference `{{extraction_field_name}}`) only when the value must be a column: a person reads, sorts or filters it, a run condition gates on it (rules take a `fieldId`, never a path), its key contains spaces, or several fields reuse it
3. Re-run the downstream field on named rows with `skipCellsWithData: false`: `custom_range` with one affected row ID to check the fix, then the remaining affected row IDs (a range such as `first_ten` is refused with the flag off)

---

## Cell status "failed" with empty or generic errorMessage

**Seen in:** `get_row_details` returns `status: "failed"` with null or unhelpful errorMessage.

**Root causes:**
1. Invalid action configuration (wrong property names, missing required fields)
2. External API returning unexpected response shape
3. Template variable `{{field_name}}` resolving to null in a required field

**Diagnosis:**
1. `get_row_details` with fieldId -- check `fullValue` for partial execution data
2. `get_table_schema` with the field's `fieldId` -- compare field config against `get_action_schema` output
3. Check upstream fields: is every `{{field_name}}` reference populated for this row?

**Fix:**
- Config mismatch: `update_field` with corrected config, then `run_field` with `runAction: "custom_range"`, `selectedIds` set to the `failedRowIds` from `get_run_status` and `skipCellsWithData: false` (allowed on named rows, so the retry runs even when a failed row kept its old value); check a single failed row first (one ID in `selectedIds`)
- Upstream empty: diagnose the upstream field first (recursive)

---

## All rows failed in a run

**Seen in:** `get_run_status` returns `progress: { succeeded: 0, failed: N, total: N }` with `failedRowIds`.

**Root cause:** Every row hit the same error. Almost always a configuration problem, not a data problem.

**Diagnosis:**
1. Read `failureReasons` in `get_run_status` or `wait_for_run` first (why rows failed, most common first), before opening rows or re-running. A re-run before that fails the same way and overwrites the cell that held the message.
2. `get_row_details` on a `failedRowIds` entry with the field's fieldId -- read errorMessage
3. Common error messages:
   - "Property X is required" -- missing input field in field config
   - "Invalid value for X" -- wrong format (display name instead of internal name)
   - "... was not one of the allowed options" -- a HubSpot enum property received a label or free text instead of one of its options
   - "Rate limited" -- external API throttling
   - "Authentication failed" -- platform connection expired

**Fix:**
- Config error: `update_field` with corrected config, then `run_field` with `runAction: "custom_range"`, `selectedIds` set to the `failedRowIds` from `get_run_status` and `skipCellsWithData: false` (allowed on named rows, so the retry runs even when a failed row kept its old value); check a single failed row first (one ID in `selectedIds`)
- HubSpot enum error: get the property's allowed values with `resolve_action_options`, then `update_field` so the mapping sends one of them (through a formula or AI step when the source value is free text), or drop the property from the mapping
- Rate limit: wait at least 60 seconds, then `run_field` with `runAction: "custom_range"`, `selectedIds` set to the `failedRowIds` and `skipCellsWithData: false`. `failedRowIds` lists at most 10; for more, with the user's approval, take the failed rows from `list_rows` with the field's `hasError` filter and retry them in batches of up to 100
- Auth failure: tell user to reconnect the platform on the Integrations page (its own sidebar item, /integrations)

---

## Send to Table creates 0 rows in destination

**Seen in:** `list_rows` on destination table returns 0 rows after the Send to Table field ran on the source table (it may show success, "No items to send", or a failed row).

**Root causes (in order of likelihood):**
1. autoRunCondition on the Send to Table field is not met for any source row
2. `send_for_each_item` mode: an empty array succeeds and shows "No items to send", while a wrong `sourceArrayPath` fails the row with "No array found at ..."
3. Destination table ID in config doesn't match the actual table (e.g., table was recreated)
4. Field mappings reference fields that don't exist in source table

**Diagnosis:**
1. `get_row_details` on a source row with the Send to Table field's fieldId -- check `value` and `fullValue`
2. If value is null: check the autoRunCondition in `get_table_schema` with the field's `fieldId` -- is the gating field populated?
3. If mode is `send_for_each_item`: inspect the source field's `fullValue` to see the actual array, verify `sourceArrayPath` matches the array structure
4. Verify destination table ID with `list_tables`

**Fix:**
- Condition not met: fix upstream field or adjust autoRunCondition
- Wrong sourceArrayPath: `update_field` with correct path, re-run on named rows with `skipCellsWithData: false`: `custom_range` with one affected row ID to check the fix, then the remaining affected row IDs
- Wrong destination ID: `update_field` with current table ID from `list_tables`
- Bad field mappings: `update_field` with corrected mappings using field `name` fields from `get_table_schema`

---

## Formula returns error or unexpected value

**Seen in:** Formula cell shows an error string, returns "undefined", or produces wrong results.

**Root causes:**
1. Formula references a field name that was renamed or deleted
2. JavaScript expression has a syntax error
3. Input data is in unexpected format (string instead of number, JSON instead of plain text)

**Diagnosis:**
1. `get_row_details` with fieldId -- read the errorMessage
2. `preview_formula` with the formula prompt against a sample row -- iterate until correct
3. `get_table_schema` -- verify all referenced field names still exist

**Fix:**
- `update_field` with corrected formula prompt
- Do not call `run_field` for formula fields; Baseloop rejects them as not runnable
- Use `preview_formula` to test before updating, then inspect rows after referenced values are present because formulas evaluate automatically

---

## Custom AI Agent returns empty, null, or irrelevant output

**Seen in:** AI field cell has null value, generic placeholder text, or clearly wrong classification.

**Root causes:**
1. Prompt references `{{field_name}}` but that field is empty for the row
2. Prompt is too vague -- insufficient context or missing few-shot examples
3. Wrong model selected for the task complexity
4. Web search enabled but adding noise instead of useful context
5. Output format mismatch (expecting JSON but getting plain text, or vice versa)

**Diagnosis:**
1. `get_row_details` with fieldId -- check `fullValue` for AI reasoning, confidence, sources
2. Check all input fields referenced in the prompt: are they populated?
3. Review prompt in `get_table_schema` with the field's `fieldId` -- is it specific enough? Does it have examples?
4. Check output format configuration: `outputFormat`, `outputFields`

**Fix:**
- Upstream empty: fix upstream fields first
- Prompt issue: `update_field` with improved prompt (add few-shot examples, tighten constraints)
- Model issue: `update_field` to switch to a model better matched to the task complexity
- Web search noise: `update_field` to disable `enableWebSearch` if not needed
- After any fix, re-run on named rows with `skipCellsWithData: false`: `custom_range` with one affected row ID to check the fix, then the remaining affected row IDs

---

## HubSpot create/update silently ignores fields

**Seen in:** HubSpot record was created or updated, but some mapped fields are unchanged or missing.

**Root causes:**
1. Using display names instead of internal property names (e.g., "Lead Status" instead of `hs_lead_status`)
2. Property doesn't exist on the HubSpot object type
3. Property is read-only in HubSpot
4. Value format doesn't match HubSpot's expected type (e.g., sending string to number property)

**Diagnosis:**
1. `get_row_details` with fieldId -- check `fullValue` for the HubSpot API response
2. `resolve_action_options` for the HubSpot object type -- get valid internal property names
3. Compare mapped field names against resolved options

**Fix:**
- Replace display names with internal property names in `update_field`
- Remove read-only properties from the mapping
- Re-run on named rows with `skipCellsWithData: false`: `custom_range` with one affected row ID to check the fix, then the remaining affected row IDs

---

## Run hangs (processing for >5 minutes on small batch)

**Seen in:** `get_run_status` shows `status: "processing"` for extended time with no progress change.

**Source imports are the exception:** an import runs 10 to 30+ minutes, `processing` with 0 rows is normal, and a `wait_for_run` timeout is not a failure. Never cancel one as frozen or re-run it: poll `get_run_status` and report its status, elapsed time (since `createdAt`) and rows so far (`tableRowCount`).

**Root causes:**
1. External API is slow or rate-limited
2. AI model with web search doing extensive per-row research
3. Run is stuck (infrastructure issue)

**Diagnosis:**
1. Poll `get_run_status` 2-3 times, 30 seconds apart -- is `progress.percent` increasing?
2. If progress is moving slowly: normal for web search AI or enrichment with rate limits
3. If progress is frozen for 3+ polls: likely stuck

**Common slow action families (normal, not stuck):**
- Waterfall enrichment can be slow because it tries multiple providers sequentially.
- AI with web search can take longer depending on research depth.
- External HTTP/API actions vary by provider rate limits and response time.
- Native enrichment latency varies by provider and lookup complexity.

Use the action's current `get_action_schema` guide and observed Rung 1/Rung 2 runtime to decide polling interval and timeout.

**Fix:**
- Slow but progressing: wait. Web search AI fields can take 30-60 seconds per row.
- Frozen (never a source import): cancel with `cancel_run`, then re-run with `run_field`

---

## `run_field` returns `RUN_IN_PROGRESS` (409)

**Seen in:** `run_field` on a source import field returns `code: "RUN_IN_PROGRESS"`, `statusCode: 409` and a `runId`.

**Root cause:** An import on this field is still running. Baseloop refuses a second one so the import cannot be paid for twice.

**Fix:**
- Follow the `runId` the error carries with `get_run_status` or `wait_for_run`. Do not call `run_field` on the field again.
- Start a new run only after that run ends `failed` or `canceled`.

---

## autoRunCondition prevents field from executing

**Seen in:** Field has data in some rows but is empty in others, despite upstream fields being populated.

**Root causes:**
1. Condition references wrong field or uses wrong operator
2. Upstream field has data but in unexpected format (e.g., "Not Found" instead of null)
3. Condition uses `isNotFound` but lookup returned an error instead of "not found"

**Diagnosis:**
1. `get_table_schema` with the field's `fieldId` -- read the autoRunCondition for the field
2. `get_row_details` on a row where the field did NOT run -- check the gating field's exact value
3. Compare the actual value against the condition operator:
   - `notNull`: passes if value is any non-null string (including "Not Found", "Error")
   - `null`: passes only if value is null/empty
   - `isNotFound`: passes only if lookup returned "not found" status
   - `isFound`: passes only if lookup returned a match
   - `=`: exact string match

**Fix:**
- Wrong condition: `update_field` with corrected autoRunCondition
- Upstream format issue: fix the upstream field to produce the expected format
- Re-run after fixing with `custom_range`, the affected row IDs and `skipCellsWithData: false` (allowed on named rows)

---

## Filter or autoRunCondition uses wrong AND/OR combinator

**Seen in:** View filter shows no rows (or too many rows). AutoRunCondition skips rows that should run, or runs on rows that should be skipped.

**Root causes:**
1. Using AND when OR is needed: e.g., `Country = "USA" AND Country = "Canada"` — impossible, no row matches both
2. Using OR when AND is needed: e.g., `Status = "Active" OR ICP Score > 80` — too permissive
3. An update sent only the new rule: a field has exactly one `autoRunCondition`, and `update_field` replaces it whole, so the rules it left out are gone. Groups nest one level deep.
4. Wrong operator name: using a display label instead of the operator name. See full operator reference in [pitfalls.md](./pitfalls.md#available-operators-for-filters-and-autorunconditions).

**Diagnosis:**
1. `get_table_schema` with the field's `fieldId`: read the `autoRunCondition`. Check `combinator` value at each level.
2. Check that every rule the field needs is in that one condition: a rule an earlier update set is gone if a later update left it out.
3. `get_row_details` on an incorrectly skipped/included row — check gating field values against condition rules.

**Fix:**
- Wrong combinator: `update_field` — flip "and" to "or" or vice versa
- Missing rules: read the current condition (`get_table_schema` with `fieldId`) and send every existing rule back plus the new one in one `update_field`; for OR logic set `combinator: "or"` or nest one `or` group
- Wrong operator: replace with valid operator name (see [pitfalls.md](./pitfalls.md#available-operators-for-filters-and-autorunconditions))
- Re-run after fixing with `custom_range`, the affected row IDs and `skipCellsWithData: false` (allowed on named rows)

---

## Extraction field returns null despite action succeeding

**Seen in:** Action field shows "Found" / "Sent" / "Created" (success), but the extraction field for that same row is null or empty.

**Root cause:** `extractionPath` doesn't match the actual `fullValue` structure. This happens when extraction fields were created without first inspecting the action's real output. Every action type has its own response shape.

**Diagnosis:**
1. `get_row_details` with the **action** field's fieldId — read `fullValue`
2. Compare the JSON structure against the extraction field's `extractionPath`
3. The path will be wrong (e.g., `id` when the actual structure is `results[0].id`, or `email` when it's `data.email`)

**Fix:**
1. `update_field` on the same extraction field with an `extractionPath` matching the actual `fullValue` structure. The field id, name and every reference survive, and existing rows re-extract in the same call (above 10,000 rows, the first 10,000 now and the rest in the background); the result reports `matchedRows`, `sample` and `availablePaths`. Never delete and recreate the column, and never re-run the source to fill it.
2. `list_rows` on a few rows to confirm the column now holds the right values.
3. Downstream fields that hold wrong values: state how many rows will be charged again, then re-run them with `custom_range`, the affected row IDs and `skipCellsWithData: false`.

**Prevention:** Always run the action on 1 row and inspect `fullValue` before creating extraction fields. This applies to ALL action types — HubSpot, HTTP requests, AI agents, enrichment, email finders, lookups.

---

## Enrichment returns partial or no data

**Seen in:** `enrich_company` or `enrich_contact` runs successfully but key fields are null, or rows fail.

`enrich_contact` takes only a LinkedIn profile URL and `enrich_company` only a LinkedIn company URL, and neither returns an email or phone. Emails come from `waterfall_email_enrichment`, phones from `waterfall_phone_enrichment`. A row without a URL fails with "LinkedIn URL is required"; a URL of the wrong kind fails with "Invalid LinkedIn URL. Expected format: ...".

**Root causes:**
1. Input data is insufficient (no LinkedIn URL, or a company URL given to `enrich_contact` / a profile URL given to `enrich_company`)
2. The person/company has limited public profile data
3. Enrichment provider rate limit or temporary outage
4. The workflow expects an email or phone from these actions

**Diagnosis:**
1. `get_row_details` with fieldId -- check which fields were returned vs null, or read the errorMessage
2. Check input: does the row have a valid LinkedIn URL of the right kind?
3. Try a different row -- if it works, the issue is data quality on the failing row

**Fix:**
- Bad input: add an upstream step to find or validate the LinkedIn URL before enrichment
- Email or phone needed: add `waterfall_email_enrichment` or `waterfall_phone_enrichment`
- Provider issue: wait and re-run
- Sparse data: this is expected for some profiles -- no fix needed, just gate downstream fields on the specific field they need
