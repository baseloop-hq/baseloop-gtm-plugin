# Outbound

Use this recipe when the team decides who to engage and goes first: a campaign to a slice of the market, cold, or to people who did something, warm. Baseloop builds the list, the context and the merge fields, writes the CRM, and hands the people to the sequencer or the dialler; the sequencer sends. The shared rules in [gtme-rules.md](./gtme-rules.md) (taking the request, building) and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) (working a CRM, delivering) apply here and are not repeated. What follows is what changes when the output is a campaign.

## 1. The job

Outbound starts with the team, not the lead. Somebody decides who to talk to this quarter and why, and wants the people in the sequencer by Monday with an email that works, a line that shows we looked, and the CRM knowing it happened. Cold means the list came from a description, a company list or a list of people. Warm means it came from a signal: they engaged with a post, an ad or a page, or they hired, raised or opened an office. The chain after the entry is the same. What changes is the campaign they go into and the line that opens the email.

Typical requests: "build the list for next quarter's campaign", "find CROs at Series B SaaS companies in DACH", "everyone who engaged with the post should be in a sequence", "write a personal first line for each prospect", "never enroll the same person twice". What they want back: people in the campaign with a valid email, the account tiered so the best ones go first, a first line and a proof line per person as merge fields, the contact and the enrolment in the CRM, and a stop the moment someone replies or converts. What kills it: a person enrolled twice, a do-not-contact address in the campaign, a first line that quotes their own comment back at them, an email column holding a provider's error sentence, a campaign that keeps enrolling after the quarter ended, a reply nobody logged.

The user's own word for the job does not pick the recipe. A workspace named Outbound that fills five roles per account is ABM by shape. The question that sorts them is how many roles per account, and it belongs in the questions.

Baseloop never emails anyone. Adding a person to a campaign is the last free step before somebody does, so it carries every gate a send would.

## 2. Where Outbound stops

- **TAM sourcing** ([use-case-tam-sourcing.md](./use-case-tam-sourcing.md)) builds the whole market once and tiers it; Outbound takes one slice for one campaign. A campaign whose market is undefined starts there: recipe 4.1 cites TAM sourcing for the search, the qualification and the tier, and takes what passed.
- **ABM** ([use-case-abm.md](./use-case-abm.md)) is few accounts and the whole committee. Outbound is many accounts and one or two personas.
- **Signals** ([use-case-signals.md](./use-case-signals.md)) finds who did something and hands them here. Recipe 4.3 starts where a Signals build ends: a person or a company with the event and its date.
- **Prospecting** ([use-case-prospecting.md](./use-case-prospecting.md)) is one rep, now, from named people. Its chain A (a list of people), chain B (a list of companies) and chain C (contacts from the CRM) are cited here, never rewritten.
- **Inbound enrichment** ([use-case-inbound-enrichment.md](./use-case-inbound-enrichment.md)) is the lead that chose us. Outbound chose the lead.
- **Replies and bounces** the sequencer posts back are read by a reply-processing table ("Pattern 11: Outreach Reply Processing Workflow" in [workflow-patterns.md](./workflow-patterns.md)); the Rep assist recipe that will own it is not written yet. This file plans the events table once and hands it there.

## 3. Taking the request

The shared order is in [gtme-rules.md](./gtme-rules.md) "1. Take the request". What Outbound adds at each step:

1. **Ask for the personas and the exclusions**, unless the user already gave them. Plugin agents have no saved company profile. Who buys decides the seats; who must never be contacted often lives in the same answer.
2. **Check what is connected** with `get_connected_platforms` and `list_actions` (`connectionMode`, `connectionStatus`): the CRM, the sequencer, the LinkedIn account, the email and phone provider keys. A sequencer question to a team with none is noise; a connected LinkedIn account makes the people finder cheaper, and the sequencer decides depth 3's shape.
3. **Read the input by its values.** A supplied list arrives with its own criteria, and every parameter the requester supplied goes into plain columns on arrival, because a value that lives only inside a saved search or a field config cannot gate anything. A column the requester filled and no step reads is a defect: every supplied parameter is read by a gate, or the build answers its own question instead of theirs.
4. **A campaign spends per person found and ends in people reaching the outside world**, so the plan names the spend, the gates on every add and the write review before anything runs.
5. **Ask the open questions one at a time** with the harness's blocking question tool, in the rank order below, and stop after the top four. Offer each question's default as the recommended option. Everything below the cut ships as a stated default that the plan announces.

