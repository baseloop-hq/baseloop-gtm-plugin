# Signals

Use this recipe when the goal is pipeline from change: something happened at a company that matters to what the user sells (a hire, a funding round, an office, engagement with a post, a page visit, a flag the CRM set), and the team wants each signal once, with the reason, landing where they already work. It covers four sources: Baseloop watches it (7.1), an outside tool posts it (7.2), the CRM flags it (7.3), and AI research on a company list (7.4).

This file does not repeat the shared rules. Read [gtme-rules.md](./gtme-rules.md) for taking the request and building, and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) for working a CRM and delivering, before you plan. What follows is what changes when the input is an event and the enemy is the repeat.

## 1. The job

A signal is a fact about a company that changes whether it is worth talking to now: they are hiring the role we sell into, they raised money, they opened an office, someone from there engaged with our post, they visited the pricing page, a leader joined, a product was recalled. The team wants each one once, with the reason it matters, the date, the source, and a person to talk to when they asked for one, landing where they already work.

Typical requests: "tell me when a target company hires an SDR", "who raised money this month in our ICP?", "which of our accounts visited the pricing page?", "who engaged with our post and is worth a call?". What they want back: the change, the date, the source, why it matters to what we sell, and the account status: a customer, an open deal, an owner. Then a person. Then it lands where the rep looks. Never twice. What kills it: a repeat, a signal about a company nobody owns that vanishes, a source that died and looks quiet, a verdict that fires on everything.

Most rows, most weeks, there is nothing. That is the normal answer and it gets its own word. A recipe returning something every time is not working, it is stretching.

## 2. Where Signals stops

- **Rep assist** (signal alerts for one rep; no written recipe in this plugin, see [use-cases.md](./use-cases.md)) is the same chain for one rep's own accounts, ending in an alert to that rep. Signals is the market: a source watched for the whole team, ending in a list, a task or a record the team works. The purpose decides.
- **Outbound** ([use-case-outbound.md](./use-case-outbound.md) 4.3, warm from a signal) takes what survives here into a campaign. Signals ends at the delivered record and the person.
- **TAM sourcing** ([use-case-tam-sourcing.md](./use-case-tam-sourcing.md)) and **ABM** ([use-case-abm.md](./use-case-abm.md)) are where a key hire goes: at an unknown company it becomes an account to qualify, at a known account it becomes a contact. That routing is the one place Signals hands to them.
- **CRM reactivation** ([use-case-crm-reactivation.md](./use-case-crm-reactivation.md)) starts from the deal record; a change at an account with a quiet deal is its 8.3, not a signal here.
- **Prospecting** recipe 9.5 (the right people at a company list) and chain A (a list of people comes in), in [use-case-prospecting.md](./use-case-prospecting.md), are cited by depth 4. Read it when depth 4 is planned.

## 3. Taking the request

The shared rules set the order: what the user sells, the input, the connections, then the questions. What Signals adds at each step:

1. **What the user sells writes the two lists.** Signals that count and signals that do not. A RevOps hire counts for a GTM data seller; a product launch does not. Without the second list the research stretches. There is no saved company profile here: ask the user what they sell and who buys, draft both lists, and have them confirmed.
2. **Check what is connected** with `get_connected_platforms` and `list_actions` (`connectionMode`, `connectionStatus`): the CRM, Slack, the LinkedIn account (it only changes the price of the Sales Navigator import and of Find People; the engagement import needs none), the sequencer for the campaign offer, and whether the outside tool the team runs has a webhook (`sourceCapabilities.webhook` says whether the plan includes webhook sources).
3. **Read one real payload per event type** before naming a step (a sample the user pastes, or `get_row_details` on a row that already arrived), because the keys differ per event and the thin events drop the ids.
4. **A watched source that writes tasks and notes onto live records, on a schedule,** always gets the full plan document and the user's approval before anything is built.
5. **Ask one question at a time** with the blocking question tool, at most four, each with its recommended default when it has one.

Rank the open questions in this order and ask the top four. Everything below the cut ships as a stated default that the plan announces.

