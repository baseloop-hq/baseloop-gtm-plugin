# CRM cleanup

Use this when the CRM's fields are filled and the question is whether they are still true: who has left, who is in twice, which addresses and numbers are dead, which figures cannot be right, which values are unusable, which accounts are dead or empty, and what to clean before a move to a new CRM. Data foundations: ops owns the database, and the whole CRM runs on a schedule that finds, flags, and fixes what a provider can verify. Filling empty fields is [use-case-crm-enrichment.md](./use-case-crm-enrichment.md); measuring the gaps once is [use-case-crm-audit.md](./use-case-crm-audit.md).

The shared rules own everything every use case does the same way, and this file does not repeat them: [gtme-rules.md](./gtme-rules.md) for taking the request and building, and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) for working a CRM and delivering. What follows is what changes when the field is already filled and the question is whether it is still true.

## 1. The job

Nobody deletes a CRM record. People leave, companies get bought, the same person is entered twice, and the database keeps every version looking equally current. A CRM row is the only source that lies confidently: formatted, full and stale. After two years of that, reps stop trusting the fields.

Eight questions, eight recipes. Who has left. Who is in here twice. Which addresses are dead. Which numbers are dead. Which figures cannot be right. Which values are filled and unusable. Which accounts are dead or empty. What must be cleaned before it is copied into a new CRM. Each one reads a field that is already filled and asks whether it is still true.

Typical requests: "reps don't trust the CRM", "which of our contacts have left their company", "we have duplicate companies", "too many of our sends bounce". What they want back is a number per outcome, on a date, comparable with last quarter, the finding on the record for a filter, and a short queue of the records a person must act on. What kills it: paying full price on every record every month, a duplicate flag that points at the wrong twin, and an audit that finds something on every record.

What is never promised: Baseloop marks records. It does not merge them and it does not delete them. The merge is a person's decision in the CRM, and a merge cannot be undone.

## 2. Where CRM cleanup stops

- **CRM enrichment** ([use-case-crm-enrichment.md](./use-case-crm-enrichment.md)) fills empty fields; this file checks filled ones. A contact who left is a finding here, never a fill there.
- **CRM audit** ([use-case-crm-audit.md](./use-case-crm-audit.md)) counts the gaps and duplicates once and writes nothing to the CRM; its duplicate and dead-address findings are built here (2.2, 2.3).
- **Prospecting** ([use-case-prospecting.md](./use-case-prospecting.md)) chain C runs the same position check on one rep's list, once, so the rep does not pay to email somebody who left. Here it runs on every record, on a schedule, and the output is a number the ops owner reads.
- **Signals** ([use-case-signals.md](./use-case-signals.md)) owns a job change on one watched account: one rep, an alert. The same job change across tens of thousands of contacts is an audit: no alert, a count and a queue.
- **CRM reactivation** ([use-case-crm-reactivation.md](./use-case-crm-reactivation.md)) tracks the champion who left a won deal and reads this audit's result where it already runs.
- **TAM sourcing** ([use-case-tam-sourcing.md](./use-case-tam-sourcing.md)) screens the leaver's new employer before it is created as an account, and **ABM** ([use-case-abm.md](./use-case-abm.md)) takes the seat the leaver left empty.

## 3. Taking the request

The shared rules set the order ([gtme-rules.md](./gtme-rules.md) "A request is a trigger, not a job"). What CRM cleanup adds:

- Read the portal's own property names back before promising any write, because bounce properties, number slots and LinkedIn fields differ per portal: `resolve_action_options` on the import's `selectedProperties` and `criteria`, and on the update's properties.
- Count the slice before quoting, because on a whole-database job the filter is the budget ([gtme-rules.md](./gtme-rules.md) "The filter is the budget"). From the plan, a HubSpot list's size is read-only: its `listId` option label in `resolve_action_options`. An exact count on a filter needs a probe import (a criteria import with a record limit of 10, whose `sourceImportSummary.hubspotSearchTotal` is the full match count), which the plan names as the build's first step and quotes only after it lands. [use-case-crm-audit.md](./use-case-crm-audit.md) section 5 has the probe.
- Always plan before building, because a whole-CRM pass writes onto live records.

Rank the open questions in this order and ask the top four, one at a time. Everything below the cut ships as a stated default that the plan announces.

| Rank | Question | What it decides | Default when it ships unasked |
|---|---|---|---|
| 1 | Which records, and how often? | The whole database is the default answer and usually the wrong one on the first run. The slice worth the money: a lifecycle stage, an ICP score, records not audited in the last six months. Then the recurrence: monthly, quarterly, or before a campaign. Recurrence rides on the import | The slice the count made affordable, quarterly |
| 2 | What may the audit write? | Custom properties created for the purpose, or the portal's own fields. A refresh that overwrites a human's spelling of a company name is a worse outcome than a stale field | Custom properties for the audit's own words; the portal's own fields only where the recipe repairs them |
| 3 | Who acts on a finding? | The record owner, a single ops queue, or nobody, in which case the finding is a filter and there is no task. A task per record on a twenty-thousand-row audit is a denial of service on the team | A filter and a view; tasks only for the queue depth, keyed so a re-run writes none twice |
| 4 | The recipe's own question | 2.1: does an acquisition count, and does the old association stay. 2.2: what counts as the same record, and who merges. 2.3: which properties record a bounce, and does a replacement become primary. 2.4: where reps record a dialled-and-wrong number, and how many slots exist. 2.5: which figure is doubted and which public source constrains it. 2.8: which objects move, in what order | The recipe's stated default |
| 5 | Is a leaver at an account with an open deal handled differently? | A deal risk, not a data fix: its own word and its own route | Its own word, handed to the account owner |
| 6 | Does a personal address count as dead or as the only address they have? | The dead email audit's status word | Personal only, kept and marked |

