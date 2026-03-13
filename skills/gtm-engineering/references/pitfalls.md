# Common Pitfalls

Known failure modes when building Baseloop workflows. Each entry: symptom, cause, fix. Sourced from production workflows.

**For runtime error diagnosis** (field failed, unexpected output, data not flowing), see [error-patterns.md](./error-patterns.md).

---

## Referencing action field output instead of extracting fullValue

**Symptom:** Downstream action receives `"Found"`, `"Sent"`, or `"Created"` instead of the actual data it needs (e.g., HubSpot object ID). HubSpot Update rejects the recordId. HTTP Request sends wrong body.

**Cause:** Used `{{action_field_name}}` directly. `{{field_name}}` resolves to display output, not `fullValue`. See SKILL.md "Action output vs fullValue" for details and extraction paths.

**Fix:** Create a data extraction field (`extractorFieldId` + `extractionPath`) and reference that instead.

**Prevention:** Before using `{{field_name}}` for any action field, ask: "Does this field's display output contain the actual value I need, or is it just a status string?" If it's a status string (Found, Sent, etc.), you need extraction.

---

## Running all rows without testing first

**Symptom:** Hundreds of credits burned, garbage data in CRM, API errors discovered only after all rows processed.

**Cause:** Called `run_field` without `runAction` (runs ALL rows), or used `first_hundred` on a table with <100 rows.

**What happened in practice:** Agent created a field, immediately ran it on all 50 rows (~6 credits each), then created the next field and ran that on all 50 rows too (~8 credits each). By the time a HubSpot API error was discovered at the final step, 540+ credits were spent and 71 contacts had been created in the CRM — including duplicates and invalid entries.

**Fix:** Follow the Scaling Ladder (see SKILL.md). Never call `run_field` without `runAction`. Always: `first_one` → `first_ten` → full scale (user approval required). For tables with >100 rows, use `list_row_ids` to paginate through all row IDs, then batch them through `run_fields` with `rowIds` (max 100 per batch). Use `hasNotRun` or `hasError` filters to only target unprocessed rows.

**Prevention:** Every `run_field` call must include `runAction`. Watch for `first_hundred` on small datasets — it runs everything if the table has <100 rows. For large tables, always use the `list_row_ids` → batch pattern instead of relying on `first_hundred`.

---

## Send to Table: pre-creating fields in destination

**Symptom:** Duplicate fields (e.g., "Company Name" and "Company Name (1)") in the destination table.

**Cause:** Created fields in the destination table before configuring Send to Table. Send to Table auto-creates fields from fieldMappings keys.

**Fix:** Always start with an empty destination table created via `create_table` with no fields. The field mappings define the fields.

---

## Template resolution in field mappings

**Symptom:** Send to Table field mapping values are empty or null in the destination.

**Cause:** Used `{{field_name}}` syntax in fieldMappings. The template engine (`variableService`) resolves `{{}}` to actual cell values before the action runs, so the action receives the resolved value instead of the field reference.

**Fix:** Use plain field names in `send_row` mode (e.g., `company_name_abc`). In `send_for_each_item` mode, use `column:field_name` for parent row fields. Never wrap in `{{}}`.

---

## Re-running AI fields upstream

**Symptom:** Different results than before, orphan rows in downstream tables, data inconsistency.

**Cause:** Re-ran an upstream Custom AI Agent field that already had correct data. AI is non-deterministic — it produces different results each run. Downstream Send to Table then creates new rows (from different AI output) while old rows remain.

**Fix:** Only re-run the field whose *configuration* changed. Never re-run upstream fields to fix a downstream issue.

---

## Source action not running after create_table

**Symptom:** Table created with source field but contains no data rows.

**Cause:** `create_table` with `sourceField` creates the table and source field but does NOT auto-trigger the import.

**Fix:** After creating the table:
1. Create a placeholder row: `create_rows` with `[{}]`
2. Run the source field: `run_field` with `skipCellsWithData: false`
3. Verify with `list_rows`

---

## Missing autoRunCondition gating

**Symptom:** Expensive actions (AI, enrichment) run on rows that should have been filtered, wasting credits.

**Cause:** Did not set `autoRunCondition` to gate on upstream results.

**Fix:** Always gate expensive actions on their prerequisites being non-null or meeting a condition. Example: gate `custom_ai_agent` on `enrich_company` being `notNull`. Gate `hubspot_create_object` on `hubspot_lookup_object` being `isNotFound`.

---

## Wrong sourceArrayPath in send_for_each_item

