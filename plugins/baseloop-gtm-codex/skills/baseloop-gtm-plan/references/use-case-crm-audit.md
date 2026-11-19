# CRM audit

Use this when the user asks for an audit or health check of a connected HubSpot portal ("audit my CRM", "CRM health check", "check my HubSpot", "how many contacts are missing emails?"). It plans a free audit that reads the CRM, counts the gaps Baseloop can fix, scores them, and hands each fix to the recipe that builds it. Quick scan by default, deep sweep on request.

## 1. The job

Sweep a connected CRM for the problems Baseloop can actually fix, enrichment gaps and duplicates, score them by impact and severity, and finish with a ranked report and remediation that hands off to a normal plan and build.

Every axis exists because a Baseloop capability can close it: company firmographics (`enrich_company`), contact data (`enrich_contact`), the email and phone waterfalls (`waterfall_email_enrichment`, `waterfall_phone_enrichment`), people finding at companies (`li_find_people_at_company`), and duplicates flagged for a person to merge. By default, do not audit generic CRM housekeeping Baseloop cannot fix (lifecycle stages, ownership, stale lists). When the user asks for one, count it ("Counts outside the audit" in section 6) and say Baseloop has no fix to hand off. Dead or bouncing addresses are not an audit axis either, but they have a fix: hand off to [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) "2.3 Dead email audit".

The recipe is written for HubSpot, whose criteria imports report an exact match count. Salesforce, Dynamics 365, Pipedrive and Attio have imports too (`list_actions` names them), but their filters, record limits and property names differ: plan those from their `get_action_schema` guides, not from this file.

## 2. What the audit builds, and what it never writes

These tools have no CRM read tool, so the audit reads HubSpot by importing it into Baseloop tables, one per object. It writes nothing to the CRM, and everything it builds bills no credits: the HubSpot imports, formulas, `lookup_multiple_records` and `hubspot_lookup_object` are free (confirm with `creditCostHint` in `list_actions`). The plan specifies the audit tables, their columns and the run order below; the build skill builds and runs them; the report is written once the imports have landed and every flag is filled. The audit tables stay as the dated record of the numbers, and `delete_table` moves them to the Trash for 30 days.

Every fix is a separate plan the user chooses to build. Describe only what ran: the audit created tables and read the CRM, it never wrote to it, and no fix has run.

## 3. Mode selection: never open with a questionnaire

Pick the mode from what the user already said and plan it immediately. Do not ask scoping questions up front: no "full or partial?", no "which checks?", no "who is the report for?".

- **Quick scan (default).** Generic asks ("audit my CRM", "CRM health check", "check my HubSpot") and anything time-boxed ("quick", a demo) get the quick scan: one capped import per object, the core gap flags, headline numbers. Offer the deep sweep in one sentence at the end.
- **Deep sweep.** Only when the user asked for a full, deep or thorough audit, or accepts the offer after a quick scan: the whole object and every axis below, duplicates included.
- **Named scope.** When the user named concerns ("how many contacts are missing emails?"), cover exactly those and nothing else. A simple count is a named-scope probe (section 5). Duplicates named inside a quick request ("quick check, look for duplicates") run the duplicate columns on the quick scan's table, reported as the undercount a slice gives; they are never deferred to a deep sweep the user did not ask for. A named concern this audit never covers is counted where a property holds it and answered in one line as having no Baseloop fix, never silently dropped and never promised for later.

Ask only what blocks the build: which HubSpot connection, when more than one is connected; and, for a deep sweep of an object over 10,000 records, which HubSpot list holds every record. These tools cannot create a HubSpot list, so the user makes an all-records list in HubSpot when none exists.

Report depth defaults to a hands-on operator brief: numbers first, tight prose. Adapt only if the user volunteered who the report is for.

Timing: imports land in 10 to 30+ minutes, and `processing` with 0 rows is normal. `wait_for_run` returns after at most 2 minutes and a timeout is not a failure; never re-run or cancel a healthy import. The quick scan is one small import per object; a deep sweep takes as long as the whole object takes to import.

## 4. Connection preflight