| Rank | Question | What it decides | Default when it ships unasked |
|---|---|---|---|
| 1 | Where does the list start? | A description of who (4.1), a company list from the CRM, a file or a TAM slice (4.2), a signal (4.3), or a list of people (4.4). The entry decides the first table and nothing else | Read from the input: a file of companies is 4.2, a file of people is 4.4 |
| 2 | Which personas, and how many per account? | The seats and the cap per account, in the requester's words; the requester's list wins and the build's list is the fallback. Where the requester has no list, the fallback is a named set read back to them, never an invention. The persona set lives in one place the steps point at, never in a formula and a search config at once, because the two copies drift and only one is the one being searched. More than two roles per account is ABM | The one or two personas the user named, at most two people per account |
| 3 | Which campaign, and who must never be in it? | One campaign id per persona and per channel, mapped in one place from a name the requester can type (the ids come from `resolve_action_options` on the add action's campaign field); a name that maps to nothing must fail loudly. Do-not-contact, unsubscribed, bounced, customers, open deals, competitors, a blocklist of accounts: ask what the words are and where they live today, and the suppression window as a number, because "not contacted recently" set to yesterday suppresses nobody | One campaign; the CRM's own do-not-contact, unsubscribed and bounced words plus customers and open deals; ninety days |
| 4 | When does the campaign end? | The date goes on every row, and every paid step and every add gates on it | The end of the quarter |
| 5 | Which channels? | Email, LinkedIn, phone. Where LinkedIn is the second channel the split is free: email takes whoever the waterfall found and LinkedIn takes the rest | Email only |
| 6 | Warm or cold, and does it change the campaign? | Warm can change the campaign, change the first line, or require a person to approve before the add. The CRM lifecycle decides the word, never a constant. There is a third kind of warm: an event on our own side, a launch or a round, which gives everyone the same dated reason to write and belongs in the copy, not in the word | Cold; warm rows held for approval |
| 7 | Is there a real example of the email? | Depth 4 needs a canonical email or the team's own hand-written sequence. Without either the depth is not planned | Not planned |
| 8 | How deep? | The list; log it in the CRM; hand it to the sequencer; snippets from the data; the mobile and the call campaign. Agreed before the paid gathering, not after, or the people found are paid for and never finished | The list, then the offers |

**Does the account already employ the people who would do this work?** At an account with reps the email names a rep and asks about their research; at an account without one it addresses the founder's own prospecting. That is a second axis on top of the persona, and it forks the campaign rather than filtering it.

**Is there a CRM at all?** An agency can work with no system of record. Then the workspace's own people table is the system of record for the free-people-first check and for the duplicate key, and depth 2 becomes a table, not a portal, with the same key.

## 4. What changes for Outbound

**The add is the send.** The shared rule puts every send gate in front of every add, per channel ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "A soft no is an asset, a hard no is a boundary"). An ungated add on a second channel sends every person in the table, and an add looser than the CRM write puts people in a live campaign the CRM does not know about.

**A verdict nothing reads is the defect of this use case.** Every classification column names, at plan time, the gate or write that reads it. Count the qualification step's own failures before trusting its output, because rows whose call errored or returned an unusable body drop out silently.

**One person, one campaign, one key, and the enrolment is a record.** The contact id plus the campaign id stops the second add, names the enrolment record, and is what the reply looks up. The record, one per person and campaign, associated to the contact and the company, holds the campaign name, the sequencer's lead id where the tool returns one, the status and the dates. The sequencer's own duplicate check is the second line, never the first: it is scoped to that tool's world, only lemlist, Smartlead and Instantly carry one (HeyReach and the other outreach actions have none), and some tools accept a lead with no email.

**The request is read once: the values the whole campaign shares (the name, the end date) as formulas returning the literal, so rows a later import adds carry them; the per-account values as plain columns.** A campaign name read from a CRM flag is erased when the flag is reset after the add and the lookup re-runs.

**Tier before send.** The slice is the budget. A tier that gates nothing is not a tier. A row count that equals the tool's cap is a truncation, not a market. Read the distribution before the band is trusted: a top tier holding most of the list is a label, not a budget.

