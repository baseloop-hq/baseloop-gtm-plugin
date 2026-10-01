# CRM Reactivation

Use this recipe when the entry point is a deal record (lost, won, or open and quiet) and the team wants the ones worth going back to, with the reason, on the record. It covers three recipes: closed lost (8.1), closed won (8.2), and open deals that went quiet (8.3, the recurring one).

This file does not repeat the shared rules. Read [gtme-rules.md](./gtme-rules.md) for taking the request and building, and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) for working a CRM and delivering, before you plan. What follows is what changes when the entry point is a deal.

## 1. The job

A deal record is the entry point. It arrives with its own id, stage, owner, close date, amount, the reason it was lost, and the notes the rep wrote. Three questions, three recipes. Closed lost: is the blocker still there, or has enough changed to go back. Closed won: what changed at the customer that fits more, and did the champion move. Open and quiet: what moved at the account that gives the owner a reason to call.

Typical requests: "which lost deals are worth a second try?", "which customers have grown since they bought?", "which open deals went quiet, and what changed at those accounts?". What they want back: a short list with the reason per deal in the rep's own words, the one thing that changed, dated, with a source, and a task on the owner. Not a list of every deal with a sentence on each. What kills it: a reason from over a year ago presented as new, the same story logged twice, a call task about the right account addressed to the wrong person, a structural loss revived.

## 2. Where CRM reactivation stops

- **Prospecting** chain C (contacts come from the CRM) is the same discipline at contact level, with no deal. Reactivation starts from the deal. Chain C's position check and the account read are written in [use-case-prospecting.md](./use-case-prospecting.md) and cited here; read it when a recipe below cites it.
- **CRM cleanup** 2.1 (the job change audit, [use-case-crm-cleanup.md](./use-case-crm-cleanup.md)) does the position check at CRM scale; 8.2's champion tracking reads its result where it exists.
- **Signals** ([use-case-signals.md](./use-case-signals.md)) watches a source for the whole market. A change at an account with a deal on it belongs here, because the deal's history is the evidence and the deal owner is the reader.
- **Account research** (no written recipe in this plugin, see [use-cases.md](./use-cases.md)) answers a custom question about one company on request; 8.3 asks the same question every cycle about every quiet deal.
- **Rep assist** (meeting prep; no written recipe in this plugin) writes the brief for a meeting the reactivation produced.

## 3. Taking the request

The shared rules set the order: what the user sells, the input, the connections, then the questions. What CRM reactivation adds at each step:

1. **What the user sells names what counts as a change.** It decides which change answers which blocker; the second list, what does not count, is what keeps a fifteen-month-old office move out of the list. There is no saved company profile here: ask the user, draft both lists, and have them confirmed.
2. **Check what is connected** with `get_connected_platforms` and `list_actions`: the CRM, and whether deals live in it or in a second system.
3. **Read the deal object's values back** before writing a filter: `resolve_action_options` on `hubspot_deals_criteria_import`'s `criteria` (with the HubSpot connection as `auth`) returns each deal property with its option list: the stages and their ids, the lost-reason property's own options, the pipelines. Every filter below is written with the portal's own values.
4. **A read over a whole pipeline that writes notes and tasks onto live deals** always gets the full plan document and the user's approval before anything is built.
5. **Ask one question at a time** with the blocking question tool, at most four, each with its recommended default when it has one.

Rank the open questions per recipe and ask the top four. Everything below the cut ships as a stated default that the plan announces.

