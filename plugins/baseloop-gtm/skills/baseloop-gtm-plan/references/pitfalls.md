<!-- SYNC SOURCE: docs/reference-sources/pitfalls.md. Run `bun run references:sync` to refresh. Do not edit directly. -->

# Common Pitfalls

Known failure modes when building Baseloop workflows. Each entry: symptom, cause, fix.

**For runtime error diagnosis** (field failed, unexpected output, data not flowing), see `error-patterns.md` in this skill's references where it has one, or use the `baseloop-gtm-diagnose` skill.

---

## Referencing action field output instead of its fullValue data

**Symptom:** Downstream action receives `"Found"`, `"Sent"`, or `"Created"` instead of the actual data it needs (e.g., HubSpot object ID). HubSpot Update rejects the recordId. HTTP Request sends wrong body.

**Cause:** Used `{{action_field_name}}` directly. `{{field_name}}` resolves to display output, not `fullValue`. See SKILL.md "Action output vs fullValue" for details.

**Fix:** Reference the nested value with an inline path derived from the observed `fullValue` (e.g. `{{action_field_name.results[0].id}}`), or create a data extraction field (`extractorFieldId` + `extractionPath`) only when the value must be a column: a person reads, sorts or filters it, a run condition gates on it (rules take a `fieldId`, never a path), its key contains spaces, or several fields reuse it.

**Prevention:** Before using `{{field_name}}` for any action field, ask: "Does this field's display output contain the actual value I need, or is it just a status string?" If it's a status string (Found, Sent, etc.), you need a path into `fullValue` or an extraction field. A bare `{{field_name}}` is right in two cases: the display value is the datum itself (an email finder's cell is the email), and an AI prompt (`custom_ai_agent`, `parallel_research`), which also receives the referenced column's `fullValue` as context.

---

## Running all rows without testing first

**Symptom:** Hundreds of credits burned, garbage data in CRM, API errors discovered only after all rows processed.

**Cause:** Ran the whole table (`entire_set`, or `first_hundred` on a table with <100 rows) before checking the output of one row. A bare `run_field` on an action field runs `first_ten`, not all rows.

**Example failure mode:** Agent created a field, immediately ran it on the full table, then created the next field and ran that on the full table too. By the time a HubSpot API error was discovered at the final step, hundreds of credits had been spent and many CRM records had been created, including duplicates and invalid entries.

**Fix:** Follow the Scaling Ladder (see SKILL.md). On action fields, always pass `runAction`. Always: `first_one` → `first_ten` → full scale (user approval required). For tables with >100 rows, use `list_row_ids` to paginate through all row IDs, then batch them through `run_fields` with `rowIds` (max 100 per batch). Use `hasNotRun` or `hasError` filters to only target unprocessed rows.

**Prevention:** Pass `runAction` on every action-field `run_field` (omitted, it runs `first_ten`). A source field takes no `runAction`: `run_field` refuses `selectedIds` or anything but `entire_set` there, so size an import through its own config (`maxContacts`, `maxEngagements`, a record limit) set low for the first run. Watch for `first_hundred` on small datasets: it runs everything if the table has <100 rows. For large tables, always use the `list_row_ids` → batch pattern instead of relying on `first_hundred`.

---

## Send to Table: pre-creating fields in destination

**Symptom:** Duplicate fields (e.g., "Company Name" and "Company Name (1)") in the destination table.

**Cause:** Created fields in the destination table before configuring Send to Table. Send to Table auto-creates fields from fieldMappings keys.

**Fix:** Always start with an empty destination table created via `create_table` with no fields. The field mappings define the fields. Run the send on one row first: it creates the Input field and one column per mapping key. Then, with the user's approval, `set_auto_dedupe` on the entity key column (`keepRule: "oldest"`) before the full run.

A second send whose mapping key matches the label of a column an earlier send created writes into that column, so several senders can feed one table. A column created by hand is never reused: the send adds a "(1)" copy beside it.

---

## Auto-dedupe deletes rows, and its key defines a duplicate

**Symptom:** Rows vanish after `set_auto_dedupe`, rows that were already in the table included. Or distinct records (two companies with the same name) collapse into one.

**Cause:** `set_auto_dedupe` deletes every row whose key column repeats (case-insensitive; blanks and values over 200 characters skipped), rows already in the table included, keeping `oldest` or `newest`. Rows have no Trash.

**Fix:** Get approval naming the table, the column and how many rows would go. Key on what makes a record unique: domain for companies, LinkedIn URL for people, the event or signal id for signals, never the company name alone. For a Send to Table destination, switch it on after the one-row test send has created the key column and before the full run, keep `oldest`.

**Prevention:** Never dedupe a table on a column its own source import refreshes: the next import re-creates the deleted rows and runs their paid columns again. Dedupe the table it sends to instead. A lookup plus a not-found gate misses rows that arrive in the same batch, so keep auto-dedupe on beside it.

---

## Template resolution in field mappings

**Symptom:** Send to Table field mapping values are empty or null in the destination.

**Cause:** Used `{{field_name}}` syntax in fieldMappings. The template engine (`variableService`) resolves `{{}}` to actual cell values before the action runs, so the action receives the resolved value instead of the field reference.

**Fix:** Use plain field names in `send_row` mode (e.g., `company_name_abc`). In `send_for_each_item` mode, use `column:field_name` for parent row fields. Never wrap in `{{}}`. Mapping values may carry fullValue paths derived from observed data (`fetch_users_abc1[0].company.name`; `column:company_data_abc1.hq.city` for parent-row fields), still without braces.

---

## Re-running AI fields upstream

**Symptom:** Different results than before, orphan rows in downstream tables, data inconsistency.

**Cause:** Re-ran an upstream Custom AI Agent field that already had correct data. AI is non-deterministic — it produces different results each run. Downstream Send to Table then creates new rows (from different AI output) while old rows remain.

**Fix:** Only re-run the field whose *configuration* changed. Never re-run upstream fields to fix a downstream issue.

