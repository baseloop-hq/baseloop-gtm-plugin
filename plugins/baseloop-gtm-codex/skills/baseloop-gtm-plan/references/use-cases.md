# GTM Use Cases

Read this in Phase 2 of the plan skill, and whenever the user asks what Baseloop can do or where to start. It names the eleven GTM jobs Baseloop is built for and routes a goal to exactly one recipe file in this folder. The recipe owns its questions, its depths, its tables and its gates. The shared rules in [gtme-rules.md](./gtme-rules.md) (taking the request, building) and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) (working a CRM, delivering) own everything every recipe does the same way, and both apply to every build this file routes.

## Which files to read

Both rules files and the one recipe the goal routes to. When that recipe cites another recipe file, read that one too, once: most cite Prospecting's chains, Outbound 4.1 cites TAM sourcing, Outbound 4.3 cites Signals, and Inbound enrichment's committee depth cites ABM. Never read a recipe the one you are on does not name. This file adds to the plan skill's phases and never replaces them.

## The eleven jobs

Three categories. **Data foundations** is ops-owned, recurring, the whole CRM. **Pipeline generation** is a motion that ends in a list reps work today. **Sales productivity** is one person, one list or one account, now.

### Data foundations

| Use case | The job | Recipe file | Recipes |
|---|---|---|---|
| CRM enrichment | Fill the fields the CRM leaves empty on every company or contact, at whole-database scale, on a schedule, writing only where the CRM's own value is empty | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) | 1.1 all companies; 1.2 all contacts; 1.3 a CRM view on a schedule; 1.4 mobiles for the whole CRM; 1.5 role classification on every contact |
| CRM cleanup | Check filled fields for being stale, duplicated, dead, implausible or unusable (people who left, duplicates, dead emails and phones), flagging on the record, never merging or deleting | [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) | 2.1 job change audit; 2.2 duplicate audit; 2.3 dead email audit; 2.4 dead phone audit and replacement; 2.5 value audit against a public constraint; 2.6 normalise the words the CRM groups on; 2.7 dead domains and empty accounts; 2.8 clean on the way into a new CRM |
| TAM sourcing | Every company in the market once, qualified, tiered, in the CRM and kept current | [use-case-tam-sourcing.md](./use-case-tam-sourcing.md) | 3.1 from a Sales Navigator company search; 3.2 from a provider list or a file; 3.3 from the CRM's own companies; 3.4 from a description in plain language, or lookalikes |

A CRM health check that counts and ranks gaps without fixing anything is [use-case-crm-audit.md](./use-case-crm-audit.md). It writes nothing to the CRM, and each finding it ranks names the recipe that fixes it.

### Pipeline generation

| Use case | The job | Recipe file | Recipes |
|---|---|---|---|
| Outbound | One campaign's slice of accounts and the people to contact there, logged in the CRM with an enrolment record and handed to the sequencer with every gate a send carries | [use-case-outbound.md](./use-case-outbound.md) | 4.1 cold, from a description of who; 4.2 cold, from a company list; 4.3 warm, from a signal; 4.4 cold, from a list of people |
| Inbound enrichment | Each arriving lead identified from its email, qualified with a reason, written with an owner and a task, in minutes | [use-case-inbound-enrichment.md](./use-case-inbound-enrichment.md) | 5.1 a new or changed CRM record; 5.2 a webhook from a form, a product or a system; 5.3 a referral from a partner |
| ABM | The buying committee at a named account list: existing contacts first, one search per empty seat, coverage written onto the account, and the audience for a channel play | [use-case-abm.md](./use-case-abm.md) | 6.1 existing contacts at the accounts; 6.2 net-new per persona; 6.3 the audience for a channel play |
| Signals | A source watched, a free screen before one judgment, a key on the event so nothing arrives twice, delivered where the next run reads it | [use-case-signals.md](./use-case-signals.md) | 7.1 Baseloop watches it; 7.2 an outside tool posts it; 7.3 the CRM flags it; 7.4 AI research on a company list |
| CRM reactivation | Lost, won and quiet deals triaged for free from the deal's own notes, researched only where reopenable, logged on the deal with a task on the owner | [use-case-crm-reactivation.md](./use-case-crm-reactivation.md) | 8.1 closed lost; 8.2 closed won; 8.3 open deals that went quiet |