| Rank | Question | What it decides | Default when it ships unasked |
|---|---|---|---|
| 1 | Where does the signal come from? | Baseloop watches it (7.1), an outside tool posts it (7.2), the CRM flags it (7.3), or a research call on a company list (7.4). This is the recipe | Read from the request |
| 2 | Which companies, do new ones join, and which are left alone? | A named list, a CRM view, or the whole market the source covers. On a recurring run over a list, whether it researches only the companies given or also takes in new ones automatically, which decides whether the send into a monitor table repeats each cycle ("Schedule chains" under "autoUpdateDependents Strategy" in [workflow-patterns.md](./workflow-patterns.md)). What makes an account one to leave alone: customer, open deal, owner, contacted recently, read back with the portal's own values | The source's own coverage; customers and open deals left alone; whether new ones join is always asked |
| 3 | What happens to a company nobody owns? | A named destination: a list a person works, a default owner, or skip, because an unowned signal otherwise lands on a list nobody reads. Asked, never assumed | One named default owner |
| 4 | Is the signal a state or an event, and how long does it count? | Hiring is a state and stays true; a funding round is an event with a date. The window is theirs | Ninety days for an event; a state carries the date it was observed |
| 5 | Where does it land? | A CRM task on the owner is the default. Slack, email and a campaign in the sequencer are offers on connected tools | A task on the owner, a note on the company |
| 6 | Do you want the history? | The current signal on the record is the default; a timeline per company is the deeper option | Current signal only |
| 7 | Who to talk to? | Optional, built on yes: existing contacts first, then new people per role with a cap | Not built; offered when a signal survives |

## 4. What changes for Signals

**The signal key is the whole design.** The shared rule ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "A signal's identity is the event, not the account") says the key is the event, never the account; what Signals adds is which event: the company plus the funding month, stage and amount; a job id; a person id plus the post plus the event type, because a like and a comment on one post are two events. A key on the company swallows every later office and every later job. Take the key the source supplies (a publication id, a job id, an engagement id) before deriving one. The key drops a repeat through auto-dedupe on the capture table (`set_auto_dedupe` on the key column, `keepRule: "oldest"`), which deletes repeat rows permanently: get approval naming the table, the column and the row count. A monitor table takes auto-dedupe only when its source is a webhook, never when an import refreshes it, or the next fire re-creates the deleted rows and, with `autoRunOnNewRow` on, every downstream column pays again on them. Repeats are not counted: Baseloop cannot count them reliably yet, so tell a user who asks to track them (a job still open, a round reported again).

**Story-level repeats need a judgment on top of the key.** The same funding told by three outlets passes the key, so a story judge runs after it, told that rumoured, agreed, approved and completed are one story, so a milestone update never becomes a second signal. The key comes first because it is free.

**The free screen goes in front of the judge.** A keyword test, a code table, a size floor, a domain lookup: each stops most of a noisy feed at no cost. What survives earns the model.

**Relevance is a table where it can be.** A short table of "posts we care about" decides a whole feed of engagement events by a free lookup. A list of things being watched, joined on the identifier the source returns, is editable by the owner and makes "not one of ours" a visible word.

**Every monitor table watches its own source.** The shared source-alive rule ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "A source that stops looks exactly like a source with nothing to report") is base on every monitor table here, because silence is the normal answer for a signal and a dead feed is indistinguishable from a quiet week.

**A re-run of the verdict overwrites what the alert was sent on.** So the delivered record is written at send time ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "Delivery is recorded where the next run reads it, and a verdict is not a delivery record"). `email_send_email_notification` skips, and does not charge, a repeat of the same recipient, subject and body from the same field and row inside 24 hours: a free second guard, never the first.

**Many signals written into one property pair show the rep only one.** The hiring state goes in a property that is overwritten and the recall event in a dated note ([gtme-rules.md](./gtme-rules.md) "A signal is either an event or a state"); those two shapes are the ones this file meets most.

**The classifier belongs where the evidence is.** When the CRM labels a company "high intent" and the page log arrives separately, re-derive the label from the pages and show both. When the evidence is missing, say so ("trigger evidence not available: the visit feed has no page that matches") instead of picking one.

**A person found from a stored list is a claim.** A contact pulled from a table someone enriched months ago carries the employer as of then. Re-check the position or print the enrichment date next to the name.

**Scoring waits for a signal mix.** A score built for signal types that never arrive scores nearly every account zero. Build the score for the signal types that arrive, and add a weight the week its first row lands.