## 4. What changes for CRM cleanup

**The audit word is free, and that is the whole affordability argument.** The import, the account lookup, the engagement reads, the self-lookup, the key formulas and the bounce properties cost nothing, so a whole-CRM pass says something about every record for free. Money starts when the row is checked against the outside world, so the free detection comes first and decides who is worth checking; the paid column runs on the slice the owner chose and the schedule spreads the rest across cycles.

**A rejected value is a fact, and it is the only free ground truth anyone gets about a provider.** Where the team's own work already produces a verdict, a rep dialling a number and finding it wrong, a send bouncing, a merge being refused, that verdict belongs on the record and every later candidate is gated on it. Clearing the field instead loses the correction and buys the same wrong answer next cycle.

**A published threshold is a free detector.** Where a filled figure has to sit inside a published band, the comparison is free and needs no provider.

**A detection rate is a test of the detector.** A rate that jumps between lists is a dead list, a broken comparison, or an enrichment that never resolved, and only a hand sample of twenty flagged records tells you which; do that before the flag is written back.

**Compare identities field to field, never as a substring inside a serialized object.** Short names match inside unrelated text, so a leaver reads as still employed and is silently dropped. Compare the account record's name and domain against every current position on the profile, never only the first, case-insensitive, on whole values, and give an acquirer its own answer.

**The account record wins, except where the contact knew first.** Company data on a contact record is a copy, usually older than the company record, so the position check compares against the account; where the two disagree, both go on the row and the row says so.

**Detecting, recording and acting are three different sizes of job.** Detection is one gated paid step and a formula; recording is an update that writes only the difference; acting on a leaver is six steps and several write variants about a different account, so it lives in its own table.

**Dedupe against the destination, not against your own copy of it.** A company table in the workspace is a snapshot, and when it lags the build creates the duplicate recipe 2.2 exists to find. The CRM lookup runs first; the workspace companies table holds the dedupe key for the create only.

**A create that is not gated on its own input runs anyway and fails.** Every write is gated on the value it needs, and a create carries a key that stops a second one.

**Nothing merges itself and no CRM record is deleted.** A duplicate is flagged with the other record's id on the row; a dead address is marked and moved aside. A record id stops resolving after a merge, which cannot be undone.

**An audit that finds something on every record is stretching.** Still there, nothing to fix and no duplicate are the normal answers, and each gets its own word; the exception has to be small and true.

**Ship it capped.** The import's record limit is the only thing between a five-row test and the whole database: build with it on, verify on one row, and lift the cap as a deliberate act. Salesforce imports and Dynamics 365 view or marketing-list imports have none: test on a narrow filter.

**An import refresh re-runs no action column.** A scheduled HubSpot import updates the records it already holds and recomputes every formula on every row it touches, but it starts action columns only on new rows (`autoRunOnNewRow`) and never triggers `autoUpdateDependents`. So each paid column whose answer must be fresh every cycle (the profile refresh, a live CRM read) carries its own schedule, set hours after the import's, because schedules keep no order and an import takes 10 to 30+ minutes. Its run condition is the per-row gate: a scheduled field runs, and reserves credits for, every row its condition admits, filled cells included. Formulas, sends and CRM writes that only read those columns follow through `autoUpdateDependents`, never on a schedule of their own ([workflow-patterns.md](./workflow-patterns.md) "autoUpdateDependents Strategy").

## 5. The sequence, and the delivery

Import the object on the schedule, its own fields only, and look up the account record with the associated company id. Then everything free, in one block: the duplicate key and the self-lookup count, the email read by content and the portal's own bounce state, the last-audited date; these decide who is worth paying for and already answer recipe 2.2, all but the domain-family pairs its paid judge settles. Then the one paid detection step, the profile refresh, gated on a real personal LinkedIn URL and on the audited slice, and the position check against the account record; a leaver's work email at the old employer is dead by definition, so the dead email audit reads the position check, never re-verifies it. Write the finding: the audit date, the status word, and the changed values. Then act, per finding. Result last, one word per row, and a view grouped on it is what the owner reads.

**Delivery.** The record is the delivery, on custom properties created for the purpose: audit date, employment status, job change date, former company, duplicate of, email status, a source label per number slot, the nothing-found date, the value audit word. The portal's own number slots and figure fields are the exception: they are the fields being repaired. Update by record id with `ignoreBlanks: true`, only where the value differs, so a monthly run on a live CRM touches only the records that need it.