### Sales productivity

| Use case | The job | Recipe file | Recipes |
|---|---|---|---|
| Prospecting | Complete a rep's own named people now: work emails, mobiles, LinkedIn URLs, where they work. Three chains: a list of people comes in, a list of companies comes in, or the contacts come from the CRM | [use-case-prospecting.md](./use-case-prospecting.md) | 9.1 a CSV of contacts with work emails; 9.2 mobile numbers for a contact list; 9.3 LinkedIn URLs for a contact list; 9.4 a Sales Navigator search into a list with emails; 9.5 the right people at a company list; 9.6 a web page into a contact list; 9.7 the CRM leads sales never touched; 9.8 leads that engaged but never became a deal; 9.9 leads sales worked but never turned into a deal; 9.10 one person at a time, from the browser |
| Account research | Answer custom questions about an account or a person that no database holds, as fields on the record | None written | None |
| Rep assist | Help one rep with their own accounts and conversations: signal alerts, meeting prep, follow-up after a meeting or a call, reply classification | None written | None |

Account research has no written recipe: plan it from first principles with the plan skill's normal phases and the two rules files.

Rep assist has no written recipe: plan it from first principles with the plan skill's normal phases and the two rules files.

## Before you route

**An explicit request beats a recipe default.** The recipes fix table counts, column sets, question caps and offer counts as defaults. When the user names the shape they want (the tables, the columns, an action, an answer in chat instead of a table), plan that and say once what the default would have given. Spend, confirmation, data-loss and honesty rules do not yield.

**Know what the company sells before designing anything.** There is no saved company profile these tools can read. Take what the company sells, who buys and the ICP from what the user already said in this session; ask it first when nobody has, and never ask again what they answered. Every judgment downstream depends on it: what counts as a signal, which person is the right one, whether a row is worth spending on. Without it an AI judge has no standard and finds a reason for anything.

**A read-only audit is its own recipe.** A request to inspect, count or score a connected CRM without building a fix goes to [use-case-crm-audit.md](./use-case-crm-audit.md). The Data foundations path below hands audits over and takes them back once the user picks a finding to fix.

## The three entry paths

A request that already names the job goes straight to its recipe file. A broad one starts at the entry path that matches it: the path establishes the scope, then picks the destination.

| Entry path | Where the user starts | What it resolves |
|---|---|---|
| Data foundations | Improve our CRM data | What data exists, what is missing or wrong, which records need work |
| Pipeline generation | Build a workflow for our sales motion | Which working motion needs companies, contacts or signals, and what data would help |
| Rep assistance | Help me with an account or deal | What one rep needs for a particular account, person, meeting or conversation |

Rep assistance is the entry into the Sales productivity category (Prospecting, Account research, Rep assist); not every request through it lands on Rep assist.

Categories are entry doors, not barriers. A CRM audit can end in ABM when missing committee roles are the real problem. A campaign can start with TAM sourcing when the market is undefined. A rep's one-record problem becomes a whole-CRM job only if the user expands the scope.

### 1. Data foundations

Direct entries include auditing a CRM, checking a supplied company or contact list, and checking target-market coverage.

**Establish the scope.** Identify the CRM or list, the object and the segment, and how the team uses those records. Ask which information matters to that work: an email gap and a mobile gap have different priority for a calling team.

**Inspect before proposing a build.** Read what is readable without building: tables already in Baseloop (`get_table_schema`, `list_rows` with filters, `list_row_ids` for a count) and the CRM's properties and enum options (`resolve_action_options`). Counting gaps, quality flags and associations inside the CRM needs its records in a table: that is the CRM audit recipe, a sized import the build skill runs, never a full-object import taken just to look (the audit's deep sweep, when the user asks for it, is the one exception). Report the slice, the affected count, whether the number is exact, sampled or a lower bound, and what could not be assessed. A populated field is not necessarily a usable one. Missing data is possible enrichment work, never a promise that the information will be found. Fresh employment checks, deliverability checks and external research are deeper investigations: offer the recipe and its scope before running them. The inspection enriches no records and changes no CRM values.

