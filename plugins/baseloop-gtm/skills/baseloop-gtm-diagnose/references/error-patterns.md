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
2. `update_field` on the failing downstream field, replacing `{{action_field_name}}` with an inline path derived from that data (e.g. `{{action_field_name.results[0].id}}`). Use an extraction field instead (`create_field` with `extractorFieldId` + `extractionPath`, then reference `{{extraction_field_name}}`) when the value should be a visible column, feeds a formula, or has several consumers
3. Re-run with `skipCellsWithData: false`

---

## Cell status "error" with empty or generic errorMessage

**Seen in:** `get_row_details` returns `status: "error"` with null or unhelpful errorMessage.

**Root causes:**
1. Invalid action configuration (wrong property names, missing required fields)
2. External API returning unexpected response shape
3. Template variable `{{field_name}}` resolving to null in a required field

**Diagnosis:**
1. `get_row_details` with fieldId -- check `fullValue` for partial execution data
2. `get_table_schema` -- compare field config against `get_action_schema` output
3. Check upstream fields: is every `{{field_name}}` reference populated for this row?

**Fix:**
- Config mismatch: `update_field` with corrected config, then `run_field` with `skipCellsWithData: false`
- Upstream empty: diagnose the upstream field first (recursive)

---

## All rows failed in a run

**Seen in:** `get_run_status` returns `progress: { succeeded: 0, failed: N, total: N }` with `failedRowIds`.

**Root cause:** Every row hit the same error. Almost always a configuration problem, not a data problem.

**Diagnosis:**
1. `get_row_details` on a `failedRowIds` entry with the field's fieldId -- read errorMessage
2. Common error messages:
   - "Property X is required" -- missing input field in field config
   - "Invalid value for X" -- wrong format (display name instead of internal name)
   - "Rate limited" -- external API throttling
   - "Authentication failed" -- platform connection expired

**Fix:**
- Config error: `update_field` with corrected config, then `run_field` with `skipCellsWithData: false`
- Rate limit: wait 60 seconds, re-run with `runAction: "first_one"`
- Auth failure: tell user to reconnect the platform in Baseloop Settings > Integrations

---

## Send to Table creates 0 rows in destination

**Seen in:** `list_rows` on destination table returns 0 rows after Send to Table field ran successfully on source table.

**Root causes (in order of likelihood):**
1. autoRunCondition on the Send to Table field is not met for any source row
2. `send_for_each_item` mode with wrong `sourceArrayPath` -- array is empty or path doesn't match
3. Destination table ID in config doesn't match the actual table (e.g., table was recreated)
4. Field mappings reference fields that don't exist in source table

**Diagnosis:**
1. `get_row_details` on a source row with the Send to Table field's fieldId -- check `value` and `fullValue`
2. If value is null: check autoRunCondition in `get_table_schema` -- is the gating field populated?
3. If mode is `send_for_each_item`: inspect the source field's `fullValue` to see the actual array, verify `sourceArrayPath` matches the array structure
4. Verify destination table ID with `list_tables`

**Fix:**
- Condition not met: fix upstream field or adjust autoRunCondition
- Wrong sourceArrayPath: `update_field` with correct path, re-run with `skipCellsWithData: false`
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
3. Review prompt in `get_table_schema` -- is it specific enough? Does it have examples?
4. Check output format configuration: `outputFormat`, `outputFields`

**Fix:**
- Upstream empty: fix upstream fields first
- Prompt issue: `update_field` with improved prompt (add few-shot examples, tighten constraints)
- Model issue: `update_field` to switch to a model better matched to the task complexity
- Web search noise: `update_field` to disable `enableWebSearch` if not needed
- Re-run with `skipCellsWithData: false` after any fix

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
- Re-run with `skipCellsWithData: false`

---

## Run hangs (in_progress for >5 minutes on small batch)

**Seen in:** `get_run_status` shows `status: "in_progress"` for extended time with no progress change.

**Root causes:**
1. External API is slow or rate-limited
2. AI model with web search doing extensive per-row research
3. Run is stuck (infrastructure issue)

**Diagnosis:**
1. Poll `get_run_status` 2-3 times, 30 seconds apart -- is `progress.completed` increasing?
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
- Frozen: cancel with `cancel_run`, then re-run with `run_field`

---

## autoRunCondition prevents field from executing