**The sample before a CRM write is a data review.** Before the full run of any write onto the live CRM, show the sample rows, ten or every eligible row when fewer, with each value to write next to the CRM's current value and the decision word; say how many records change and which properties, and wait for the user. Approval of the plan is not approval of the data ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "The sample before a CRM write is a data review, not a smoke test").

The second deliverable is the view: one row per record, grouped on the Result word, with the counts per outcome and the run date, which makes next quarter comparable with this one. Where the findings span contacts and companies, the queue is a table with an Object Type word, because a view cannot span two objects, and it carries an owner, a state and an exit, or it is a second copy of the verdict that never changes.

A task only where a person has to act, on the owner the record already carries, with the specifics in the body. A task, a note or a record created twice cannot be undone from the table: gate each create on a key the CRM or a history table already holds, and remember that with `autoUpdateDependents` on, any change to a column a task or note reads re-runs it and posts again ([workflow-patterns.md](./workflow-patterns.md) "HubSpot Engagement Notes as Audit Trail"). Offers: a `slack_send_message_to_channel` or `email_send_email_notification` digest of the counts, a CSV of the exceptions, `baseloop_send_http_request` into the team's own automation (a key or webhook URL in that field is readable by everyone who can read the table, so only with the user's consent). Baseloop writes and marks; the merge, the delete and the outreach stay with people.

## 6. The eight recipes

Four depths, offered in order and built on yes: detect for free, write the finding to the record, act on the finding, the person for the rep. Depth 1 is the base. Recipe 2.4 renames its depths, because a phone queue ends by handing the record back, not a person to a rep.

**Table count.** 2.1 has two, the contacts audit table and the new-employer table the leaver leg runs in, plus the workspace companies table it sends creates to. 2.2 has one per object audited, because the key and the object differ. 2.3 has none of its own: it runs on the contacts audit table. 2.4 has one, the queue table. 2.5 and 2.7 have one per object. 2.6 has two, one per object, unconnected. 2.8 has one per object moved. No table anywhere holds a filtered copy of another.

Cost below is shape only. Read the figure from the action's guide (`get_action_schema`) when it states one; `creditCostHint` in `list_actions` says only free, paid or variable, so otherwise the rate is known after the build's one-row test. Where a recipe names the HubSpot action, the Salesforce, Dynamics 365, Pipedrive and Attio equivalents apply where one exists (`list_actions` names them): Attio has no engagement actions, and Salesforce cannot read activity back (keep Already logged on the row).

### 2.1 Job change audit

Depths 1 and 2 are Prospecting chain C's position check pointed at the whole object ([use-case-prospecting.md](./use-case-prospecting.md) "Chain C. Contacts come from the CRM" holds its tables); the leaver leg and the rep's task are proposed from the rules. Entry point: the whole contact database, or the owner's slice, on the import's schedule.

**Depth 1, detect for free, then one paid check.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The CRM import | `hubspot_contacts_criteria_import` or `hubspot_contacts_list_import`, the audit slice, record limit while building | | free | record id, name, email, company, title, LinkedIn URL, owner, associated company id, last audited date |
| Account record | `hubspot_lookup_object` on the associated company id | id not empty | free | the account is where account data lives, and it is what the position is compared against |
| The account columns | data extraction fields on that lookup | | free | name, domain, owner, stage, open deals |
| Person LinkedIn URL | formula | | free | a company page in the LinkedIn field counts as empty; a portal can hold two LinkedIn fields, so merge them; a Sales Navigator URL is kept apart for the resolver below |
| Public profile URL | `custom_ai_agent`, web search on, from name, company and the Sales Navigator URL | the URL is a Sales Navigator URL AND In this cycle | paid per row | the enrichment accepts only public profile URLs |
| In this audit cycle | formula | | free | the slice plus the last audited date, so a quarterly run does not re-pay for a record checked last month. The import recomputes it on every row it touches, so its comparison with today is fresh each cycle |
| Employment change signal | formula comparing the company a second source implies against the associated company id the contact carries | a second company source on the row | free | Employer current, Employer changed, Not in the CRM. Where the row already carries a company from elsewhere, the comparison is an id against an id and it gates the paid check instead of following it |
| LinkedIn profile refresh | `enrich_contact` | URL not empty AND In this cycle AND the signal did not already say Employer current | paid on success | the paid check; its only input is the public profile URL, merged from the CRM's value and the resolver's. On a recurring audit it carries its own schedule after the import's (section 4). Fallback after two identical failures on valid rows: `custom_ai_agent` with web search for the current position |
| Reverse email lookup | `reverse_email_lookup` on the record's address | URL empty AND email not empty AND In this cycle | paid on a match, and it bills when the match is the wrong person | the way in where the record has an address and no profile URL; the surname it returns is compared with the record's own before anything downstream reads it |
| Current employer, Current title, Profile URL resolved | data extraction fields | | free | the refresh also returns the employer's website, the role start date and the person's city, so nothing after it buys those again |
| Position check | formula | | free | Still there, Promoted, Left the company, Employer differs from the account, Not checked. Whole values against the account's name and domain, every current position, an acquirer counted as the same organisation, leaning towards Still there: a wrong leaver flag removes a real contact from every campaign, a missed leaver costs one bounced email |
| New employer | formula | | free | the employer the profile lists as current and matched, else the first current one, with its company page; this carries the row into depth 3 |
| Result | formula off a helper that says whether the refresh ran | | free | Still there, Promoted, Left, No LinkedIn URL, Out of this cycle, Pending |