| Finding or request | Recipe file |
|---|---|
| Missing company information | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) |
| Missing contact details or mobiles | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) |
| Fill a CRM view repeatedly, on a schedule | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) |
| Missing buying role, department or persona | [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) |
| Work a cohort of CRM contacts now: never touched, engaged but no deal, worked but no deal | [use-case-prospecting.md](./use-case-prospecting.md) |
| Stale employment, wrong associations, duplicates, dead contact details, inconsistent values | [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) |
| Define the market, qualify existing companies, find missing target accounts | [use-case-tam-sourcing.md](./use-case-tam-sourcing.md) |
| Target accounts with no buyers or influencers on them | [use-case-abm.md](./use-case-abm.md) |

A CRM scan cannot establish which companies are missing from the market: that needs a target-market definition and an external comparison. Existing accounts that fail the definition are a TAM qualification question, not automatically records to delete.

**Return** a short prioritized list of findings, each with its evidence, the affected segment, the recommended recipe and the smallest useful next depth. Carry the same filter into the follow-up import. If the user picks one finding, carry that segment forward and leave the rest in the report.

### 2. Pipeline generation

Direct entries include building an outbound list, enriching inbound leads, finding buyers at named accounts, tracking company signals, and reviewing deals that went quiet.

**Establish the motion.** Ask which activity the data supports: a campaign, inbound arrivals, a named account list, signal monitoring or existing deals. Identify what already exists, who acts on the output, the destination, and whether the work is one-off, recurring or bounded by a campaign window.

**Assess the starting point.** Inspect the supplied list or source and the identifiers it carries. For a campaign, establish the audience and the window. For inbound, establish what triggers an arrival and where the lead goes. For signals, establish which events or states matter to what the company sells. For reactivation, start from the deal record and its history. The recipe owns the detailed investigation; this path only selects it.

| Request | Recipe file |
|---|---|
| Supply accounts and contacts for an outbound campaign | [use-case-outbound.md](./use-case-outbound.md) |
| Identify, enrich and route incoming leads | [use-case-inbound-enrichment.md](./use-case-inbound-enrichment.md) |
| Complete the buying committee at named target accounts | [use-case-abm.md](./use-case-abm.md) |
| Prepare an audience for an account campaign or a channel play | [use-case-abm.md](./use-case-abm.md) |
| Find relevant company changes and deliver them with context | [use-case-signals.md](./use-case-signals.md) |
| Revisit lost, won or quiet open deals, starting from the deal record | [use-case-crm-reactivation.md](./use-case-crm-reactivation.md) |
| Work a cohort of CRM contacts now: never touched, engaged but no deal, worked but no deal | [use-case-prospecting.md](./use-case-prospecting.md) |
| The market itself is undefined or missing | [use-case-tam-sourcing.md](./use-case-tam-sourcing.md) first, then the campaign's recipe |

**Return** the workflow to start with, its source and its output, the selected recipe and depth, and any prerequisite that has to be resolved first. Baseloop prepares and delivers the data; the commercial team and its outreach tools act on it. A request for more pipeline is not a basis for promising a pipeline result.

### 3. Rep assistance

Direct entries include finding one person's contact details, researching an account, preparing for a meeting, processing a call, and handling a reply.

**Establish the immediate job.** Identify the person, account, deal or conversation, preferably from a supplied record or source link. Ask what the rep needs next and when. Carry forward the company context you already have. A rep preparing for one meeting does not answer questions about the whole CRM or the team's entire market.

**Read the relevant context.** Use the supplied identifiers and the source material the chosen recipe needs: a meeting request can need account history, a call needs the call evidence, a reply needs what the person actually said. A missing transcript or an ambiguous account stays an explicit gap on the row, never a guessed summary.

