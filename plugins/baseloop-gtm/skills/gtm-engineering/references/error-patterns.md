# Error Patterns and Diagnosis

Error signatures observed in Baseloop workflow runs, mapped to root causes and fix procedures. Each entry shows what MCP tools reveal, why it happened, and how to resolve it.

**For preventive guidance** (how to avoid errors when building), see [pitfalls.md](./pitfalls.md).

---

## Cell status "error" with empty or generic errorMessage

**Seen in:** `get_row_details` returns `status: "error"` with null or unhelpful errorMessage.

**Root causes:**
1. Invalid action configuration (wrong property names, missing required fields)
2. External API returning unexpected response shape
3. Template variable `{{column_name}}` resolving to null in a required field

**Diagnosis:**
1. `get_row_details` with fieldId -- check `fullValue` for partial execution data
2. `get_table_schema` -- compare column config against `get_action_schema` output
3. Check upstream columns: is every `{{column_name}}` reference populated for this row?

**Fix:**
- Config mismatch: `update_column` with corrected config, then `run_field` with `skipCellsWithData: false`
- Upstream empty: diagnose the upstream column first (recursive)

---

## All rows failed in a run

**Seen in:** `get_run_status` returns `progress: { completed: 0, failed: N, total: N }`.

**Root cause:** Every row hit the same error. Almost always a configuration problem, not a data problem.

**Diagnosis:**
1. `get_row_details` on any failed row with the column's fieldId -- read errorMessage
2. Common error messages:
   - "Property X is required" -- missing input field in column config
   - "Invalid value for X" -- wrong format (display name instead of internal name)
   - "Rate limited" -- external API throttling
   - "Authentication failed" -- platform connection expired

**Fix:**
- Config error: `update_column` with corrected config, then `run_field` with `skipCellsWithData: false`
- Rate limit: wait 60 seconds, re-run with `runAction: "first_one"`
- Auth failure: tell user to reconnect the platform in Baseloop Settings > Integrations

---

## Send to Table creates 0 rows in destination

**Seen in:** `list_rows` on destination table returns 0 rows after Send to Table column ran successfully on source table.

**Root causes (in order of likelihood):**
1. autoRunCondition on the Send to Table column is not met for any source row
2. `send_for_each_item` mode with wrong `sourceArrayPath` -- array is empty or path doesn't match
3. Destination table ID in config doesn't match the actual table (e.g., table was recreated)
4. Field mappings reference columns that don't exist in source table

**Diagnosis:**
1. `get_row_details` on a source row with the Send to Table column's fieldId -- check `value` and `fullValue`
2. If value is null: check autoRunCondition in `get_table_schema` -- is the gating column populated?
3. If mode is `send_for_each_item`: inspect the source column's `fullValue` to see the actual array, verify `sourceArrayPath` matches the array structure
4. Verify destination table ID with `list_tables`

**Fix:**
- Condition not met: fix upstream column or adjust autoRunCondition
- Wrong sourceArrayPath: `update_column` with correct path, re-run with `skipCellsWithData: false`
- Wrong destination ID: `update_column` with current table ID from `list_tables`
- Bad field mappings: `update_column` with corrected mappings using column `name` fields from `get_table_schema`

---

## Formula returns error or unexpected value

**Seen in:** Formula cell shows an error string, returns "undefined", or produces wrong results.

**Root causes:**
1. Formula references a column name that was renamed or deleted
2. JavaScript expression has a syntax error
3. Input data is in unexpected format (string instead of number, JSON instead of plain text)

**Diagnosis:**
1. `get_row_details` with fieldId -- read the errorMessage
2. `preview_formula` with the formula prompt against a sample row -- iterate until correct
3. `get_table_schema` -- verify all referenced column names still exist

**Fix:**
- `update_column` with corrected formula prompt
- `run_field` with `skipCellsWithData: false`
- Use `preview_formula` to test before updating

---

## Custom AI Agent returns empty, null, or irrelevant output

**Seen in:** AI column cell has null value, generic placeholder text, or clearly wrong classification.

**Root causes:**
1. Prompt references `{{column_name}}` but that column is empty for the row
2. Prompt is too vague -- insufficient context or missing few-shot examples
3. Wrong model selected for the task complexity
4. Web search enabled but adding noise instead of useful context
5. Output format mismatch (expecting JSON but getting plain text, or vice versa)

**Diagnosis:**
1. `get_row_details` with fieldId -- check `fullValue` for AI reasoning, confidence, sources
2. Check all input columns referenced in the prompt: are they populated?
3. Review prompt in `get_table_schema` -- is it specific enough? Does it have examples?
4. Check output format configuration: `outputFormat`, `outputFields`