**Depth 2, write the finding to the record.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Title to write, Profile URL to write | formulas | | free | empty unless the value actually changed |
| Employment status, Audit date | the status formula, and a date formula that references the refresh column as its trigger | | free | no action exposes its run time, so the table column is a trigger-bound formula and the CRM property written below is the record: the next import reads it back for the In this cycle test, and a row the import merely touched keeps the property's date |
| Location check, Location to write | formulas on the profile's location | | free | the same paid lookup answers where the person now sits, so a territory question rides for free |
| Update contact | `hubspot_update_object` by record id, `ignoreBlanks: true` | one "to write" value present AND record id | free | never the company name over a human's spelling; custom properties for the audit's own words. Gated on the verdict column, never on the judge not having errored: a judge skipped by its own gate has no error, and the write fires on the rows the judge never judged |
| Result | formula | | free | adds Written |

The full run of the update waits for the data review in section 5.

**Depth 3, act on the leaver, in its own table.** Rows where Position check is Left the company are sent on; the row stops being about the old account, so it moves.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The leaver row | `send_to_table` | Position check = Left the company | free | one row per contact: a re-send updates it, so a second move overwrites the first; the contact id stays its own column for lookups |
| New employer group | a formula key on the new employer's company page from the profile, counted by `lookup_multiple_records`, then one ICP screen per company; a row with no page goes to review, never into a name group | at least two leavers share the page, else per row | free, plus the screen | leavers going to the same new employer are one company, and each company is screened against the seller's ICP before anything is created, or the audit fills the CRM with accounts nobody wants |
| New company profile | `enrich_company` on the new company page URL | page URL not empty | paid on success | resolves the slug and returns the domain |
| New company in the CRM | `hubspot_lookup_object` on OR groups: domain; company page; name last | domain OR company page | free | the CRM itself, not a workspace copy of it |
| Send company for creation | `send_to_table` into the workspace companies table | not found AND domain not empty | free | created there once. On that table: `set_auto_dedupe` on domain (keep oldest) after the one-row send has created the column and before the full run, approved by the user with the table, the column and how many rows would go; the create gated on its own CRM lookup's `isNotFound` and carrying every property the update writes. A create with no domain produces duplicates |
| New company id | formula | | free | the found id, else the created one, looked back up from the companies table: one Effective ID, so there is one create, one update and one association per record |
| Identity and association decision | live contact read (`hubspot_lookup_object` by record id), then formula | contact record id AND new company id | free | Same company, Moved, Missing association, Review. Confirm one person before comparing company ids; an ambiguous identity is not a confirmed move |
| Preserve the old relationship | stored former company name, domain, id, title, buying role and observation date | confirmed move AND history not already saved for this change | free | save before changing the association; keep the job-change date separate from the observation date. A company name overwritten by the next import is not history |
| Apply the old-association policy | an owner review: no action removes a HubSpot association | confirmed move AND new company resolved AND policy permits removal | free | retain the former link, or hand its removal to the owner as agreed |
| Associate the contact | `hubspot_update_object` with `associateWithObject: true`, the new company id | confirmed identity AND new company id AND the decision permits the write | free | ungated, it fires on an empty id and fails |
| Work email at the new employer | `waterfall_email_enrichment`, verdict at `status` in its fullValue (`{{email.status}}`) | new domain AND first AND last AND no verified address at the new domain | free on the org's own key, else paid on success | the old address is dead by definition, so this is the replacement, not an enrichment |
| Buying role at the new employer | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) "1.5 Role classification on every contact", cited | confirmed move AND the agreed reassessment policy applies | as 1.5 | a confirmed champion at the old company is not automatically a champion at the new one |
| Update the contact | `hubspot_update_object` by record id, `ignoreBlanks: true` | new employer AND not already written for this change | free | a refused email is a duplicate found: show the other record id, write the rest without the email, leave the merge to the rep |
| Verify association | `hubspot_lookup_object` on contacts, the record id plus the search API's association filter on the new company id, where the portal accepts that filter | association write completed | free | no action reads a record's associations back; where the filter is refused the word is Association unverified and the owner checks in the CRM |
| Result | formula | | free | New employer written, Company created, No domain, Email conflict, Identity review, Association repair needed, Pending |

Old-link removal is the owner's step in the CRM: establish and verify the new link, and never call the move complete until a read confirms it. Newer design: run the recovery sequence on a small slice first.

**Depth 4, the person for the rep.** A leaver is a hole at the old account and a warm contact at a new one, and those belong to two different people. A `hubspot_create_engagement` task on the old account's owner says the relationship there is gone and who else is on the account; a task on the new account's owner, or the unowned queue, carries the person, the new company and the history. Both gated on a surviving finding and on an Already logged key read through `hubspot_get_engagements`, so a re-run writes nothing twice.