**A change is dated with two points in time.** To turn a state into a dated event for free, give the research the site now and an archived copy from the start of the window, and name the neighbours that do not count: a feature update and a rebrand are not a launch.

## 5. The sequence, and the delivery

The source delivers rows into its own monitor table, on its schedule or on arrival. The free screen runs there: is this one of ours, is the company big enough, is the code in our list. Then identity: the company resolved and checked against the name that arrived; on a webhook without a domain, one paid identity call. Then the CRM: found, several, not in CRM, and the leave-alone word. Then one judgment call, web search off, with the seller profile in its system prompt and the two lists, returning the verdict, the reason in the source's words, the date, and the offered outputs; the deterministic parts stay out of it: recency from the row's own date, size from a formula, the key from a formula. Then the send into the capture table, keyed on the signal key, so a re-run updates the same signal row. On the capture table: the delivered record and the Result word. Then delivery, gated on the account word and on not already delivered: the CRM first, the channel second. Then the person, only where a signal survived and the user asked.

**Delivery** is the CRM record: a task on the owner with the specifics in the body, a property for a state, a dated note for an event, both keyed. Never the CRM's own description, website or industry. No owner means the named list a person works, or the default owner, decided in the request. Slack and email are offers; Slack keeps no body, so it is never the history. The sequencer is an offer: add the person to a campaign, gated on the signal, a deliverable email and the leave-alone word; the lemlist, Instantly, HeyReach and Smartlead add-to-campaign actions all take a per-row campaign (`campaignId: "{{campaign_formula}}"` with `campaignId__dynamic: true`). A ticket with an expiry also works: its duplicate search reads open items only, so a new signal after one closes opens a new one. More than most teams need, and the same field fits a custom property or a note. Baseloop sends no outreach itself: the sequencer sends.

## 6. The four recipes

Four entry points, one chain. Depth 1 is the base. Each next depth adds on the one before: watch and judge, keep the history, deliver, find the person. Offered in that order, built on yes.

**Table count.** Two. A monitor table per source (a table holds one source, fixed at `create_table`), and one capture table where every signal lands keyed and is delivered from. A third table is needed only when several signals are grouped into one message per company or per rep, and depth 4 adds its people table where it is built, because the finder writes into a table of its own. Staging tables between monitor and capture are not built by default (a user who names one gets it, told once what the item key would have done): the send's item key does their job: key, look up, forward. A digest reads only the signals not yet delivered, or each new mail reprints what the rep has already been sent.

Cost below is shape only. Read the figure from the action's guide (`get_action_schema`) when it states one; `creditCostHint` in `list_actions` says only free, paid or variable, so otherwise the rate is known after the build's one-row test.

### Depth 1, watch and judge