**Fix:**
- Upstream empty: fix upstream columns first
- Prompt issue: `update_column` with improved prompt (add few-shot examples, tighten constraints)
- Model issue: `update_column` to switch model (e.g., GPT-4o to Claude Sonnet for nuance)
- Web search noise: `update_column` to disable `useWebSearch` if not needed
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
- Replace display names with internal property names in `update_column`
- Remove read-only properties from the mapping
- Re-run with `skipCellsWithData: false`

---

## Run hangs (in_progress for >5 minutes on small batch)

**Seen in:** `get_run_status` shows `status: "in_progress"` for extended time with no progress change.

**Root causes:**
1. External API is slow or rate-limited (common with RapidAPI, BuiltWith)
2. AI model with web search doing extensive per-row research
3. Run is stuck (infrastructure issue)

**Diagnosis:**
1. Poll `get_run_status` 2-3 times, 30 seconds apart -- is `progress.completed` increasing?
2. If progress is moving slowly: normal for web search AI or enrichment with rate limits
3. If progress is frozen for 3+ polls: likely stuck

**Fix:**
- Slow but progressing: wait. Web search AI columns can take 30-60 seconds per row.
- Frozen: ask user to cancel the run in the Baseloop UI, then re-run with `run_field`

---

## autoRunCondition prevents column from executing

**Seen in:** Column has data in some rows but is empty in others, despite upstream columns being populated.

**Root causes:**
1. Condition references wrong column or uses wrong operator
2. Upstream column has data but in unexpected format (e.g., "Not Found" instead of null)
3. Condition uses `isNotFound` but lookup returned an error instead of "not found"

**Diagnosis:**
1. `get_table_schema` -- read the autoRunCondition for the column
2. `get_row_details` on a row where the column did NOT run -- check the gating column's exact value
3. Compare the actual value against the condition operator:
   - `notNull`: passes if value is any non-null string (including "Not Found", "Error")
   - `isNull`: passes only if value is null/empty
   - `isNotFound`: passes only if lookup returned "not found" status
   - `isFound`: passes only if lookup returned a match
   - `equals`: exact string match

**Fix:**
- Wrong condition: `update_column` with corrected autoRunCondition
- Upstream format issue: fix the upstream column to produce the expected format
- Re-run with `skipCellsWithData: false` after fixing

---

## Filter or autoRunCondition uses wrong AND/OR combinator

**Seen in:** View filter shows no rows (or too many rows). AutoRunCondition skips rows that should run, or runs on rows that should be skipped.

**Root causes:**
1. Using AND when OR is needed: e.g., `Country = "USA" AND Country = "Canada"` — impossible, no row matches both
2. Using OR when AND is needed: e.g., `Status = "Active" OR ICP Score > 80` — too permissive, runs on unqualified rows
3. Multiple autoRunConditions expecting OR behavior: multiple FieldAutoRunCondition objects are always AND'd together. To get OR logic, put rules in a **single** condition with `combinator: "or"`.
4. Default combinator is "and" if not set — users who add multiple rules without setting combinator get AND logic they may not have intended
5. Wrong operator name: using a display label (e.g., "is not empty") instead of the operator name (e.g., `notNull`). See full operator reference in [pitfalls.md](./pitfalls.md#available-operators-for-filters-and-autorunconditions).

**Diagnosis:**
1. `get_table_schema` — read the `autoRunCondition` or filter config. Check the `combinator` value at each level.
2. For autoRunConditions: count how many condition objects exist. If >1, they're AND'd regardless of internal combinator.
3. Check operator names are valid: `notNull`, `null`, `isFound`, `isNotFound`, `hasError`, `hasNoError`, `hasNotRun`, `runConditionNotMet`, `=`, `!=`, `>`, `>=`, `<`, `<=`, `contains`, `doesNotContain`, `startsWith`, `containsAnyOf`, `doesNotContainAnyOf`, `in`, `notIn`, `isDatePreset`, `between`.
4. `get_row_details` on a row that was incorrectly skipped/included — check the values of the gating columns against the condition rules.
5. Think through the boolean logic: write out what the condition evaluates to for that specific row's data.

**Fix:**
- Wrong combinator: `update_column` with corrected `autoRunCondition` — flip "and" to "or" or vice versa
- Multiple conditions that should be OR'd: merge into a single condition with `combinator: "or"`
- Wrong operator: replace with valid operator name from the list above
- For filters: update the view filter combinator in the UI
- Re-run with `skipCellsWithData: false` after fixing autoRunConditions

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
- Sparse data: this is expected for some profiles -- no fix needed, just gate downstream columns on the specific field they need