Offers: a digest of the cycle's counts and the leavers at owned accounts; the leaver as a new contact in a re-introduction campaign, gated on a verified email at the new employer; the waterfall and the enrichments at zero credits on an own key.

Check the detection rate against the list before it counts as a finding. The follow-through is the weak part: gate the final update and the association on their inputs, give the employment property one writer, and never pay for a refresh whose only reader is a note no gate reads.

### 2.2 Duplicate audit

One table per object: companies, and contacts. Everything is free except the judge on domain-family candidates, the argument for running it first.

**Depth 1, detect for free.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The CRM import | `hubspot_companies_list_import` or `hubspot_contacts_list_import` on a list of every record (a criteria import fails above 10,000 matches without a record limit) | | free | record id, and the fields the key is built from |
| Dedupe key | formula | | free | companies: the domain family, from the bare domain lowercased with scheme and www stripped. Contacts: the email, lowercased; and a second key of first name plus last name plus company |
| Matches on this key | `lookup_multiple_records` targeting the same table on the key column, `filterOperator: "equals"` | key not empty | free | a formula reads its own row only, so counting duplicates is a lookup that targets its own table. The match is exact on the stored value, so the key formula does the lowercasing, and the row finds itself. Run it after the import has landed, not on new rows: a lookup into a table still importing reads a partial set |
| Match count | the lookup's `count` | | free | above one is a duplicate |
| Duplicate of | extraction of the other record ids from the lookup's `records` | count above one | free | the ids and links of the twins, not a Yes |
| One account? | `custom_ai_agent`, web search off, on the group's names, domains and pages | count above one AND the keys differ in more than case | paid per row, free on the org's own key | Same, Different, Unsure, with the reason; only Same reaches the write, and Unsure goes to the queue |
| Result | formula | | free | Unique, Duplicate group of N, Candidates, No key, Pending |

A name is not a key: three spellings of one company are three rows. The contact needs two keys, because email is unique in the CRM, so the same human on two records has two different addresses. The company key is a domain family rather than a bare domain: a regional site, a sub-brand and a holding company are the real duplicates, so the string match generates candidates and the judge decides. Where the owner already holds candidate groups, those are the entry and the self-lookup is skipped. Never switch on `set_auto_dedupe` here: it deletes rows permanently, and the next import re-creates them.

**Depth 2, write the finding to the record.** A custom property holding the other record ids and the group size, written by record id with `ignoreBlanks: true`, only where the value differs, after the data review in section 5. For companies the finding goes to the CRM's own additional-domains property where it has one, read first and merged with what is there, because that property also changes how the CRM associates new records. The finding is a filter the whole team can use; the view grouped on Result is the count the owner reads.

**Depth 3, act on the finding.** The queue is a list in the CRM, worked top down, naming the records in each group and which one the rule says survives, with a task only where one group needs a named person, keyed so a re-run does not create a second one. No merge, ever, and the next cycle re-imports before it decides anything, because merged-away record ids stop resolving.

There is no fourth depth. The merge is ops work, not a rep's.

Candidate groups over-group: one often holds more than one real organisation, so the judged step mostly splits name-alikes apart, and its confidence gates the write.

### 2.3 Dead email audit

Proposed from the rules. It runs on the contacts audit table, because it needs 2.1's position check and import; no standalone email verification action exists, so the waterfall is both replacement and check.

**Depth 1, detect for free.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Address shape | formula | | free | read the cell by content: not an address at all, a personal freemail domain where a work address belongs, a role address |
| Bounce state | import columns for the portal's own bounce and unsubscribe properties | | free | the property names read back with the owner, never guessed |
| Employer test | the position check from 2.1 | | free | a leaver's address at the old domain is dead by definition, and costs nothing to conclude |
| Email status | formula | | free | Stands, Bounced, Personal only, Dead employer left, Not an address, Not checked |
| Replacement | `waterfall_email_enrichment`, verdict at `status` as in 2.1 | Email status is not Stands AND current employer AND first AND last | free on the org's own key, else paid on success | the waterfall verifies what it finds and flags catch-all, so it is the check, not a separate step |
| Replacement check | formula: the found address against the rejected and current addresses | | free | the waterfall takes no rejected-address input and can return the bounced address itself with a deliverable status; an address in the rejected set is not a replacement and never reaches the write |
| Result | formula off a helper that says whether the waterfall ran | | free | Address stands, Replaced, No replacement found, Not checked, Pending |

**Depth 2, write the finding to the record.** The status on its own property. A found replacement becomes the primary address and the old one moves to the additional-emails property; where none was found, the record is marked and nothing erased, because a marked address is a filter marketing can exclude and an empty one is a lost fact. The change test compares the column that changes: against a property that has already moved, every real change reads as no change.

**Depth 3, act on the finding.** A refused write means the address belongs to another record, which is a duplicate found and a hand-off to recipe 2.2, not an error. Everything else is an exclusion list the sender uses: a view or CSV, gated on Email status not Stands; no action suppresses an address in a sequencer. The person depth belongs elsewhere: a contact worth re-approaching after the address is fixed is Prospecting chain C or CRM reactivation, and this recipe hands them the clean address.

