# Inbound Enrichment

Use this recipe when a lead arrived on its own (a form, a product signup, a demo request, a referral, a record a warehouse or a CRM workflow pushed) and the team wants it identified, qualified, in the CRM with an owner, and in front of a rep within minutes. It covers three entry points: a new or changed CRM record (5.1), a webhook from a form, a product or a system (5.2), and a referral from a partner (5.3).

This file does not repeat the shared rules. Read [gtme-rules.md](./gtme-rules.md) for taking the request and building, and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) for working a CRM and delivering, before you plan. What follows is what changes when the lead chose us and the clock is theirs.

## 1. The job

Inbound is the one motion where the lead chose us. The work is the same every time: find out who this is and where they work from what arrived, often only an email; check the CRM; enrich; decide whether they fit; write the record with an owner; tell the rep; find the buyer at the company when the signup is not the buyer.

Typical requests: "signups come in with just an email", "leads sit with no owner", "filter students and competitors out of demo requests", "we get more trial signups than the team can call". What they want back: the person and the company on the record within minutes, a fit word with the reason, the right owner, a task or an alert, and no duplicate. Then the buyer at the company when the signup was a user. What kills it: a lead that sits, a personal-mailbox signup enriched at full price, a student marked ICP because the judge had nothing and guessed, a blocklisted company researched and written back, a phone bought for every signup.

Speed comes from the schedule and the gates, not from skipping checks.

## 2. Where Inbound enrichment stops

- **Prospecting** recipe 9.8 is the backlog of engaged leads, once. Inbound is on arrival, recurring, and the rep must hear about it the same hour. Chain A (the person completed from what arrived) is written in [use-case-prospecting.md](./use-case-prospecting.md) and cited here; read it when a recipe below cites it.
- **ABM** ([use-case-abm.md](./use-case-abm.md)) owns the buying committee at the company. Depth 5 here is ABM 6.2 (net-new per persona) written once and cited.
- **Signals** ([use-case-signals.md](./use-case-signals.md)) owns a record that arrives because something happened at a company. A signup is a person who acted, and belongs here.
- **CRM enrichment** ([use-case-crm-enrichment.md](./use-case-crm-enrichment.md)) fills fields across the whole object on a schedule. This file fills one record on arrival.
- **Outbound** ([use-case-outbound.md](./use-case-outbound.md)) takes the qualified lead into a campaign as an offer; Rep assist (reply classification; no written recipe in this plugin) reads what comes back.

## 3. Taking the request

The shared rules set the order: what the user sells, the input, the connections, then the questions. What Inbound enrichment adds at each step:

1. **What the user sells supplies the two lists.** Students, competitors, agencies, free mailboxes, countries, sizes: what is a good lead and what is not. The second list is what stops the judge stretching. There is no saved company profile here: ask the user, draft both lists, and have them confirmed.
2. **Check what is connected** with `get_connected_platforms` and `list_actions` (`connectionMode`, `connectionStatus`): the CRM, Slack, the sequencer, the provider keys. The owner rule and the alert channel come from here.
3. **Read one real payload per event type before naming a step** (a sample the user pastes, or `get_row_details` on a row that already arrived). A form webhook carries an email and a few fields. A product webhook carries the user, the org and the plan. A CRM-sent webhook or a CRM list import carries the record ids and often a verification verdict. A warehouse or a partner list carries its own identifiers. A payload that already carries the CRM ids and a verification word skips every identity step.
4. **A recurring build that writes new records and sets owners on a live CRM** always gets the full plan document and the user's approval before anything is built. Setting the owner overwrites a routing-critical property: name it in the plan's Run Intent.
5. **Ask one question at a time** with the blocking question tool, at most four, each with its recommended default when it has one.

Rank the open questions in this order and ask the top four. Everything below the cut ships as a stated default that the plan announces.

| Rank | Question | What it decides | Default when it ships unasked |
|---|---|---|---|
| 1 | Where do leads arrive, and what does the sender already know? | The recipe (5.1, 5.2 or 5.3), the intake table and which identity steps exist at all | Read from the payload |
| 2 | Who gets the lead? | Territory, round robin, the account owner when the company is known, a default. Read the portal's own owner ids with `resolve_action_options` on `hubspot_owner_id`. A company that is already a customer or in an open deal goes to that owner, never to an SDR | The account owner where the account is in play, else one named default owner |
| 3 | What happens to a personal email? | Some teams drop it before any spend, some refuse it at signup, some want it resolved. It is the first free gate either way | Stop at the gate; never enriched, never the primary email |
| 4 | Which accounts must not be touched? | The blocklist by domain and CRM id. A blocklist column nothing reads stops nothing: the blocked companies are researched and written to the live portal | The CRM's customers and open deals, plus a blocklist table the team fills |
| 5 | How fast, and where does the rep hear? | The schedule on the import sets the speed; a task on the record, Slack or email is where the rep looks | The rate new records arrive at, and no more often than once an hour for a CRM list (every fire re-imports every record on the list, so a ten-minute import on a list that gains a record a day is cost with nothing to show); a task on the owner |
| 6 | Do you want the buyer at the company? | When the signup is a user, the committee is a second step, priced per person found | Offered after depth 3, never built unasked |
| 7 | How deep? | Identify and enrich; qualify; write, route and alert; the mobile; the committee | Identify and enrich, then the offers |