**Identity, not a refresh window, stops the repeat.** A feed with no key across weeks makes a company that engages again a new row, and a thirty-day test on a CRM date stops the spend, not the duplicate. The repeat that is allowed is a decision with a date: a memory table of everyone ever worked, keyed on the profile URL, stops the repeats in a new list before any spend, with a window after which a person may be approached again. That window is only as good as the date that feeds it, so the date is written by the step that did the work, never by a formula that recomputes. A people list is a snapshot: the row carries the date it was read, or a list of COOs from August reads as current in December.

**Free before paid, in this order.** The CRM's own contacts before the finder, the CRM's email before the waterfall, the page-shape test before the paid call, the persona test on the source's own text before the enrichment. A free read placed after the paid step it should gate saves nothing. Enriching and classifying every person before the account screen has run pays for the people the screen would have removed, so the persona test runs on the slice the account screen left. A free and a paid source for the same field are measured, not assumed.

**The finder is picky about the page, and about the titles.** `li_find_people_at_company` takes a company page URL and rewrites a showcase or school path to the company path itself, and it takes a country subdomain; what it refuses is a path suffix or a missing scheme, and a refused URL fails that record only. What fails the whole batch is a title list the search cannot parse, and seniority, function, geography or industry filters sent as labels instead of the numeric ids `resolve_action_options` returns, so the seat lists are proved on one row before the field runs. A CRM's own LinkedIn column is the CRM's spelling, not the provider's. A resolved page is proved by reading the company name back, because a resolver can return a different company's page and the paid finder then runs on it.

**A snippet has to land somewhere.** Depth 4 is not planned until depth 3 carries it. Message agents whose output no add carries in its custom fields reach nobody. Design the carrier first, and check what actually leaves the table before adding another research column.

**Where the buyer is a business, the identity step is the mailbox.** A published address can belong to the place, to its parent group or to an agency, and every personalised line is wrong in the same way when it belongs to somebody else.

**Every terminal step has a silent bin.** Count what its condition leaves behind on the day it is built and give that a word, or those rows end with no send, no error and no explanation.

**What this build owes the reply is the key.** The CRM ids ride along in the sequencer's custom fields, or the reply table cannot match a reply to the row that produced it.

## 5. The sequence, and the delivery

The request arrives with the accounts, the personas, the campaign name and the end date: the accounts and personas into plain columns, the name and the end date as formulas returning the literal. Free first: the campaign id from the name, the end date test, the blocklist, the CRM state of the account, the tier. Then the people: the CRM's own contacts on the account first, filtered on persona; the finder only for the seats the CRM does not hold, capped per account, on a page whose shape and identity were proved. Then identity and the email, each gated on the cheaper miss, the persona re-tested on the title that came back, the employer checked against the account for free from what the finder already returned. Then the do-not-contact test on the person, per channel. Then the write: contact created or updated with the association, the enrolment record with the key. Then the add, with the CRM ids and the merge fields as custom fields, duplicates off, every gate the write had. Then the snippets, only for people who passed the add, written back into those same custom fields. Then the mobile, only for the call campaign. Result last: Enrolled, Already enrolled, Blocked, No email, Not persona, Campaign ended, Add failed with the sequencer's reason.

**Delivery** is the campaign in the sequencer: the person with a valid email, the CRM ids and the merge fields, in the campaign for their persona, channel and mailbox provider. A coverage word per account, from the finder's own count, is the deliverable when the work was commissioned per account. And the CRM: the contact with the association, the enrolment record with the campaign name, the lead id where the tool returns one, and the status. Two other handoffs take the same gates: a static list in the CRM (`addToList` with `listConfig.hubspotListId` on the HubSpot create or update), where the list id plays the part of the campaign id, and a task on the owner. A filtered view somebody exports is a real finish where the team loads the sequencer by hand: the view carries the filter and the Result word, because a view named for readiness that filters nothing tells the reader a test was done that was not. A built add that never dispatched is not depth 3: where the client pushes from the sequencer's own screen, the deliverable is the view and the plan says so. Nothing is sent by Baseloop.

## 6. The four recipes

Depth 1 is the base. Each next depth adds on the one before, offered in this order and planned on yes, and offered before the paid gathering runs: the list, log it in the CRM, hand it to the sequencer, snippets from the data, the mobile and the call campaign.