Offers for 2.2 and 2.3: the digest of counts and the merge queue in Slack or email; the waterfall at zero credits on an own key; the per-account version when a new account is created, its other domains researched and written on its record.

### 2.4 Dead phone audit and replacement

It is 2.3's shape with a number instead of an address, and [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) "1.4 Mobiles for the whole CRM" sits inside it as the slot-filling half.

Three things are specific to a phone: no verification action exists, so the only verdict comes from a person dialling; a contact carries several number slots, so the output is an ordered set; and the rejected numbers are worth keeping.

Entry point: a request property the CRM's own workflow sets when a rep has exhausted the numbers on a record, plus a blocklist property holding every number already rejected. The queue is the property: the record joins because the flag is true and leaves because the last depth sets it false. Read the request once into a plain column: read from a property the build later resets, it is erased on the next re-run.

**Depth 1, detect, mostly for free.** Most records end here.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The CRM import | `hubspot_contacts_list_import` over the request property, on the native schedule | | free | record id, name parts, company, every number slot the object holds, the blocklist property, the run mode. A record returning to the queue is an updated row, so the ladder below re-runs on it through a field run gated on the request flag, not through the import |
| Run mode | import column | | free | the requester's own word for how deep to go. The free mode runs no provider at all and only re-sorts what the CRM already holds |
| Rejected numbers | import column for the blocklist property | | free | every number a rep dialled and found wrong, produced for free as a by-product of calling |
| Slot 1 | formula over the candidates in priority order | | free | the first candidate whose last ten digits are not in the blocklist. Digits only, after stripping spaces, dashes, brackets and plus signs, because a raw string test passes every spelling |
| Slots 2, 3 and 4 | the same formula, each also excluding the slots above it | | free | the ladder. Without it one number fills two slots and the record looks like it has two numbers |
| Source per slot | a formula next to each slot | | free | which candidate won. Without it nobody can ever settle which provider is worth paying |
| Result | formula off a helper that says whether any provider ran | | free | Re-sorted, Replaced, Nothing left, Free mode, Pending |

The providers run cheapest first, each gated on the one before leaving a gap, and every candidate they return goes through the same blocklist test.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Own-account providers | the native actions on the org's own accounts: `waterfall_phone_enrichment` on an own key, `zoominfo_enrich_contact` on the org's ZoomInfo account, in the org's order | a slot still empty AND not the free mode | free on the org's own accounts | a provider with no native action is not called over `baseloop_send_http_request`: that action carries no connection, and a key typed into a field is readable by everyone with access to the workspace |
| Phone waterfall on Baseloop credits | `waterfall_phone_enrichment` | every own-account provider left the slot empty | paid on success | last in the recipe: the most expensive thing in the library |
| Candidates into the ladder | the same slot formulas, extended | | free | a provider's number is a candidate like any other and is dropped if it is on the blocklist |
| Source alive per provider | each provider column's `failedRows` over `totalRows` in `list_runs` | | free | a failing provider looks exactly like a provider with nothing to return |

**Depth 2, write the finding.** The four slots, the source label per slot, and the dated stamp.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The live read it owes | `hubspot_lookup_object` on the record id before the write | record id | free | a set-owning write must read the record first, or a number a person typed in since the last import is not a candidate and is overwritten |
| The number write | `hubspot_update_object` by record id, `ignoreBlanks: true` | the optional provider steps have settled | free | an emptied slot is never cleared: an empty column reaches the update as nothing and is dropped whatever `ignoreBlanks` says, and a phone-number property is never sent empty, so the old number stays; flag it for the owner. An all-empty payload fails outright rather than writing nothing |
| Nothing found stamp | a date formula triggered by the last provider column, then its own update | every slot empty | free | a dated "we looked and found nothing" on its own property; the CRM property is the record, the column only the trigger. Without it the CRM cannot tell "we tried" from "we have not got to it", and the same exhausted contact is requested forever |
| Do not call | extraction of whatever the provider returns | | free | a provider flag that reaches a column and gates nothing is worse than no flag. It blocks the slot |

**Depth 3, act.** One update setting the request flag false, the run mode empty and the audit date, which takes the record off the queue. It needs an alarm when it fails, because the clear is the only brake on the re-import. It is bookkeeping, not delivery, so nothing announcing the run may read it.

Offers on connected tools: a Slack line per repaired record, gated on the number write and never on the clear; the whole ladder at zero Baseloop credits on an own key; a task on the owner for a record that came out empty, gated on the nothing-found stamp.

The blocklist does real work for free: a stored primary number is often one a rep already rejected. What breaks is at the end: a write from a stale candidate list blanks numbers people typed, and a Slack line gated on the clear announces syncs that did not happen.

### 2.5 Value audit against a public constraint

The cheapest audit in this file: one formula. The other recipes ask whether the person is still there; this one asks whether the number in the field can be true at all, wherever a filled figure has to sit inside a band somebody else publishes: a revenue figure against a company's own filing exemption, an employee count against a size band on a public register, a licence count against a published tier. Entry point: the whole object, or the slice the owner chose, on the import's schedule.

