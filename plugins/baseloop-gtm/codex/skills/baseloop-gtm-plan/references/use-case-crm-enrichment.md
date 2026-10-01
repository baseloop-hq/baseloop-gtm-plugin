# CRM enrichment

Use this recipe when an ops owner wants empty fields filled across the records the CRM already holds (companies with no industry or size, contacts with a name and an email and nothing else), on the whole object or a CRM list, and wants it to run again next month without anyone opening Baseloop.

The shared rules own everything every use case does the same way, and this file does not repeat them: read [gtme-rules.md](./gtme-rules.md) for taking the request and building, and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) for working a CRM and delivering. What follows is what changes when the input is the whole CRM and the job repeats. The build skill cannot read this file, so every table, column, action key, gate, schedule and run order the plan needs goes into the plan itself.

## 1. The job

An ops person looks at their CRM and sees holes. Half the companies have no industry or employee count. Contacts carry a name and an email and nothing else. Nobody can build a segment, route a lead or report on a market, because the fields the reports read are empty on most rows.

The job is filling empty fields on records the team already owns, on every record, again next month. Three things separate it from its neighbours, and each one changes the build. It fills what is empty: a filled field that is wrong is the other job. It runs on the whole CRM, so the first question is never how many records there are but how many lack the field, and that count is free to read. It recurs, so every step has to be safe to run again: recurrence lives in native schedules, the import's for records it has not seen and the action column's own for the refresh over existing ones, never in an outside scheduler, and every gate reads the CRM's current value rather than the copy the last import made, because that copy ages between runs.

Typical requests: "many of our companies have no industry or size", "our contacts have no LinkedIn URL", "an old imported list needs cleaning up", "keep these fields filled without me running it every month". What they want back is a number per field: industry filled on most of the companies, of which so many were empty this morning, and the promise that the run left everything a person typed alone. What kills it: an AI sentence written over a human's description, a second note on a record every time the job runs, a bill for the whole CRM when only part of it lacked the field.

What is never promised: a field no provider holds. Coverage depends on the providers connected, so the word is verified, never guaranteed. Baseloop fills the record; the CRM stays the working system, and nothing is sent, called or booked from here.

## 2. Where CRM enrichment stops

- **CRM cleanup** ([use-case-crm-cleanup.md](./use-case-crm-cleanup.md)) checks filled fields for being wrong, stale or duplicated. A contact who has left the company is a finding for cleanup, not a fill for this file: the position check here flags and stops, and the leaver leg runs in cleanup's own table.
- **Prospecting** ([use-case-prospecting.md](./use-case-prospecting.md)) runs the same chain on one rep's list, once. Chain A completes a person and chain C refreshes a CRM contact; both are written there and cited here, never rewritten. When a recipe below cites a chain, read that file for the chain's own columns. What this file adds is the schedule, the whole-object filter, the write only where the CRM's own value is empty, and the ops view.
- **TAM sourcing** ([use-case-tam-sourcing.md](./use-case-tam-sourcing.md)) decides which companies belong in the CRM at all. This file fills the ones already there.
- **Account research** answers a custom question about one company or person, on request (it has no recipe of its own yet). The same research run monthly over the whole CRM lives here, because the category is who asks and how often.
- **Signals** ([use-case-signals.md](./use-case-signals.md)) owns the record that arrives one at a time because something happened: an outside tool posting a company to a webhook is a trigger, not a schedule, and a re-check is not a fill.

## 3. Taking the request

The order is the one in [gtme-rules.md](./gtme-rules.md) "A request is a trigger, not a job". What CRM enrichment adds at each step:

1. **Count the gap before quoting anything.** Which fields are empty and on how many records is the request restated in numbers, it is free, and it is the only honest basis for an estimate ([gtme-rules.md](./gtme-rules.md) "The filter is the budget"). A job quoted on the row count instead pays on the records that already had the answer. The plan skill creates nothing, so either the user reads the counts from filtered views in their own CRM, or the count is the first build step: on HubSpot, a criteria import (`hubspot_companies_criteria_import` or `hubspot_contacts_criteria_import`) filtered on `NOT_HAS_PROPERTY` for the field, with `recordLimitEnabled: true` and a record limit of 1, reports HubSpot's full match count as `sourceImportSummary.hubspotSearchTotal` in `wait_for_run`, at no cost. One probe per field; the real import's first run with the same limit gives the count for "lacks at least one of the fields". Probe tables go to the Trash afterwards (`delete_table`).
2. **Check what is connected** (`get_connected_platforms`, and `connectionMode` and `connectionStatus` in `list_actions`): the CRM, and every provider key. Own keys decide the bill more than anything else in the build: the email and phone waterfalls, `parallel_research` and `custom_ai_agent` all run free on a connected key (each defaults to the org's working key when one exists), so with a key the expensive step is free and the design moves the spend to where the key does not reach.
3. **Read the portal's own property list back** before naming what the build may write: `resolve_action_options` on `hubspot_update_object`'s `fieldMapping` with the `objectType` returns the internal names and a `metadata.keyType` per property (`select`, `radio` and `checkbox` are fixed-option lists; `text` and `textarea` may carry a human's words). Look for two LinkedIn fields too. Enum values never come from a provider as-is ([pitfalls.md](./pitfalls.md) "HubSpot enum property mismatch").
4. **Size it in the plan.** A whole-object job that writes onto live records always gets phases, each with the approval it waits on, and its write depth ends in the data review of [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "The sample before a CRM write is a data review, not a smoke test".
5. **Ask the open questions one at a time** with the harness's blocking question tool, at most four, each with its default marked recommended when it has one.

Rank the open questions in this order and ask the top four. Everything below the cut ships as a stated default the plan announces, so the owner corrects a default instead of answering another round.

| Rank | Question | What it decides | Default when it ships unasked |
|---|---|---|---|
| 1 | Which object, and which slice? | The whole object, a CRM list or view, or a criteria filter. A list is the user's own definition of "these need fixing" and it comes with the native schedule attached, which is why it is its own recipe | The whole object, on the fields the count found empty |
| 2 | Which properties may Baseloop write, and which belong to a person? | Named property by property from the portal's list. Description, website and industry are where builds go wrong, because an AI overview written there replaces what a person wrote. Researched values go to custom properties created for the purpose | Firmographic properties only; description, website and name never; researched facts to new custom properties |
| 3 | How often, and what happens to a filled field? | The schedule on the import, and whether a filled field is never touched or refreshed after an agreed number of months. Both are policy, and the answer sets the gate on every paid step, not only the write | Monthly, never touch a filled field |
| 4 | What else would help? | The extra facts, offered once before the AI call is planned, because outputs added afterwards mean a second run and double the spend over the whole CRM | The fields the count found empty and nothing else |
| 5 | Where does a found work email go? | The primary email is a human's value and the CRM's unique key, so a found address goes to the additional-emails property unless the owner says otherwise | The additional-emails property |
| 6 | Are contacts who have left in scope? | The handover to CRM cleanup 2.1: here a leaver is a word on the row and nothing more | Flag and stop |

What is never asked: what counts as filled. A phone column holding a switchboard number, an email column holding a LinkedIn URL, a LinkedIn field holding a company page: every field is read by content and the row says so.

**Is there a CRM at all?** An agency can hold its people across many tables with no system of record anywhere: every list is a campaign artefact and the same company is enriched again in each workspace with no key between them. Two things change when the answer is no. The "check the CRM twice" step reads the workspace's own people or companies table instead, which then has to be a real entity table with a dedupe key rather than a copy of a campaign. And the count this file is quoted from cannot be taken, because there is no denominator. Say it plainly: the first piece of work is building the thing the enrichment recurs over.

## 4. What changes for CRM enrichment

**Count before you spend, and the count is a column.** One formula per field saying Missing, Has a value or Not a value. Those formulas are the gate on every paid step and the numerator of the coverage report, so they are built first and they are free. A whole-CRM job with no gap columns pays for every row twice: once to find what it already had, once to write it back.

**The empty test reads the CRM, not the import's copy.** On a schedule the import's copy is up to one interval old, and a rep may have typed the value in yesterday. So look the record up live and gate every paid step on it, not only the write.

**A gate reads a helper column, never an action's state.** A run condition is answered once, at dispatch, so a gate on "the previous action found something" leaves a repaired row skipped forever while the row reads finished.

**One classifier, one home.** A CRM property has one definition. The step that fills it is built once and every recipe reads it; the same LinkedIn URL finder existing in several workbooks on different models with different guards is how a property ends up holding two meanings.

**Never write over a human, and never over yourself.** Custom properties for anything researched. `ignoreBlanks: true` on every update, so an empty result cannot erase. And a write is sent only where the gap column said Missing, so a run over a live CRM touches the records that need it and nothing else.

**A freshness stamp comes from the step that did the work.** A formula computing the current date re-stamps on every recalculation, so the CRM's "enriched on" field, the one an ops person uses to decide what to re-run, records the last recalculation instead of the last enrichment.

**The cheap check makes the paid step unnecessary.** A free formula in front of a paid step answers every row it can, so the paid step runs only on the rest. At CRM scale that ratio is the budget.

**Gather once, judge many times.** One research call with every data point on it, then cheap calls with web search off that read those columns and return the labels. A new label then costs one cheap pass over the CRM, not a new crawl of every website.

**An estimate is a band and a number.** Where a step estimates rather than reads, the sales team size for instance, it is delivered as a band next to the figure: the band survives being wrong by a few units, and the band is what a segment filters on.

**The deliverable is coverage, not the row.** An ops person will not read tens of thousands of rows. The build ends in a view per field and a count: filled before, filled now, still empty, failed. One status-filtered count per step produces it (`list_row_ids` with a filter, reading its total).

## 5. The sequence, and the delivery

The import runs on its own schedule, one table per CRM object, with the filter the request set and every field the recipe may fill, so the gap test reads the CRM's own value. Then the gap columns, one per field, read by content. Then, where the write lands on records that may have changed since the import, a live read of the record, because that is what the paid steps are gated on. Then the cheapest step that fills several gaps at once: one AI call with web search for a contact, one company enrichment for a company, gated on at least one gap existing. Then identity: the name that came back against the name the CRM holds, and a mismatch is a word on the row before anything else is paid for. Then the targeted enrichment for what the cheap step could not finish. Merge, one column per field, the CRM's own value always first. Then the expensive lookups, gated on the gap and on everything they need. Then the extra facts, one call with every point on it, then the judgments reading those columns. Then the write, then Result, then the coverage view.

**Delivery** is back into the same CRM by record id, `ignoreBlanks: true`, one update per object per run rather than one per enrichment track.

Fixed-option properties are mapped or left out. HubSpot's industry is an enum and rejects free text; an HQ country property that takes full country names fails the write on an ISO code. Employee range is the hardest of the three, because the provider's bands and the portal's bands do not share boundaries, so the map is written boundary by boundary and a value that straddles two bands is not sent. A value bent to fit the destination's type is a defect: a number prefixed with a space to enter a text property makes every later read of that property a string comparison nobody expects. The mapping lives in one formula, read from the destination.

An email another record already holds makes HubSpot refuse the whole update and lose every other property in that write, so a found work email goes to the additional-emails property (`hs_additional_emails` on a standard portal; confirm with `resolve_action_options`), or it is its own write, or the fallback is built: attempt the full write, and on an error retry the same payload without the email. A note on the record is an offer, and only with a key that stops a second one ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "A create carries a key that stops a second one"). An export is offered from the app for the person who wants to check before the first real run.

## 6. The five recipes

Depth 1 is the base. Each next depth adds on the one before, offered in this order and built on yes: fill what is empty, write it back, refresh on a schedule, the expensive lookups, the extra facts.

**Table count.** One table per CRM object. 1.1 and 1.3 are a companies table; 1.2, 1.4 and 1.5 are a contacts table. A contacts table updates companies and never creates them. A contact who has left is flagged and stops.

Cost below is shape only. Read the figure from `creditCostHint` in `list_actions` and from the action's guide (`get_action_schema`) when writing the plan.

### 1.1 Enrich all companies

Taking the request adds: whether the portal's industry is a fixed list, and whether description and website may be touched, named explicitly.

**Depth 1, fill what is empty.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The CRM import | the source, set at `create_table`: `hubspot_companies_criteria_import` or `hubspot_companies_list_import`, or the Salesforce, Dynamics 365, Pipedrive or Attio import `list_actions` names | | free | record id (`hs_object_id`), name, domain, company page URL, and every field the recipe may fill, so the gap test reads the CRM's own value. HubSpot criteria imports are capped at 10,000 by HubSpot's search, so a broad filter takes a record limit (10,000 or less) or it fails rather than importing a partial set; beyond that, narrower criteria or a list import |
| Gap per field | one formula per field | | free | Missing, Has a value, Not a value. A company page in the domain column and a placeholder name both read as Not a value. Every paid gate and every coverage number reads these |
| Company page | formula on the CRM's own LinkedIn company property, shape-tested for the company path | | free | a domain is never handed to the enrichment: it accepts only a company page URL |
| Page resolver | `custom_ai_agent`, `enableWebSearch: true`, from name and domain | Company page empty AND at least one gap | paid per row | resolves the page the CRM lacks; told to return empty rather than guess, because a guessed slug bills for the wrong company |
| Merged company page | formula | | free | the CRM's, else the resolver's |
| Company profile | `enrich_company` on the merged page, `selectedOutputFields` set to the gaps | Merged company page not empty AND at least one gap | paid on success | proves the page and returns the matched name. Left unset, `selectedOutputFields` creates Company Name, Industry, Website and Employee Range columns on its own, so set it rather than hand-building extraction columns for the same values. Fallback after the same error on two valid rows: the resolver again, handed the failure text, then this step on what it returns |
| Name check | formula | | free | the matched name against the CRM's name: Match, Differs, Not checked. Differs stops paid work and is a word on the row |
| Website usable | formula | | free | not empty, not a shortener or social host, a dot and a real TLD. Enrichment can return a doubled scheme or the bare string of a scheme, and both pass a "not empty" gate |
| Website finder | `parallel_research` on the `lite` processor (`custom_ai_agent` with web search only when the user names it or a specific model is required) | Website usable = No AND Name check = Match | paid per row, free on the org's own key | runs on the few rows the free check could not settle |
| Merged domain | formula | | free | the finder's result where the input was unusable, else the profile's, cleaned to a bare domain |
| Firmographic columns | the profile's own output columns, plus an extraction column for anything it does not offer | | free | industry, employee count and range, HQ country, founded year, company page and handle, description, address |
| Free proxy band | a public register read over `baseloop_send_http_request` (no key in the field: its config is readable by everyone with the table), or a value the record already carries, banded in a formula | the identifier resolves | free | a free proxy that narrows the answer to a band beats a paid figure that names one: a company's own filing exemption can put it in a band low enough that the exact figure cannot change the tier. Any classification with published thresholds has a free proxy, and finding it is the first step of the build |
| Paid figure needed | formula on the band against the decision boundary | | free | Yes, Optional, Settled. Settled rows never reach the paid step; Optional rows reach it only where the owner asked for the exact figure |
| Paid figure | `parallel_research` for the one fact the band left open | Paid figure needed = Yes, or Optional where the owner asked | paid per row, free on the org's own key | one fact, not a brief; the band is recomputed from it |
| Result | formula off a helper | | free | Filled, Nothing missing, Wrong company, No website, Failed, Pending |

**Depth 2, write it back.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Live read of the record | `hubspot_lookup_object` on `hs_object_id` equal to the record id, or the other CRM's lookup | record id not empty | free | the value the CRM holds right now, not the import's copy. The decision word is computed against this. The read and the write sit in one run, so the only edit the gate cannot see is one a person makes during the run itself; a property the team is actively working is left off the list |
| Value to write, one per field | formulas | | free | the enriched value only where the gap column said Missing, empty otherwise. This is the column that keeps a live CRM quiet |
| Write decision, one per field | formula naming why | | free | Write, was blank. Write, was unknown. Write, override approved. No, already correct. No, conflicts with existing. No, already populated. No, unverified. No, not checked. The word next to the value is what makes a live CRM safe and lets an ops person read the run without opening the CRM. The best of them is a rule: a postcode that disagrees means the registered address is probably an accountant's and must not be written as the trading address |
| Basis, one per contested field | formula with the sources in a fixed order | | free | which evidence set the value; the CRM's own figure ranks below anything checked against an outside source, because a field nobody trusts is the reason the job exists |
| Fixed-option mapping | formula against the portal's own option list | | free | complete the map or do not send the field |
| Update company | `hubspot_update_object` by record id (`recordId.companyRecordId`), `ignoreBlanks: true` | record id AND the write decision starts with Write | free | one update per run, not one per track. The gate is the decision word, so nothing human-maintained is overwritten without an override on the row |
| Last enriched | formula off a column that re-runs each cycle, as a trigger only | | free | never a formula that computes the current date on its own. Each HubSpot import recomputes formulas on every row it touches, so the record is the CRM property the update writes after an enrichment |
| Coverage | a view per field (`create_view`, `set_view_filters`) plus one count per step (`list_row_ids` filtered on the gap column or the step's state) | | free | filled before, filled now, still empty, failed. The thing the ops person reads |

Without the decision word, a run is a pile of writes with no way to tell a correction from a no-op. And each property has one writer: a second action writing it, gated on nothing but a record id, can blank it.

**Depth 3, refresh on a schedule.** The schedule sits on the import field, in its native units (HubSpot imports take any unit; `list_actions` reports `allowedScheduleUnits` where an action restricts them). What a scheduled import does: it creates rows for records it has not seen and, with the table's `autoRunOnNewRow` on, runs the action fields on those rows only; a record it has seen is an updated row, whose import columns and formulas refresh while its action cells keep their last value, `autoUpdateDependents` on or off, because an import's refresh starts no chain. So the gap columns recompute every cycle for free and new records are filled on arrival. A refresh over existing rows (a filled field older than the agreed months, a row that failed last cycle) is the action field's own schedule (`update_field` with a `schedule`), gated by a run condition on the refresh rule below, because a fire runs every row the condition admits, filled cells included, and reserves credits for each; never something the import does on its own, and never a person re-running it by hand each month. The write-back reads that field, so it follows the refresh through `autoUpdateDependents`, switched on in the same build, never through a schedule of its own ([workflow-patterns.md](./workflow-patterns.md) "Schedule chains"). State the rows per fire in the plan. Each schedule counts against the organization's active schedule limit, and `update_field` refuses one over it; to pause or resume, read the schedule with `get_table_schema` and send it back whole with only `enabled` changed. What the schedule adds: a Source alive check, not a formula (it sees one row and recomputes only when that row changes): the import's runs against the interval (`list_runs` for a failed fire, and `get_run_status` for the rows a fire created, `rowsCreated` in `sourceImportSummary`), because a list that stopped returning rows looks exactly like a list with nothing left to fix; a run date off a column that re-runs each cycle; and a refresh rule that tests the gap column first and the date second, because "last enriched more than N days ago" alone excludes every record that was never enriched, which is the population the job exists for.

**Depth 4, the expensive lookups.** Nothing at company level costs what a mobile does, so at this depth the expensive step is a paid third-party read: the technology-stack lookup `list_actions` names, on the domain, billed on every row it looks up, found or not, gated on a domain with a dot and a TLD because a row without one fails before the call. Offered, not base. Name the technologies to check rather than asking what they use: the keyword list filters the result, and an empty list returns the whole stack.

**Depth 5, the extra facts on a schedule.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Free signature pass | fetch the page's raw HTML over `baseloop_send_http_request` (no JavaScript, no redirects: request the root and the www host, as [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) 2.7 does), match the named list in a formula | Merged domain usable | free | the named tools found for nothing; the research below is gated on this pass having found none |
| Research | `parallel_research` with typed `outputFields`: `lite` for one to three points, a higher processor for a wide question needing cited evidence; `custom_ai_agent` with web search only when the user names it | Merged domain usable AND Name check = Match AND the account is one to touch | paid per row, free on the org's own key | one call, every point on it: the same call account research runs once for one company, here on a schedule over the whole object |
| Evidence columns | research outputs | | free | one per data point, quoted, in the source language, the empty value spelled once |
| Judgments | `custom_ai_agent`, web search off, one call | at least one evidence column holds a real value | paid per row, free on the org's own key | the labels the user asked for, read from the evidence columns only, the seller profile in the system prompt (a web-search agent takes no system prompt) |
| Hiring | `li_company_hiring_activity` on the company page URL | the same gates | paid per company, and it bills on a miss | a flat charge per company, zero open jobs included, so at CRM scale it bills the whole table, unlike the enrichments that bill on success. Keep the count and the top titles: the count answers the segment, the titles answer which motion they are hiring for, and a free formula over the titles flags an upmarket motion |
| Employee count growth | two readings of the profile's employee count, one per cycle, and a formula | | free | delivered as the percentage and a flag per window, thresholds named by the user and applied in a formula, the unit fixed in one place, so no writer stores a fraction where another stores a percent |
| The writes | custom properties, or a property the owner named, `ignoreBlanks: true` | value changed | free | never the CRM's description, website or industry unless the owner named that property for these facts |

Offers on connected tools: custom research points on a schedule; an own research key, which prices research at zero and tiers it by depth rather than price; the technology stack; hiring, with the bills-on-a-miss shape said before it is planned; a note on the record, only with a key that stops a second one.

Check identity before the research, not after: research on the wrong company returns a confident and correct brief about the wrong company, on a row that reaches no CRM record. A track can fail on every row while the table reads as finished, which is what the per-step status count is for. And read the CRM's own company page property before paying to find one.

### 1.2 Enrich all contacts

The chain is Prospecting chain A depth 1 and chain C depth 1, cited: read [use-case-prospecting.md](./use-case-prospecting.md) for the chains' own columns. Taking the request adds: whether a found work email may replace the primary email or goes to the additional-emails property; what the portal's engagement and owner fields are called, read back; whether a contact who has left is in scope at all.

**Depth 1, fill what is empty.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The CRM import | `hubspot_contacts_criteria_import` or `hubspot_contacts_list_import`, with a record limit | | free | contact fields only, plus the associated company id. Company data on a contact record is a stale copy |
| Gap per field | formulas, read by content | | free | the LinkedIn field often holds a company page, the phone column a switchboard, the email column a personal address. A portal can hold two LinkedIn fields, so the gap column reads both |
| Personal email test | formula against one freemail list | | free | a freemail domain is a gap, not a value. The common consumer domains and their country variants, about two dozen, in one formula the user can read |
| Account record | `hubspot_lookup_object` on companies, `hs_object_id` equal to the associated company id | id not empty | free | supplies the domain the email waterfall needs. When the contact's company field and the account record disagree, the account record wins |
| Chain A depth 1 | Prospecting, cited | the gap columns in place of the entry point's own helper | paid per row for the repair call, paid on success for the profile, free on the org's own key for the email | one AI call fills name parts, company, domain and the LinkedIn URL; `enrich_contact` runs only on what it could not finish; `waterfall_email_enrichment` last, its verdict the `status` in the cell's fullValue |
| Position check | formula against the account record's name | profile enrichment ran | free | Still there, Left, Not checked. Left is a flag here and nothing more |
| Result | formula off a helper | | free | Filled, Nothing missing, No email, Left company, Failed, Pending |

**Depth 2, write it back.** The same shape as 1.1 depth 2: a value-to-write formula per field, one `hubspot_update_object` by record id with `ignoreBlanks: true`, a last-enriched stamp off a column that re-runs, the coverage view. Two things are specific. A found work email goes to the additional-emails property unless the user said otherwise. And a write carrying an email another record already holds is refused outright and loses every other property, so either the email is its own write or the retry-without-the-email fallback is built.

**Depth 3, refresh on a schedule.** As 1.1 depth 3, on the contacts import.

**Depth 4, the expensive lookup.** The mobile, which is recipe 1.4, built here when the same request asked for both.

**Depth 5, the extra facts.** Chain A depth 4, gated on the gap columns and on the account being one to touch. Role and seniority are the most-asked and they are recipe 1.5.

Offers on connected tools: the work email at zero credits on the org's own provider key; the LinkedIn profile refresh, which is what makes the position check possible; a tag or source property naming the run, so the ops person can filter what this job touched.

A job changer's new employer is cleanup's finding, never a fill for the company field, and a found email goes to the additional-emails property, not the primary address, unless the user said otherwise. Identity repair is worth its credit and the order matters: keep the AI finder as the last resort behind any LinkedIn URL provider waterfall, and have the merge pick from the providers in the order the gates run them, or the provider that answered first is not the one whose URL reaches the profile lookup. Substring matching a company name against an experience list false-positives on short names, which is how a job changer gets marked as still employed. And an AI second opinion on employment status is dead weight where the formulas already decide the status.

### 1.3 Enrich a CRM view on a schedule

Not a separate chain: 1.1 or 1.2 with a list id instead of the whole object. It is its own recipe for three reasons: the user owns the list definition, so the scope question is answered in the CRM and not in Baseloop; a list is where a team parks "these need fixing", which is a different request from "fix everything"; and the schedule sits on the import field, which brings new records in each cycle, recomputes the formulas and, with the table's `autoRunOnNewRow` on, runs the action fields on the rows it creates; a refresh of the rows already there is the action column's own schedule with a run condition, as 1.1 depth 3 says.

Taking the request adds: which list, by its id (`resolve_action_options` on the list import's `listId` returns the lists with their sizes; offer those, never guess an id); what puts a record on it and what takes it off, because that decides whether a filled row keeps coming back; the interval and the time; what happens to a record that arrives again and is already complete.

**What this recipe adds.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The list import | `hubspot_companies_list_import` or `hubspot_contacts_list_import` with the native schedule: interval, unit, time, timezone | | free | a table holds one source, so each list is its own import table that sends into one working table with a view per list; the chain runs on the working table. Each import table has `autoRunOnNewRow` on, so its send runs on the rows each fire creates |
| Source alive | not a formula (it sees one row and recomputes only when that row changes): the import's runs against the interval (`list_runs` for a failed fire, and `get_run_status` for the rows a fire created) | | free | Alive, Late, Dead |
| Run date | formula referencing a column that re-runs each cycle, as a trigger only | | free | the per-row "as of" date. A formula computing the current date freezes on a table fed by sends and moves on every import on a HubSpot import table, and the row's creation date never moves |
| Already complete | the gap columns | | free | a record that arrives again updates only its import-table row: the send does not re-run on an updated row, and a re-sent row recomputes no formulas, so the working table's gap columns keep their first values; the live read in 1.1 depth 2 is what sees a newer value |
| Source list | a formula on each import table holding its list name, mapped by its plain field name (in `send_row` mode a `column:` value matches no field and is dropped) | | free | the view per list filters on it. A record on two lists lands once, under the first list that sent it when the dedupe keeps the oldest row, and is filled once, which is the point: the enrichment runs per record, never per list |
| Duplicate check | `lookup_multiple_records` into the working table on the record id; run the send on one row, which creates the columns, then `set_auto_dedupe` on the record id column it created (`keepRule: "oldest"`) before the full run | | free | a formula cannot see other rows, so cross-row dedupe is a table setting, and a lookup alone misses rows that arrive in the same batch. Dedupe the working table, never an import table on a column its own import refreshes ([pitfalls.md](./pitfalls.md) "Auto-dedupe deletes rows, and its key defines a duplicate") |
| The chain | 1.1 or 1.2 by object, with `autoRunOnNewRow` on the working table once the first send has created its Input field | the gap columns | as per that recipe | nothing new below this line |

Offers on connected tools: a `slack_send_message_to_channel` or `email_send_email_notification` summary per run, gated on rows having been filled, so a quiet run stays quiet; a second view of the rows the run could not fill, which is the queue an ops person works by hand.

Recurrence breaks on state, not on logic: a scheduled source field's own run reports zero rows in its row counts and the real count shows on the send that follows minutes later, which is why the source-alive check reads `rowsCreated` in the run's `sourceImportSummary` from `get_run_status`, where the import records it, and not `totalRows`.

### 1.4 Mobiles for the whole CRM

The chain is Prospecting chain A depth 3, cited ([use-case-prospecting.md](./use-case-prospecting.md)). What the whole CRM adds is the money: a mobile is the most expensive step in the catalogue on Baseloop credits and free on the org's own key, and on tens of thousands of contacts the difference between gating on the CRM's live value and gating on the import's copy is most of the bill. So the first question is not the cap, it is the key: with one connected this recipe is close to free, and without one it is the single line that can empty a budget.

Taking the request adds: how many contacts have no mobile, counted from the CRM; whether the org has a phone provider key; a cap per run, in rows, agreed before the first real run; which property the number goes to, the mobile property (`mobilephone` on a standard portal; confirm with `resolve_action_options`) and never the phone property.

**Depth 1, find the mobile.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The CRM import | `hubspot_contacts_criteria_import` on the native schedule, with a record limit | | free | record id, name parts, company, the phone and mobile properties, the LinkedIn URL |
| Live contact read | `hubspot_lookup_object` on `hs_object_id` equal to the record id | record id not empty | free | the current mobile and the current email. The whole waterfall is gated on this |
| Rejected numbers | import extraction of whatever property the reps write a bad number into | | free | a memory beats reading the field by content, because a number can look perfect and be dead, and no formula reading the cell will ever know. Compare the last ten digits, stripped of spaces, dashes, brackets and plus signs, because the same number arrives in several spellings |
| Mobile already known | formula | | free | the live CRM mobile and the imported phone column, both read by content: a switchboard or toll-free number is not a mobile, and a number on the rejected list is not known, it is dead |
| Identity first | chain A's repair call, then `enrich_contact` | Mobile already known empty | paid per row, then paid on success | the waterfall requires first name, last name and company name, and the LinkedIn URL, optional, is what finds the most. A full name concatenated without a null guard produces "undefined Smith" and feeds a paid finder |
| Mobile found | `waterfall_phone_enrichment` | known empty AND merged email AND first AND last AND company AND LinkedIn URL | paid on success, free on the org's own key | company name only: the action has no domain input and its output carries no deliverability status. There is no phone validation action, so the number is not promised as verified |
| Merged mobile | formula | | free | |
| Result | formula off a helper that says whether the waterfall ran | | free | Found, No mobile, Already had one, Missing inputs, Pending. No mobile only after the waterfall ran |

**Depth 2, write it back.** One `hubspot_update_object` by record id, `ignoreBlanks: true`, gated on a merged mobile existing and the live mobile being empty, to the mobile property. Then the coverage view: mobiles before, mobiles now, and the rows that failed the input gate, which is the list worth repairing before the next run.

There is a second shape, because a CRM can hold several number slots. A write that owns a whole set of slots recomputes them from every candidate each run, but it cannot clear one: an empty mapped cell is never sent whatever `ignoreBlanks` says, and a phone-number property cannot be cleared from a table, so a slot the ladder emptied keeps its old number. That write must read the record live first, or a number a person typed in since the last import is not a candidate and is overwritten, and each slot carries its own source label. The ladder and the slot rules are [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) 2.4, cited.

**Depth 3, refresh on a schedule.** As 1.1 depth 3, with the cap per run on the import and the live read gating every cycle.

Offers on connected tools: the org's own phone provider key, which is the first thing to ask; a cap per run; a view per owner of who now has a number, for the calling team.

The switchboard trap: gating the mobile on the imported phone property being empty and writing to phone makes a reception number read as a mobile found. Gate every finder on no mobile in the live CRM, a full name and a LinkedIn URL, and write with blanks removed so an empty result cannot erase; the one gap left is validation, because no validation action exists. On an active provider connection the waterfall defaults to the org's own key, so successful lookups cost almost no credits.

### 1.5 Role classification on every contact

A recipe rather than a column because an ops person asks for it on its own ("tag every contact by persona so marketing can segment") and it runs on rows that need nothing else. It reads the facts already on the row: a formula where the agreed rules fully decide the answer, otherwise one classification call with web search off. No email or phone lookup is needed to classify a contact.

**Buying role and department are separate outputs.** Influencer is a role in the purchase; HR is a department. Keep both, in the user's vocabulary. A title suggests a persona, not a relationship: a manager is not a confirmed champion because the title matches, so the inferred role stays distinguishable from a role Sales confirmed, and the confirmed value is preserved. The classification stays here; selection for an account belongs to ABM ([use-case-abm.md](./use-case-abm.md) 6.1 depth 1), which reads this output.

**The existing label has a write policy.** Ask whether each property is filled only when empty, appended as a multi-value set, or reassessed when title or employer changes. Read the current record before applying it, append only missing values, never duplicates: on a HubSpot multiple-checkbox property `hubspot_update_object` does this itself, reading the record's selections and adding the mapped ones (keep the `metadata.keyType: "checkbox"` that `resolve_action_options` returns). A person who changes company can lose the buying role they held there, so preserve the old relationship as history and reassess the new one under the agreed rule.

Taking the request adds: the option list, written down with an example per label and read back; what Other means and whether it is allowed; whether the CRM property is a fixed list; whether a contact already carrying a label is re-classified and whether a changed title triggers one; the tie-break, because when two words in one title point at different labels one has to win, and a founder at a small company is an owner, not an executive; and what happens to the seller's own product in the option list, because a product mapped to the catch-all leaves the customers the seller already has uncountable.

**Depth 1, classify.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Title, industry, employee count | the contacts import plus `hubspot_lookup_object` on the associated company id | | free | title alone mislabels: the same title means different things at twenty employees and at five thousand |
| Persona, department and seniority | one classification step: a formula, or `custom_ai_agent` with web search off, per [gtme-rules.md](./gtme-rules.md) "Formula or agent" | title not empty AND a label is needed under the agreed policy | free, or paid per row and free on the org's own key | separate outputs for buying role, function and seniority; one call for all judgments where a model is needed, with the inputs closed in the first line of the prompt and every label carrying its own ordered heuristics that stop at the first match |
| Reasoning per label | agent explanation, or the matched rule from the formula | | free | the evidence next to the label is what lets an ops person audit tens of thousands of rows by reading twenty |
| Not one of ours | the option list itself | | free | Other is an answer where the agreed list carries it, and the common one on a mixed CRM. A classifier that never returns Other is stretching |
| Mapped value | formula against the property's own option list | | free | the select's options do not constrain the model: a Confidence select declared High, Medium and Low can still return decimals |
| Label to write | formula comparing the mapped value with the live CRM value under the agreed policy | | free | empty when unchanged; fill a gap, append a missing member, or apply an approved reassessment. Buying role and department each carry their own policy |
| Update contact | `hubspot_update_object` by record id, `ignoreBlanks: true` | label to write not empty AND policy permits the change | free | writes classification only; it does not mark email, phone or employment as verified |
| Coverage | a view and a count per label | | free | the distribution is the review: a label holding most of the CRM is a list problem, not a model problem |

Depths 2 and 3 are the write above and the schedule on the import, as 1.1. Offers on connected tools: the same classifier pointed at the company object for an account type or segment; a route word when the labels decide a next motion, which hands the row to ABM or Outbound; a second cheap pass when the list changes, which is the whole point of separating gathering from judging.

The option list is a policy decision and not a model decision: a prompt that says every manager is leadership marks a Customer Success Manager as leadership, and nothing downstream knows. A mapping to the destination's vocabulary belongs in a formula after the judge, never patched inside the prompt. A worked example outranks the instructions, so an example that contradicts the rules above it is a wrong rule applied silently to every row that looks like it. The classifier sits where its answer is read: on the contacts whose branch uses the label, never in front of the fan-out, where it is paid on every row.

## 7. Offering the next depth

When a depth is built and verified, the plan or the build report ends with one closing line naming at most three next depths, deepest first, in this use case's order: fill what is empty, write it back, refresh on a schedule, the expensive lookups, the extra facts. Each names the table, the object, the fields and the work in full, so it reads as a new request rather than a continuation of a finished plan.

After depth 1, the three are, deepest first, the extra facts from depth 5, the schedule from depth 3, then the write-back from depth 2. After depth 2, they are the growth into the neighbouring use case the owner's own findings point at (the leavers the position check flagged, which is [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) 2.1; the roles missing per account, which is [use-case-abm.md](./use-case-abm.md); a campaign's slice, which is [use-case-outbound.md](./use-case-outbound.md)), then depth 5, then depth 3. Offer, never assume, and never build the next depth because it seemed obvious.