## 4. What changes for Inbound enrichment

**The email is the identity.** Company from the domain, never from the company name field, which is empty on most signups. Personal email is the first free gate. Name parts from the local part when nothing else exists. Only then the paid steps, each gated on the cheaper one having missed: the company page from the domain, a reverse lookup on the email, the profile enrichment. On a business trial funnel the personal-email gate stops few rows, so it is cheap insurance and not a saving. The company page call on the org's own model key costs no credits, which is why it runs before any paid lookup.

**Company before contact, deduped, re-expanded.** One account table deduped on domain, one company enrichment serving every signup at that domain, contacts fanned back out from it. Companies are created from the account table only ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "Companies are created from their own table"): a HubSpot company create never dedupes. This is what makes the arithmetic work at hundreds of signups a week.

**The fan-out is gated on identity, never on the write.** A rejected enum, a rate limit or a duplicate key fails the write, the gate is answered once, and contacts gated on that write are lost for good.

**Qualification lives in the build, not in the CRM's list criteria.** An ICP test kept in a CRM list closes the loop outside the build. The recipe puts the fit word, the persona and the reason on the row and writes them back, so the CRM and the table agree.

**A judgment needs at least one fact.** With no facts the judge guesses, and can invent the company name. Gate the judge on the enrichment having returned something (`isFound` on the enrichment: `enrich_company` and `enrich_contact` write "Not found" as a success, which passes a not-empty gate), and give it Unclear as a real word.

**A repeat arrival is not counted.** The account table's key keeps the first row for a domain and drops the rest, and no row counts how often a signup came back; Baseloop cannot count returning signups reliably yet, so tell a user who asks to track them.

**A blocklist that stops nothing is a false safety.** Same run, one row stopped by it, before the build is trusted.

**A personal address never goes in the primary email.** It is the CRM's unique key and the rep's own channel. A found personal address goes to the additional-emails property.

**A validator that cannot fail has not been tested.** An email checker can answer an authentication failure inside a 200 body: the cell reads success, every row falls to "unverified", and the forwarding gate reads that word. An HTTP 200 is transport, not a result: read the body's own status key, and gate on the states that mean go, all of them named. A validator that needs a key is a credential problem: `baseloop_send_http_request` carries no connection, and a key typed into it is stored in the field config and returned by `get_table_schema` to everyone who can read the table ([gtme-rules.md](./gtme-rules.md) "A credential lives in a connection"). Where the team has a keyed validator, prefer its verdict arriving on the payload from the sender's side, read as a word; put the key in a field only with the user's explicit consent.

**A resolution is worth keeping.** A memory table of "partner plus their id" to the CRM company id, so a repeat referral is matched for free. What enters the memory needs a higher bar than what passes one write, and every memory row carries how it was decided and when ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "A resolution is worth keeping, and what enters the memory needs a higher bar than what passes one write").

## 5. The sequence, and the delivery

The lead arrives. Free first: personal or business email, the domain, the name parts, the sender's own ids and verdicts, the blocklist, the CRM lookup on what arrived. Then identity where it is missing: the company page from the domain, the person's profile from the reverse lookup or the finder, each gated on the previous miss. Then the enrichment, company then person. Then one judgment call with the seller profile and the two lists, gated on facts having come back, returning the fit word, the persona, the seniority, the reason. Then the write: company from the account table, contact by id with the association, the fit and the reason on the record, the owner by the agreed rule, the task, the alert. Then the mobile, only on a qualified buyer where the CRM has none. Then the committee, only when asked. Result last.

**Delivery** is the CRM record: contact updated or created with the association, the fit word, the persona and the reason as properties, the owner set, a note with the specifics, a task on the owner. Slack or email to the owner is an offer, after the record, never instead of it. The sequencer is an offer: the qualified lead handed to a campaign (the add-to-campaign actions take a per-row `campaignId` with `campaignId__dynamic: true`), and the reverse, a lead who converted or replied paused in the campaign. A warehouse or any system with an endpoint takes an HTTP post in its own shape, from an output table built in that shape ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "Format for the destination"). Baseloop sends no outreach itself.

