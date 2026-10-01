# TAM sourcing

Use this recipe when the job is the whole market: every company that fits, once, into the CRM with a tier and a reason, owned by ops and read by every campaign as the list it slices. The shared rules in [gtme-rules.md](./gtme-rules.md) (taking the request, building) and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) (working a CRM, delivering) apply here and are not repeated. What follows is what changes when the job is the whole market.

## 1. The job

Somebody has to answer "how many companies are in our market, and which ones matter". TAM sourcing finds them all, once, throws out the ones that do not fit, ranks the rest, and puts them in the CRM as accounts with a tier and a reason. Every other list starts from this one: a campaign takes a slice, ABM takes the top tier, a rep takes a territory.

Typical requests: "how many companies are in our market", "get every company in our market into the CRM", "the reps keep finding companies we should have had", "which accounts in the CRM are not our ICP". The reader is the person who owns the account list, RevOps or marketing ops, and behind them the founder who wants the size of the market before hiring reps. What they want back: every company that fits, in the CRM, with a tier and the reason next to it, deduplicated against what was already there, and a number: how many we found, how many fit, how many were new. What kills it: a market that is exactly the size of the search cap, a research brief about the wrong company, a tier nobody reads, a create that duplicates a customer, a description a human wrote overwritten by the model's, and a list with no date, read as current a year later.

The user's own word does not pick the recipe: a request called outbound or prospecting can still be a market import. If the request is "every X in the CRM" or "how big is our market", it is this file.

## 2. Where TAM sourcing stops

- **Outbound** ([use-case-outbound.md](./use-case-outbound.md)) is one campaign's slice plus the people. It takes a slice of this list and reads the tier written here.
- **ABM** ([use-case-abm.md](./use-case-abm.md)) is few accounts and the whole committee. It takes the top tier and never recomputes it.
- **CRM enrichment** ([use-case-crm-enrichment.md](./use-case-crm-enrichment.md)) fills empty fields on companies the CRM already holds, on a schedule. TAM sourcing decides which companies belong in the CRM at all; a build that only re-screens the CRM on a schedule to keep fields filled is CRM enrichment 1.1.
- **Signals** ([use-case-signals.md](./use-case-signals.md)) hands over a company that did something and is not yet an account: it enters here to be qualified.
- **Account research** (no recipe written yet) is one company, on request. The market pass gathers the same facts once for every company.
- **CRM cleanup** ([use-case-crm-cleanup.md](./use-case-crm-cleanup.md)) owns normalising the CRM's own vocabulary ("2.6 Normalise the words the CRM groups on"); recipe 3.3 runs it before the judge reads the row.

## 3. Taking the request

The shared order is in [gtme-rules.md](./gtme-rules.md) "1. Take the request". What TAM sourcing adds at each step:

1. **Write the market in the seller's words, as two lists, with the user:** what passes and what fails. Own-brand manufacturers pass; contract manufacturers, distributors and pure software fail. Plugin agents have no saved company profile, so ask for both unless the user already gave them, because the second list is what stops the judge stretching, and both go into every judging prompt verbatim.
2. **Check what is connected** with `get_connected_platforms` and `list_actions`: the CRM, a LinkedIn account (optional: Sales Navigator imports run without one on managed access, and a connected account makes them free but quota-bound), and research or model keys. An own research key prices the expensive step at zero and moves the design's spend to where the key does not reach.
3. **A whole-market pass spends at scale and writes onto a live CRM**, so the plan names the slice, the spend per step and the write review before anything runs.
4. **Ask the open questions one at a time** with the harness's blocking question tool, in the rank order below, and stop after the top four. Offer each question's default as the recommended option. Everything below the cut ships as a stated default that the plan announces.