| Rank | Question | What it decides | Default when it ships unasked |
|---|---|---|---|
| 1 | Which deals, and how far back? | 8.1: which lost reasons the portal actually uses, the window, the amount floor, whose deals. 8.2: how long after the close a customer is fair game. 8.3: which stages count as live and what stalled means, days since the last stage change, days since the last activity, past the expected close date, read back with the portal's own stage ids, and what the owner already receives on the record today, so the build adds to it rather than duplicating it | Last twelve months; no floor; every owner; open deals stalled ninety days |
| 2 | What counts as a change for what we sell, and what does not? | The two lists the judge is handed, and the window a change has to fall inside | The seller's signals; ninety days |
| 3 | How is the company known? | The deal import carries the deal's own properties and no association, so the company arrives either as a property the portal fills (a workflow copying the company id or domain onto the deal) or through the resolution step in section 4. Ask which, because a property is free and exact | A deal property where one exists; the resolution step otherwise |
| 4 | What is a re-approach? | A task, a sequence, nothing; whether a lost deal may be touched while another deal is open at the same company; whether a won account belongs to customer success, not sales, and what an expansion conversation is allowed to look like | A task on the deal owner; never while another deal is open; sales |
| 5 | Should the CRM's own notes be read, and how deep? | The notes are the evidence and they are free; the depth is the only question: a cap on how many (`hubspot_get_engagements` `maxResults`, default 10, keeps the first N associations HubSpot returns, not the newest) or the whole history | The whole history on the deal |
| 6 | Which contact, by role? | The role the play names, so the task addresses the right person; a role computed and then ignored produces a task about the right account addressed to the wrong person | The deal's associated contacts filtered on the role the play names |

## 4. What changes for CRM reactivation

**The company is a pointer that came with the deal, never a name parsed out of the deal title.** The deal import (`hubspot_deals_criteria_import`, `hubspot_deals_list_import`) returns the deal's own properties and no association. So the company comes one of two ways, and the plan says which. Where the portal holds a deal property with the company id or the domain, a workflow can fill it and the row reads it, free and exact. Where it does not, one resolution step runs once per deal: `custom_ai_agent`, web search off, handed the deal name, the notes and the deal's own properties, returning the company name it read, then `hubspot_lookup_object` on companies by that name and by any domain in the notes, a Match word from the returned name against the deal, and every paid step gated on Match. The resolution is kept in a memory table keyed on the deal id (a `lookup_single_record` into it before the resolution runs), so a re-run pays nothing.

**The deal's notes are the evidence, and they are free.** The objection in the rep's own words, what was promised, what they bought it for. Most teams have never read them in bulk. One free `hubspot_get_engagements` on the deal (`objectType: "deals"`, `engagementType: "notes"`), before any paid step, is the highest-value column in this file.

**Triage nearly for free, research only what survived.** The notes are free and a no-search call on the cheapest model costs a fraction of the research call it gates; it labels a loss reopenable or structural from the notes and the recorded reason. Structural stops and never costs a credit. Only reopenable earns the web-search call. A low structural share usually means the "what does not count" list is thin ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "A soft no is an asset, a hard no is a boundary").

**The change needs a window after it, in code.** A research call told to find a change finds the best one it can, at any age. The age test is arithmetic on the date the agent returned, against a per-row run date. Without it a change from over a year ago reads as a reason to call today.

**On the recurring recipe the difference is the only gate on the write** ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "On a recurring write-back, read the record first and write only the difference"): an agent asked whether a story is new can say yes to the same story twice, so "have we told them" is the comparison, never the agent's memory.

**The run date is a formula bound to a column the cycle rewrites.** A formula comparing to today recomputes only when a cell it reads is rewritten, so it goes stale on a recurring table. Reference a deal column the import refreshes, as a trigger only: each import recomputes it on every row it touched, so it reads the last import on every in-scope deal. Whether a producer ran this cycle is read from its own cell, never from the run date.

**The final score clears when the producer did not run this cycle**, or it reads a stale verdict from an earlier cycle.

**Never take the first contact at the company.** The contact lookup returns several (`advancedConfig.limit` above 1), the role filters them, and "no fitting contact" is a word on the row.

**A feed is built with its match-back step or not at all.** A feed nothing joins to a deal only collects what the research call already pays to find.

## 5. The sequence, and the delivery