| Request | Where it goes |
|---|---|
| Find or refresh contact details for one person or a rep's list | [use-case-prospecting.md](./use-case-prospecting.md) |
| Find the right people at a handful of companies for one rep | [use-case-prospecting.md](./use-case-prospecting.md) |
| Put custom company or person research onto records | Account research: no recipe, plan from first principles |
| Prepare for an upcoming meeting | Rep assist: no recipe, plan from first principles |
| Alert a rep to changes at their own accounts | Rep assist: no recipe, plan from first principles |
| Analyse a meeting or a call and log the result | Rep assist: no recipe, plan from first principles |
| Classify a reply and prepare the handoff | Rep assist: no recipe, plan from first principles |
| Systematically review a cohort of existing deals | [use-case-crm-reactivation.md](./use-case-crm-reactivation.md) |

**Return** the immediate output the rep needs and the recipe and depth that produce it. Offer CRM logging, further research or a draft where the recipe supports them. The rep sends any drafted message and owns the sales decision.

## Carry the context into the recipe

The recipe receives the user's actual job, not the category name. Carry:

- What the company sells, who buys, and the targeting or exclusions that apply.
- The source, the CRM connection, record ids, the list or view, and the exact segment filter.
- Findings already established, their scope, and the checks still open.
- The selected recipe and depth, and why they fit.
- The destination, the owner and the conventions the user supplied.
- The agreed volume, recurrence or campaign window, and any spending or write permission already granted.

Ask only what the recipe still needs. Routing grants no extra authority to spend credits or change records, and authority already given carries forward without a second permission loop.

## Intake order

Run the intake in this order and stop at the first step that has to wait for the user. [gtme-rules.md](./gtme-rules.md) "1. Take the request" holds the full rule.

1. **Check what is connected** before designing anything that reads or writes an outside system: `get_connected_platforms`, and `connectionMode` and `connectionStatus` in `list_actions` (Phase 1 of the plan skill already calls both). A question about a sequencer is noise to a team that has none, and a plan that assumes a CRM nobody connected is rewritten after approval. A missing required connection becomes a setup prerequisite: the user connects it on the Integrations page in the app, or with `baseloop integrations connect <provider>` in their terminal.
2. **Size the job.** A broad or multi-phase request, spend at scale, or bulk writes onto existing records make the plan name each phase and the approval it waits on. Small, direct, reversible work needs no phases.
3. **Ask at most four questions**, one at a time with the harness's blocking question tool (the Interaction Method in the plan skill), each with its default marked recommended when it has one. Never ask what the conversation or the connection check already answered.
4. **Rank, then default the rest.** Every recipe ranks its intake questions. Ask the top four still open; every remaining question ships as a stated default the plan announces, so the user corrects a default instead of answering another round of questions.

Ask about cost, branches and the company's own conventions. Never ask whether to do the work properly: that invites a no for no reason and hands the user a worse answer.

## Build on a ladder, never straight to scale

One row, then ten, then the full run on approval. The single row proves the extraction path and the real shape of the data; the ten prove the gates and the hit rate while correction is still cheap; the full run happens only after the user has seen the ten. Build one step, run it, look, then the next. The user corrects you on the sample, never on the full run. The plan's Testing Strategy writes this ladder for each table, and the build skill runs it.

## Cost

Recipes state cost as shape only: free, paid per row, paid on success, or free on the org's own key. Take the figures for the plan's Cost Estimate from the action's guide (`get_action_schema`) when it states one and the build's one-row test (`creditCostHint` in `list_actions` says only free, paid or variable), never from a number written in a recipe. Before quoting a job over a whole object, count the rows that actually lack the field, not the rows that exist: it is the only honest basis for an estimate. `list_row_ids` counts a table for free. HubSpot imports are free, and a criteria import on `NOT_HAS_PROPERTY` with a small `recordLimit` reports the full match count as `sourceImportSummary.hubspotSearchTotal` in `wait_for_run`. When the records are not in a table yet, make that count the first step of the build and quote per row until it lands.

## Offer the next depth, never assume it

When a depth is built and verified, name the next depth in one closing line of the plan or the build report: at most three offers, deepest first, in the depth order the recipe uses. Write each one self-contained, naming the table, the records and the work, as a new request, never as resuming a finished plan. Never build the next depth because it seemed obvious. Nothing is assumed: the base build is what the recipe needs; everything else is offered and built on yes.