| Rank | Question | What it decides | Default when it ships unasked |
|---|---|---|---|
| 1 | Where do the companies come from? | An existing Sales Navigator company search URL the user pastes (3.1), a provider list or a file (3.2), the CRM's own back catalogue (3.3), or a description in plain language (3.4). Most markets need more than one door, into one table | Every door the connections allow, one import table each, into one accounts table |
| 2 | What is the tier, and what fact is it made of? | A band needs a fact: plant count, employee count, revenue, site count, a certification. The fact has to be gathered before the band can be computed, and the band has to gate something afterwards or it is not a tier | Employee count, three bands, the band gating the CRM write |
| 3 | What must not be created? | Customers, open opportunities, competitors, partners, a blocklist. Read the CRM's state on every match and ask what the words are, because lifecycle stages are custom per portal (read them back with `resolve_action_options`) | Customers and open deals are never created or overwritten; competitors get their own word |
| 4 | Which properties may the build write? | Firmographics and the tier, yes. A description or a name a human maintains, only with permission | Firmographics, tier, reason, segment and as-of date; never the description or the name |
| 5 | Does it run again? | Once is the base. A schedule that keeps the market current, and a re-tier when a signal lands, are the deeper option | Once |
| 6 | What unit is the number in? | A revenue figure carries its currency as a column or it cannot be banded | The user's home currency, as a column |

What is never asked: which size band is running. Read it back from the prompt, not the name: the band that runs is the one in the prompt, never the one in the title of the list.

## 4. What changes for TAM sourcing

**The cap is not the market.** `li_import_sales_nav_companies` splits a filter-based Sales Navigator company search past LinkedIn's 1,000-result window by itself, so the cap that bites is `maxCompanies` (at most 10,000); a saved-search or account-list URL cannot be split and stays near 1,000, so ask the user to open it and copy the resulting filter URL. On the org's own LinkedIn account (the default when one is connected) the account's export quota of 2,500 a day also caps a run. A count that equals the cap is a truncation, and nothing on the row says so. Searches split by hand stay one definition, extracting the same fields into one table, because two halves of one search drift apart.

**One accounts table, fed by one import table per door.** A table holds exactly one source, attached when it is created, so every search, list or CRM import is its own small import table whose only job is to send its rows on with `send_to_table` into the one accounts table. There, auto-dedupe (`set_auto_dedupe`, keep oldest) on the domain column the send creates (each import table cleans the domain in a formula before its send, under the same mapping key, so the key arrives filled) is switched on after a one-row send creates the column and before the full run, and `autoRunOnNewRow` is switched on so each arriving company runs the chain. The company page is the Already here lookup: dedupe takes one column per table. The accounts table has no source of its own: it receives. The import tables carry the source, the as-of date and the send, and nothing else, because the accounts table asks the ICP question once for every door.

**The row carries where it came from and when.** Every account list is a snapshot that reads as current forever unless the row says otherwise.

**The free screen comes first and it is the same five columns everywhere.** A shortener and social host test before paying for a website search. A domain cleaner plus a validity test with a real TLD, because a bare URL scheme otherwise reaches a paid research call. A profile URL merge with a shape test, never constructed. A size helper on every paid gate. A self-lookup with the send gated on not found, which stops a repeat before anything is spent. A pre-filter score is the same screen written as one number, with weights the user can read, and it is worth it only where several weak signals have to be combined before a row earns the paid call.

**Gather once, judge cheaply, and the judge needs a precedence rule.** One research call returns quoted evidence and is forbidden to classify. Cheap classifiers with web search off read it, each gated on the verdict before it. An eight-way classifier drifts unless one rule wins, so the prompt names the rule that always wins. The verdict returns empty, not a negative, while the pipeline is incomplete. Two columns, never one call, however short the list: a five-name paste gets the research column and the judge column that five thousand get, and the judge stays empty behind its Evidence complete gate while the Result formula says Unresolved, never Not fit from a name. A classifier given only what an index already said, an industry label and a blurb, can only rearrange the index's opinion: it decides who is worth reading about, and the qualification still has to read the company's own site.