In `send_for_each_item`, a re-run updates destination rows by item position unless `sourceConfig.sourceItemKey` names an id every item carries (a required, always-filled schema property). Set it before the first run: adding or changing it later creates fresh rows.

---

## Source action not running after create_table

**Symptom:** Table created with source field but contains no data rows.

**Cause:** `create_table` with `sourceField` creates the table and source field but does NOT auto-trigger the import.

**Fix:** After creating the table:
1. Use the source's own sampling controls when available (for example, `recordLimit`, `maxJobs`, list selection, criteria, or selected properties from `get_action_schema`).
2. Call `run_field` with only the table ID and source field ID. Omit `runAction` and `selectedIds`; source imports execute as `entire_set` internally and create or update their own rows.
3. `wait_for_run` and inspect `sourceImportSummary` when available.
4. Verify imported data with `list_rows` or `get_row_details`.

---

## Missing autoRunCondition gating

**Symptom:** Enrichment, people-finding, or AI actions run on rows that should have been filtered, producing low-value work or bad downstream data.

**Cause:** Did not set `autoRunCondition` to gate on reliable upstream prerequisites, or treated every row as eligible even after CRM/blocklist/dedupe signals narrowed the audience.

**Fix:** Gate credit-consuming actions when a reliable prerequisite exists and the gate preserves the workflow's selected quality tier. Example: gate `custom_ai_agent` on `enrich_company` being `notNull` when the prompt depends on enriched company data. Gate `hubspot_create_object` on `hubspot_lookup_object` being `isNotFound`. Do not add gates that suppress rows the workflow explicitly needs for coverage, confidence, CRM integrity, contact quality, deliverability, or downstream conversion.

---

## Sentinel words pass every not-empty gate

**Symptom:** Paid steps, sends or CRM writes run on rows whose upstream answer was "Not found", "NONE" or "N/A".

**Cause:** A step told to return "Not found" or "NONE" when it finds nothing still writes a value, and that value passes every `notNull` and not-empty gate. Models also add a full stop, so an `!=` rule on the word misses too.

**Fix:** Prompt for an empty value when nothing is found. End each table in one Result formula (for example Done, Not found, Failed, Pending) and gate every send and CRM write on it.

---

## Wrong sourceArrayPath in send_for_each_item

**Symptom:** Send to Table creates no rows or creates rows with wrong data in `send_for_each_item` mode.

**Cause:** `sourceArrayPath` doesn't match the actual JSON structure of the source field's output.

**Fix:**
- Read the current `send_to_table` guide via `get_action_schema`; its `aiDescription` is authoritative for modes, source configuration, and mapping behavior.
- Inspect the source field's `fullValue` with `get_row_details` using the source field ID.
- Call `resolve_action_options` for `sourceConfig.sourceArrayPath` instead of guessing array paths.
- If the source action has its own destination-table behavior, follow that action's current `get_action_schema` guide before adding Send to Table.
- Never route `li_find_people_at_company` through Send to Table: it writes one row per found contact into its own `destinationListId` table, and its `fullValue` is an object whose array is `contacts`, so a `send_for_each_item` on `fullValue` fails every row and any send duplicates the contacts.

---

## Per-candidate slot columns

**Symptom:** A table grows "Decision maker 1", "Decision maker 2", "Decision maker 3" columns, and each candidate needs its own copy of every enrichment, dedupe and CRM step.

**Cause:** Multi-record output was spread across numbered columns instead of rows. Slot columns cannot be enriched, deduplicated or synced as records.

**Fix:** Produce the list in one `custom_ai_agent` column with a JSON Schema array (`outputFormat: "jsonSchema"`), then one Send to Table `send_for_each_item` into a child table, one row per candidate. Enrich, dedupe and sync there.

---

## Missing parent IDs in CRM sync

**Symptom:** Contacts created in HubSpot without company association (orphan records).

**Cause:** Did not pass the company's HubSpot object ID when creating contacts.

**Fix:** Carry the parent company/account ID into the contact table, then configure the CRM create/update action to associate the child record with that parent. Use `get_action_schema` for the routing action and CRM action, `get_table_schema` for field names, and `resolve_action_options` for association or property options. Do not hardcode mapping syntax from memory.

---

## Updating contact company as flat text without Company object

**Symptom:** Contact's company field is updated in HubSpot, but the contact has no Company object association. HubSpot's company-level reporting, deal pipelines, and ABM features show incomplete data. Sales reps can't navigate from the contact to the company record.

**Cause:** Workflow detects a job change and pushes the new company name as a text field on the contact, but never creates the Company object in HubSpot or associates the contact with it.

**Fix:** Any workflow that updates a contact's company after a job change must include the full company chain:

1. **Resolve company identity** — produce a stable domain or CRM lookup key, using enrichment output or a gated AI/web-research fallback when needed.
2. **Lookup company/account** — use the current CRM lookup action guide and gate on a non-null lookup key.
3. **Create company/account if missing, from a companies table**: a HubSpot company create never dedupes, so create each company once from a companies table (auto-dedupe on domain) when the lookup reports not found, never from a contacts table, where three contacts at one company create three companies. Then look the company id back up from the contacts table.
4. **Consolidate company/account ID** — use a formula or extraction field to get the ID from whichever source produced it.
5. **Associate the contact** — configure the CRM contact create/update action from its live `get_action_schema` guide so it links to the consolidated company/account ID.

**Prevention:** Before designing any job-change or company-enrichment workflow, ask: "Does this workflow create/link the Company object, or just update flat text?" If the answer is flat text, the workflow is incomplete.

---

## HubSpot property name mismatch

**Symptom:** HubSpot create/update fails or ignores fields silently.

**Cause:** Used display names instead of internal property names (e.g., "Lead Status" instead of `hs_lead_status`).

**Fix:** Always use `resolve_action_options` to get valid HubSpot property internal names. Never guess property names.

---

## Placeholder IDs in runnable external fields

**Symptom:** A CRM, outreach, notification or HTTP field fails on every row, or writes to the wrong record, campaign or channel.