## When the user asks what Baseloop can do

Answer with the jobs, not the tool list, unless the user asks which actions exist. A user who hears import, enrich, score and sync still cannot see the work Baseloop is built for. Lead with the three entry paths, name the eleven jobs, and offer three of them. If the user asked about one area only, cover that area and skip the rest.

**Offer three, name the rest.** Pick at most three offers for this user: what their message pointed at, what their tables already hold (`list_tables`), what their connected integrations allow (`get_connected_platforms`). Put them in one single-select question (the Interaction Method), each option self-contained: the job, the records and the outcome. Name the remaining jobs in one prose line so nothing is hidden. Never offer a route through an integration that is not connected without saying it needs setup first. Account research and Rep assist are never among the three and never promised as a guided recipe: when a user describes one, say it has no written recipe and plan it from first principles.

When the user picks one, or describes a job of their own, route it with this file.

### Quick start examples

| The user says | Do |
|---|---|
| "Import my HubSpot companies and enrich them" | Plan it: CRM enrichment 1.1 in [use-case-crm-enrichment.md](./use-case-crm-enrichment.md) |
| "Find decision makers at my target companies" | Plan it: [use-case-abm.md](./use-case-abm.md) when the companies are a named target-account list and the goal is a person per role; Prospecting 9.5 in [use-case-prospecting.md](./use-case-prospecting.md) for a rep's handful of companies |
| "Check my workflow for issues before I scale up" | `baseloop-gtm-review`, read-only, on the named workspace |
| "Audit my CRM" | Plan it: [use-case-crm-audit.md](./use-case-crm-audit.md) |
| "My enrichment field is failing" | `baseloop-gtm-diagnose` on that field |
| "What actions are available?" | `list_actions` for the live list, then `get_action_schema` for any action worth configuring |
| "What integrations do I have?" | `get_connected_platforms` |

## Recurring work and schedules

**Scheduling is native first.** A source import on a schedule refreshes its table on its own, a scheduled CRM view or criteria import keeps a segment current, and a webhook covers anything an outside system can push. Name one of those before anything else, and reach for an outside scheduler only when the user asks for one or the native options cannot do the job.

**What takes a schedule.** Import (source) columns and action columns, Custom AI Agent included, through the field's `schedule`: in `create_table`'s `sourceField` for an import, in `create_field` for an action column, in `update_field` for either. Formula, plain, webhook, input and legacy AI columns (an AI column with no action behind it) take none. `list_actions` reports the units each action accepts (`allowedScheduleUnits`) and whether the plan allows schedules (`scheduleAccess`; the app describes them as Pro and Scale). Every organization has a fixed number of active schedules, and a switch-on past that limit fails with a message saying how many are in use.

**What a fire does.** A fire re-runs every row the column's run condition admits, rows that already hold a value included, and reserves credits for every one of them: a manual `run_field` skips filled cells by default, a fire does not, so the run condition is the only per-row gate. A fire is skipped while a manual or scheduled run of that column is in progress.

**A recurring chain.** A fire re-runs its own column only; schedules keep no order and never wait for each other. The columns that read it follow through the table's `autoUpdateDependents` switch (Auto-update dependents in the app's Automations popover), which re-runs them only on the rows whose displayed value changed. So a recurring chain is a schedule on each column whose answer must be fresh every cycle (the import, a research call, a CRM read) plus that switch, never a schedule per column.

**An import's refresh starts no chain.** An import refresh never triggers `autoUpdateDependents`, and its new rows move on only through `autoRunOnNewRow`, so switch that on for a scheduled import's table. Rows the import has already seen are not re-run, so an action column that must pick up the refresh keeps its own schedule and can lag the import by a cycle or more.

**Pause, resume, remove.** `update_field` stores the schedule exactly as sent and fills every key left out with its default (daily, 00:00, UTC), so `{ enabled: false }` alone turns a weekly schedule into a paused daily one. To pause or resume, read the field's `schedule` from `get_table_schema` with `fieldId` and send it back whole with only `enabled` changed. These tools cannot remove a schedule: the user does that in the app, from the Schedules page or the column's run settings (the root skill's app map says where).