**Symptom:** Send to Table creates no rows or creates rows with wrong data in `send_for_each_item` mode.

**Cause:** `sourceArrayPath` doesn't match the actual JSON structure of the source field's output.

**Fix:**
- For `li_find_people_at_company`: use `sourceArrayPath: "fullValue"` (the root value is the array)
- For `custom_ai_agent` with JSON Schema: use the property name of the array (e.g., `"founders"` if the schema has `"founders": { "type": "array", ... }`)
- Check the actual output with `get_row_details` (with fieldId) to see the fullValue structure

---

## Missing parent IDs in CRM sync

**Symptom:** Contacts created in HubSpot without company association (orphan records).

**Cause:** Did not pass the company's HubSpot object ID when creating contacts.

**Fix:** In the Send to Table fieldMappings from companies to contacts, include the company HubSpot ID using `column:` prefix (e.g., `{ "key": "Company HubSpot ID", "value": "column:hs_object_id_xyz" }`). Then in the `hubspot_create_object` field on the contacts table, map this field to HubSpot's association property.

---

## Updating contact company as flat text without Company object

**Symptom:** Contact's company field is updated in HubSpot, but the contact has no Company object association. HubSpot's company-level reporting, deal pipelines, and ABM features show incomplete data. Sales reps can't navigate from the contact to the company record.

**Cause:** Workflow detects a job change and pushes the new company name as a text field on the contact, but never creates the Company object in HubSpot or associates the contact with it.

**Fix:** Any workflow that updates a contact's company after a job change must include the full company chain:

1. **Resolve company domain** — if `enrich_contact` didn't return `companyWebsite`, add a `custom_ai_agent` with web search (~4 credits) to find the company domain from the company name. Gate on: email found AND companyWebsite is null. Skip if companyWebsite is already populated.
2. **HubSpot Lookup Company** — `hubspot_lookup_object` for companies, filtered by domain (prefer `companyWebsite` from enrichment, fall back to AI-resolved domain). Gate on: domain is not null.
3. **HubSpot Create Company** — `hubspot_create_object` for companies with name, domain, industry. Gate on: lookup = `isNotFound`.
4. **Consolidate Company ID** — use a formula or extraction field to get the company HubSpot ID from whichever source produced it (lookup or create).
5. **HubSpot Update Contact** — `hubspot_update_object` with `associateWithObject: true`, `associatedObjectType: "companies"`, and `associatedObjectHubspotId` pointing to the consolidated company ID.

**Prevention:** Before designing any job-change or company-enrichment workflow, ask: "Does this workflow create/link the Company object, or just update flat text?" If the answer is flat text, the workflow is incomplete.

---

## HubSpot property name mismatch

**Symptom:** HubSpot create/update fails or ignores fields silently.

**Cause:** Used display names instead of internal property names (e.g., "Lead Status" instead of `hs_lead_status`).

**Fix:** Always use `resolve_action_options` to get valid HubSpot property internal names. Never guess property names.

---

## Running the wrong field after a config fix

**Symptom:** Fixed a field's config but the old (wrong) data persists.

**Cause:** Ran `run_field` with default `skipCellsWithData: true`, which skipped cells that already had data from the previous (wrong) configuration.

**Fix:** After fixing a field config with `update_field`, re-run with `skipCellsWithData: false` to overwrite existing data. But only on that specific field — not upstream fields.

---

## Formula field not evaluating correctly

**Symptom:** Formula returns unexpected values or errors.

**Cause:** Formula references field names that don't exist or uses wrong syntax.

**Fix:** Always use `preview_formula` to test the formula before creating the field. The preview shows sample evaluations on actual row data. Iterate until the output looks correct, then pass the same prompt to `create_field`.

---

## Missing LinkedIn URL blocks entire enrichment chain

**Symptom:** RapidAPI enrichment fails or returns empty — the entire qualification chain stalls.

**Cause:** Source data (HubSpot import) doesn't always include LinkedIn company URLs. Without a LinkedIn slug, the RapidAPI HTTP request can't run.

**Fix:** Add a `custom_ai_agent` field as a "LinkedIn URL Finder" early in the chain. Give it the company name and domain, let it search for the LinkedIn URL. Gate subsequent enrichment on this field being `notNull`. This is a real pattern used in content magnet workflows.

---

## LinkedIn search returns "Not Found" for non-LinkedIn audiences

**Symptom:** `li_find_people_at_company` returns "Not Found" for a large percentage of rows. The workflow dead-ends for those companies — no contacts found, no downstream processing.