**Identity before research.** The name the enrichment returned is compared with the name that arrived and a mismatch is a word on the row. Skip it and the result is a confident brief about the wrong company. Prompt quality decides the hit rate, not the action: a resolver prompt that tries several strategies fails on far fewer rows than a two-sentence one.

**A tier is a band from a fact, computed by formula, and it gates something.** A verdict word (fit, not fit, competitor) stops spend; a band orders the market. Sourcing needs both, and the paid step only runs where the free band leaves the decision open: where the free band sits clear of a tier boundary, the exact figure cannot change the tier. A band that nothing reads costs the same as not computing it. The cheapest substitute for a tier is a proof gate: one cheap search that shows the account has the thing you sell to, and the expensive work gated on it having found somebody.

**The CRM is matched on more than the domain.** Matched on the domain alone, a company whose CRM record spells the domain differently becomes a duplicate. The lookup takes OR groups on domain, company page and record id, reads back the lifecycle, the owner and the last contact, and a customer or an open deal is never created twice or overwritten. Reading those fields into columns and gating nothing on them costs the same as not reading them.

**Own keys change the shape, not only the bill.** With a key the expensive step is free and the design moves the spend to where the key does not reach.

**Coverage is the deliverable.** How many we had, how many we found, how many fit, how many were new, how many failed.

## 5. The sequence, and the delivery

The companies arrive through one or more doors into one accounts table, each row carrying its source and its date. Free first: the domain cleaned and tested, the shortener test, the profile URL merged and shape-tested, the size helper, the self-lookup so a company arriving twice is one row. Then identity: the company enrichment, and the returned name compared with the arriving name. Then the CRM read, on OR groups, returning the state of the account, so a customer, an open deal or a blocked account stops here with its word. Then one research call gathering the facts the tier needs, gated on identity having settled. Then the cheap judges: fit or not, the reason, the segment, the competitor test, each gated on the one before. Then the band, by formula from the fact, and only where the free band leaves it open does a paid figure run. Then the write: create from this table where the CRM has nothing, update by id where it does, the tier and the reason and the as-of date as properties, `ignoreBlanks` on, never a human's field. Before the full write the build shows ten sample rows with each value next to the CRM's current value and waits ([gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) "The sample before a CRM write is a data review, not a smoke test"). Result last, one word: Created, Updated, Not fit, Blocked, In play, Unresolved, Pending. And the count.

**Delivery.** The CRM: every company that fits, created or updated by id, with the tier, the reason, the segment and the as-of date as properties, and nothing a human wrote overwritten. In the workspace: one view per tier and one per Result word, each counted with `list_row_ids` on that view (its `total`). The reason next to the tier is a short fixed word, not a sentence, so the tiers group into themes the owner can read: what the best accounts have in common is the answer to the next search. Static lists in the CRM as an offer, one per tier, which is what reps work (`addToList` with `listConfig.hubspotListId` on the HubSpot create or update). The handoff: Outbound takes a slice, ABM takes the top tier, both read the tier property and never recompute it. Nothing is sent by Baseloop.

## 6. The four recipes

Depth 1 is the base. Each depth adds on the one before: the market, qualify, tier, put it in the CRM, keep it current. Offered in that order, planned on yes.

**Table count.** One accounts table with dedupe on, plus one import table per door that only sends into it. Companies are created from the accounts table and it is what Outbound and ABM read. A review queue is a view on it. A second table only where a signal feed needs its own capture, and that table is the Signals recipe's table. When the user wants the source on the accounts table or a different split, plan that and note the door it closes.

Cost below is shape only; read the figure from `get_action_schema` and `list_actions` (`creditCostHint`) at plan time. At the time of writing: `li_import_sales_nav_companies` bills 0.5 credits per imported company on managed access and nothing on the org's own LinkedIn account; `enrich_company` bills 1 credit per match and nothing on not found; `parallel_research` bills 1, 3 or 5 credits per row (`lite`, `base`, `core`), and nothing on the org's own Parallel key. Where a recipe names the HubSpot action, the Salesforce, Dynamics 365, Pipedrive and Attio equivalents `list_actions` names apply. Recipe 3.1 carries the whole chain by depth; the other three cite it and add what their door changes.