## 6. The three recipes

Depth 1 is the base. Each next depth adds on the one before, in the order speed to lead wants it: identify and enrich, qualify, write and route and alert, the mobile, the committee. Offered in that order, built on yes.

**Table count.** Three: an intake table per source, an account table deduped on domain, and a contacts table the account table re-expands. A committee table only at depth 5. Age bands and campaign copies are views or a source column. When the user names a different table shape, build that, but keep one domain-keyed account row as the single writer for enrichment and company creation (a separate account table with auto-dedupe on domain, however small; a `lookup_single_record` check only beside it, never instead), never domain auto-dedupe on a contacts or intake table, which permanently deletes every extra person of the same company, and say once what three would have given.

Cost below is shape only. Read the figure from the action's guide (`get_action_schema`) when it states one; `creditCostHint` in `list_actions` says only free, paid or variable, so otherwise the rate is known after the build's one-row test.

### 5.1 A new or changed CRM record

The lead is already in the CRM; the job is to make the record useful and route it. The record arrives by a CRM list or criteria import on a short schedule, or by a CRM workflow posting each record to a webhook source with its ids. Either way, switch `autoRunOnNewRow` on for the intake table so new rows move on.

**Depth 1, identify and enrich.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The record | `hubspot_contacts_list_import` or `hubspot_contacts_criteria_import` on a schedule, with a record limit for the first run, or a webhook source the CRM's own workflow posts to | | free | record ids, email, name, whatever the CRM holds, the verification word when the sender has one |
| Source alive | not a formula (it sees one row and recomputes only when that row changes): the newest row's Created At against the interval (a view sorted on Created At), plus the import's runs (`list_runs` for a failed fire, `get_run_status` for the `sourceImportSummary` of rows a fire created) | | free | a schedule that fires far more often than rows arrive shows up here |
| Email type | formula: personal or business, against one freemail list | | free | the first free gate; personal stops here unless the request said otherwise |
| Domain | formula from the email | | free | the account key, never the company name field |
| Blocklist | `lookup_single_record` on domain and CRM id | | free | Blocked is a word that stops every paid step and the write |
| Account status | `hubspot_lookup_object` on the company record: owner, open deals, lifecycle | | free | a customer or a live deal routes to its owner and skips the SDR path |
| Send to accounts | `send_to_table` in `send_row` mode; on the account table `set_auto_dedupe` on domain, `keepRule: "oldest"` so the enriched row stays, switched on after a one-row send creates the column and before the full run, approved by the user with the table, the column and how many rows would go | Business email AND not Blocked | free | one row per company |
| Company page | `custom_ai_agent` with web search, or `parallel_research` at its `lite` tier | domain not empty AND page empty AND not Blocked AND Account status not in play | paid per row, free on the org's own key | resolved, never constructed; an account in play goes to its owner as it is, and nothing is spent on it |
| Company profile | `enrich_company` on the LinkedIn company page | page not empty AND not Blocked AND Account status not in play | paid on success, free when not found | name, industry, size, HQ, description |
| Name check | formula: the returned name against the arriving one | | free | Match, Differs, Not checked. Not checked when no name arrived, which is most signups, and the create then rests on the domain; Differs stops the write, because a wrong page renames a company in the CRM silently |
| Person profile | `enrich_contact` | profile URL contains `/in/` | paid on success, free when not found | the CRM's URL first; a company page in the URL field counts as empty |
| Profile URL found | `reverse_email_lookup`, then `custom_ai_agent` with web search | URL empty AND business email AND not Blocked AND Account status not in play | 3 credits on a match, 0 on a miss, billed even when the match is the wrong person; then paid per row | each gated on the cheaper miss; the reverse lookup's returned name is checked against the arriving one before the row trusts it |
| Merged first name, last name, title, company, domain | formulas | | free | the CRM's value first, the profile's for what a profile owns, never a failed step's output |
| Result | formula off a helper | | free | Enriched, Personal email, Blocked, No profile, Account in play, Pending |

**Depth 2, qualify.** One call, every output, gated on at least one fact having come back.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Facts found | formula | | free | the judge's floor |
| Fit | `custom_ai_agent`, web search off, the seller profile in the system prompt with both lists | Facts found | paid per row, free on the org's own model key | fit word (ICP, Not ICP, Unclear), persona, seniority, the reason, and the offered outputs; numbered rules that stop at the first match and return the rule number beside the verdict |
| Output columns | extraction columns on the agent's outputs a gate, a write or a person reads | | free | |
| Phone eligible | formula on fit, size, seniority, persona | | free | the yes or no a person can read before the expensive step |
| Result | formula | | free | adds ICP, Not ICP, Unclear |