**Table count.** Four at most: a request table where the campaign request arrives, an accounts table, a people table, and an events table for what the sequencer posts back. One people table for every seat, with dedupe (`set_auto_dedupe`, keep oldest) on the person's profile URL switched on after a one-row finder run creates the column and before the full run, and `autoRunOnNewRow` on so the rows the finder lands move down the chain. A table per persona is what people build when nobody tells them not to, because the finder takes one destination per field, and the same person found twice is then worked twice. When the user names a table per persona anyway, plan those and say once what one people table with dedupe would have caught. The events table is the reply-processing table (Pattern 11 in [workflow-patterns.md](./workflow-patterns.md)), planned once per sequencer. A mirror of the CRM's own companies, deals and contacts does not count against the four: it is CRM enrichment's table. One table pair per persona also caps the volume.

Cost below is shape only; read the figure from `get_action_schema` and `list_actions` (`creditCostHint`) at plan time. At the time of writing: `li_find_people_at_company` bills 2 credits per person found, 1 on the org's own LinkedIn account; `waterfall_email_enrichment` bills 2 credits per deliverable address on Baseloop credits and nothing on the org's own keys; `waterfall_phone_enrichment` bills 25 credits per mobile found; `enrich_company` bills 1 credit per match; the sequencer adds and the CRM writes are free.

### 4.1 Cold, from a description of who

"CROs at Series B SaaS in DACH." The description becomes a search and a persona set. TAM sourcing owns the search, the qualification and the tier, on a slice bounded by the campaign: follow [use-case-tam-sourcing.md](./use-case-tam-sourcing.md) when the market is not yet built. Then recipe 4.2 from depth 1 on the accounts that passed.

What the entry adds over 4.2: the search is a Sales Navigator company search the user builds and pastes (these tools cannot build the URL; never compose one), with `maxCompanies` set to the slice, because `li_import_sales_nav_companies` splits a filter-based search past LinkedIn's 1,000-result window itself. A saved-search or account-list URL cannot be split and stays near 1,000: ask the user to open it in Sales Navigator and paste the resulting filter URL. A `lookup_single_record` from the import table into the accounts table plus a send gated on not found is where dedupe belongs, with auto-dedupe on the accounts table's domain column beside it, because the lookup misses rows that arrive in the same batch. The qualifier needs a precedence rule rather than more categories: "a CRM data automation service line always wins" is what stops an eight-way classifier drifting.

### 4.2 Cold, from a company list

The accounts arrive: a CRM flag on the company posted to a webhook table with the record id (plan-gated: `sourceCapabilities.webhook` in `list_actions`), a CRM list or criteria import, or a file the user uploads in the app. Taking the request adds: the personas as plain columns on the account row where the requester sends them per account, and the campaign name mapped to an id in one place.