1. `get_connected_platforms`. No HubSpot connection: tell the user to connect HubSpot on the Integrations page, or with `baseloop integrations connect hubspot` in their terminal, and plan nothing further.
2. `list_actions`: read `connectionStatus` and `canAccess` for `hubspot_contacts_criteria_import`, `hubspot_contacts_list_import`, `hubspot_companies_criteria_import`, `hubspot_companies_list_import` and `hubspot_lookup_object`.
3. More than one HubSpot connection: each import's `auth` names exactly one. Ask which portal to audit; never pick one.
4. An import that fails on authorization means the connection's token is dead: tell the user to reconnect HubSpot and stop. A 403 or a missing scope on one object marks that object's axes not assessed and the other object continues; it does not mean the CRM is unsupported.

## 5. The audit tables

One table per object, Contacts audit and Companies audit, each created with its import as the source: a source attaches only at `create_table`.

**Properties.** Resolve `selectedProperties` with `resolve_action_options` before naming any: names differ per portal, and HubSpot's calculated properties are not offered. Keep `hs_object_id`. A property the portal lacks makes that axis not assessable, never "0 gaps, clean".

- Contacts: `hs_object_id`, `firstname`, `lastname`, `email`, `phone`, `mobilephone`, `jobtitle`, `company`, `associatedcompanyid`, and the portal's LinkedIn URL property (search the options for "linkedin").
- Companies: `hs_object_id`, `name`, `domain`, `industry`, `numberofemployees`, `description`, the company LinkedIn page property, and `num_associated_contacts` where the options list it.

**The source, per mode.**