**Depth 3, write and route and alert.** The owner, the task and the alert are proposed from the rules: run them on a small slice first.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Company | on the account table: `hubspot_lookup_object` on domain, `hubspot_create_object` gated on its `isNotFound` and carrying every property the update writes, `hubspot_update_object` gated on its `isFound`, both with `ignoreBlanks: true`, then an Effective ID formula merging the two ids | Name check = Match or Not checked, AND domain | free | custom properties only; the CRM's own description stays |
| Enum values | formulas joined to the portal's option lists, read with `resolve_action_options` on the write's `fieldMapping` | | free | one wrong token refuses the whole payload; send empty rather than a guess. An option list typed into a prompt drifts from the portal's and fails writes |
| Contact | `hubspot_update_object` by the imported record id, with `associateWithObject` pointing at the account's Effective ID and `addToList` for the static list the team's segment reads, in the same call. In 5.2 the second CRM check gates it instead: update on its `isFound`, `hubspot_create_object` on its `isNotFound` with every property the update writes | merged email AND not Blocked | free | fit, persona, seniority, reason as properties. The gate is identity, never the company write, so a failed company write leaves the contact written and Association pending as a word on the row for a reconciliation re-run |
| Owner | formula: account owner if the account is in play, else the agreed rule | | free | never a hardcoded id |
| Already logged | `hubspot_get_engagements` on the contact plus a formula on the arrival key | | free | one note and one task per arrival |
| Note and task | `hubspot_create_engagement`, a note and a task on the owner (`hubspot_owner_id` from the Owner column, the due date in `hs_timestamp`) | Fit = ICP AND not Already logged | free | the specifics in the body |
| Alert | `slack_send_message_to_channel` or `email_send_email_notification` to the owner | a helper saying the task was created this cycle | free on Slack, a small charge per email | after the record, never instead of it; the helper, not the create's own state, so a repaired create still alerts |
| Result | formula | | free | adds Routed, No owner |

**Depth 4, the mobile.** `waterfall_phone_enrichment` gated on Phone eligible AND the CRM's own phone empty, read by content, AND first AND last AND company AND the LinkedIn URL (first name, last name and company are required inputs; the LinkedIn URL improves the match). 25 credits per success, free on the org's own provider keys. Not every attempt answers, so the price per lead is below the price per success, and it is still most of the bill. Never gate it only on "has no phone", which feeds every contact without a phone into the chain.

**Depth 5, the committee.** When the signup is a user, not the buyer: ABM 6.2, cited, from [use-case-abm.md](./use-case-abm.md). `li_find_people_at_company` per role with a cap (`maxLeadsPerCompany`), writing into a committee table through its own `destinationListId`, an employer check against the account before anything is spent on the person (the finder can return people who now work elsewhere), then Prospecting chain A from the first CRM check. Found rows already carry the LinkedIn URL, headline, role and company: add no "find LinkedIn profile" step. Cost shape: the search paid per person found at the cap, then the profile and the seat call per person, on top of the signup.

Offers on connected tools: hand the qualified lead to a sequencer campaign; pause the campaign when the lead converts or replies, with a campaign table joined on an id instead of a list in a prompt; a weekly coverage count for the owner.

### 5.2 A webhook from a form, a product or a system