Import the deals with the filter the request set: stage, dates, amount, owner, and the fields the recipe writes back (a record limit on the first run). Read the deal's notes, free. Resolve the company, from the property or the resolution step. On the recurring recipe, re-read the record live to get its current values and its current stage, and decide in scope or not before anything paid. Triage from the notes, one cheap call, no search. Research what changed, one call with web search, gated on the triage, told the blocker and told what would answer it. Cap by age in a formula. Compare against what the record already holds. Then the note on the deal, the task on the owner, the person when asked. Result last.

**Delivery** is the deal record: a note with the loss type, the objection, what changed, the dated source, the angle, every section branching on its value, keyed on the source URL or the run so a re-run writes nothing twice ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "A create carries a key that stops a second one"). A task on the deal owner with the brief in the body, `hubspot_owner_id` from the deal's own owner property and never a hardcoded fallback, a due date per row in `hs_timestamp`. On the recurring recipe, the deal's own properties updated only where the value differs. Offers: Slack, email, the draft in an email engagement next to the call task.

The same steps exist for Pipedrive (`pipedrive_lookup_object`, `pipedrive_update_object`, `pipedrive_create_activity`, `pipedrive_get_activities`, which returns the deal's activities, not its Notes) and for Salesforce opportunities (`salesforce_opportunities_criteria_import`, `salesforce_lookup_object`, `salesforce_update_object`, `salesforce_create_activity`) except the read: no action reads a Salesforce record's notes or activity history, so there the triage reads the recorded loss reason and the opportunity's own fields, and the Already logged key lives on the row. Baseloop sends no outreach itself: the rep sends.

## 6. The three recipes

Depth 1 is the base. Each next depth adds on the one before, offered in order, built on yes.

**Table count.** One deals table per recipe, plus the memory table for the company resolution where it is needed, plus a second table only for 8.2's champion who left, because that row stops being about this deal.

Cost below is shape only. Read the figure from the action's guide (`get_action_schema`) when it states one; `creditCostHint` in `list_actions` says only free, paid or variable, so otherwise the rate is known after the build's one-row test.

### 8.1 Closed lost

Import filter: stage closed lost, close date inside the window, amount above the floor, owner.

**Depth 1, triage for free.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Lost deals | `hubspot_deals_criteria_import`, `selectedProperties` including `hs_object_id` | | free | id, name, amount, close date, loss reason, owner, pipeline, and any property the portal fills with the company |
| Deal notes | `hubspot_get_engagements` on the deal, notes | | free | the objection in the rep's own words |
| Company | the deal property, else the resolution step from section 4 with its Match word | | free, or paid per row once | never parsed from the deal name without the check |
| Loss triage | `custom_ai_agent`, web search off, one call, the cheapest model | notes or loss reason not empty | paid per row at the cheapest rate, free on the org's own model key | reopenable or structural, the loss type, the objection quoted, what would have to change, confidence. Lean on the recorded reason when the notes are thin and say so |
| Result | formula off a helper | | free | Reopenable, Structural, No evidence, Pending |

**Depth 2, what changed since.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Change research | `parallel_research` with typed `outputFields` (what changed, the date, the source URL, why it answers the blocker); `custom_ai_agent` with web search only when the user names it, one call | Result = Reopenable AND Company = Match | paid per row, free on the org's own key | the single strongest dated signal with a source URL and why it answers this blocker; empty when nothing is found (a "None" or "Not found" passes every not-empty gate) |
| Output columns | extraction columns on the agent's outputs | | free | what changed, date, source, strength, why |
| Signal age | formula on the date and a per-row run date | | free | an event older than the window cannot be High |
| Priority | formula | | free | High when strong AND inside the window AND answers the blocker; Medium when one is soft; Low when nothing. Deterministic, so a formula |
| Result | formula | | free | adds Trigger found, No trigger |

**Depth 3, log it on the deal.** Already logged, a formula on the review key against the notes read in depth 1. Review note on the deal through `hubspot_create_engagement`, a note, the body as the CRM renders it, gated on Priority and not Already logged.

**Depth 4, who to call and the task.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Contacts at the account | `hubspot_lookup_object` on contacts by the company's id (confirm the contact property with `resolve_action_options`), `advancedConfig.limit` above 1 | Priority High or Medium AND Company = Match | free | several, not one arbitrary record |
| Right person | formula on the title, `custom_ai_agent` only where titles do not decide | contacts not empty | free, or paid per row | the role the play asked for; nothing usable is a state |
| Position check | `enrich_contact` | offered; the champion who objected may have left | paid on success, free when not found | Prospecting chain C's step, cited ([gtme-rules.md](./gtme-rules.md) "Match the right position") |
| Call task | `hubspot_create_engagement`, a task on the contact, `hubspot_owner_id` the deal owner, the due date per row | right person AND not Already logged | free | the four-line brief in the body |
| Result | formula | | free | adds No contact at the account |

**Depth 5, the draft.** One `custom_ai_agent` with the house style guide (ask the user for it and for real examples; never invent them), web search off, gated on a surviving priority and a real contact, landing in an email engagement (`hubspot_create_engagement`, emails) next to the call task. The rep sends.

Cost shape for 8.1: the cheapest call per deal to triage, one research call per reopenable deal, free after.

### 8.2 Closed won

Import filter: stage closed won, close date window, the company known.

**Depth 1, the account as it stands.** `hubspot_deals_criteria_import`; the product owned from a deal property the portal holds, the product field or a property a workflow fills from the line items, never the deal name, because no action reads line items; months since close on a per-row run date; the deal notes, free; the company from the property or the resolution step. Result: In window, Too recent, Pending.

**Depth 2, what changed at the customer.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Change research | `parallel_research` with typed `outputFields` (what changed, the date, the source URL, why it answers the blocker); `custom_ai_agent` with web search only when the user names it, one call, the areas agreed with the user | In window AND Company = Match AND domain resolved | paid per row, free on the org's own key | headcount, funding, new officers, new tools, or the seller's own list; each output empty when nothing changed |
| Signal count | formula counting the outputs that hold a change | | free | a sentence such as "no change found" counts as a change when the test is "is the cell empty": prompt for empty, and read the outputs, not the prose |
| Play | `custom_ai_agent`, web search off, reads the signal columns and the catalogue | Signal count above zero | paid per row | upsell, cross-sell or no-play, the product, who to speak to, the brief, the reason; never the product they own; no-play is the common answer |
| Result | formula | | free | Play, No play, No change found, Pending |

**Depth 3, hand it to the owner.** A task on the deal through `hubspot_create_engagement`, `hubspot_owner_id` from the deal owner, a due date per row, the brief in the body, gated on Play and an Already logged key read from the deal's engagements.

**Depth 4, champion tracking.** The contacts associated with the won deal, their current position checked with `enrich_contact`, paid on success. Still there: the person to speak to for the play. Left: a second table, because the row stops being about this deal. The champion's new employer is a new account with a warm relationship, resolved and checked against the CRM, handed to the owner as a task with the history. CRM cleanup 2.1 does the position check at CRM scale; this reads its result where it exists. Proposed from the rules: run it on a small slice first.

### 8.3 Open deals that went quiet

The recurring shape, scheduled per "Schedule chains" under "autoUpdateDependents Strategy" in [workflow-patterns.md](./workflow-patterns.md). A native schedule on the import brings new deals in and refreshes the deal columns each cycle; with `autoRunOnNewRow` on, it runs the action fields only on the rows it creates, and its refresh of a deal re-runs nothing, whichever switch is on. So the research over the deals already in the table is that column's own weekly schedule. The Live re-read is a CRM read and carries its own schedule, set hours after the import's and before the research's, because an import refresh re-runs nothing; schedules keep no order, so the research reads whatever the re-read last wrote. The research's schedule is gated by the In scope run condition so a fire spends only on open deals; every admitted row re-runs each fire and reserves credits, so the plan states the deals per fire. The judgment and the owner's task read the research, so they follow it through `autoUpdateDependents`, switched on in the same build, never through schedules of their own.

**Depth 1, decide whether to spend.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Open deals | `hubspot_deals_criteria_import` on the agreed recurrence, or the Pipedrive or Salesforce equivalent | | free | id, title, value, stage, owner, last stage change, last activity, the fields the recipe writes back |
| Run date | formula referencing a column that re-runs each cycle, as a trigger only | | free | the per-row "as of" date |
| Live re-read | `hubspot_lookup_object` on the deal by its id | | free | current status, stage and the values already on the record: the carry-forward input and the free stop |
| Company | the deal property, else the resolution step, kept in the memory table on the deal id | | free after the first run | |
| Account record | `hubspot_lookup_object` on the company id | Company = Match | free | name, domain, the account fields the research needs |
| In scope | formula: live status and stage, plus the team's stall test on the last stage change and last activity against the run date | | free | without the stall test every open deal passes; the stall test is what the request adds |
| Result | formula | | free | In scope, Not in scope, Pending |

**Depth 2, research, cap, verify.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Change research | `parallel_research` with typed `outputFields` (what changed, the date, the source URL, why it answers the blocker); `custom_ai_agent` with web search only when the user names it, one call, the previous state passed in as context | In scope AND Company = Match | paid per row, free on the org's own key | the dated event, its sources, the score, the account's current status; states carry the date observed |
| Output columns | extraction columns on the agent's outputs | | free | |
| Age-capped score | formula on the event date and the run date | | free | an event from years ago cannot be High |
| Verification | `parallel_research` at its base tier | capped score High or Medium | paid per row, free on the org's own key | fact-check the finding. An offer, cheap because it runs only on rows that would be acted on |
| Final score | formula | | free | None when refuted, else the capped score; cleared when the producer did not run this cycle |
| New or repeat | formula comparing the source URLs against what the record holds | | free | a comparison, never the agent's opinion |
| Result | formula off a helper | | free | Signal, Quiet, Not in scope, Refuted, Failed, Pending |

A prompt that demands a minimum number of searches costs more than one call, and with a spend cap on it the cap becomes the budget.

**Depth 3, write back only the difference.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Intended values | formulas per property, carrying forward the record's value when the story is not new | | free | score, type, signal date, expiry |
| Delta | formula against the values read in depth 1 | | free | the only gate on the write; empty, null and "None" are one state |
| Update the deal | `hubspot_update_object` by id, `ignoreBlanks: true` | Delta AND record id | free | |
| Timeline note | `hubspot_create_engagement`, a note on the deal | New story AND a real score | free | one per story, keyed on the source URL through the Already logged read ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "Signal history comes from the delivery record") |
| Delivery check | formula comparing what came back with what was sent | | free | |