**Cause:** The target group isn't active on LinkedIn. Common with small businesses, non-tech industries (e.g., local services, agriculture, construction), or specific regions with low LinkedIn adoption.

**Fix:** Add a `custom_ai_agent` field with `enableWebSearch: true` and `outputFormat: "jsonSchema"` as a fallback. Gate it on the Find People field being `isNotFound`. The AI searches company websites, team pages, Crunchbase, press releases, and other public sources. Use the same Send to Table `send_for_each_item` pattern to route results to the same destination table as the LinkedIn results. Both paths converge into the same downstream workflow.

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

## No blocklist check before enrichment

**Symptom:** Credits wasted enriching companies that are already customers or churned accounts.

**Cause:** Workflow runs enrichment on every imported company without checking against existing CRM data.

**Fix:** Maintain a "Master CRM Blocklist" table with closed-won + churned companies. Add a `lookup_single_record` field as the **first gate** before any enrichment. Gate all downstream fields on blocklist lookup being `isNotFound`. This is one of the cheapest checks you can run.

---

## AND vs OR confusion in filters and autoRunConditions

**Symptom:** Filter shows no rows when it should show some (or shows too many). AutoRunCondition skips rows that should execute, or runs on rows that should be skipped.

**Cause:** AND and OR combinators are commonly mixed up. Key rules:

1. **AND** = ALL rules must be true. Use for narrowing: "must be Active AND must be in USA."
2. **OR** = AT LEAST ONE rule must be true. Use for alternatives: "Country = USA OR Country = Canada."
3. **Multiple autoRunCondition objects are always AND'd together.** To get OR logic between rules, put them in a **single** condition with `combinator: "or"`. Creating separate conditions for each rule will AND them.
4. **Default combinator is "and"** if not explicitly set. Adding rules without setting the combinator gives AND behavior.

**Fix:** Before creating an autoRunCondition, think: "Do ALL of these need to be true (AND), or does at least one need to be true (OR)?"