### 3.1 From a Sales Navigator company search

**Depth 1, the market.** The first three fields live on each import table, the rest on the accounts table.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The import (import table) | `li_import_sales_nav_companies` as the import table's source field, with the company search URL the user pasted (`https://www.linkedin.com/sales/search/company?query=...`; these tools cannot build one, so never compose one) and `maxCompanies`; one import table per search (a saved-search or account-list URL is swapped for the filter URL the user copies from it), each sending on with `send_to_table` into the accounts table | | paid per company imported, free on the org's own LinkedIn account | the first run takes a small `maxCompanies` (for example 25); the import lands in 10 to 30+ minutes, and a `wait_for_run` timeout is not a failure; every import table extracts the same columns, and the accounts table receives them all |
| Source and as-of date (import table) | formulas returning the literal, carried across by the send | | free | which search, when; the row says it forever |
| Cap check (import table) | the import's run summary, not a formula (a formula sees one row): `wait_for_run` or `get_run_status` returns `sourceImportSummary`, with `recordsProcessed` to hold against `maxCompanies` and `split` reporting partitions planned, fetched, skipped and truncated | | free | equal means truncated, and the build report says so |
| Cleaned domain | formula: lowercase, strip scheme, www, path and generic subdomains; empty on website builders | | free | |
| Domain valid | formula: labels, a dot, a real TLD; blocks link hosts | | free | stops a bare scheme reaching a paid step |
| Shortener or social | formula on the website host | | free | decides whether to pay for a website search |
| Company page | the import's URL, shape-tested | | free | must contain the company path; never constructed |
| Page resolver | `custom_ai_agent` with web search, from name and cleaned domain, told to return empty rather than guess | Company page empty AND Domain valid | paid per row | rows from 3.2 and 3.3 often arrive with no page; the Name check confirms what it returns |
| Merged page | formula: Company page, else Page resolver | | free | what Company profile reads |
| Size helper | formula on employee count against the user's bands | | free | on every paid gate after this |
| Already here | `lookup_multiple_records` on this same table by the company page (the domain is the auto-dedupe key) | | free | the row finds itself, so a `count` above 1 means another door already brought the company in: one row per company across every door |
| Result | formula off a helper | | free | Imported, Out of size, No domain, Duplicate, Pending |

**Depth 2, qualify.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Company profile | `enrich_company`, `selectedOutputFields` narrowed to the gaps | Merged page not empty AND (the row came through 3.2 or 3.3, OR the import left a field the tier needs empty, OR Shortener or social) | paid on a match | rows from the Sales Navigator import already carry name, page, website, industry, location, employee count and description from the same provider; re-buying them adds a second column under the same label. For the other doors this is the identity step that returns the matched name. Fallback after two identical failures on valid rows: `custom_ai_agent` with web search to resolve the page, then this step on what it returns |
| Name check | formula: returned name against arriving name | | free | a mismatch is a word on the row and stops the research; Match by definition on a Sales Navigator row |
| Website found | `parallel_research` at `lite` (`custom_ai_agent` with web search only when the user names it or a specific model is required) | Shortener or social AND Size helper = yes | paid per row, free on the org's own key | only where the import gave no usable site |
| Research | `parallel_research`, gather only, typed `outputFields` for the facts the tier needs, pointed at the valid cleaned domain, else at the website the finder returned | (Domain valid OR Website found not empty) AND Name check = Match AND Size helper = yes | paid per row, free on the org's own key | quoted evidence; forbidden to classify. Told to return positive or neutral public facts and leave the pain to be inferred |
| Evidence complete | formula: all evidence columns non-empty | | free | the judge's floor |
| Fit | `custom_ai_agent`, web search off, the two lists and a precedence rule in the system prompt | Evidence complete | paid per row, free on the org's own key | fit word, reason, segment, competitor status, in one call; returns empty while incomplete |
| Result | formula | | free | adds Fit, Not fit, Competitor, Unresolved |