**Depth 4, the person.** Contacts at the account by the company id, filtered on the responsibility the signal is about. Only where a signal survived.

**Offers on connected tools.** Slack, email, a post to the team's own automation where its inbound hook takes no key, each gated on the delta and a real score. A market feed (`pull_rss_feed`, a provider through `apify_import`) only with the step that matches it back to a deal, or it is not built.

**Quick wins to propose first.** Closed lost, free pass: notes plus one cheap triage. Closed won, one free column: the notes on every customer. Open deals, the free stop: in scope or not, and the deals whose stage moved since last time. Then, second, the web-search "what changed since" behind the free triage.

## 7. The next depth

When a depth is planned, end the plan (and the build report) with one line naming at most three next depths, deepest first, in the recipe's own depth order. Name the table, the deals, the window and the work in that line, so it can start a new plan on its own.

After 8.1 depth 1, the offers are the draft (depth 5), who to call and the task (depth 4), then the log on the deal (depth 3); each names the research it depends on. After 8.3 depth 1, they are the person at the account (depth 4), then the write-back of the difference (depth 3), then the research with its verification (depth 2). Most rows end on the deal. The one that leaves is the champion who left a won deal: a new account in its own table, and the employment check behind it runs at CRM scale in CRM cleanup 2.1. Offer, never assume, and never build the next depth because it seemed obvious.