On the monitor table.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Source | the recipe's source: a scheduled source action, a webhook source or a CRM list import, each with `autoRunOnNewRow` on | | free, or paid per row on the LinkedIn sources | every extraction the chain needs, read from a real payload per event type |
| Source alive | not a formula (it sees one row and recomputes only when that row changes): the newest row's Created At against the interval (a view sorted on Created At), plus the source's runs (`list_runs` for a failed fire; `get_run_status` for its `sourceImportSummary` where the import records one: an RSS pull records the items it read, the rows it created and the newest item's date, the HubSpot imports record records processed and rows created, a webhook records none) | | free | Alive, Late, Dead. A source only writes rows when it finds something, so Late means either a dead source or a quiet one; a failed run, or an import's row count where it records one, tells them apart, and Late is a list a person checks, never a silence |
| Signal key | formula: the source's own id, else what happened plus when plus who | | free | never the company alone |
| Screen | `lookup_single_record` on the watched list, plus formulas for a code table, a size floor, a keyword test | | free | stops most rows at no cost; the reason on the row |
| Company | formula, or one `custom_ai_agent` call with web search | Screen passed AND no domain on the row | free, or paid per row | the source's domain or company page first; the paid call only when the payload has neither, told what not to return: recall portals, news, aggregators, directories. A wrong website is worse than none |
| Name check | formula | | free | the resolved name against the arriving one; Differs stops paid work |
| CRM company | `hubspot_lookup_object` on OR groups: domain; LinkedIn page; name, with `advancedConfig.limit` above 1 so several matches can be seen | Screen passed | free | |
| CRM status | formula counting the lookup's results, and the portal's values | | free | Found, Several, Not in CRM, plus Leave alone or Cold |
| Judgment | `custom_ai_agent`, web search off | Screen passed AND Name check = Match AND status is one to research | paid per row, free on the org's own model key | seller profile in the system prompt, two lists, verdict, the reason in the source's words, the date, and the offered outputs. Web search stays off because with it on the agent takes no system prompt to hold the profile; a thin payload gets its facts from the Company step above, never from the judge searching. Recency and size are formulas the prompt is told not to touch. Unsure is a third word, never "return Qualified when unsure" |
| Output columns | extraction columns on the agent's outputs a gate or a person reads | | free | |
| Result | formula off a helper | | free | Signal, Review, Not ours, Too small, Wrong company, Left alone, Source dead, Pending |

Offer at this depth: a verification call on the open web for webhook signals that name the company but carry no source page, with "absence of confirmation is unverified, never refuted".

### Depth 2, keep the history

The capture table.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Send to signals | `send_to_table`: `send_for_each_item` with `sourceConfig.sourceItemKey` on the id property each array item carries (an item property, never the Signal key column), or `send_row` where the monitor row is the signal | Result = Signal or Review | free | a re-run updates the same signal row instead of adding one |
| Auto-dedupe | `set_auto_dedupe` on the Signal key column, `keepRule: "oldest"`, switched on after a one-row send has created the column and before the full run | | free | a repeat of one event never becomes a second row; the key dedupes here, not on the monitor |
| Already delivered | `hubspot_get_engagements` on the company plus a formula on the Signal key (the task and note bodies carry the key) | | free | reads what the CRM holds, never this row's own writes, so a re-run of the verdict or a skipped write cannot flip it |
| Same story | `custom_ai_agent`, web search off | a second signal at the same company inside the window | paid per row | drops the second telling of one story; only after the key |
| Expiry | formula on the signal date and the window | | free | a state carries the date it was observed |

Switch `autoRunOnNewRow` on for the capture table once the first send has created its columns, so a new signal row runs the delivery (and, at depth 4, the finder) on arrival.

### Depth 3, deliver

On the capture table.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Owner | formula: the record's owner, else the agreed fallback | | free | never a hardcoded id; the portal's owner ids come back from `resolve_action_options` on `hubspot_owner_id` |
| Task | `hubspot_create_engagement`, a task on the company, `hubspot_owner_id` from the Owner column in dynamic mode, the due date in `hs_timestamp` | Status = Found AND owner AND Result = Signal AND not Left alone AND not Already delivered | free | the specifics in the body: what, when, source, why |
| Signal property or note | `hubspot_update_object` for a state; `hubspot_create_engagement`, a note, for an event | Status = Found AND Result = Signal AND not Left alone AND not Already delivered | free | custom properties only; the create has no key of its own, so the gate is the key |
| No owner | `send_to_table` to the agreed list, or the default owner | Result = Signal AND no owner | free | an unowned signal otherwise vanishes |
| Delivered record | formula off a helper that reads the success of every write selected on the row: the task, and the property or the note | | free | what was sent, to whom, when; the history the next run reads. It reads success, not the attempt, and all of the writes, or one failed write is never retried while its sibling's success hides it |
| Result | formula | | free | adds Delivered, Already delivered, No owner, Not in CRM |

Offers on connected tools: `slack_send_message_to_channel` with the specifics and the record link; `email_send_email_notification` (a small charge per email); add to a campaign in the sequencer on the outcomes the team names.

### Depth 4, find the person

Only where a signal survived and the user asked. Existing CRM contacts first: `hubspot_lookup_object` on contacts by the company's id (confirm the contact property with `resolve_action_options`), a limit above 1, filtered by the agreed responsibilities, free. Then `li_find_people_at_company` per role with a cap (`maxLeadsPerCompany`), writing into a people table through its own `destinationListId` (never a Send to Table after it), paid per person found and less on the org's own LinkedIn account: Prospecting 9.5 and chain A, cited. Rank the candidates by whether they can be reached first, then by function, then by seniority, because a perfect title with no address is not a contact. A person from a stored list carries the date it was enriched. Offer beyond depth 4: a score across signals per account, built only for the signal types that arrive.

### 7.1 Baseloop watches it

A scheduled source action in Baseloop pulls the signal:

- **Engagement** on a person's or a company's posts through `li_import_profile_engagement` (beta): one `/in/` or `/company/` profile URL per table, daily, weekly or monthly, 0.5 credits per engagement row, capped by `maxEngagements`.
- **Job postings** through `li_job_posting_tracking`: a query of up to 22 OR-separated terms with a location (`geoId`) and the board's own filters, capped per run by `maxJobs`, 1 credit per job imported, deduplicated by the job id on a re-run.
- **Key hires** from a Sales Navigator people search through `li_import_sales_nav_contacts`, monthly, free on the org's own LinkedIn seat and 0.5 credits per contact on Baseloop's access. Ask the user for an existing search URL; these tools cannot build one, and one is never composed by hand.
- **A feed** through `pull_rss_feed` (free); **an Apify actor** through `apify_import` (needs the Apify connection).

Research on a schedule is recipe 7.4.

What is specific: the engagement import skips the events it has already imported by their own id (the source cell's `fullValue` holds it as `engagementId`), so the monitor is an event log, and the capture key is still person plus post plus event type, because a like and a comment on one post are two events for one pair. Relevance is the watched-posts table. A comment gets the paid read; a like never does. A blocklist of own staff, investors and customers sits in front of the first paid step. A job posting carries the employer and a website, so no identity call. A people search becomes a key-hire signal only when the search is filtered on a recent change or the row carries the date the person started: a scheduled Sales Navigator import restarts from the head of the search each run, so otherwise it returns the same people every month and nothing says what moved. `li_find_people_at_company` with `changedJobs: true` (started a new position in the last 90 days) is the per-account form of the same signal. Cost on the engagement source: a fraction of a credit per event, one paid read for a comment worth reading, the identity of a person and of their company paid once each, and nothing on every event after that. A key hire is a person at a company: a known account gets a contact, an unknown company becomes an account to qualify.

### 7.2 An outside tool posts it

A webhook from a monitor the team runs elsewhere: a search API through an automation tool for funding, office openings and hiring, a registry feed for building permits and product recalls, an authority-post tracker, an ad-engagement tracker, a scraper. Any tool with a webhook posts to a table created with a webhook source, with `autoRunOnNewRow` on.

What is specific: one real payload per event type is read at build time, because the keys differ per event and the thin events drop the ids. The sender's own reference or dedupe key is the signal key when it has one; the webhook source itself dedupes nothing. A registry payload carries a code and the screen is a code table, a formula. A payload without a domain needs one identity call, and the prompt names what not to return. Upstream drift is normal: a payload can lose a key or gain a new one, so the raw body is kept and re-read when a column goes quiet. A call back to the outside tool when the row finishes, to stop it re-posting, is built only where the tool issues a signed, event-scoped URL for it: `baseloop_send_http_request` carries no connection, and a key typed into it is stored in the field config and returned by `get_table_schema` to everyone who can read the table, so it goes in only with the user's explicit consent. A plain public hook is never used for the callback, since a forged call would suppress real events; without a signed URL the callback is left out.

### 7.3 The CRM flags it

A scheduled import of a CRM list or view where the CRM already set the trigger: website intent lists, a lifecycle change, a flag a workflow set. `hubspot_companies_list_import` on the interval the team wants, the page log arriving by webhook from the tracker.

What is specific: the CRM's word is the trigger and the page log is the evidence; the build re-derives the intent word from the pages and says so when they disagree. The classifier is a formula over the visit log: first match wins on the URL path, the traffic type comes from the click ids and the medium, and a paid landing page never counts as evidence for a trigger. Strip our own outreach tag out of the trigger list before the row counts as intent, because a company whose only trigger is our own campaign has done nothing. Three CRM lists are three monitor tables, one per list because a table holds one source, feeding one shared capture table with a view per trigger by default; when the user asks for a capture table per trigger, build those and say once what one keyed table would have caught. The key carries the trigger and the date, not the company alone. History on the CRM object with the signal date and expiry.

A flag the build writes back can be the thing that triggers the next run: a property set on the company in the full sweep and re-checked from a webhook the CRM fires on that property. Name the sender and the stop condition before any flag is written, or the loop runs forever.

### 7.4 AI research on a company list

The monitor is a research call per company on the list, `parallel_research` at its base tier or `custom_ai_agent` with web search, inside a window. This is the Rep assist alert on one rep's accounts at team scale, and it is the expensive entry point: paid per company per run before a signal exists, free on the org's own research key. The scheduling follows "Schedule chains" under "autoUpdateDependents Strategy" in [workflow-patterns.md](./workflow-patterns.md):

- **Its own table.** When the list's table already runs other action columns (a qualification chain, a send), the monitor is a table of its own, fed from the list by a send, so its `autoUpdateDependents` re-runs nothing else. Whether that send repeats each cycle is the user's answer on new companies, asked before the plan when the request has not said it.
- **The research carries the schedule.** The recurrence over existing companies is the research column's own schedule (`update_field` with a `schedule`, weekly on the chosen day). A fire runs every row the column's run condition admits, rows that already hold a value included, and reserves credits for each, so gate it on the window word and state the company count per fire in the plan before switching it on. The judgment and the send read the research, so they follow it through the monitor table's `autoUpdateDependents`, switched on in the same build, and neither carries a schedule of its own.
- **The leave-alone check goes first, on its own schedule.** When the user names companies to leave alone (customers, open deals, recently contacted), the CRM check runs before the research, as the free gate that keeps them out of paid research; placed after it, the research pays for every company the check then leaves alone, on every cycle ([gtme-rules.md](./gtme-rules.md) "Cheapest first"). The gate lets through every company not left alone, the ones the CRM does not know included: on a list someone chose, a company the CRM lacks is a new account, not a miss. The check keeps its own weekly schedule next to the research's: the research reads it, so it cannot ride the chain, and a cascade from a CRM state that rarely changes would almost never re-run the research. Schedules keep no order, so the research reads whatever the check last wrote: a company that has just become a customer can get one more paid research before the gate catches it, and the plan says so.
- **A lookup that gates nothing rides the chain.** Only a lookup that gates nothing (no company is left alone, and the record only feeds the delivery, an owner for a task) goes after the research, where it matters only when the research finds something: a run condition that reads the research re-runs it, before the judgment, on every row whose research changed.
- **Where the chain ends.** A scheduled list import keeps its own schedule, which brings new companies in; it runs the action fields on the rows it creates (with `autoRunOnNewRow` on), not on the rows it has seen, and its refresh re-runs nothing. The chain ends at the send: a new signal row runs the capture table's delivery and finder through that table's `autoRunOnNewRow`, and a re-send that updates a signal row already there re-runs nothing on the capture table, whichever of its switches are on.

What is specific: the seller profile is the recipe; the same tables aimed at two sellers return different signals. Research accepts states with the date observed, or it drops hiring for having no event date. The source URL it returns is often an index page, so an item whose URL is a section index is unverified. Repeats are stopped by a story-level judgment reading the signals already captured, because the key alone cannot see a second telling. Nothing found is the common answer and reads as Quiet; prompt for an empty value when nothing is found, because a "Not found" or "NONE" passes every not-empty gate. The research is never gated on a hand-typed owner map, because a company whose owner is missing from the map never runs. Fixed checks beat open research where the questions are known: open sales roles from `li_company_hiring_activity` (0.5 credits per company, charged on a zero too), headcount growth from two readings of the profile, a tool in use from the technology-stack action `list_actions` names, a product launch inside the window from the site now against an archived copy; each a state or an event with its own output written to the company record. Where no provider sells a fact, such as the size of the sales team, an agent estimates it from the public people page with the employee count as a sanity check, and delivers the number and a band together. The on-request form is a CRM property or a workflow posting the record id to a webhook source, and the checks run for that one account.

## 7. The next depth

When a depth is planned, end the plan (and the build report) with one line naming at most three next depths, deepest first, in this use case's order: watch and judge, keep the history, deliver, find the person. Name the source, the tables, the companies and the work in that line, so it can start a new plan on its own.

After depth 1, the offers are delivery to the owner (depth 3), then the history on the key (depth 2), then a second source into the same capture table. After depth 3, they are the person at the company (depth 4), then the campaign handoff into Outbound 4.3, then the account to qualify when the company is unknown (TAM sourcing) or the contact at a known account (ABM). Offer, never assume, and never build the next depth because it seemed obvious.