The lead is not in the CRM yet, or the destination is not a CRM at all. What changes against 5.1: the identity step does most of the work, because a form or a product hands over an email and little else. The CRM check runs twice ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "Check the CRM twice"), on what arrived and on the merged email, with OR groups, and the create runs only after the second: the update gated on the second check's `isFound`, the create on its `isNotFound`, never a contact created without an email. A verification step, where the team has a keyless validator, runs first over `baseloop_send_http_request` and is proved on one row that returns its negative answer. The destination can be a system with an endpoint instead of a CRM: then an output table in that system's shape, and one HTTP post per row, keyed so a re-run posts the difference. Two event types on one webhook (a signup and an invited user) are two shapes: one intake table each, or a source column and a gate per shape. Swap the intake paths and the posted field names and the middle of this chain is unchanged, which is why the same chain answers "our leads sit in a warehouse" and "our leads come from our app".

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The payload | a webhook source, `autoRunOnNewRow` on (the plan must include webhooks: `sourceCapabilities.webhook`) | | free | one field per posted key the chain reads; the raw body kept |
| Event shape | formula on the keys present | | free | signup, invited user, other: the thin shape drops the ids |
| Job id, requester, date | formulas from the payload | | free | a request that arrives as a job carries them on every row, so the destination can join the batch back |
| Verification | the sender's own verdict on the payload, read into a column; a keyless checker over `baseloop_send_http_request` where one exists, with an extraction column on the body's own status key | email not empty | free | the states that mean go, all named; proved on one row that returns its negative answer |
| Shared mailbox | formula: neither name token appears in the local part | | free | flagged before a paid step reads it |
| Name order | formula on the country | | free | in China, Japan, Korea, Taiwan and Vietnam the first token can be the family name |
| First CRM check | `hubspot_lookup_object` on OR groups: the email; first, last and domain; the LinkedIn URL | email OR (first AND last) | free | on what arrived, before any spend |
| The chain | 5.1 depth 1 from Domain onward, then depths 2 and 3 | | | |
| Second CRM check | `hubspot_lookup_object` on the same groups plus the merged email | merged email OR LinkedIn URL | free | the create runs only after this |
| Output row | formulas in the destination's shape | the destination is not a CRM | free | what the next arrival is checked against, so the memory is what was delivered, not what was attempted |
| Post | `baseloop_send_http_request` to an endpoint that needs no credential in the call: a signed URL the destination issued, or an automation tool's own inbound hook | Output row complete AND not already posted | free | one post per row, keyed; an error status fails the cell and reads as a word, never as delivered. An endpoint that wants a key in a header is called only with the user's consent, since the key is readable from the field config; otherwise the destination takes the rows from a view (the app exports a view as CSV) |

The parts worth copying: the gather-then-judge split with a helper between; the seller profile in the system prompt with competitors in three tiers; the three-source identity cascade each gated on the cheaper miss; the label and custom-value pair for a fixed CRM enum; a formula that returns empty when the destination already holds the value; a campaign table joined on an id for the pause loop; one free `lookup_single_record` that carries every column the company leg computed onto the person's row. And the traps: a status formula that tests emptiness miscounts an errored cell, because an errored cell is not empty; a prompt whose no-match branch sets the matched label reads "matched" on every row; a phone write that sends the whole waterfall object instead of the phone.

### 5.3 A referral from a partner

A partner sends a list of their clients with the partner's own client id. The job is to match each referral to a company the CRM already holds, or say honestly that it does not. Proposed from the rules: run it on a small slice first.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The referral | a file the user uploads in the app, or a webhook source the partner posts to | | free | the partner's name and their id, cleaned in a formula |
| Memory key | formula: partner plus id | | free | |
| Crosswalk | `lookup_single_record` into the crosswalk table on the memory key | | free | a repeat referral matched for free |
| CRM by id | `hubspot_lookup_object` on the property made for the partner's key | Crosswalk empty | free | never a free-text field the CRM already uses for something else |
| CRM by email | `hubspot_lookup_object` on the contact email | still unmatched | free | |
| How matched | formula | | free | Memory, Id, Email, Unresolved: one word |
| Identity | `reverse_email_lookup` | Unresolved | 3 credits on a match | only unresolved rows pay |
| Candidate pick | `custom_ai_agent`, web search off, over the CRM's candidate companies | Unresolved AND candidates exist | paid per row | a confidence word and a reason; declining is right when nothing confirms the match, name similarity alone is never enough, and the first candidate is not the default |
| Write the memory | `send_to_table` into the crosswalk | confidence = High | free | how it was decided, when, the confidence |
| Attach the contact | `hubspot_update_object` with `associateWithObject` | confidence = High | free | |
| Review | a view on Medium | | free | writes nothing |
| Result | formula | | free | Matched, Review, Unresolved |

Medium passes neither the memory write nor the CRM write. A wrong high match is permanent, so the high ones are sampled by hand before the crosswalk is trusted, because a judge can take "the city is close" or a marketing note as evidence. The crosswalk is the pattern to keep for any recurring inbound where the same account arrives under a different spelling: one row per source and identifier, the CRM id, how it was decided, when, and the confidence.

## 7. The next depth

When a depth is planned, end the plan (and the build report) with one line naming at most three next depths, deepest first, in this use case's order: identify and enrich, qualify, write and route and alert, the mobile, the committee. Name the table, the source, the records and the work in that line, so it can start a new plan on its own.

After depth 1, the offers are the write, the owner and the task (depth 3), then the fit word (depth 2), then the schedule check on the source. After depth 3, they are the committee at the company when the signup was a user (ABM 6.2), then the sequencer handoff and the pause loop, then the mobile on qualified buyers. Offer, never assume, and never build the next depth because it seemed obvious.