**Depth 1, detect, mostly for free.** The paid step below runs only where the CRM lacks the register number.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The CRM import | `hubspot_companies_list_import` on a list of every record | | free | record id, the figure being audited, its currency and unit, and whatever identifies the record to the public source |
| The public identifier | the register's own number, normalised in a formula, resolved where the CRM does not hold it | | free where the CRM holds it; else a free register search over `baseloop_send_http_request`, then `custom_ai_agent` to pick the record, paid per row on those rows only, their count read before the run | resolved, never constructed |
| The constraint | a free public register read over `baseloop_send_http_request` | identifier not empty | free | for example a company's own filing exemption; only the resolution can cost |
| Band from the constraint | formula against the published thresholds | | free | the thresholds as rules, not as a prompt. They are public, fixed and countable, so this is a formula and never an agent |
| Audit word | formula comparing the CRM's figure against the band | | free | Consistent, Below the band, Likely a factor of ten out, Above the band, No filing basis, No figure in the CRM. The factor-of-ten case is a dropped digit on import and it earns its own word, because the fix is different |
| Scale check | formula on the figure's own currency and unit | | free | a correct figure banded on the wrong scale is the same defect as a wrong figure |
| Result | formula off a helper | | free | Consistent, Flagged, No basis, Not checked, Pending |

**Depth 2, write the finding to the record.** The audit word and its date on custom properties, by record id, `ignoreBlanks: true`, only where the value differs, plus the view grouped on the word. A finding that lives only in a view inside Baseloop breaks this file's rule that the record is the delivery.

**Depth 3, act on the finding: buy a figure, on a sample.** `parallel_research` on a hand-picked slice, compared against the CRM's figure by ratio rather than by difference, so the bands mean the same thing at every size. The sample is the point: the free word already told the owner how big the problem is, and the paid step proves the free word was right before anybody agrees to correct thousands of records.

There is no fourth depth. Correcting a figure a person entered is a decision for the record's owner, and the recipe's job ends at handing them a filtered list and a reason.

Offers: a task on the owner for the flagged records; the counts per word per cycle in Slack or email; the sampled figure at zero credits on an own research key.

### 2.6 Normalise the words the CRM groups on

The field is filled, the value is right, and it is unusable, because it is not one of the words the CRM can filter or group on: industry as free text, a country in three spellings, a name in capitals with an emoji. The safety rule, and the reason the recipe exists: the target vocabulary is the CRM's own option list, read for free off the import, and a value already legal in that list is never replaced.

**Depth 1, detect, mostly for free: canonicalise.** The agent below runs only on values a rule cannot map; count them before the run. Two tables, one per object, unconnected.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The import | `hubspot_companies_list_import` or `hubspot_contacts_criteria_import` | | free | the fields to normalise, and the CRM's option list for each fixed-vocabulary field, which arrives as the select column's options |
| Name case, country code, phone format, domain, currency, stage | formulas | | free | anything a rule can state: a join against the CRM's list, never a model. Each cleaner carries its exception list, because title case turns initials into words |
| Needs agent | formula: the raw value is not legal AND no rule maps it | | free | the only thing the agent runs on |
| Country name, industry, job title | `custom_ai_agent`, web search off, handed the CRM's whole option list | Needs agent = Yes | paid per row, free on the org's own key | a subset is a silent rewrite. Where the list is too long for the prompt, the agent returns the name it read and a formula returns the key |
| Already legal | formula: the raw value against the CRM's list | | free | legal values are never touched |
| Result | formula | | free | Legal, Normalised, Unmapped, Empty |

**Depth 2, write the finding to the record.** A live read of the record, a to-write column per property, `hubspot_update_object` gated on the value differing, `ignoreBlanks: true`, and never a catch-all: OTHER or UNKNOWN is a word for a person to filter on, and as a value it corrupts the field or fails the payload. The full run waits for the data review in section 5.

**Depth 3, act on the finding: fill the gap first.** Only where the field is empty, one `enrich_company` or one web agent gated on the empty test, so the normaliser has something to read.

**Depth 4, the count per field.** Legal, Normalised, Unmapped and Empty per property, per run. That number is what makes the recipe repeatable.

Offers: the same pass run before any judge that reads these fields, so one column serves the gate, the judge and the write ([use-case-tam-sourcing.md](./use-case-tam-sourcing.md) "3.3 From the CRM's own companies"); the mapping table kept as the seller's own vocabulary for the next import.

### 2.7 Dead domains and empty accounts

Two free audit words no other recipe asks: does the website still answer, and does the account have anybody on it.