**Seen in:** Field has data in some rows but is empty in others, despite upstream fields being populated.

**Root causes:**
1. Condition references wrong field or uses wrong operator
2. Upstream field has data but in unexpected format (e.g., "Not Found" instead of null)
3. Condition uses `isNotFound` but lookup returned an error instead of "not found"

**Diagnosis:**
1. `get_table_schema` -- read the autoRunCondition for the field
2. `get_row_details` on a row where the field did NOT run -- check the gating field's exact value
3. Compare the actual value against the condition operator:
   - `notNull`: passes if value is any non-null string (including "Not Found", "Error")
   - `isNull`: passes only if value is null/empty
   - `isNotFound`: passes only if lookup returned "not found" status
   - `isFound`: passes only if lookup returned a match
   - `equals`: exact string match

**Fix:**
- Wrong condition: `update_field` with corrected autoRunCondition
- Upstream format issue: fix the upstream field to produce the expected format
- Re-run with `skipCellsWithData: false` after fixing

---

## Filter or autoRunCondition uses wrong AND/OR combinator

**Seen in:** View filter shows no rows (or too many rows). AutoRunCondition skips rows that should run, or runs on rows that should be skipped.

**Root causes:**
1. Using AND when OR is needed: e.g., `Country = "USA" AND Country = "Canada"` — impossible, no row matches both
2. Using OR when AND is needed: e.g., `Status = "Active" OR ICP Score > 80` — too permissive
3. Multiple autoRunCondition objects are always AND'd together. For OR logic, put rules in a **single** condition with `combinator: "or"`.
4. Wrong operator name: using a display label instead of the operator name. See full operator reference in [pitfalls.md](./pitfalls.md#available-operators-for-filters-and-autorunconditions).

**Diagnosis:**
1. `get_table_schema` — read the `autoRunCondition`. Check `combinator` value at each level.
2. Count how many condition objects exist. If >1, they're AND'd regardless of internal combinator.
3. `get_row_details` on an incorrectly skipped/included row — check gating field values against condition rules.

**Fix:**
- Wrong combinator: `update_field` — flip "and" to "or" or vice versa
- Multiple conditions that should be OR'd: merge into a single condition with `combinator: "or"`
- Wrong operator: replace with valid operator name (see [pitfalls.md](./pitfalls.md#available-operators-for-filters-and-autorunconditions))
- Re-run with `skipCellsWithData: false` after fixing

---

## Extraction field returns null despite action succeeding

**Seen in:** Action field shows "Found" / "Sent" / "Created" (success), but the extraction field for that same row is null or empty.

**Root cause:** `extractionPath` doesn't match the actual `fullValue` structure. This happens when extraction fields were created without first inspecting the action's real output. Every action type has its own response shape.

**Diagnosis:**
1. `get_row_details` with the **action** field's fieldId — read `fullValue`
2. Compare the JSON structure against the extraction field's `extractionPath`
3. The path will be wrong (e.g., `id` when the actual structure is `results[0].id`, or `email` when it's `data.email`)

**Fix:**
1. Delete the wrong extraction field
2. Create a new one with `extractionPath` matching the actual `fullValue` structure
3. Update any downstream fields referencing the old extraction field name (it will have a new auto-generated name)
4. Re-run with `skipCellsWithData: false`

**Prevention:** Always run the action on 1 row and inspect `fullValue` before creating extraction fields. This applies to ALL action types — HubSpot, HTTP requests, AI agents, enrichment, email finders, lookups.

---

## Enrichment returns partial or no data

**Seen in:** `enrich_company` or `enrich_contact` runs successfully but key fields (email, phone, LinkedIn URL) are null.

**Root causes:**
1. Input data is insufficient (no LinkedIn URL, no domain, misspelled name)
2. The person/company has limited public profile data
3. Enrichment provider rate limit or temporary outage

**Diagnosis:**
1. `get_row_details` with fieldId -- check which fields were returned vs null
2. Check input: does the row have a valid LinkedIn URL or domain?
3. Try a different row -- if it works, the issue is data quality on the failing row

**Fix:**
- Bad input: add an upstream AI agent or formula to find/validate the LinkedIn URL or domain before enrichment
- Provider issue: wait and re-run
- Sparse data: this is expected for some profiles -- no fix needed, just gate downstream fields on the specific field they need