**Depth 1, the list.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The request | a webhook source with the company id, `hubspot_companies_list_import` or `hubspot_companies_criteria_import`, or a file | | free | account, personas and the list's own criteria read once into plain columns; the campaign name and the end date as formulas returning the literal, so the rows the next import adds carry them |
| Campaign id | `lookup_single_record` into a campaign table on the name | | free | one place; a name that maps to nothing writes a stop word, never an empty that skips in silence |
| Campaign open | formula on the end date against a date the cycle rewrites, never a today computed once | | free | every paid step and the add gate on it |
| Account state | `hubspot_lookup_object` on the company: owner, lifecycle, open deals | | free | a customer or a live deal goes to its owner, never into the cold campaign |
| Blocked | `lookup_single_record` on the blocklist table, one column by CRM id and one by domain | | free | Blocked stops every step after |
| Tier | from the accounts table or the free screen | | free | the campaign runs top tier first |
| Company page | Prospecting chain B depth 1: the CRM's page where it contains a company path, else `custom_ai_agent` with web search, then `enrich_company` on the result | page empty AND not Blocked AND Account state = Cold AND Campaign open | paid per row, then paid on a match | never constructed, and the name read back and compared |
| Page usable | formula on the URL shape | | free | a company path with a scheme and no path suffix; the finder normalises showcase and school paths itself and takes a country subdomain |
| Existing contacts | `hubspot_lookup_object` on contacts by the associated company id, with a limit above one (up to 100), returning titles | Account state ran | free | free people first; where there is no CRM, `lookup_multiple_records` on the workspace's own people table |
| Persona gaps | formula naming each function and the titles that cover it | | free | the seats to fill; "filtered on the persona" is not a filter anybody can write |
| Find people | `li_find_people_at_company`, one field for the missing seats, the cap in `maxLeadsPerCompany` (1 to 10), the people table as its own `destinationListId` | Persona gaps not empty AND Page usable AND Tier in scope AND Campaign open AND not Blocked AND Account state = Cold | paid per person found, less on the org's own LinkedIn account | titles as items on `currentJobTitles`, an exclusion the same item as `{ "value": "...", "excluded": true }`; the lists are checked against each other first, because a title in two lists is a duplicate human paid for twice. The action upserts on the person's LinkedIn id inside its destination, which is one more reason for one people table. No `send_to_table` behind it. Where the requester names two audiences on the account row, two finder fields branched on that column, each with its own titles and cap, beats a seats formula |
| Persona | formula, or `custom_ai_agent` with web search off, on the title that came back | | free, or paid per row | the finder's title list is a request, not a property of the result; a screen behind a filter that already asked the same question rejects nobody |
| Employer check | formula on the employer the finder already returned | | free | Match, Mismatch or Cannot check, and the third has its own exit |
| Contact quality | formula on the name fields | | free | a legal form inside a surname, a URL or an @ in a name, a one-character first name |
| Domain quality | formula on the domain | | free | shortener, webmail, social, placeholder, malformed, each a named list |
| Work email | Prospecting chain A depth 1's first CRM check, then `waterfall_email_enrichment` | Persona set AND Employer check = Match AND quality passed AND CRM email empty AND not Blocked AND Account state = Cold AND Campaign open | free on the org's own key, else paid per deliverable address | the CRM's email first, read by content |
| Deliverability | a data extraction field on the email column, `extractionPath` `status` | a helper saying the email step ran | free | deliverable, risky, undeliverable, unknown: only deliverable reaches the send |
| Merged name, title, email | formulas | | free | never a failed step's value: read the producer through a state the table can see |
| Result | formula off a helper | | free | Listed, Not persona, Wrong employer, No email, Blocked, Campaign ended, Pending |

Five things this table does not show on its own. Where a role only exists above a team, find the cheap seat first and gate the expensive seat on having found it: the team's presence is the free proof the role exists. A broader seat search gated on the narrow one having found nobody is the same idea in the other direction. One call for every missing seat at a small cap returns fewer people than the cap on most accounts, so the account still needs a seats-filled word after the people land, or nobody can tell a covered account from a half-covered one. A second pass of the same email waterfall with the domain left out, gated on the first pass having errored, recovers the hard failures that were a bad domain and not a missing person. A web fallback for accounts with no LinkedIn page (Prospecting chain B's "People from the web") is a second row shape, not a second source: it arrives without a profile URL or a headline, so every step after the join gates on the thin shape's own columns or those rows fail at full price on inputs they never had.

**Depth 2, log it in the CRM.** The second check and the writes are Prospecting chain A depth 2. What this recipe adds:

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| CRM contact | `hubspot_lookup_object` on four OR groups: the LinkedIn URL; first, last and company; first, last and domain; the merged email | merged email OR LinkedIn URL | free | never name alone, never email alone, and never without the domain clause |
| Write decision | formula naming why | | free | Write, was blank. No, already correct. No, conflicts with existing. The word is what makes a live CRM safe to write to |
| Update contact | `hubspot_update_object` by id, `ignoreBlanks` on, with the association | CRM contact found AND Merged email not empty AND Campaign open AND the decision says write AND the account id is present | free | persona and seniority as properties; the company from the accounts table only |
| Create contact | `hubspot_create_object` with the association, carrying every property the update writes | CRM contact not found AND Merged email not empty AND Campaign open AND the account id is present | free | the gate carries the account id because a create whose association id is empty still creates the contact, loose, and only skips the association |
| Enrolment key | formula: contact id plus campaign id | | free | the key that stops a second one |
| Already enrolled | `hubspot_lookup_object` on the enrolment object by the key | | free | a re-run finds the record and stops |
| Enrolment record | `hubspot_create_object` on the enrolment custom object, associated to the contact; then `hubspot_update_object` on the created id with the association to the company | not Already enrolled; the second write gated on the created id | free | campaign name, tool, status, date. The create carries one association, so the company is a second write keyed on the created id. Custom objects need HubSpot Enterprise; where the portal has none, a static list plus a dated note on the contact keyed on the campaign |
| Result | formula | | free | adds Logged, Already enrolled |