**Depth 3, tier.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The fact | from the research, or a free public register read over `baseloop_send_http_request` (keyless; a register that needs a key puts it in the field config, so only with the user's consent) | Fit = Fit | free, or as the research | plant count, site count, a filing band, an employee count |
| Free band | formula from the fact against the thresholds | | free | thresholds are rules, never a prompt |
| Paid figure needed | formula: does the band span a tier boundary | | free | Yes, Settled |
| Paid figure | `parallel_research` at a deeper `processor` tier (`custom_ai_agent` with web search only when the user names it or a specific model is required) | Paid figure needed = Yes | paid per row, free on the org's own key | |
| Tier | formula from the settled fact | | free | tier 1, 2, 3; the judge returns the count, code derives the band |
| Result | formula | | free | adds the tier |

**Depth 4, put it in the CRM.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| CRM company | `hubspot_lookup_object` with OR groups: domain; the company page property; the record id where the row carries one (property names confirmed with `resolve_action_options`); reads lifecycle, owner, last contact (`notes_last_contacted`) | Domain valid | free | one key is a duplicate generator |
| Account state | formula on what came back | | free | Customer, Open deal, Blocked, Known, New |
| Blocklist | two `lookup_single_record` columns on a blocklist table, one by CRM id and one by domain (the action matches one column) | | free | the list is a table the owner can add a row to, never a prompt |
| Unit | formula on the figure's currency | | free | a figure without its unit is not banded |
| Write decision | formula per property: was blank, conflicts, already correct | | free | the word that makes a live CRM safe |
| Create | `hubspot_create_object` from this table, carrying every property the update writes | Account state = New AND Tier not empty AND not Blocked | free | a second self-lookup on the merged domain before it |
| Update | `hubspot_update_object` by id, `ignoreBlanks` on | Account state = Known AND Write decision = write | free | tier, reason, segment, as-of date, firmographics; never the description |
| Created or found | formula written at the create | | free | the lookup re-runs later and erases the answer |
| Coverage | one view per Result word, counted with `list_row_ids` on the view (`total`) | | free | the number the owner asked for |
| Result | formula | | free | adds Created, Updated, In play, Blocked |

**Depth 5, keep it current.** The import on its native schedule, which the Sales Navigator company import takes by day, week or month (`allowedScheduleUnits`; `scheduleAccess` says whether the plan allows it). A scheduled run restarts from the top of the search rather than paging deeper, so it refreshes the head of the result set and brings in newly matching companies. A schedule re-runs only its own column: the new rows it sends move on through the accounts table's `autoRunOnNewRow`, and an import refresh never re-runs the columns of rows it only updated (see "Schedule chains" in [workflow-patterns.md](./workflow-patterns.md)). The CRM's own companies re-screened through recipe 3.3 on a schedule; the as-of date refreshed only when the tier was recomputed; and a re-tier when a Signals build lands a hire, a funding round or a new site on the account. A schedule is possible on every import door (a file door has none); it is proposed from the rules, so run one cycle by hand first.

### 3.2 From a provider list or a file

What changes against 3.1: the list arrives qualified by whoever sold or typed it, so the build's job is identity, the CRM match and the write, and the free screen is what stops a bought list from re-creating customers. The provider's own "already in CRM" column is present and ignored in favour of the build's lookup. A second judgment that a loose first one relies on, an ownership check for instance, needs a consumer, or the companies it rules out are still phoned and written. And the number carries its unit.

The list gets its own import table (the user uploads the file in the app, or hands over a small list for `create_rows`), sending into the accounts table like any door. The chain is 3.1 from depth 2 on those rows, with Source set to the list's name and the as-of date to the upload. Where the list carries a company number instead of a domain, the domain is resolved from the register, never guessed. A list built from an observable fact about the account, every company running a named tool, carries its own offer, because the offer can name the thing that was observed.

Per-property updates, each gated on the live CRM value being empty, are the cleanest write-back. A list push with no run condition leaves the routing to whichever rows a person selects.

### 3.3 From the CRM's own companies

The CRM is part of the market. The companies it already holds go through the same screen and get the same tier, so the market is tiered as one list and a new entry is deduped against a tiered catalogue. What is specific: the record id arrives, so there is no lookup and no create, only the update; the account state is read from what arrived; and the "not contacted since" filter is a number the owner chooses, because a date set to yesterday suppresses nobody. Normalise into the CRM's own vocabulary before the judge reads the row, so one column serves the gate, the judge and the write: that pass is [use-case-crm-cleanup.md](./use-case-crm-cleanup.md) "2.6 Normalise the words the CRM groups on".

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The import | `hubspot_companies_list_import` or `hubspot_companies_criteria_import` as its own import table's source, scheduled where `allowedScheduleUnits` allows, sent into the accounts table as a third door | | free | record id, name, domain, company page, lifecycle, owner, last contacted, and every field the judge reads. A criteria import stops at 10,000 records (more matches with no record limit fail it); a list import has no cap |
| Account state | formula on the imported fields | | free | Customer, Open deal, Blocked, Known: read from what arrived, never looked up again |
| Outside the target market but ours | formula | | free | an existing account outside the target countries is still their account; the word forgives it instead of dropping it |
| The chain | 3.1 from the free screen through the tier | as 3.1 | as 3.1 | |
| Update | `hubspot_update_object` by the imported id, `ignoreBlanks` on | Tier not empty AND Write decision = write | free | the tier, the reason, the segment, the as-of date; a Non-ICP word on the companies that failed |

A leave-alone window shorter than the campaign lets recently contacted accounts back in: make it at least as long as the campaign. Avoid the score template: the score is the model's own number, the threshold lives in the prompt and the score gates nothing but its own write.

### 3.4 From a description in plain language, or lookalikes

"Every batch manufacturer of food or feed in the Benelux with more than one plant." There is no company search from a plain-language description these tools can plan on, and lookalikes have no feature. What the description becomes: the two lists, and then the search parameters for a door: a Sales Navigator company search the user builds in Sales Navigator from the description and pastes back (these tools cannot build the URL), which is 3.1, or a provider list bought against it, which is 3.2. Lookalikes are the second form: a list of best customers, their shared traits extracted once with `custom_ai_agent` reading the profiles the enrichment returned, and the traits turned into that search. Proposed from the rules: run it on a small slice first. Both forms end in the CRM with a tier, never at outreach, and the doors they open feed the same accounts table.

Offers on connected tools, for every recipe: one static list per tier in the CRM; a free public register as the tier's fact, one HTTP read; research at zero credits on an own research key; a second door from a people list, the employer picked per person and the send gated on a self-lookup; a re-tier when a Signals build lands on this table; the tier read by Outbound and ABM, never recomputed.

## 7. Offering the next depth

End the plan, and the build report once a depth is verified, with one line naming at most three next depths, deepest first, in this use case's order: the market, qualify, tier, put it in the CRM, keep it current. Name the table, the doors, the market and the work in full, so the line reads as a new request.

After depth 1, the three are, deepest first, the CRM write from depth 4, the tier from depth 3, then qualifying from depth 2. After depth 4, they are the growth into the neighbouring use case the owner's own list points at (one campaign's slice, which is Outbound; the whole committee at the top tier, which is ABM; a watch on the accounts for hiring, funding and new sites, which is Signals), then the schedule from depth 5, then a second door, its own import table sent into this one. Offer, never assume, and never plan the next depth because it seemed obvious.