**Depth 1, detect for free.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The import | `hubspot_companies_list_import` on a list of every record, or `hubspot_companies_criteria_import` for the owner's slice | | free | domain, record id |
| Cleaned domain | formula: lowercase, strip the scheme, the path and a leading www | | free | the probes below are built from this, never from the raw property, or www.example.com becomes www.www.example.com |
| Domain valid | formula: labels, a dot, a real TLD | | free | |
| Domain answers, root | `baseloop_send_http_request` to `https://<cleaned domain>/` | Domain valid | free | Live on a 2xx, read from the step's own output; the action follows no redirects, so a site that only redirects fails this probe |
| Domain answers, www | `baseloop_send_http_request` to `https://www.<cleaned domain>/` | Domain valid | free | the second chance for a site that redirects apex to www. Anything else fails both cells, and a failed cell reads as empty to a formula, so a bot block, a dead site, a DNS failure and a TLS failure are one word, Review, never Dead |
| Contacts on the account | `hubspot_lookup_object` for contacts on the company id (`associatedcompanyid`), limit 1 | record id | free | an account with nobody on it is a record nobody can work |
| Issue | formula reading both probes and the contact count | | free | Live when either probe returned a 2xx; review, no contacts, both, or none. A compound word forces every gate onto contains, so say so |
| Result | formula | | free | Live, Review, Empty account, Both |

**Depth 2, write the finding to the record.** The issue word and the date on custom properties, by record id, only where the value differs, plus the review queue table with the Object Type word.

**Depth 3, act on the finding: fix on the slice.** Only the flagged rows reach a paid table: the Review rows researched with `custom_ai_agent` and web search, which decides dead, moved or blocked and finds the new domain, checked live before it is written; contacts found for the empty account through [use-case-prospecting.md](./use-case-prospecting.md) "Chain B. A list of companies comes in". Every paid step gated on the free word, and every fix table ending in a confidence word one write reads. Whether that write goes straight to the CRM on a high confidence word or waits for a person is the owner's choice, asked, never the recipe's.

A failed cell reads as empty in a formula, so the dead-domain word tests for a 2xx, never for the probe's error text.

### 2.8 Clean on the way into a new CRM

Cleaning is cheapest before the move, because everything wrong today is copied into the new system and becomes permanent there. This recipe runs the other recipes first, moves only what passed, and keeps the map between the old ids and the new ones; its write lands in the new CRM. Newer design: run the destination half on a small slice first, with Salesforce, Pipedrive and Attio each carrying a native import, lookup, create and update.

Entry point: the old CRM, object by object, companies before contacts before deals, because each one needs the ids the one before it created.

**Depth 1, detect for free: clean and stage.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The import | the old CRM's import, one per object | | free | every property that will move, plus the record id |
| The audits | recipes 2.1, 2.2 and 2.6 on this table | | per those recipes | the leaver, the duplicate and the unusable value are found before the move, not after |
| Move decision | formula | | free | Move, Hold, Drop, with the reason; a Drop is decided once for a class of records, never row by row |
| Result | formula | | free | Staged, Held, Dropped, Pending |

**Depth 2, write the finding: map to the new CRM's fields.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The destination's lists | read off the new CRM's action options (`resolve_action_options`) or its import | | free | its option lists, its required fields and its own spelling, read from the system itself and never assumed |
| To write, one per property | formulas | | free | the value in the destination's vocabulary, empty where the two CRMs disagree and no rule decides |
| Owner and stage map | one table joined on the old value | | free | ids differ between systems, so the map lives in one place and a missing entry is a word, not an empty |
| Ready to create | formula | | free | every required field present, or the row waits |

**Depth 3, act on the finding: create and keep the crosswalk.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Already moved | `lookup_single_record` on the crosswalk table by the old record id | | free | the key that makes the move re-runnable |
| Already in the new CRM | `salesforce_lookup_object`, `pipedrive_lookup_object` or `attio_lookup_object` on the record's unique key | Ready to create AND not Already moved | free | a destination that already holds records (an earlier partial move, a team already working in it) is checked before anything is created there |
| Create in the new CRM | `salesforce_create_object`, `pipedrive_create_object` or `attio_create_object`, from this object's own table | Ready to create AND not Already moved AND the destination lookup is not found | free | companies first, then contacts with the association read from the crosswalk |
| Crosswalk row | `send_to_table` writing the old id and the new id | create succeeded | free | written at the create, because the lookup re-runs later and then finds everything |
| Result | formula | | free | adds Created, Already moved, Failed with the destination's reason |

**Depth 4, reconcile.** Counts per object, old against new, and a list of what did not move with its word: a migration nobody can reconcile is a migration nobody can sign off.

Offers: keep the crosswalk after the move, because integrations and reports quote the old ids for months; the first enrichment pass on the moved records ([use-case-crm-enrichment.md](./use-case-crm-enrichment.md) "1.1 Enrich all companies"); the reconciliation counts per object per run.

## 7. Offering the next depth

When a depth is built and verified, the plan or the report ends with one line naming the next depth, and at most three offers in all, deepest first, in this use case's order: detect for free, write the finding to the record, act on the finding, the person for the rep. Each names the table, the object, the finding and the work in full, so it reads as a new request, never as resuming a plan that is already finished.

After depth 1, the offers are, deepest first, the act depth in its own table, then the write-back, then the schedule on the import. After depth 2, they are the growth into the neighbouring use case the findings point at (the leaver's new employer screened as an account, which is TAM sourcing; the seat left empty, which is ABM; a fixed address handed to Prospecting chain C), then the person for the rep, then the act depth. Offer, never assume, and never build the next depth because it seemed obvious.