**Cause:** The field was created runnable with a placeholder id (`PENDING_*`, `TODO`, `TBD`, a sample id) meant to be replaced later, and a run or a new row fired it first.

**Fix:** Never create a runnable CRM, outreach, notification or HTTP field with a placeholder id. Resolve the real value (`resolve_action_options`), leave `autoRunEnabled: false`, or ask.

---

## Running the wrong field after a config fix

**Symptom:** Fixed a field's config but the old (wrong) data persists.

**Cause:** Ran `run_field` with default `skipCellsWithData: true`, which skipped cells that already had data from the previous (wrong) configuration.

**Fix:** After fixing a field config with `update_field`, re-run that field on named rows with `skipCellsWithData: false`: `custom_range` with one affected row ID (or `first_one`) to check the fix (a range such as `first_ten` is refused with the flag off). Only that specific field, not upstream fields. Completed rows are paid for: re-run the remaining affected row IDs only when the user asks, after stating how many rows will be charged again.

---

## Formula field not evaluating correctly

**Symptom:** Formula returns unexpected values or errors.

**Cause:** Formula references field names that don't exist or uses wrong syntax.

**Fix:** Always use `preview_formula` to test the formula before creating the field. The preview shows sample evaluations on actual row data. Iterate until the output looks correct, then pass the same prompt to `create_field`.

---

## Trying to run formula or data-extraction fields

**Risk level:** LOW — usually surfaces immediately as a rejected `run_field` call, but can lead agents to misunderstand when values refresh.

**Symptom:** `run_field` fails with "Field is not runnable" or similar after creating a formula or data-extraction field.

**Cause:** Formula and data-extraction fields are not action fields. They evaluate automatically from referenced cell values and are outside the `run_field` / `autoRunEnabled` lifecycle.

**Fix:** Do not run these fields. For formulas, use `preview_formula` before creating or updating the field, then inspect row values after upstream cells have data. For extraction fields, ensure the referenced source cells have data (e.g. by running the upstream action field that produces the JSON/text, or by populating whatever referenced cell feeds the extraction), then inspect the extraction field value.

**Prevention:** Only discuss `autoRunEnabled`, `runAction`, `run_field`, and `run_fields` for runnable action/AI fields. For formulas and data extraction, describe validation as previewing or row inspection, not running.

---

## Formula used for open-ended semantic classification

**Symptom:** A formula becomes large, brittle, or slow because it embeds long lists of countries, cities, industries, job titles, or synonyms. Classification misses obvious cases or requires constant maintenance.

**Cause:** Treated "formulas are free" as "formulas should classify everything." Formulas are best for compact deterministic logic, not ambiguous or high-cardinality natural-language values.

**Example failure mode:** A source column contains a mix of countries and cities. The agent creates a formula with many country and city names inside it to classify each value. This is inefficient and fragile because geography lists are large, overlapping, multilingual, and incomplete.

**Fix:** Use a `custom_ai_agent` field for the classification and constrain the output. For mixed location values, ask the AI agent to return labels such as `country`, `city`, `region`, or `unknown`, plus a normalized value when confident. Gate it on the source field being `notNull`, test with `first_one` and `first_ten`, then use downstream formulas only for deterministic gates based on the AI output.

**Prevention:** Before creating a formula, ask: "Is this compact deterministic logic, a long but fixed list, or open-ended judgment?" A long but fixed list (countries, country or currency codes) stays free: normalise the value, match it in a formula or with `lookup_single_record` into a codes table, and send only the leftovers to AI. Values that need judgment get a gated AI classification field.

---

## Missing LinkedIn URL blocks entire enrichment chain

**Symptom:** External LinkedIn enrichment fails or returns empty — the entire qualification chain stalls.

**Cause:** Source data (HubSpot import) doesn't always include LinkedIn company URLs. Without a LinkedIn slug, the external enrichment request can't run.

**Fix:** Add a `custom_ai_agent` field as a "LinkedIn URL Finder" early in the chain. Give it the company name and domain, let it search for the LinkedIn URL. Confirm an AI-found LinkedIn URL or domain before paid steps read it (for example `enrich_company` on the found URL, then compare its name and website with the input). Gate subsequent enrichment on a formula that is empty unless the value is well formed (a domain with a dot and a TLD, a `linkedin.com/company/` URL), not on the finder being `notNull`: a "Not found" answer passes `notNull`.

---

## LinkedIn search returns "Not Found" for non-LinkedIn audiences

**Symptom:** `li_find_people_at_company` returns "Not Found" for a large percentage of rows. The workflow dead-ends for those companies — no contacts found, no downstream processing.

**Cause:** The target group isn't active on LinkedIn. Common with small businesses, non-tech industries (e.g., local services, agriculture, construction), or specific regions with low LinkedIn adoption.

**Fix:** Add a `custom_ai_agent` field with `enableWebSearch: true` and `outputFormat: "jsonSchema"` as a fallback. Gate it on the Find People field being `isNotFound` OR `hasError` (one condition, `combinator: "or"`): a provider error never sets not found. The AI searches company websites, team pages, Crunchbase, press releases, and other public sources. Route its `contacts` array with a Send to Table `send_for_each_item` into the same table Find People writes to (its `destinationListId`). Both paths converge into the same downstream workflow.

**JSON Schema example for the fallback AI:**
```json
{
  "type": "object",
  "properties": {
    "contacts": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "full_name": { "type": "string" },
          "first_name": { "type": "string" },
          "last_name": { "type": "string" },
          "title": { "type": "string" },
          "email": { "type": "string" },
          "linkedin_url": { "type": "string" }
        },
        "required": ["full_name", "first_name", "last_name"]
      }
    }
  },
  "required": ["contacts"]
}
```

---

## Changed-jobs filter used to find the buying committee

**Symptom:** `li_find_people_at_company` returns a handful of contacts, or none, at companies that clearly have people in the target roles.

**Cause:** Set `changedJobs: true`. It keeps only people who started a new position in the last 90 days, and it is off by default.