| Mode | Import | Record limit | What the numbers are |
|---|---|---|---|
| Quick scan | `hubspot_contacts_criteria_import` and `hubspot_companies_criteria_import`, on a rule every record meets (for example `createdate` HAS_PROPERTY; confirm the property with `resolve_action_options` on `criteria`) | on, 1,000 | exact for the imported rows. For the object, a rate on the first 1,000 records HubSpot's search returned: the import sends no sort, so this is a slice, not a random sample. When `hubspotSearchTotal` is 1,000 or less, the slice is the whole object and every count is exact |
| Deep sweep, up to 10,000 records | the same criteria imports | off | exact for the object. After a quick scan, lift the limit on the same tables |
| Deep sweep, over 10,000 records | `hubspot_contacts_list_import` or `hubspot_companies_list_import` on a list holding every record, in new tables (a table's source is fixed) | off | exact for the list. Its size shows in the `listId` option label from `resolve_action_options`: check it against the object's `hubspotSearchTotal` before calling the list the whole object |
| Named scope | a criteria import whose criteria is the gap itself (`email` NOT_HAS_PROPERTY) | on, 10 | `hubspotSearchTotal` is the exact portal count of that gap. The same criteria is where that gap's fix starts |

A criteria import reports `hubspotSearchTotal`, the provider's full match count, in `sourceImportSummary` (`wait_for_run`, `get_run_status`), even when the record limit stopped it early. With no record limit and more than 10,000 matches it fails rather than import part of the set. A list import streams the whole list and reports no search total.

**The flags.** Formulas, free, one word per row: Missing or OK, so an empty cell means the formula has not computed yet. Each reads the cell by content, not by presence: "n/a" in an email field is missing.

Contacts audit:

| Column | Kind | Reads | Missing when | Mode |
|---|---|---|---|---|
| Email gap | formula | email | empty, or not an address | quick |
| Phone gap | formula | phone and mobilephone | both empty | quick |
| Title gap | formula | jobtitle | empty | quick |
| Company link gap | formula | associatedcompanyid | empty: a contact floating without a company | deep |
| LinkedIn gap | formula | the LinkedIn URL property | empty, or not a personal profile URL (a company page counts as empty) | deep |
| Email key | formula | email | the address lowercased and trimmed, empty when there is none | deep, or quick when duplicates are named |
| Matches on email | `lookup_multiple_records` targeting this same table: `targetColumn` the Email key, `filterOperator: "equals"`, `rowValue` the Email key's `{{field_name}}` | | | as Email key |
| Duplicate email | formula on the lookup's `count` | | Duplicate when above one (the row finds itself), else Unique | as Email key |
| Name key, its matches, Duplicate name | the same three columns on first name, last name and company, lowercased | | candidates only: two people can share a name, and the same person on two records usually has two addresses | deep |

Companies audit:

| Column | Kind | Reads | Missing when | Mode |
|---|---|---|---|---|
| Domain gap | formula | domain | empty, or not a domain (labels, a dot, a real TLD) | quick |
| Industry gap | formula | industry | empty | quick |
| Size gap | formula | numberofemployees | empty | quick |
| No contacts | formula | num_associated_contacts | 0 or empty | quick, where the property is listed; else the lookup below in the deep sweep |
| Description gap | formula | description | empty | deep |
| LinkedIn gap | formula | the company page property | empty, or not a company page URL | deep |
| Contacts on the account | `hubspot_lookup_object`, `objectType: "contacts"`, `contactsFilters` on `associatedcompanyid` EQ the row's record id, limit 1 | | `isNotFound`: no contact names this company as its primary company, so secondary associations are missed | deep, only where `num_associated_contacts` is not listed |
| Domain key, Matches on domain, Duplicate domain | formula, self-lookup, formula, as for contacts | domain | the key is the bare domain, lowercased, with scheme, path and www stripped | deep |

Compound gaps need no column: a `list_rows` filter with two rules (Domain gap = Missing AND LinkedIn gap = Missing).

**Run order**, which the build skill follows:

1. Create each audit table with its import at a record limit of 10, run it, and wait.
2. Build the flags with `preview_formula` on those rows. Formulas are never run: they evaluate on their own.
3. Set the record limit for the mode with `update_field` on the source (`recordLimitEnabled`, `recordLimit`) and run the import again. It updates the ten rows by HubSpot ID, adds the rest, and recomputes every formula on every row it touches.
4. Deep sweep: once the import has landed, run each lookup once over every row with `run_field` `runAction: "entire_set"` and `confirmedRowCount` from `list_row_ids` `total` (the lookups are free, and a deep sweep is an all-rows ask). Keep `autoRunOnNewRow` off: a lookup into a table that is still importing reads a partial set, and twins split across batches read as unique.
5. Before counting, confirm every flag is filled: a `list_rows` filter `null` on each flag returns `total: 0`.

`hubspot_lookup_object` calls HubSpot once per company and shares the portal's API limit with the org's own integrations, which is why it runs only where `num_associated_contacts` is not available. Never switch on `set_auto_dedupe` on an audit table: it deletes rows permanently, and the next import brings them back.

## 6. Reading the counts

- **The denominator** is `get_table_schema` `table.rowCount` for the rows imported, never `list_tables`. The object's total is `hubspotSearchTotal`, or the list size.
- **Each gap** is one `list_rows` call with `filters` on its flag (`{ "combinator": "and", "rules": [{ "fieldId": "<Email gap id>", "operator": "=", "value": "Missing" }] }`) and `limit: 1`: `total` is the filtered row count. Duplicates read the Duplicate column's word. Companies checked by lookup read `isNotFound` on the lookup field, and its `hasError` rows are not assessed.
- **Write each count down** next to its filter the moment it returns, and build the scorecard from that record: a dozen counts assembled from memory at the end is how two rows swap their numbers.
- **Examples** (deep sweep only): the same filter with `limit: 3`, reported by name and record id, never with dumped property values.
- **Exact or sampled, on every number.** A whole-object import is exact. The quick scan's slice gives a rate on the first records the search returned: say so. Duplicates inside a slice are an undercount, because both twins must be inside it. `hubspotSearchTotal` is exact even above 10,000: never mark it as a floor or append a "+".

**Counts outside the audit.** A lifecycle stage, an owner or a consent property the user asks about is counted the same way: import the property and filter on it, or run a criteria import on that rule and read `hubspotSearchTotal`. Answer with the number and one line saying Baseloop has no fix to hand off.

## 7. Score

Rank each finding by impact times severity:

- **Impact:** how many records are affected, relative to the object's base, and how much usable audience or pipeline the fix unlocks (contacts that become reachable once an email is found).
- **Severity:** how blocking the gap is. A missing email blocks outreach entirely (high); a missing description is low.

Where the affected count is known, add a rough credit estimate for the fix and label it an estimate. `enrich_company` and `enrich_contact` bill per record: take the rate from the action's guide (`get_action_schema`) when it states one; otherwise say the rate is unknown until the fix's one-row test. `creditCostHint` only says free, paid or variable, so it cannot size anything. The email and phone waterfalls bill only per address or number found, and nothing on the org's own provider keys. A 40,000-row paid fix never outranks 500 missing emails without saying what it costs.

Be honest about the numbers: a sampled rate is labelled as an estimate of its slice and never presented as a portal-wide count.

## 8. Report

A ranked report, most impactful finding first. The quick scan reports a compact scorecard; the deep sweep goes finding by finding.

- **Quick-scan scorecard:** one line per gap with the metric, the affected count, its share of the object's total, the Baseloop fix in product terms ("1,240 contacts missing an email: the email waterfall can fill these"; "310 companies with no contacts: people finding can add decision makers"), and the cost shape of that fix (free, paid per row, paid per result found, paid on success, or free on the org's own key), taken from the action's `creditCostHint` and guide, never from memory. Close by naming only the axes the quick scan skipped (duplicates unless named, per-field overlap, LinkedIn coverage, contacts without a company) and offer the deep sweep in one sentence.
- **Deep-sweep findings:** what it is, the affected count (exact or sampled, say which), severity, the Baseloop fix, and 2 or 3 example records by name and id. Report the outreach-ready share (contacts with an email) next to the contact gaps, and the compound gap (companies missing both domain and LinkedIn page, the hardest to enrich) on its own line.
- **Axes not assessed**, mandatory the moment one axis did not complete: the axis and the reason (import failed, excluded by the user, property not in the portal, object not readable).
- **Empty or tiny portal:** that axis reads "nothing to audit". Never invent findings and never score against a zero denominator.
- **Close** with a short summary of overall coverage and one fixed line on what this audit never covers: lifecycle stages, stale deals, ownership, deliverability, consent and workflow configuration. Say it leaves them out by design, because it has no fix to hand off for them, not because they cannot be read (an import filters on lifecycle stage and owner and can count them). Name the alternative that exists: a table built from the relevant records with the check as a column (a `custom_ai_agent` column for a lifecycle, ownership or staleness rule the user states, the CRM's own consent property for consent), [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) "2.3 Dead email audit" for dead or bouncing addresses, and nothing for workflow configuration, which Baseloop cannot check. Never say the deep sweep covers them.

## 9. Remediation

Finish with at most three fixes, most valuable first. Each is a self-contained build request that names the records, the fix and the recipe, so it reads as a fresh request with no memory of the audit: "Import the 1,240 HubSpot contacts missing an email into a table, run the email waterfall, and write the found addresses back to HubSpot". Each follows the same path: import the affected records, fix them with an action, write the corrections back.

| Finding | The fix | Recipe |
|---|---|---|
| Contacts missing an email | `waterfall_email_enrichment` | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) "1.2 Enrich all contacts" |
| Contacts missing a phone | `waterfall_phone_enrichment` | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) "1.4 Mobiles for the whole CRM" |
| Contacts missing a title, a LinkedIn URL or a company link | `enrich_contact`, after `reverse_email_lookup` where the record has only an email | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) "1.2 Enrich all contacts" |
| Companies missing domain, industry, size or description | `enrich_company`, which needs the company page URL: a company missing it first gets a column that resolves it (`custom_ai_agent` with web search) | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) "1.1 Enrich all companies" |
| Companies with no contacts | `li_find_people_at_company` | [use-case-prospecting.md](./use-case-prospecting.md) "Chain B. A list of companies comes in"; the empty-account word is [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) "2.7 Dead domains and empty accounts" |
| Duplicates | each record flagged with its twins' ids and the groups queued for a person to merge; nothing merges itself | [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) "2.2 Duplicate audit" |

The import step is the HubSpot source import configured with the same filter the audit counted (for example `industry` NOT_HAS_PROPERTY) and a record limit for the sample. Never read the records and type them into `create_rows`: manual rows cannot be re-run, scheduled, or scaled from the sample to the full affected count, and the point of the handoff is a repeatable fix.

After a quick scan, when the deep sweep looks worthwhile, one of the three may be "Run the deep CRM audit", never at the cost of the single most valuable fix. End with one line naming that next depth. The audit builds none of the fixes on its own.