- Same field, multiple values (e.g., Country = USA or Canada): **single condition, combinator: "or"**
- Different fields, all required (e.g., Status = Active AND Score > 80): **single condition, combinator: "and"** (or separate conditions, since they're AND'd)
- Mixed logic (e.g., (Country = USA OR Country = Canada) AND Status = Active): **two conditions** — one with combinator "or" for countries, one for status (multiple conditions are AND'd)

**Nested combinator groups** are fully supported. You can nest rule groups for complex logic like `(A OR B) AND (C OR D)`:
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
| `hasNoError` | has no error | Filter rows where field succeeded |
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
| `isDatePreset` | is | string | Relative date preset. Values: `today`, `yesterday`, `thisWeek`, `lastWeek`, `thisMonth`, `lastMonth`, `last7Days`, `last30Days`, `last90Days` |
| `between` | is between | object `{start, end}` | Absolute date range (ISO date strings) |

**Common autoRunCondition patterns:**
- Gate enrichment on upstream being populated: `operator: "notNull"`, field = upstream field
- Gate CRM create on lookup miss: `operator: "isNotFound"`, field = lookup field
- Gate on qualification result: `operator: "="`, field = AI qualifier field, value = "Qualified"
- Gate on multiple alternatives: `combinator: "or"`, rules with `operator: "="` for each valid value

---

## Downstream table not auto-processing new rows

**Symptom:** Send to Table creates rows in the destination table, but action fields there don't run.

**Cause:** `autoRunOnNewRow` is `false` on the destination table (the default).

**Fix:** After verifying the workflow works end-to-end, enable `autoRunOnNewRow: true` on tables that receive data via Send to Table. This way, when new rows arrive, all action fields with `autoRunEnabled: true` cascade automatically. Keep `autoRunOnNewRow: false` on source/enrichment tables that you run manually or on a schedule.

---

## Not writing engagement notes for disqualification reasons

**Symptom:** CRM records have no context on why a company wasn't pursued. Sales reps can't tell why an account was skipped.

**Cause:** Workflow only writes HubSpot engagement notes for qualified companies, not for disqualified ones.

**Fix:** Create separate `hubspot_create_engagement` fields for each disqualification reason, each gated on the specific failure condition. For example:
- "NOTE: FTE Disqualified" — gated on staff qualification = "Disqualified"
- "NOTE: Country Count Disqualified" — gated on country qualification = "Disqualified"
- "NOTE: LinkedIn Not Found" — gated on LinkedIn URL being `isNull`

Each note should include the specific data that triggered disqualification (e.g., "Staff count: 45, required: 200+"). This creates a full audit trail in the CRM.

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

**Symptom:** Credits wasted enriching and reaching out to accounts that sales reps already contacted last week.

**Cause:** Workflow doesn't check when the account was last touched in HubSpot before enriching.

**Fix:** After the `hubspot_lookup_object` field, add a "Contacted Within 30 Days" formula that checks `hs_last_contacted_date`. Gate downstream enrichment fields on this being "false" or empty. This prevents redundant work on warm accounts.

---

## Domain mismatch between input and RapidAPI

**Symptom:** HubSpot lookup finds no match even though the company exists in CRM. Or enrichment data is for a subsidiary instead of the parent company.

**Cause:** The LinkedIn company page found by RapidAPI has a different domain than the input (common with regional sites like `.fr` vs `.com`, subsidiaries, or rebrands).

**Fix:** Do two HubSpot lookups — one on the input domain, one on the RapidAPI-discovered domain. Merge results with a formula that picks whichever found a match. Create separate Update/Create/Engagement fields for each lookup path. This is a proven production pattern.

---

## No email verification before routing

**Symptom:** Outreach campaigns have high bounce rates. Email campaigns include freemail addresses or invalid emails.

**Cause:** Workflow routes leads to outreach without checking email quality first.

**Fix:** Add a `baseloop_send_http_request` field calling an email verification API (e.g., MillionVerifier) before routing. Check the response for freemail, quality, and validity. Gate outreach routing on email quality being acceptable. Write a "NOTE: Bad Email" HubSpot engagement note for failed verifications so sales reps know.

---

## Cloned workspace missing source-specific tags

**Symptom:** Downstream systems (CRM, outreach) can't distinguish which campaign batch a record came from.

**Cause:** Cloned a template workspace but didn't update the "Table Source" or campaign tag fields.

**Fix:** Always include a "Table Source" field (either a formula returning a literal string, or an Input field) that identifies the batch. Examples: "TAM List (Data Provider)", "LinkedIn Followers", "Industry Report Q1 2026". Update this field in each workspace clone before running the workflow.

---

## Single HubSpot lookup returning incomplete data

**Symptom:** Missing CRM data fields despite the record existing in HubSpot. Or engagement data is empty while account data is present.

**Cause:** A single `hubspot_lookup_object` field can only extract a limited set of properties. Different property types (account data vs engagement data) may require separate queries.

**Fix:** Use multiple `hubspot_lookup_object` fields on the same table, each pulling different property sets. Example: one lookup for Account Tier + Assigned AE + Company ID, a second lookup for Notes Last Contacted + Last Modified Date. Name them clearly (e.g., "Lookup Object (Engagement)").

---

## Slack notifications for all outreach reply types

**Symptom:** Slack channel flooded with notifications for bounces, OOO auto-replies, and other non-actionable events. Team ignores the channel.

**Cause:** Slack notification field runs on all webhook events without filtering by event type and reply category.

**Fix:** Gate Slack notifications with multiple conditions: `event_type = EMAIL_REPLY` AND `reply_category != 4` (bounces) AND `reply_category != 6` (OOO). Process OOO replies separately (e.g., with Perplexity AI to extract backup contacts). Only notify Slack for replies that need human attention.

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
2. Formula: classify job title into clusters (keyword matching)
3. Formula: map Language × Cluster → campaign ID (lookup table in formula logic)
4. One `baseloop_send_http_request` with `{{campaign_id_formula}}` in the URL path

This replaces N enrollment fields with 3 formulas + 1 HTTP request. Add new dimensions by adding formulas, not fields.

---

## Shortened or missing company website breaks enrichment chain

**Symptom:** AI agents, BuiltWith, or HTTP requests fail or return data for the wrong company. Website-dependent fields produce garbage.

**Cause:** LinkedIn company profiles often have shortened URLs (bit.ly, linktr.ee, hubs.ly) or no website at all. Downstream actions use this invalid URL and either fail or resolve to the wrong site.

**Fix:** Add a website validation step as the first action after dedup. Use a `custom_ai_agent` with web search that resolves shortened URLs, finds missing websites, and validates the result matches the company name. AutoRunCondition: website is null OR contains bit.ly/linktr/hubs.ly. Use a formula to merge the found website with the original, prioritizing the AI-found one when the original is a shortened link.

---

## Junk replies polluting classification workflow

**Symptom:** Reply classification produces nonsensical categories. Positive reply counts are inflated. Sales reps get Slack alerts for non-replies.

**Cause:** Outreach platform webhooks include "untracked replies" — system-generated junk like DMARC aggregate reports, Jira auto-responses, mailing list digests, and bounce notifications that look like email replies but aren't.

**Fix:** Add a dedicated "Is Real Reply" AI agent field that runs only on `UNTRACKED_REPLIES` event type. Classify as "Pass" (human-authored, including OOO) vs "Junk" (system-generated). Gate the full reply classification workflow on this returning "Pass".

---

## Not feeding classification back to outreach platform

**Symptom:** Outreach platform keeps sending follow-up emails to leads that already replied negatively or are out of office. Double-messaging damages sender reputation.

**Cause:** Reply classification happens in Baseloop but the outreach platform doesn't know about it. The platform continues the sequence because its lead category wasn't updated.

**Fix:** After reply classification, add a `baseloop_send_http_request` field that POSTs to the outreach platform API to update the lead's category and pause the sequence. Use a formula to map category names to the API's numeric IDs. Gate on reply classification being complete.

---

## Same email copy regardless of CRM usage

**Symptom:** Email mentions "connect your CRM" to a prospect who specifically uses HubSpot. Generic phrasing reduces reply rates when personalization is available.

**Cause:** AI-generated email copy uses the same value proposition text for all leads, ignoring known CRM usage data from BuiltWith/tech stack detection.

**Fix:** Don't put the value proposition in the AI prompt. Instead, have the AI generate the personalized parts (opener, question, greeting) and use a formula to assemble the final email with conditional text: "connect HubSpot" if Using CRM = HubSpot, "connect your CRM" otherwise. Formula-controlled precision for the value proposition, AI-controlled personalization for everything else.

---

## Company intelligence not propagated to contact tables

**Symptom:** AI email agents on the Outbound table have no ICP context. Emails are generic because the AI doesn't know what the prospect's company does.

**Cause:** Company research (Target Personas, Core Intelligence, Prospecting Signals) was done on the Companies Master List but not pulled into the contacts table.

**Fix:** On every contact-level table (Outbound, CRM Enrichment, Inbound), add a `lookup_single_record` back to the Companies Master List. Pull all intelligence fields (Core Intelligence, Target Companies, Target Personas, Prospecting Signals, Go-to-market Motion, Using CRM, Hiring Roles, Traffic, etc.). Feed these fields into the AI email prompt so it can write informed, personalized emails.

---

## Guessing extraction paths without inspecting fullValue

**Risk level:** HIGH — causes silent null values across entire fields, often not caught until downstream actions fail.

**Symptom:** Extraction field is empty despite source action succeeding.

**Cause:** Creating extraction fields with assumed JMESPath expressions instead of inspecting the actual action output. Different actions return different JSON structures (e.g., `hubspot_create_object` returns flat `{"id": "..."}` while `hubspot_lookup_object` returns nested `{"results": [...]}`). There is no universal pattern. See SKILL.md "Extraction Field Rule" for the mandatory inspection protocol.

**Prevention:**
1. Create the action field first
2. `run_field` on at least 1 row (Rung 1)
3. `get_row_details` with the action field's `fieldId` — read the complete `fullValue`
4. Derive the `extractionPath` from the actual JSON structure you see
5. THEN create the extraction field

**If you already made this mistake:**
1. `get_row_details` on a successful row to see the real `fullValue`
2. Delete the wrong extraction field
3. Recreate with the correct path
4. Update any downstream fields that referenced the old field name (see "Cascading name changes" below)
5. Re-run with `skipCellsWithData: false`

---

## HubSpot enum property mismatch

**Risk level:** MEDIUM — causes row-level failures that block CRM sync.

**Symptom:** `INVALID_OPTION` error on HubSpot create/update. Error message lists allowed values in SCREAMING_SNAKE_CASE.

**Cause:** Mapping a field like `industry` or `lifecyclestage` with human-readable values ("Computer Software", "IT Services and IT Consulting") instead of HubSpot's internal enum format (SCREAMING_SNAKE_CASE). This happens when sourcing data from external enrichment (LinkedIn, Apollo, etc.) — their format will NOT match HubSpot's enum format.

**Prevention:**
- Use `resolve_action_options` to check valid enum values before mapping
- When sourcing data from external enrichment, assume the format will NOT match HubSpot's enum format
- Omit enum fields from automated mappings unless you can guarantee format conversion

**If you already made this mistake:**
- `update_field` to remove the enum field from fieldMapping
- Re-run failed rows with `skipCellsWithData: false`

---

## Cascading field name changes when recreating extraction fields

**Risk level:** MEDIUM — silently breaks downstream formulas and action templates.

**Symptom:** After deleting and recreating an extraction field, downstream formulas return empty.

**Cause:** Deleting and recreating an extraction field generates a new `name` (e.g., `lookup_company_hs_id_zefz` instead of `lookup_company_hs_id_abc1`). Any formula or action template referencing `{{old_name}}` now resolves to null — silently, without erroring.

**Prevention:** After recreating any field:
1. `get_table_schema` — note the new field's `name`
2. Search all downstream fields for references to the old name
3. `update_field` on each downstream field to replace old name with new name

**If you already made this mistake:**
- `get_table_schema` to find the new name
- `update_field` on every downstream field that referenced the old name
- Re-run affected fields with `skipCellsWithData: false`

---

## Using boolean/number/select types for output fields or extraction fields

**Risk level:** HIGH — causes silent null values and broken autoRunConditions.

**Symptom:** AI agent output fields show null or unexpected values. Extraction fields silently coerce data. Downstream `autoRunCondition` with `=` operator fails because it's comparing against a boolean instead of a string.

**Cause:** Created an extraction field with a type other than `text` (e.g., `"boolean"`, `"number"`, `"select"`).

**Why this breaks:**
- Boolean fields coerce AI output. If the AI returns `"Yes"` instead of `true`, the boolean field stores `null`.
- Number fields reject non-numeric AI output silently.
- Select fields reject values not in the predefined options list.
- autoRunConditions using `=` or `contains` behave differently on booleans vs text strings.
- Text fields accept ANY value the AI or API returns, making them the only safe default.

**Fix:** Delete the wrong-type field, recreate with `type: "text"`. Update any downstream references to the new field name.

**Prevention:** Every output field and every extraction field must use `type: "text"`. No exceptions, regardless of whether the data "looks like" a boolean, number, or enum.

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

**Fix (structure replication — copy Table A's schema to Table B):**
1. `get_table_schema(tableA)` — read the Input field and all extraction fields with their `receivesDataFrom.extractionPath` values
2. Create Table B as an empty table
3. Create an Input field on Table B: `create_field` with `type: "input"`
4. For each extraction field on Table A, create a matching field on Table B: `create_field` with `type: "text"`, `extractorFieldId` = Table B's new Input field ID, `extractionPath` = same path from Table A's schema

**Fix (new pipeline — set up Send to Table from A → B where you don't know the payload structure):**
1. Create Table B as an empty table
2. Create an Input field on Table B: `create_field` with `type: "input"`
3. Create Send to Table on Table A → Table B with `fieldMappings` referencing Table A's field names
4. Run Send to Table on 1 row so data arrives in Table B's Input
5. `get_row_details` on the Table B row with the Input field's `fieldId` to see the `fullValue` structure
6. Create extraction fields on Table B that extract from Table B's Input field using paths derived from the actual `fullValue`

**Prevention:** When `get_table_schema` shows a source table has an Input field with extraction fields, always replicate the same pattern on the destination: Input field first, then extraction fields from it. Never create plain fields to hold data that should come from an Input source.

**Important — this only works for Input sources.** If the source table uses a different source type (HubSpot import, LinkedIn import, webhook, etc.), you cannot replicate that source via `create_field` — source actions can only be created via `create_table` with `sourceField`. Tell the user the table structure can't be copied and they need to create a new table from scratch with the same source configuration.

---

## Modifying an existing table without confirming with the user

**Symptom:** User asks to build a workflow or add fields. The AI finds a table in the workspace with a similar name or schema (e.g., "Companies", "Contacts") and starts adding fields or modifying it. The table belongs to a different workflow or contains production data the user didn't intend to modify.

**Cause:** The AI assumes an existing table is the right target because it looks relevant — similar name, matching entity type, or compatible fields. It skips confirmation and starts building.

**Fix:** Always ask the user which table to work in before creating or modifying fields. If the user's request is ambiguous (e.g., "enrich my companies"), list the tables in the workspace and ask which one they mean. Never assume a table is the correct target just because it has a similar name or schema.

**Prevention:** When `list_tables` or `get_table_schema` returns existing tables that look like a match, confirm with the user before modifying. The only exception is when the user explicitly names the table or there is only one table in the workspace and the request clearly applies to it.