**Fix:** Leave `changedJobs` off for a role list (buyers, decision makers, a department). Set it only when the audience is recent movers (new hires, people who just joined). A leadership-change signal ("new CRO this year") is a research question: ask it in an AI research column (`parallel_research` by default) that returns a dated source.

---

## No blocklist check before enrichment

**Symptom:** Companies that are already customers or churned accounts repeat low-value enrichment.

**Cause:** Workflow runs enrichment on every imported company without checking against existing CRM data.

**Fix:** Maintain a "Master CRM Blocklist" table with closed-won + churned companies. Add a `lookup_single_record` field early in the workflow before enrichment when the matching key is available. Gate downstream fields on blocklist lookup being `isNotFound` so the workflow avoids low-value enrichment while preserving the selected audience.

---

## AND vs OR confusion in filters and autoRunConditions

**Symptom:** Filter shows no rows when it should show some (or shows too many). AutoRunCondition skips rows that should execute, or runs on rows that should be skipped.

**Cause:** AND and OR combinators are commonly mixed up. Key rules:

1. **AND** = ALL rules must be true. Use for narrowing: "must be Active AND must be in USA."
2. **OR** = AT LEAST ONE rule must be true. Use for alternatives: "Country = USA OR Country = Canada."
3. **A field has exactly one `autoRunCondition`, and `update_field` replaces it whole.** To add a rule, read the current condition (`get_table_schema` with `fieldId`) and send every existing rule back plus the new one. For OR logic, set its `combinator: "or"` or nest an `"or"` group. Groups nest one level deep.
4. **Default combinator is "and"** if not explicitly set. Adding rules without setting the combinator gives AND behavior.

**Fix:** Before creating an autoRunCondition, think: "Do ALL of these need to be true (AND), or does at least one need to be true (OR)?"

- Same field, multiple values (e.g., Country = USA or Canada): **single condition, combinator: "or"**
- Different fields, all required (e.g., Status = Active AND Score > 80): **single condition, combinator: "and"**
- Mixed logic (e.g., (Country = USA OR Country = Canada) AND Status = Active): **one condition, combinator: "and"**, holding an `"or"` group for the countries plus the status rule. Groups nest one level deep: a group's rules are all leaf rules.

**Nested combinator groups** are supported one level deep. You can nest rule groups for logic like `(A OR B) AND (C OR D)`:
```json
{
  "combinator": "and",
  "rules": [
    {
      "combinator": "or",
      "rules": [
        { "fieldId": "country_abc", "operator": "=", "value": "USA" },
        { "fieldId": "country_abc", "operator": "=", "value": "Canada" }
      ]
    },
    {
      "combinator": "or",
      "rules": [
        { "fieldId": "score_xyz", "operator": ">", "value": "80" },
        { "fieldId": "tier_def", "operator": "=", "value": "enterprise" }
      ]
    }
  ]
}
```

**Value coercion:** All condition values are coerced to strings before comparison. Boolean `true` becomes `"true"`, number `1` becomes `"1"`. When writing conditions against formula or AI output, always use string values (e.g., `"value": "true"` not `"value": true`).

### Available operators for filters and autoRunConditions

Use the correct operator `name` value (left field) when configuring rules:

**No-value operators** (status checks — don't need a `value` field):
| Operator | Label | Use for |
|---|---|---|
| `notNull` | is not empty | Gate on upstream field being populated |
| `null` | is empty | Gate on field being empty/missing |
| `hasError` | has an error | Filter rows where field errored |
| `hasNoError` | has no error | True for every cell that has not failed: succeeded, skipped by its run condition, or never run. Never gate a write or routing send on it; gate on the verdict value (`= "Qualified"`, `isFound`, a Result word) |
| `isFound` | has results | Gate on lookup returning a match (enrichment, HubSpot lookup) |
| `isNotFound` | has no results | Gate on lookup returning no match (create-if-not-exists pattern) |
| `hasNotRun` | has not run | Filter rows where field hasn't executed yet |
| `runConditionNotMet` | run condition not met | Filter rows where autoRunCondition blocked execution |

**Value operators** (require a `value` field):
| Operator | Label | Value type | Use for |
|---|---|---|---|
| `=` | is equal to | string, number, date | Exact match |
| `!=` | is not equal to | string, number, date | Exclude specific value |
| `>` | is greater than | number, date | Threshold check |
| `>=` | is greater than or equal to | number, date | Threshold check (inclusive) |
| `<` | is less than | number, date | Upper bound check |
| `<=` | is less than or equal to | number, date | Upper bound check (inclusive) |
| `contains` | does contain | string | Substring search |
| `doesNotContain` | does not contain | string | Exclude substring |
| `startsWith` | starts with | string | Prefix match |
| `containsAnyOf` | does contain any of | array (JSON) | Match any of multiple keywords (max 20) |
| `doesNotContainAnyOf` | does not contain any of | array (JSON) | Exclude multiple keywords (max 20) |
| `in` | is any of | array | Value is one of the options |
| `notIn` | is none of | array | Value is not any of the options |
| `isDatePreset` | is | string | Relative date preset. Values: `today`, `tomorrow`, `yesterday`, `thisWeek`, `lastWeek`, `thisMonth`, `lastMonth`, `thisQuarter`, `lastQuarter`, `thisYear`, `lastYear`, `last7Days`, `last14Days`, `last30Days`, `last60Days`, `last90Days`, `last180Days`, `last365Days` |
| `between` | is between | object `{start, end}` | Absolute date range (ISO date strings) |

**Common autoRunCondition patterns:**
- Gate enrichment on upstream being populated: `operator: "notNull"`, field = upstream field
- Gate CRM create on lookup miss: `operator: "isNotFound"`, field = lookup field
- Gate on qualification result: `operator: "="`, field = AI qualifier field, value = "Qualified"
- Gate on multiple alternatives: `combinator: "or"`, rules with `operator: "="` for each valid value

---

## Downstream table not auto-processing new rows

**Symptom:** Send to Table or a scheduled import creates rows in the table, but action fields there don't run.

**Cause:** `autoRunOnNewRow` is `false` on the table (the default). Imports and Send to Table start a table's action fields only through `autoRunOnNewRow`.

**Fix:** After verifying the workflow works end-to-end, switch `autoRunOnNewRow` on (`update_table`) for every source table whose new rows must move on: a scheduled import, or a Send to Table destination once the first send has created its Input field. New rows then run every action field with `autoRunEnabled: true`. Keep it off only on tables run by hand. `update_table` refuses it until the table has a source field and at least one runnable field.

---

## Dependent columns run twice on a table with autoUpdateDependents

**Symptom:** After `update_row` or `run_field`, `list_runs` shows runs you did not start, with `trigger: "auto_update"`. Or a dependent field was charged twice for the same rows.

**Cause:** The table has `autoUpdateDependents: true` (`get_table_schema` reports it on `table`). When a cell's displayed value changes through `update_row`, a grid edit or a field run (scheduled runs included), the fields that depend on it re-run for that row only, in dependency order. An import refresh and a Send to Table landing never trigger it, and a change visible only in `fullValue` (or in its extraction columns) starts nothing. Running those fields by hand afterwards repeats the same work and pays for it again.

**Fix:** Before editing rows or running a field, read `table.autoUpdateDependents`. When it is on, change or run the upstream field, then follow the `auto_update` runs with `wait_for_run` instead of calling `run_field` on the dependents. In their progress, `skippedInputUnchanged` means the field it reads came back with the same value, so the row kept its result, and `skippedUpstreamFailed` means the field it reads failed. Neither costs credits. A failed upstream still creates the dependent's `auto_update` run: its rows close without running, keep their value and cost nothing.

**Prevention:** Switch `autoUpdateDependents` on (`update_table`) only when the user asked for values to stay in sync, and say first that every change, manual edits included, spends credits on the dependent fields and can write to external systems. Fields with `autoRunEnabled: false` are never re-run by it.

---

## Not writing engagement notes for disqualification reasons

**Symptom:** CRM records have no context on why a company wasn't pursued. Sales reps can't tell why an account was skipped.

**Cause:** Workflow only writes HubSpot engagement notes for qualified companies, not for disqualified ones.

**Fix:** Write one note per record per outcome, with the reason in its body. One `hubspot_create_engagement` field whose body is a formula naming the outcome and the data behind it, gated on Note Needed (see "A note, task or campaign add created twice cannot be undone"). Separate note fields per reason post several notes when a record fails several checks. The reasons the body formula covers, for example:
- "NOTE: FTE Disqualified" — gated on staff qualification = "Disqualified"
- "NOTE: Country Count Disqualified" — gated on country qualification = "Disqualified"
- "NOTE: LinkedIn Not Found": gated on LinkedIn URL being `null`

Each note should include the specific data that triggered disqualification (e.g., "Staff count: 45, required: 200+"). This creates a full audit trail in the CRM. Gate each note on a key so a re-run cannot post it twice (see "A note, task or campaign add created twice cannot be undone").

---

## A note, task or campaign add created twice cannot be undone

**Symptom:** The same CRM note or task appears two or more times on a record, or a lead is enrolled twice, after a re-run, a config fix or an upstream edit.

**Cause:** A note, task or record created twice cannot be undone from the table. With `autoUpdateDependents` on, any change to a column the note reads re-runs it with skip-filled-cells off and posts again.

**Fix:** Gate each create on a key the destination or a history table already holds: a property the same run writes, or a `lookup_single_record` into a table of delivered notes. Keep the sequencer's duplicate checks on. Put events in a dated note and states in a property. For notes, one buildable gate is **Note Needed**: a formula that is `yes` when the row's outcome differs from the outcome the CRM record last noted (a property the same run writes, read back by the HubSpot lookup); gate the note on `Note Needed = yes`. Run conditions compare a column with a fixed value, so the comparison lives in the formula.

---

## Data quality issues from mismatched company names

**Symptom:** HubSpot company name doesn't match LinkedIn company name. Enrichment data may be for the wrong company.

**Cause:** Company names in HubSpot often differ from LinkedIn (abbreviations, legal suffixes, typos).

**Fix:** Add verification fields:
- Formula: domain match check (compare HubSpot domain vs LinkedIn website domain)
- AI Agent: name match check (compare HubSpot company name vs LinkedIn company name)
Gate downstream processing on matches, or flag mismatches for manual review.

---

## Enriching recently contacted accounts

**Symptom:** Recently contacted accounts repeat enrichment or outreach instead of following the appropriate recency path.

**Cause:** Workflow doesn't check when the account was last touched in HubSpot before enriching.

**Fix:** After the `hubspot_lookup_object` field, read the last-contacted date: HubSpot's property is `notes_last_contacted` (confirm with `resolve_action_options`). What counts as an account to leave alone (customer, open deal, stages, contacted within how long, for example 30 days) is the user's call: ask, then gate downstream enrichment on it. A formula comparing to today recomputes only when a cell it reads is rewritten or a HubSpot import refreshes the row, so on a recurring table that no import refreshes it goes stale. Compare against a date the cycle rewrites, or use `isDatePreset` in a run condition, which is evaluated when the step dispatches. It matches dates inside the window and has no negated form, so it can gate a step for recently contacted rows, not the enrichment of the rest: for that, gate on a formula.

---

## Domain mismatch between input and enrichment result

**Symptom:** HubSpot lookup finds no match even though the company exists in CRM. Or enrichment data is for a subsidiary instead of the parent company.

**Cause:** The enriched company profile has a different domain than the input (common with regional sites like `.fr` vs `.com`, subsidiaries, or rebrands).

**Fix:** Do two HubSpot lookups: one on the input domain, one on the enrichment-discovered domain. Merge both lookups into one Effective ID formula that returns whichever id was found (lookup ids only, never the create's output). Keep exactly one create, one update and one note: gate the create on both lookups being `isNotFound` and give it every property the update writes; gate the update on either lookup being `isFound` (one `or` condition) and point its record id at the Effective ID. Never add a create, update or note per lookup path.

---

## No email verification before routing

**Symptom:** Outreach campaigns have high bounce rates. Email campaigns include freemail addresses or invalid emails.

**Cause:** Workflow routes leads to outreach without checking email quality first.

**Fix:** Emails found by `waterfall_email_enrichment` are already verified: it stops at the first provider that returns a verified address. For emails that arrive from elsewhere (an import, a webhook), Baseloop has no verification action, so a `baseloop_send_http_request` field calling the user's email verification API is the route, with the user's consent, because its key is stored in the field (see "Credentials stored in an HTTP request field"). Check the response for freemail, quality, and validity. Gate outreach routing on email quality being acceptable. Write a "NOTE: Bad Email" HubSpot engagement note for failed verifications so sales reps know.

---

## Credentials stored in an HTTP request field

**Symptom:** An API key or webhook URL shows up in `get_table_schema` for everyone who can read the table.

**Cause:** `baseloop_send_http_request` has no connection, so a key or webhook URL in it is stored in the field config itself.

**Fix:** Prefer the connected native action (`slack_send_message_to_channel`, the sequencer add-to-campaign actions, CRM actions). Put a key or webhook URL in `baseloop_send_http_request` only with the user's consent.

---

## Cloned workspace missing source-specific tags

**Symptom:** Downstream systems (CRM, outreach) can't distinguish which campaign batch a record came from.

**Cause:** Cloned a template workspace but didn't update the "Table Source" or campaign tag fields.

**Fix:** Always include a "Table Source" formula returning a literal that identifies the batch (campaign name, batch label, end date). Examples: "Target Account Batch", "LinkedIn Followers", "Content Campaign Q1". Update the formula in each workspace clone before running the workflow. Never use an Input field or hand-filled cells for it: imports and Send to Table compute every formula on the rows they add, while an `update_row` fill covers only the rows in the table today.

---

## Single HubSpot lookup returning incomplete data

**Symptom:** Missing CRM data fields despite the record existing in HubSpot. Or engagement data is empty while account data is present.

**Cause:** A single `hubspot_lookup_object` field can only extract a limited set of properties. Different property types (account data vs engagement data) may require separate queries.

**Fix:** Use multiple `hubspot_lookup_object` fields on the same table, each pulling different property sets. Example: one lookup for account metadata and company ID, a second lookup for engagement metadata such as notes and last contacted date. Name them clearly (e.g., "Lookup Object (Engagement)").

---

## Slack notifications for all outreach reply types

**Symptom:** Slack channel flooded with notifications for bounces, OOO auto-replies, and other non-actionable events. Team ignores the channel.

**Cause:** Slack notification field runs on all webhook events without filtering by event type and reply category.

**Fix:** Gate Slack notifications with one `and` condition: the event is a reply (for example `event_type = EMAIL_REPLY`) and the reply category is neither a bounce nor an out-of-office. Reply category codes differ per outreach platform: read them from that platform's action schema or webhook payload instead of hardcoding them. Process OOO replies separately with the current AI/web-research action from `list_actions` to extract backup contacts. Only notify Slack for replies that need human attention.

---

## Missing two-hop CRM lookup for outreach reply context

**Symptom:** Slack notification for an outreach reply shows the email but no company name, LinkedIn URL, or HubSpot link. Sales reps can't act on the notification without manually looking up the contact.

**Cause:** Only did a HubSpot contact lookup but didn't chain a company lookup using the associated company ID.

**Fix:** After the contact lookup (by email), add a second `hubspot_lookup_object` field that looks up the company by the `associatedcompanyid` extracted from the first lookup. Gate the second lookup on the first being `isFound`. This gives you company name, domain, and other company-level context for rich Slack notifications.

---

## Hardcoded campaign routing with many fields

**Symptom:** Workflow has 8+ separate outreach enrollment fields with complex autoRunCondition gating for each language × persona combination. Maintenance nightmare when adding new dimensions.

**Cause:** Created one enrollment action per campaign instead of computing the campaign dynamically.

**Fix:** Use a formula chain to compute routing dimensions and combine them into a campaign ID:
1. Formula: infer language from email domain (`.it` → IT, else → EN)
2. Formula: classify job title into clusters (a short keyword list; a long or fuzzy title list goes to a gated `custom_ai_agent` instead, see "Formula used for open-ended semantic classification")
3. Formula: map Language × Cluster → campaign ID (lookup table in formula logic)
4. One add-to-campaign field with a per-row campaign: `campaignId: "{{campaign_id_formula}}"` with `campaignId__dynamic: true`. The lemlist, Instantly, HeyReach and Smartlead add-to-campaign actions all take it; use `baseloop_send_http_request` only for a platform with no built-in action.

This replaces N enrollment fields with 3 formulas + 1 enrollment field. Add new dimensions by adding formulas, not fields.

---

## One table per signal, persona or stage

**Symptom:** The plan has a table per signal type, persona or funnel stage, all with the same columns, and every fix has to be repeated in each.

**Cause:** Treated a category as a table instead of a column value.

**Fix:** Put the category in a column of one table and let gates read it. Two planned tables with the same columns are one table with a type column. Exceptions: one small import table per source that sends on to the shared table, and per-status tables whose downstream columns differ.

---

## Shortened or missing company website breaks enrichment chain

**Symptom:** AI agents, technology-stack detection, or HTTP requests fail or return data for the wrong company. Website-dependent fields produce garbage.

**Cause:** LinkedIn company profiles often have shortened URLs (bit.ly, linktr.ee, hubs.ly) or no website at all. Downstream actions use this invalid URL and either fail or resolve to the wrong site.

**Fix:** Add a website validation step as the first action after dedup. Use a `custom_ai_agent` with web search that resolves shortened URLs, finds missing websites, and validates the result matches the company name. AutoRunCondition: website is null OR contains bit.ly/linktr/hubs.ly. Use a formula to merge the found website with the original, prioritizing the AI-found one when the original is a shortened link.

---

## Web search turns off the system prompt

**Symptom:** A `custom_ai_agent` with web search ignores the seller profile, ICP definition or examples it was given, and its verdicts read generic.

**Cause:** With `enableWebSearch: true`, `custom_ai_agent` takes no system prompt and no examples: a seller profile or examples placed there are dropped.

**Fix:** Gather, then judge. One column with web search collects the evidence; the next, web search off, judges it with the profile in the system prompt. For open-ended, multi-source research, default to `parallel_research`.

---

## Junk replies polluting classification workflow

**Symptom:** Reply classification produces nonsensical categories. Positive reply counts are inflated. Sales reps get Slack alerts for non-replies.

**Cause:** Outreach platform webhooks include "untracked replies" — system-generated junk like DMARC aggregate reports, Jira auto-responses, mailing list digests, and bounce notifications that look like email replies but aren't.

**Fix:** Add a dedicated "Is Real Reply" AI agent field that runs only on `UNTRACKED_REPLIES` event type. Classify as "Pass" (human-authored, including OOO) vs "Junk" (system-generated). Gate the full reply classification workflow on this returning "Pass".

---

## Not feeding classification back to outreach platform

**Symptom:** Outreach platform keeps sending follow-up emails to leads that already replied negatively or are out of office. Double-messaging damages sender reputation.

**Cause:** Reply classification happens in Baseloop but the outreach platform doesn't know about it. The platform continues the sequence because its lead category wasn't updated.

**Fix:** After reply classification, write the category back to the outreach platform and pause the sequence. No built-in action updates a lead's category today, so this is a `baseloop_send_http_request` field that POSTs to the platform's API, set up with the user's consent because its key is stored in the field. Use a formula to map category names to the API's numeric IDs. Gate on reply classification being complete.

---

## Same email copy regardless of CRM usage

**Symptom:** Email mentions "connect your CRM" to a prospect who specifically uses HubSpot. Generic phrasing reduces reply rates when personalization is available.

**Cause:** AI-generated email copy uses the same value proposition text for all leads, ignoring known CRM usage data from technology-stack detection.

**Fix:** Don't put the value proposition in the AI prompt. Instead, have the AI generate the personalized parts (opener, question, greeting) and use a formula to assemble the final email with conditional text: "connect HubSpot" if Using CRM = HubSpot, "connect your CRM" otherwise. Formula-controlled precision for the value proposition, AI-controlled personalization for everything else.

---

## Company intelligence not propagated to contact tables

**Symptom:** AI email agents on the Outbound table have no ICP context. Emails are generic because the AI doesn't know what the prospect's company does.

**Cause:** Company research was done on the Companies Master List but not pulled into the contacts table.

**Fix:** On every contact-level table (Outbound, CRM Enrichment, Inbound), add a `lookup_single_record` back to the Companies Master List. Pull the company intelligence fields needed for personalization, such as overview, market, personas, signals, GTM motion, CRM usage, hiring, and traffic. Feed these fields into the AI email prompt so it can write informed, personalized emails.

---

## Guessing paths without inspecting fullValue

**Risk level:** HIGH — causes silent null values across entire fields, often not caught until downstream actions fail.

**Symptom:** Extraction field or inline `{{field.path}}` reference is empty despite source action succeeding.

**Cause:** Writing extraction fields or inline path references with assumed JMESPath expressions instead of inspecting the actual action output. Different actions return different JSON structures (e.g., `hubspot_create_object` returns flat `{"id": "..."}` while `hubspot_lookup_object` returns nested `{"results": [...]}`). There is no universal pattern, and resolution is fail-empty: a wrong path yields an empty value, never an error. See the build skill's nested-data rule for the mandatory inspection protocol.

**Prevention:**
1. Create the action field first
2. `run_field` on at least 1 row (Rung 1)
3. `get_row_details` with the action field's `fieldId` — read the complete `fullValue`
4. Derive the path from the actual JSON structure you see
5. THEN wire the inline reference or create the extraction field

**If you already made this mistake:**
1. `get_row_details` on a successful row to see the real `fullValue`
2. Fix the path in place, never delete and recreate: `update_field` with the new `extractionPath` on the same extraction field (id, name and every reference survive, and existing rows re-extract in the same call; check `matchedRows` and `sample`), or `update_field` on the consumer whose inline `{{field.path}}` is wrong
3. Never re-run the source field to fill an extraction column. A consumer action field that already ran on the empty value: re-run its test row (`custom_range` with its row ID and `skipCellsWithData: false`), and its other completed rows only when the user asks, after stating how many rows will be charged again

---

## HubSpot enum property mismatch

**Risk level:** MEDIUM — causes row-level failures that block CRM sync.

**Symptom:** `INVALID_OPTION` error on HubSpot create/update. Error message lists allowed values in SCREAMING_SNAKE_CASE.

**Cause:** Mapping a field like `industry` or `lifecyclestage` with human-readable values ("Computer Software", "IT Services and IT Consulting") instead of HubSpot's internal enum format (SCREAMING_SNAKE_CASE). This happens when sourcing data from external enrichment providers — their format will NOT match HubSpot's enum format.

**Prevention:**
- Use `resolve_action_options` to check valid enum values before mapping
- When sourcing data from external enrichment, assume the format will NOT match HubSpot's enum format
- Omit enum fields from automated mappings unless you can guarantee format conversion

**If you already made this mistake:**
- `update_field` to remove the enum field from fieldMapping
- Re-run the failed rows: `run_field` with `runAction: "custom_range"`, `selectedIds` set to the `failedRowIds` from `get_run_status` and `skipCellsWithData: false` (allowed on named rows, so the retry runs even when a failed row kept its old value)

---

## Cascading field name changes when recreating extraction fields

**Risk level:** MEDIUM — silently breaks downstream formulas and action templates.

**Symptom:** After deleting and recreating an extraction field, downstream formulas return empty.

**Cause:** Deleting and recreating an extraction field generates a new `name` (e.g., `lookup_company_hs_id_zefz` instead of `lookup_company_hs_id_abc1`). Any formula or action template referencing `{{old_name}}` now resolves to null — silently, without erroring.

**Prevention:** Never delete and recreate an extraction field to fix its path: `update_field` with the new `extractionPath` on the same field keeps its id, name and every reference, and re-extracts existing rows in the same call. Recreate only a field that truly has to be recreated (for example a non-text extraction column, whose type cannot change), and then:
1. `get_table_schema` — note the new field's `name`
2. Search all downstream fields for references to the old name
3. `update_field` on each downstream field to replace old name with new name

**If you already made this mistake:**
- `get_table_schema` to find the new name
- `update_field` on every downstream field that referenced the old name
- Re-run the affected fields on the test row: `custom_range` with its ID and `skipCellsWithData: false` (failed cells alone need no flag). Re-run the other completed rows only when the user asks, after stating how many rows will be charged again

---

## Using boolean/number/select types for output fields or extraction fields

**Risk level:** HIGH — causes silent null values and broken autoRunConditions.

**Symptom:** Extraction columns show null or silently coerced values. Downstream `autoRunCondition` with `=` operator fails because it's comparing against a boolean instead of a string.

**Cause:** Created an extraction field with a type other than `text` (e.g., `"boolean"`, `"number"`, `"select"`).

**Why this breaks:**
- Boolean fields coerce AI output. If the AI returns `"Yes"` instead of `true`, the boolean field stores `null`.
- Number fields reject non-numeric AI output silently.
- Select fields reject values not in the predefined options list.
- autoRunConditions using `=` or `contains` behave differently on booleans vs text strings.
- Text fields accept ANY value the AI or API returns, making them the only safe default.

**Fix:** Delete the wrong-type field, recreate with `type: "text"`. Update any downstream references to the new field name.

**Prevention:** Every extraction field must use `type: "text"` (`create_field` always creates extraction columns as text), regardless of whether the data "looks like" a boolean, number, or enum. A `custom_ai_agent` output field is different: `outputFields` may declare a `columnType` (`select` with `options`, `checkbox`, `number`) to constrain the model's answer, and that is fine.

---

## Custom AI Agent schema rejected at save time

**Symptom:** Saving a `custom_ai_agent` with `outputFormat: "jsonSchema"` fails with `Schema property "properties.required" must be an object describing that field. "required" belongs beside "properties", not inside it.` (or the same message for a nested path such as `properties.rows.items.properties.required`).

**Cause:** `required` or `additionalProperties` sits inside `properties`, where every value must be the schema of one field.

**Fix:** Move `required` and `additionalProperties` beside `properties`, and make every entry under `properties`, at every depth (inside `items` too), a schema object.

---

## Attempting to modify system fields

**Symptom:** `update_field` returns an error: "System fields (Created At, Updated At, Created By) are read-only and cannot be modified."

**Cause:** Tried to update or reconfigure a system-generated field. Every table has three read-only system fields: Created At, Updated At, and Created By.

**Fix:** These fields cannot be modified via `update_field`. If you need custom timestamp or user tracking, create a separate field (e.g., a formula that references the system field value).

**Prevention:** Before calling `update_field`, check `get_table_schema` — system fields have `isSystem: true`. Skip them in any batch update logic.

---

## Copying from a table with Input source creates plain fields on destination

**Symptom:** User asks to "copy data from Table A to Table B." Table A receives its data via Send to Table (Input source) and has extraction fields. The AI creates Send to Table from A → B but creates plain text fields on Table B instead of replicating the Input + extraction field structure. Table B ends up with empty or disconnected fields.

**Cause:** The AI sees Table A's extraction fields and tries to recreate them on Table B, but since Table B has no Input source, it falls back to creating plain primitive fields. Plain fields have no `extractorFieldId` or `extractionPath`, so they can't extract data from the incoming Send to Table payload.

**Fix (structure replication, copy Table A's schema to Table B):** `duplicate_table` on Table A. It copies any table's fields, the source included, with no rows, as "<name> (Copy)" in the same workspace. Extraction paths show only in `get_table_schema` with the field's `fieldId`; the table-level call omits them.

**Fix (new pipeline — set up Send to Table from A → B where you don't know the payload structure):**
1. Create Table B as an empty table, without fields
2. Create Send to Table on Table A → Table B with one mapping key per value Table B needs (`fieldMappings` referencing Table A's field names)
3. Run Send to Table on 1 row: it creates Table B's Input field and one column per mapping key
4. `get_row_details` on the Table B row to check the values arrived
5. To bring over another value, add a mapping key to the send (its value may carry a fullValue path), never a column by hand

**Prevention:** To copy a table's structure, use `duplicate_table`. For a Send to Table copy, leave the destination without fields and add mapping keys to the send, never columns by hand. Never create plain fields to hold data that should come from an Input source.

**A source cannot be added later.** For a table with an import or webhook source (HubSpot import, LinkedIn import, webhook, etc.), use `duplicate_table`, or create a new table with the same `sourceField`: `create_field` rejects source action keys, so a table created without one never gains one.

---

## Modifying an existing table without confirming with the user

**Symptom:** User asks to build a workflow or add fields. The AI finds a table in the workspace with a similar name or schema (e.g., "Companies", "Contacts") and starts adding fields or modifying it. The table belongs to a different workflow or contains production data the user didn't intend to modify.

**Cause:** The AI assumes an existing table is the right target because it looks relevant — similar name, matching entity type, or compatible fields. It skips confirmation and starts building.

**Fix:** Always ask the user which table to work in before creating or modifying fields. If the user's request is ambiguous (e.g., "enrich my companies"), list the tables in the workspace and ask which one they mean. Never assume a table is the correct target just because it has a similar name or schema.

**Prevention:** When `list_tables` or `get_table_schema` returns existing tables that look like a match, confirm with the user before modifying. The only exception is when the user explicitly names the table or there is only one table in the workspace and the request clearly applies to it.