A build that stops here is finished, not abandoned: with no sequencer, depths 1 and 2 alone produce CRM contacts with a title, a profile URL and an association. What such a build still owes is the enrolment record, because without it nobody can say later which contacts came from which campaign. The reverse is the defect: an add whose CRM create is gated on something the add does not need, a mobile for instance, leaves the CRM with no record of most of the people being emailed.

**Depth 3, hand it to the sequencer.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Do not contact | formula on the CRM's own words plus `lookup_single_record` on the events table, one word per channel | | free | the same person can be blocked on email and open on LinkedIn; tested on a row that carries the word before the build is trusted |
| Mailbox provider | `baseloop_send_http_request` to a public DNS-over-HTTPS resolver for the MX record of the email domain (no key, so no credential in a field), then a data extraction field and a formula | Merged email not empty | free | Google, Microsoft, gateway, other, empty; a security gateway is a technical suppression and needs its own destination, not a view. Read the split before mailbox pools are bought: on some regional lists one mailbox provider is most of the list, so several campaigns can mean one real pool |
| Add to the email campaign | `lemlist_add_to_campaign`, `instantly_add_to_campaign` or `smartlead_add_to_campaign`, all three reading the campaign id per row (`campaignId: "{{campaign_id}}"` with `campaignId__dynamic: true`), so one add field serves every campaign; the duplicate check left strict (Allow Duplicate Leads Across Campaigns off on lemlist and Smartlead, Skip if in Any Campaign on for Instantly); custom fields: contact id, company id, campaign name, persona, tier, warm or cold. `reply_create_contact` creates a contact in Reply and enrolls it in nothing, so with Reply the handoff is the contact plus a view the team enrols from, and Result reads Handed over, never Enrolled | Channel = Email AND Result = Logged AND not Blocked AND Account state = Cold AND not Do not contact (email) AND Campaign open AND Deliverability = deliverable | free | the shared gates on every add in the table, plus the channel word and the channel's own identifier |
| Add to the LinkedIn campaign | `heyreach_add_to_campaign`, the same custom fields | Channel = LinkedIn AND Result = Logged AND not Blocked AND Account state = Cold AND not Do not contact (LinkedIn) AND Campaign open AND first AND last AND profile URL | free | a person with no address is still reachable on LinkedIn, so this add never reads Deliverability and needs no email; the channel word on the row decides which add a person gets, so the two cannot see each other and still never overlap |
| Add failed | formula on the add's error | | free | "already in the campaign" is a word, not a retry |
| Status | `hubspot_update_object` on the enrolment record: Added, and the lead or contact id where the tool's full value carries one (lemlist returns one) | a helper on the add's output word (Added or Updated; Instantly's Skipped is not an enrolment), refreshed on a re-run | free | the forward-only status ladder ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "Delivery is recorded where the next run reads it, and a verdict is not a delivery record") starts here; a failed add keeps Add failed and its reason, and a gate on the add's own state would leave a repaired add's status unwritten forever |
| Task on failure | `hubspot_create_engagement`, a task (`engagementType` `tasks`) on the owner | Add failed | free | a person clears the block |
| Result | formula | | free | adds Enrolled, Add failed |

Two other destinations take the same gates: a static list in the CRM, and a task on the owner. Events back from the sequencer, the status ladder and the reply: the reply-processing table (Pattern 11 in [workflow-patterns.md](./workflow-patterns.md)). The first column on a sequencer events table is a type filter, because a sequencer can post team notifications with no lead.

What the sequencer sent back is an input to the next campaign, not only a record: a bounce logged by the reply classifier is what tells the email step the address on the CRM record is dead. Suppression, account state and consent are facts about the person now, so the add re-reads them on its own row rather than trusting a word another table computed. Where the decision, the suppression word and the eligibility word arrive pasted from outside, they are inputs and not guarantees: each one needs a row carrying its negative value and a gate that reads it. Two seats at one account are two emails about the same company: cap the enrolments per account, or let one seat carry the segment claim. Two adds with no shared gate put the same person in two campaigns that cannot see each other: the channel is a word on the row, decided once, and each add reads it. One letter means one fact: a bucket covering both no address and the check did not run passes the send test on rows where nothing was decided.

**Depth 4, snippets from the data.** Four shapes, chosen by what varies.

| Shape | When | What it looks like |
|---|---|---|
| Snippet agents plus an assembly formula | the email has frozen lines and a fixed structure | one `custom_ai_agent` per adaptive part, the structure in a formula, two or three examples cut from the canonical email |
| One opener agent | only the first line changes | one agent, handed the sentence that follows it so the line has to set it up; the examples live in the field's own `examples` config (web search off). Turns four agents into one |
| Variations named inside one prompt | the user asks for the copy anyway, with no canonical email and no examples to cut | three named variations in the prompt do the job examples would: the model picks one per person, and the spread is unverifiable, so count the openers before the second run |
| A full-email agent | no fixed structure, or the team writes long | a persona table keyed on the bucket, a proof pattern keyed on the segment, a word-swap list, a same-protagonist rule, a checklist before output |

A snippet can be written as the sentence the reader would type at the product and quoted back inside the email, which makes the demonstration the personalisation. A snippet prompt carries a ranked fallback, from a named segment in the buyer's own jargon down to a generic category with a specifying anchor, because a snippet with no ladder goes generic on the first row it cannot answer. A line written from an account fact is the same line for everyone at that account, so either the writer is given something only that person has, or the build calls it an account line and says so. The named customer, the number and the claim are frozen in the assembly step and never handed to the model, and where a model must pick one it gets a closed list plus the rule that a customer is never cited to itself. A copy step returns its own audit flags next to the text, which pattern it used, which proof it cited, because they cost nothing in the same call and they are what a person filters on before the send. A message goes to the tool that will send it: a LinkedIn note carried in the email tool's merge fields is written, paid for and never sent. Where the list spans languages, the language is derived once on the account from the country or the domain, carried down to the person, sent to the sequencer as a merge field, and the accented characters are spelled out in the copy prompt, or one campaign ships two languages inside one email.

The copy can be bought rather than built: a finished hand-written sequence pasted into columns, with Baseloop only carrying it into the sequencer, is a legitimate starting state, and the migration path is to model the hand columns as first-class inputs with their own gate, then replace one at a time. The copy can also be pure formula: frozen lines around a first name, a vacancy title and two requirements, with three variants sent as custom fields for the sequencer to pick. Count how often the step that makes those emails specific actually filled, because where it did not, every email ships the fallback sentence and nothing says so. Rotation between variants is a formula on a stable identifier, not a model call. Assembled text goes to the sequencer as custom fields, or it is a rep artefact that reaches the CRM and no campaign.

**Depth 5, the mobile and the call campaign.** Prospecting chain A depth 3, with what a campaign adds:

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Phone eligible | formula on tier, seniority, persona | | free | the yes or no a person reads before the spend |
| Timezone and callable | `custom_ai_agent` on location, then a formula against the team's calling windows | Phone eligible | paid per row, free on the org's own key | Disqualified stops the spend |
| Mobile | `waterfall_phone_enrichment` | Phone eligible AND Callable AND CRM mobile empty AND merged email AND first AND last AND company AND LinkedIn URL | paid on success, free on the org's own key | this is where the money goes, so the eligibility gate stands in front of it |
| Calls campaign | the sequencer's calls campaign, or a view the dialler's own import reads | Mobile found AND not Do not contact AND the same gates as the email add | free | a phone number is not a reason to call somebody. No dialler has a native action, and the HTTP action carries no connection, so a dialler that needs a key is loaded from the view, never posted to with the key in a field |

An email-only enrolment costs a few credits a person and a called one an order of magnitude more, because the mobile is most of it.

Point the suppression check at a list that holds every do-not-contact word, not one that fills only on bounce or unsubscribe. Run the free lookup a paid step depends on before the paid step. Never pay to research a company page the CRM already holds, and never run a guard before its inputs exist.

### 4.3 Warm, from a signal

Signals owns finding the signal: follow [use-case-signals.md](./use-case-signals.md) when the source is not yet built. What arrives here is a person or a company with the event and its date.

What changes against 4.2, and why: the row carries the event, and the event writes the first line. Read every like and comment that person made on that post, pick the latest, and return one type word and a sentence that never quotes the comment. Where the signal is the offer, as it is for a staffing seller reading a job posting, the event writes the whole email: qualify on it, write from it, and never research past it. When the signal is a company, the people step of 4.2 runs first with the event as context. The repeat key is the event, not a date window: the person plus the post, the company plus the event. Where the feed already carries someone else's verdict, read it or replace it and say which: two judges on one row, disagreeing, with only one of them gating anything, is a decision nobody made.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The signal | from the Signals capture table, keyed on person plus event | | free | who, what, when, the post, the ad or the posting |
| History | `lookup_multiple_records` on the engagement table by the key | | free | every event for the pair |
| Engagement summary | `custom_ai_agent`, web search off, on the history | History found | paid per row, free on the org's own key | one type word and one sentence, never the comment verbatim |
| Warm or cold | formula on the CRM lifecycle, or on the connection state where there is no CRM | | free | decides the campaign, the first line, or who approves |
| The rest | 4.2 depths 1 to 5 | | | |
| Intro line | `custom_ai_agent` from fixed patterns keyed on the event type | Enrolled AND summary found | paid per row, free on the org's own key | depth 4 here is often one field |

Where the signal lands on the account and the campaign runs on people, the join back is a lookup on the account key and a column, because the version people build instead is a person copying the signal across by hand.

A note per person needs a key that stops a second one, and every destination takes the same send gates. The merged email carries a validity test, because a provider's error sentence can land in the email column and reach the CRM as the email. The lookup back to a job posting keys on the posting, never on the company page, or a company with several open roles gets one of them at random attached to every person.

### 4.4 Cold, from a list of people

The list is people. The accounts do not exist yet. This inverts the recipe, and it needs two steps the other entries do not have. First, pick the right current employer out of several: with a disqualification list and a tiered priority order this is a `custom_ai_agent` prompt, not a formula, and everything downstream points at whatever it returns. Second, dedupe the company before creating it, because the accounts table is a by-product here and cannot be trusted as an account list for anything priced per account.

After those two, the chain is 4.2 from the persona step, on Prospecting chain A's people table. The identity key is the profile URL, which is also the CRM lookup key and the dedupe key.

The account screen runs before the person is spent on. The working dedupe idiom is a `lookup_single_record` into the destination plus a not-found gate on the send, and it stops the duplicates it can see; rows that arrive in one batch race past it, so auto-dedupe on the key stays on beside it. A column reading "Probably" on every row is a question nobody asked. With duplicates allowed on the adds, the same person lands in more than one campaign.

### Offers on connected tools

| Offer | What it needs |
|---|---|
| Stop the person when they reply, convert or take a call | no native pause action exists: the stop is the status on the enrolment record moved forward from the events table, and the sequencer's own rule or a person reads it; say so in the plan |
| Log the reply and the status on the enrolment record | the sequencer's webhook into the events table (Pattern 11 in [workflow-patterns.md](./workflow-patterns.md)) |
| Route the campaign by the recipient's mailbox provider | one free DNS call per domain |
| A human approval before the warm rows go | a select column and one clause on the add |
| A task on the owner when the add fails | the CRM: 4.2 depth 3 |
| A calls-only campaign for the phone eligible | the dialler or a calls campaign: 4.2 depth 5 |
| Re-tier the account when a signal lands | a Signals build on the accounts table |
| A coverage count per account and per campaign | the finder's own output, free |
| A memory of everyone ever worked, with a re-approach window | one table keyed on the profile URL |
| The gap list back from the LinkedIn leg | a named table the LinkedIn campaign writes the unreachable people into; an email pass on the people with no address can make them reachable |
| Gate the email lookup on the LinkedIn accept | the sequencer's connected event: on a LinkedIn-first campaign only the people who accepted are paid for |
| Any sequencer without a native action | a view in the tool's import shape that the team loads; the HTTP action carries no connection, so an endpoint that needs a key is never called with the key in a field without the user's consent |

## 7. Offering the next depth

End the plan, and the build report once a depth is verified, with one line naming at most three next depths, deepest first, in this use case's order: the list, log it in the CRM, hand it to the sequencer, snippets from the data, the mobile and the call campaign. Name the table, the campaign, the people and the work in full, so the line reads as a new request.

After depth 1, the three are, deepest first, the sequencer handoff from depth 3, then the CRM log from depth 2, then the snippets only where a canonical email exists. After depth 3, they are the reply reading the sequencer's events call for (Pattern 11 in [workflow-patterns.md](./workflow-patterns.md)), then the snippets, then the call campaign. What comes back is the next job: the sequencer posts the replies and the bounces, and reading them is "who replied and what do they want?". Offer, never assume, and never plan the next depth because it seemed obvious.
