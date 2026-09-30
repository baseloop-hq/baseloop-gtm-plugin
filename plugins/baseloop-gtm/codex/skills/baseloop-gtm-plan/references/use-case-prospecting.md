# Prospecting

Use this recipe when a rep already has the people or the accounts in hand (a file, a web page, a Sales Navigator search, a few names, a list of accounts, or their own CRM view) and wants rows they can call or email today. The shared rules in [gtme-rules.md](./gtme-rules.md) (taking the request, building) and [gtme-rules-crm-and-delivery.md](./gtme-rules-crm-and-delivery.md) (working a CRM, delivering) apply here and are not repeated. What follows is what changes when the people are already named.

## 1. The job

The rep is not asking you to enrich a list. They are asking you to make it usable so they can start calling or emailing today. Every row ends with a verified work email, often a mobile, and lands where the rep already works.

The starting point is never the problem. Any list, any page, any search, any CRM view can start this. Making it usable is the job. The rep already chose these people, so completing and delivering is the work, and qualification happens only when the rep asks for it.

What the rep wants back, in this order: emails that do not bounce, because every address passes verification before it is delivered, and a result the provider marks catch-all or risky is flagged rather than counted as found; numbers that connect, because the mobile is looked up with the LinkedIn profile attached; no duplicates, because every contact is checked against the CRM before it is written and the row says which record it matched; the list where they already work, a CRM, an outreach tool or a file; and only then the context that makes the first call better: title, company size, industry, tools in use, funding, who runs sales.

Where a team already pays a contact-data vendor, keep it. With the key connected (Integrations page, or `baseloop integrations connect <provider>`), that provider runs first at no Baseloop credit, and the next source (another connected key, or a second waterfall column on Baseloop credits gated on the first one's not found) runs only on what it missed. Coverage always depends on the providers connected, so the word on the row is verified, never guaranteed.

## 2. Where Prospecting stops

- **TAM sourcing** ([use-case-tam-sourcing.md](./use-case-tam-sourcing.md)) defines a market and finds the companies in it. Prospecting completes people and accounts somebody already named; when the request cannot say who the people are, the market is undefined and that is the other job.
- **Outbound** ([use-case-outbound.md](./use-case-outbound.md)) starts from a description of who to find, so finding and qualifying is the core of it. Prospecting starts from who is already named, so completing and delivering is the core.
- **CRM enrichment** ([use-case-crm-enrichment.md](./use-case-crm-enrichment.md)) fills fields across a whole object, for ops, usually on a schedule. Prospecting works one rep's list now and stops when that list is workable; a request that grows to the whole database has become the other use case.
- **Rep assist** (no recipe written yet) works one meeting, one call or one reply. Prospecting works the list the rep will call after it.

The same table grows without starting over, and that is the reason to build the list here: a list of accounts becomes the whole buying committee at each one ([use-case-abm.md](./use-case-abm.md)), the contacts get a brief before the call (account research, no recipe written yet), the accounts get watched for hiring, job changes and funding ([use-case-signals.md](./use-case-signals.md)). Name the growth as the next depth; never plan it unasked.

## 3. Taking the request

The shared order is in [gtme-rules.md](./gtme-rules.md) "1. Take the request". What Prospecting adds at each step:

1. **Ask what the company sells and who buys**, unless the user already said it. Plugin agents have no saved company profile. The answer decides which extended data points are worth offering to this team; without it an AI judge has no standard and the fit column finds a reason for anything.
2. **Check what is connected** with `get_connected_platforms` and `list_actions` (`connectionMode`, `connectionStatus`) before designing anything: CRM, outreach tool, provider keys, LinkedIn account. The connections answer half the questions before you ask them, and they decide whether the first CRM check exists at all.
3. **Read the input by its values, not its headers** (`list_rows` on an existing table, or the rows the user shares). A column called email holds LinkedIn URLs often enough that a header is never evidence. Note what the rows carry and what they lack, because that decides the whole chain and which repair steps ever run.
4. **Ask the open questions one at a time** with the harness's blocking question tool, in the rank order below, and stop after the top four. Offer each question's default as the recommended option. Everything below the cut ships as a stated default that the plan announces, so the rep corrects a default instead of answering more questions.

| Rank | Question | What it decides | Default when it ships unasked |
|---|---|---|---|
| 1 | What will you do with the list? | The outputs and the delivery. Emails for a campaign need a verified email and nothing else. Calls need a mobile, and a mobile needs the LinkedIn URL. A CRM import needs the record complete enough to trust | A verified work email per row, delivered to the one connected destination |
| 2 | What else would help? | The extended set, offered once, before the AI call is designed: title, location, industry, company size, HQ country. Then what the company's offer implies, one column each with a fixed output | The base extended set only |
| 3 | Should the list be qualified? | Whether depth 4 carries a fit verdict. Take the criteria in the rep's own words | No qualification; the rep already chose these people |
| 4 | Where does it go? | The delivery shape. One connected target that fits is taken without asking; two or more is a question | The single connected destination, or a file when none is connected |
| 5 | How many rows, once or recurring? | Whether the volume is worth an estimate first, and whether the import gets a schedule | The rows supplied, once |
| 6 | If the list comes from the CRM, refresh employment first? | Whether paid steps run on people who have left. CRM records look complete and are often stale | Refresh before spending, because a leaver is a different sales conversation |

Chain B adds two questions the recipe cannot invent, both asked before the find step runs because it is priced per person found: the personas and the cap per company. Chain C adds two: the cutoff, which sets the import filter and what counts as recent activity, and what makes an account one to leave alone. Recipe 9.10 adds two: the claim rule and the blocklist. Ask about the extended data before the AI call is designed, because an output added afterwards means a second run and double the spend.

The plan states inputs, steps and delivery up front, and its testing strategy builds one step, runs it on one row, then on ten, and runs the full set only after the rep has seen the ten and approved. The rep corrects the build on the sample, never on the full run.

Nothing is assumed. The base is what the recipe needs, which for chain A is one verified work email per row and delivery. Title, location, company research and qualification are offered once and planned on yes. A list id, a page URL or a Sales Navigator search URL is asked for and never fabricated: these tools cannot build a Sales Navigator URL, so ask the user for an existing one and never compose one.

## 4. What changes for Prospecting

**Rows from LinkedIn skip the repair chain.** They arrive complete, so a Sales Navigator import or a Find People result goes straight to the email step and the repair agent is not built at all, with one narrow exception: a Sales Navigator row that shows an initial instead of a surname, or a website that yields no usable domain, gets the repair step before the email step (recipe 9.4), because the email waterfall needs a first and last name plus a company or a domain. Rows from outside (a file, a page, a webhook, a CRM view) get the repair chain, each step gated on what is still missing. When an outside row already looks complete, ask the rep once whether to refresh it from LinkedIn rather than deciding for them.

**The position is the one at the company on the row.** When the row carries a company or a domain, take the position at that company, not the most senior title elsewhere. Past positions are not used here; they belong to job-change signals.

**The first CRM check sits before the email step, not after it.** It is free, and it supplies the email the CRM already holds, which stops a paid lookup on a person the company can already reach. Placed after the paid steps it gates nothing and the money is already spent.

**The phone comes last, only when asked, and only behind a verified email.** Attach the LinkedIn URL, because that is what finds the most, and it is the one step that can burn a budget on its own.

**"Find X for each row" is a column with an action, not research you do with your own tools.** A rep asking you to find the emails, the mobiles, the LinkedIn URLs or the right people is describing a field on the table: the answer has to exist on every row, re-run when the row changes, and be auditable next to the row it belongs to. An answer typed into the conversation is lost on the next import, cannot be gated, cannot be written back and does not scale past the handful of rows you looked at. Plan the column; the build runs it on one row and shows the cell. A rep who wants three emails answered directly and no column gets them for those rows, and the column is offered once.

**Two identical failures on valid rows fork to the fallback and the build continues.** When a step fails twice, on rows whose inputs are genuinely good, with the same error, stop re-running it: the provider or the identifier shape is the problem, not the row. Switch to the fallback named in that step's row below, gate it on the failed column's own state so the rows that did succeed are not paid for twice, and carry on down the chain. The fallback for contact and company enrichment is a `custom_ai_agent` with web search filling the same merged columns; the fallback for people finding is a `custom_ai_agent` with web search and a JSON Schema array feeding the same destination table. The build report says what forked and why, because a fallback is a different provider and the rep reads the coverage differently ([gtme-rules.md](./gtme-rules.md) "An action failing is a fork in the plan, not the end of the build").

## 5. The three chains

Ten entry points sit on three chains. A chain is written once, by depth. A recipe is one entry point: it cites its chain and adds only its own columns. Depth 1 is the base; each next depth adds on the one before, in the order a rep usually wants it: complete the person, put them where the rep works, the mobile, the extra facts and the fit. Offered in that order and planned on yes.

Cost below is shape only; read the figure from `get_action_schema` and `list_actions` (`creditCostHint`) at plan time. At the time of writing: `enrich_contact` and `enrich_company` bill 1 credit per match and nothing on not found; `waterfall_email_enrichment` bills 2 credits per deliverable address on Baseloop credits (a risky or missing address bills nothing) and nothing on the org's own keys; `waterfall_phone_enrichment` bills 25 credits per mobile found; `li_find_people_at_company` bills 2 credits per person found, 1 on the org's own LinkedIn account; Sales Navigator imports bill 0.5 credits per imported row on managed access and nothing on the org's own LinkedIn account; `parallel_research` bills 1, 3 or 5 credits per row (`lite`, `base`, `core`).

### Chain A. A list of people comes in

Recipes 9.1, 9.2, 9.3, 9.4, 9.6 and 9.10. One people table, plus one companies table shared by the whole workspace. Recipe 9.6 puts a pages table in front of the people table; recipe 9.10 runs the research and the fit on the companies table before the person is spent on. The companies table never receives a contact.

**Depth 1, complete the person and reach a verified email.** One agent call fills every gap at once, formulas merge, one targeted enrichment runs only where the agent could not finish, then the email. The first CRM check belongs here, not in depth 2.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The input columns | text, or the entry point's own source action | | free | read by value, never by header |
| Repair | `custom_ai_agent`, web search on (so no system prompt: the instructions go in the prompt) | the entry point's own helper, or none | paid per row | one call: name parts, company, domain, person LinkedIn URL, and the extended set on yes. Told to fill only what is missing, to return empty when nothing is found, and never to invent an email |
| Merged LinkedIn URL | formula | | free | the input's value first, then the agent's; a company page or a search URL counts as empty |
| Needs profile enrichment | formula | | free | a URL exists AND an essential field is still missing |
| LinkedIn profile | `enrich_contact` | Needs = Yes AND URL not empty | paid on a match | finishes what the agent could not. Accepts only public `/in/` profile URLs. On a clean file it runs on almost no rows, because the cheap step already answered. Fallback after two identical failures on valid rows: `custom_ai_agent` with web search, gated on this column's failed state |
| Merged first name, last name, company, domain | formulas | | free | input wins, then agent, then profile, except the company, where the profile beats the agent ([gtme-rules.md](./gtme-rules.md) "Never overwrite what the user gave you"); one merge per field. The domain merge leaves the value empty when it has no TLD |
| Job title, Location, Industry, Company size, HQ country | agent outputs, or data extraction fields on the profile | | free | the base extended set, offered once |
| Already in the CRM (first check) | `hubspot_lookup_object`, or the Salesforce, Dynamics 365, Pipedrive or Attio lookup `list_actions` names, on OR groups: first, last and company; first, last and domain; the LinkedIn URL | (first AND last) OR LinkedIn URL | free | runs before the email step: it is free and it supplies the email the CRM already holds, which stops a paid lookup. Never email alone, and never before there is a name to match on |
| Work email already known | formula | | free | the row's own email when what it contains is a real address, else the CRM's |
| Work email found | `waterfall_email_enrichment` | known empty AND first AND last AND (company OR domain) | free on the org's own key, else paid per deliverable address | the company OR domain pair stops the field failing outright on an empty domain. Catch-all re-verification (`verifyCatchAll`) exists only when the run uses the org's own keys, and only a BetterContact key on the org's BetterContact Pro or Enterprise plan acts on it: switch it on there and say so in the plan. On Baseloop credits and on any other key the address is checked but catch-all domains are not re-tested, so the promise is that the address is checked |
| Deliverability | a data extraction field on the email column, `extractionPath` `status` | the email step ran | free | the provider's own word: deliverable, risky, undeliverable or unknown. The action returns a success with the address in the cell for a deliverable and a risky result alike, so without this column a risky address reads as found |
| Merged work email | formula | | free | the known address, then the found one only where Deliverability says deliverable. A risky, undeliverable or unknown address stays visible in its own column and never becomes the address the CRM writes and the sequencer uses |
| Result | formula, off Deliverability and a helper that says whether the email step ran | | free | Done, Risky email, Incomplete, No email, Pending. Done means a merged address exists, Risky email means the waterfall returned one the word does not call deliverable, and No email only once the waterfall has actually run |

With no CRM connected, the first check is not built and the known-email helper reads the input column alone.

**Depth 2, put them where the rep works.** The second check, the companies table, the writes.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Already in the CRM (second check) | the same lookup action, on four OR groups: the three from depth 1 plus the merged email | merged email OR LinkedIn URL | free | four groups, always. Built with two, it creates a duplicate for every person whose email is new and whose profile URL is empty |
| Company in the CRM | the same lookup action on domain OR name | domain OR company | free | |
| Send company for creation | `send_to_table`, `send_row` mode | company not found AND domain | free | one row per company into the companies table, which creates the company in the CRM |
| Company row in the companies table | `lookup_single_record` on domain | same gate | free | fetches the created id back |
| CRM company id | formula | | free | the existing id, else the created one |
| Update contact | `hubspot_update_object` by record id, `ignoreBlanks` on, with the association | second check found AND merged email | free | |
| Create contact | `hubspot_create_object`, with the association | second check not found AND merged email | free | never without the second check, and carrying every property the update writes |

The companies table is five columns plus its own CRM company lookup, a create gated on that lookup's not found, and an Effective ID formula, and every chain A recipe that writes contacts feeds the same one. Never pre-create its columns: run the send on one row, which creates them, then switch `set_auto_dedupe` on the domain column the send created (keep oldest) and `autoRunOnNewRow` on (`update_table`) before the full run. The created id reaches the people table only after the companies table's create has run, so the contact writes wait on the CRM company id formula being non-empty ([gtme-rules.md](./gtme-rules.md) "Resolve identifiers, never construct them", on lookups into a table that is still computing).

For a sequencer, alone or beside the CRM: the add-to-campaign action `list_actions` names for the connected tool (`lemlist_add_to_campaign`, `instantly_add_to_campaign`, `smartlead_add_to_campaign`), gated on a verified merged email and on the row not being empty, because some tools accept an empty lead. All of them take the campaign per row (`campaignId: "{{campaign_formula}}"` with `campaignId__dynamic: true`), and their duplicate checks stay strict: Allow Duplicate Leads Across Campaigns off on lemlist and Smartlead, Skip if in Any Campaign on for Instantly. `reply_create_contact` creates the contact in Reply and enrolls it in nothing, so with Reply the enrollment stays with the rep. `heyreach_add_to_campaign` is LinkedIn outreach: it needs first name, last name and the profile URL, never an email, and no paid email column belongs in front of it.

**Depth 3, the mobile.** Only on request, and only behind a verified email.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Mobile already known | formula | | free | the rep's phone column and the CRM's mobile, with switchboard and toll-free numbers read out by content |
| Mobile found | `waterfall_phone_enrichment` | known empty AND merged email AND first AND last AND company AND LinkedIn URL | free on the org's own key, else paid on success | company name only; the action takes no domain input. The LinkedIn URL is what finds the most |
| Merged mobile | formula | | free | |
| The write | `hubspot_update_object`, `ignoreBlanks` on | merged mobile not empty | free | the mobile property (`mobilephone` in HubSpot; confirm with `resolve_action_options`), never the phone property |

**Depth 4, the extra facts and the fit.** One research call, several fixed outputs, each one a question the rep asked for, gated on a row that already has an email and a domain so nothing is researched for a person who cannot be contacted. The fit, when asked, is a separate judge reading those outputs ([gtme-rules.md](./gtme-rules.md) "Gathering and judging are two steps").

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Company facts | `parallel_research` with typed `outputFields`; `custom_ai_agent` with web search only when the user names it or a specific model is required | merged email AND domain not empty | paid per row, free on the org's own key | one call carries every output: seven outputs cost what one costs |
| One column per question | the call's outputs, fixed shape each | | free | uses a given tool (a technology-stack action `list_actions` names can answer this one), number of sales reps, raised in the last twelve months, hiring SDRs, who runs sales, plus what the company's offer implies. The rep cuts the set |
| Fit | `custom_ai_agent`, web search off, the criteria in the system prompt, reading the fact columns | the facts came back | paid per row | only when the rep asked to qualify, against the criteria in their own words |

Why chain A works: the one agent call usually makes the profile enrichment unnecessary, so that step is gated rather than run on every row. Every filled cell is read by content, because a switchboard number in a phone column, a LinkedIn URL in an email column and a company page in a profile column all read as filled. Most of the columns in any chain A table are this shared chain; a recipe adds the rest.

### Chain B. A list of companies comes in

Recipe 9.5. Two tables, always: the accounts the rep brings, and the people table the find step writes into on its own. The campaign version of this job is Outbound, the named-account version is ABM and the whole-CRM version is CRM enrichment; all three cite this chain.

**Depth 1, on the accounts table: verify the company, then find the people.**

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| Account, Website, LinkedIn, Notes | text | | free | what the rep brought |
| Company repair | `custom_ai_agent`, web search on | none | paid per row | name, domain, company page URL, industry, size, HQ country |
| Company LinkedIn page | formula | | free | the rep's value only where it contains a company path |
| LinkedIn company profile | `enrich_company` | page not empty | paid on a match | resolves the slug and proves it. A slug cannot be derived from a company name, and a guessed one bills for the wrong company. Fallback after two identical failures on valid rows: `custom_ai_agent` with web search to resolve the page URL, then this step on what it returns |
| Account check | formula | | free | Verified, Skipped no page, Page mismatch |
| Company name, Domain | formulas | | free | |
| Find people at this account | `li_find_people_at_company`, with the people table as its own `destinationListId` | Account check = Verified AND page not empty | paid per person found, less on the org's own LinkedIn account | the action creates the contact rows itself, so no `send_to_table` sits behind it: its `fullValue` is an object whose array is `contacts`, so a send on `fullValue` fails every row and a send on `contacts` writes the same people a second time. Personas and the cap come from the request: titles as free text in `currentJobTitles`, exclusions as `{ "value": "Intern", "excluded": true }`, the cap in `maxLeadsPerCompany` (1 to 10); seniority, function, geography and industry filters take numeric LinkedIn ids from `resolve_action_options`, never labels |
| People from the web | `custom_ai_agent` with web search, `outputFormat: "jsonSchema"`, a top-level `contacts` array of full name, name parts, title, company and LinkedIn URL | the find column is not found OR has an error | paid per row | the fallback, for an audience with thin LinkedIn coverage and after two identical failures on valid rows. Both states belong in the condition: a provider error never sets not found, so a not-found gate alone never fires on the failure it promises to fork on |
| Send the web people | `send_to_table`, `send_for_each_item` mode, `sourceConfig.sourceColumnField` the fallback column, `sourceArrayPath: "contacts"` | the fallback array not empty | free | into the same people table. Mappings: the item's own full name, first name, last name, title and LinkedIn URL by plain property name, the account's name, domain and company page by `column:` reference, and never onto a destination column labeled `linkedinId` (Find People matches its rows on that key). A `sourceItemKey` only on a property the schema makes required and the prompt always fills, because an item missing that value fails |

Every contact the find step creates already arrives with full name, name parts, headline, location, role, LinkedIn URL, company, company website, employee count, size, description, industry and company LinkedIn URL, so no step is ever added to fetch those again. A row from the web fallback carries only what its schema named, so chain A's repair agent fills the rest. Switch `autoRunOnNewRow` on for the people table once the first run has created its fields, so the rows the find step lands move down the chain.

**Depth 2, the account in the CRM and the people written back.** On the accounts table: the company lookup on domain, name or company page, the create, the id. On the people table: a `lookup_single_record` back to the account row on the company LinkedIn URL pulls the company name, the domain and the CRM company id across, because people come back with their own stated employer rather than the account name. Then chain A from the first CRM check onward, and chain A depth 2's writes carrying the account's id. The people table never creates a company. Depths 3 and 4 are chain A's.

Why chain B works: the email step is the real quality gate, because a novelty profile passes any title filter. A scrambled website or a wrong company page is repaired to the right company by the repair and enrichment pair, which is why the account check exists as a visible word instead of a silent skip. In Prospecting a count of people per account is not built: the count was never the rep's decision.

### Chain C. Contacts come from the CRM

Recipes 9.7, 9.8 and 9.9. One table, one path. Read the portal's own values back to the user before designing the account test (`resolve_action_options` on the lifecycle stage and owner properties), because lifecycle stages are custom per portal and both owners and custom stages arrive as numeric ids.

**Depth 1, decide whether to spend, then refresh.** The account read and the status word come before every paid step. Placed at the far right of the table instead, where they gate nothing, the build pays on every row.

| Field | Action | Gate | Cost | Purpose |
|---|---|---|---|---|
| The CRM import | `hubspot_contacts_criteria_import`, or the Salesforce or Dynamics 365 criteria import `list_actions` names, contact fields only, with a record limit | | free | name, email, title, LinkedIn URL, record id, associated company id, and the engagement and last-contact fields this recipe reads. HubSpot criteria imports stop at 10,000 records, and more matches with no record limit fail the import |
| Account record | `hubspot_lookup_object` on the associated company id | id not empty | free | account data lives on the account, never on the contact's copy of it |
| The account columns | data extraction fields on that lookup | | free | name, domain, stage, open deals, last contacted (`notes_last_contacted`), owner |
| Account status | formula | | free | Not checked, Leave alone, Cold. The team's own test, with the portal's raw stage ids in it, against a date passed per row and never a today computed once |
| Person LinkedIn URL | formula | | free | a company page counts as empty; a Sales Navigator URL is kept apart for the resolver below |
| Public profile URL | `custom_ai_agent`, web search on, from name, company and the Sales Navigator URL | the URL is a Sales Navigator URL AND Account status = Cold | paid per row | `enrich_contact` accepts only public `/in/` profile URLs |
| Merged profile URL | formula | | free | the CRM's public URL, else the resolver's |
| LinkedIn profile refresh | `enrich_contact` | Merged profile URL not empty AND Account status = Cold | paid on a match | the first paid step, behind the account gate. Fallback after two identical failures on valid rows: `custom_ai_agent` with web search for the current position |
| Position check | formula | | free | compares against the account record's name, never the contact's own company field, which is blank on most CRM rows and a blank compares as a match. When the two disagree, both values go on the row and the row says so |
| Work email check, then the email | formula, then `waterfall_email_enrichment` from chain A | Cold AND still there AND the address on record is dead or missing | free on the org's own key, else paid per deliverable address | |
| Notes history, Email history | `hubspot_get_engagements`, one `engagementType` per column | Account status = Cold | free | the artefact, not the counter |
| Last touch | formula | | free | count, type, date, months ago and owner, in one line |
| The judge | `custom_ai_agent`, web search off | Position = Still there AND Cold | paid per row | three outputs: the verdict, what happened in the person's own wording with a date, and the single deciding piece of evidence. It reads the real bodies |
| Next step | formula | | free | account first, then position, then the verdict |
| Result | formula | | free | Done, No email, Left company, Account in play, Do not contact, Pending |

A hard no gets its own word, Do not contact, and its own route: the record is marked and no task is created. Collapsing it into the same word and the same task as a lead with no history is a compliance problem, not a data-quality one.

**Depth 2, write back.** Title to write and Profile URL to write, each empty unless the value actually changed. One update by record id with `ignoreBlanks` on. One task (`hubspot_create_engagement`, `engagementType` `tasks`) with a computed owner (`hubspot_owner_id`) and a computed due date (`hs_timestamp`), the specifics in the task body where the rep reads them, gated on an Already logged helper that reads the record's existing engagements so a re-run writes nothing twice. A note never prints an empty value: branch on whether the value exists, because a wrong sentence on a live record cannot be edited from the table.

**Depth 3, the mover leg.** Leavers stop at the flag in depth 1, with the new employer and the new title on the row. Finding the new employer's record, creating it, associating it and handling an address another record already holds is six steps and three write variants where the still-there row has one. Ask before the plan, and plan it in a child table on yes. Built inline instead, it piles update variants and engagement creates into one table until the rows produce more engagements than rows.

Depths for the mobile and the extra facts are chain A's, gated on Cold and still there.

Why chain C works: a row that stops at the account check pays nothing, which is the whole value of putting it first. CRM contacts change employer often, which is why the refresh runs before the email. Reading the real history, not the counters, is what flips a row from a cold re-introduction to a genuine re-open, and that flip is the recipe's reason to exist. Even a cutoff of a few months can match much of a portal, so the cutoff is the budget and it is agreed before the import runs.

## 6. Delivery

**Same CRM as the source.** Update by the record id that came with the import, `ignoreBlanks` on, so an empty result never erases a value.

**Any other CRM.** Look up by the merged email, update on found, create on not found. Company before contact, then associate: never a flat company name on a contact. Fixed-option properties reject free text, so map to the destination's own list (`resolve_action_options`) or leave the property out of the write.

**Outreach tools.** Only rows whose merged email exists, which means an address the rep or the CRM already held, or a found one the deliverability word calls deliverable. A risky, undeliverable or unknown address is never sequenced, and never an empty lead. A LinkedIn sequencer takes the profile URL and the name parts instead.

**Anywhere else.** `baseloop_send_http_request` for a custom endpoint, with the user's consent to a key stored in the field config ([gtme-rules.md](./gtme-rules.md) "A credential lives in a connection"); a file is exported from the app.

Whatever the destination, the last column is Result, one word per row, and the rep filters on it.

## 7. The ten recipes

### 9.1 Enrich a CSV of contacts with work emails

Chain A. The user uploads the CSV in the app, which creates the table with the file's columns, or hands over a small list for `create_rows`. Base is one verified work email per row and delivery; everything else is offered. Raw text columns and a repair prompt that names all of them and states that the headers are unreliable. Result: Done, Risky email, Incomplete, No email, Pending.

### 9.2 Find mobile numbers for a contact list

Chain A plus depth 3, and a phone column read by content rather than by emptiness. The enrichment helper carries phrases instead of yes or no, so the rep sees why a row was skipped. Second entry point: a rep sets a property on one contact, a CRM workflow posts that record with its id to a webhook table (plan-gated: `sourceCapabilities.webhook` in `list_actions`), and the chain runs for that one person. Built that way it runs one contact at a time, indefinitely, with each provider's number validated before it is accepted.

### 9.3 Find LinkedIn URLs for a contact list

Chain A, with one change: a URL can be checked, never guessed. Resolve the rep's URL with `enrich_contact` and read the name back. Name matches, keep it. Name differs, resolve the researched URL instead and keep the rep's original visible on the row. Check the name, never the employer: senior people often show a board seat as their main position. Two resolves, a supplied-URL check and a URL check each carrying phrases rather than yes or no, and a merge that reads the check. Result adds No URL.

### 9.4 Turn a Sales Navigator search into a list with emails

Chain A from a source action: `li_import_sales_nav_contacts` with a people search URL (`https://www.linkedin.com/sales/search/people?query=...`) and `maxContacts`, neither one fabricated: ask the user for both, since these tools cannot build the URL. The import needs no LinkedIn connection. On the org's own connected LinkedIn account (the default when one is connected) it is free, and that account's export quota of 2,500 a day caps the run; a scheduled re-run restarts from the top of the search rather than paging deeper. On managed access (`useOwnAPI: { "useOwnAPIEnabled": false }`, 0.5 credits per contact) a filter-based search splits past LinkedIn's 2,500-result window by itself, up to `maxContacts` (at most 10,000); a saved-search or lead-list URL cannot be split and stays near 2,500, so ask for the filter URL instead. On the org's own account the 2,500-a-day quota caps the day however the search is split. For more in one pass, offer managed access (`useOwnAPI: { "useOwnAPIEnabled": false }`, 0.5 credits per contact), or spread filter URLs the user builds in Sales Navigator over several days, one import table each, each sending into one people table. Rows arrive with name, title, profile URL, company and website, so the repair finds little and only two merges exist. The website is a URL, not a domain: clean it in a formula before the email step. Some out-of-network profiles show an initial instead of a surname, enough to matter and quiet enough to miss, so a row repair helper flags it and one narrow agent call recovers the surname and the domain; the email still passes the waterfall.

### 9.5 The right people at a company list

Chain B, both depths. Personas and the cap per company are asked before the find step runs, because it is priced per person found. Second entry point: a rep flags one company, a CRM workflow posts it with its id to a webhook table, and the people are found and created for that one account. Built that way it runs one account at a time against a fixed title list.

### 9.6 Turn a web page into a contact list

Chain A behind a pages table of four columns: the URL, what to extract, the transcriber agent, and the split send. The agent (`custom_ai_agent`, web search on to read the page, `outputFormat: "jsonSchema"`) reads the page as a transcriber, not a researcher: everything the page shows, nothing it does not, returned as an array. `send_to_table` in `send_for_each_item` mode fans it into the people table, with the page URL carried across using a `column:` reference. The `sourceItemKey` is the person's LinkedIn URL where the page shows one, otherwise a per-entry id the transcriber is told to emit on every entry and never leave empty. Keyed on the person's name instead, an entry with no name fails and the second of two people with the same name fails after the first, so the page silently loses rows. The people table then runs chain A; its repair agent's outputs are read by dotted path and there are no merged name columns. The page is one paid call and each person found is one repair call, because the page shows names and the chain has to find everything else. Result reads Pending from the email step, never from the repair agent: read from the wrong step it says No email on rows where the waterfall never ran.

### 9.7 Work the CRM leads sales never touched

Chain C. Filter: contacted zero times, no sales activity, no owner. Next step words: Cold intro, Left company, Hand to account owner.

### 9.8 Follow up the leads that engaged but never became a deal

Chain C. Filter: visited, opened, clicked or filled in a form, no sales activity, no deal. Engagement properties differ per portal, so read the portal's properties (`resolve_action_options` on the import's criteria) or ask which fields carry engagement before designing the filter. Inbound contacts often arrive as an email address and little else, so the person is rebuilt from the email domain. Re-engage warm only where there is a recent, concrete action to open with: ask which actions count and how far back. Next step words: Re-engage warm, Cold intro, Left company, Hand to account owner.

### 9.9 Revive the leads sales worked but never turned into a deal

Chain C. Filter on the last contacted date, not the sales activity date, which lags by years: last contacted before the cutoff, contacted count above zero, no deal, no next activity. Reading the real history is part of the recipe, not an option: the notes and the last few emails, both free, gated on the account check. Ask only how deep the read goes, subjects and direction or the full bodies. Weigh by direction, discount sequence sends, and let a rep's own note outrank any email. Where the team draws the re-open line is a judgment, so ask. Next step words: Re-open, Cold re-intro, Left company, Hand to account owner, Do not contact.

### 9.10 One person at a time, from the browser

Chain A with the order reversed: qualify the account before spending on the person. A rep sees someone and saves them with the Baseloop Chrome extension (set up in the app under Integrations), and the row arrives already complete: name parts, title, company, location, headline, profile text, profile URL and LinkedIn id, so no repair agent is built at all. The extension saves into a table with no other source: plan a table created without a source field, because a table with a webhook or import source is refused.

What changes: the employer is resolved to its company page from the person's own position list, sent to the companies table, researched and tested against the fit criteria there, and only a person at a company that passed gets a CRM check, an email or a mobile. Disqualified companies then cost nothing at person level, which at a thousand accounts is the whole budget. When a rep brings people one at a time forever, that order is the cheap one.

Two things are asked before the plan: the claim rule, meaning how long the clicking rep holds the contact, what counts as a touch and whether a colleague's record can be reassigned, and the blocklist, meaning the accounts nobody may touch, read by CRM id and by domain from a blocklist table. The employer match between the supplied company name and the profile's position list gets a word on the row when it disagrees; unflagged it fails silently. The second CRM check on the found email is not optional here: without it, writes fail because the address already belongs to another record. The rep reads the outcome in the CRM, on a contact that is owned, tagged and associated, with a note carrying the fit report and the call brief; a view per rep on the pool is the in-app equivalent.

## 8. Offering the next depth

End the plan, and the build report once a depth is verified, with one line naming at most three next depths, deepest first, in this use case's order: complete the person, put them where the rep works, the mobile, the extra facts and the fit. Name the table, the rows and the work in full, so the line reads as a new request.

After depth 1, the three are, deepest first, the extended set from depth 4, then depth 3, then depth 2 in the destination the rep named. After depth 2, they are the growth into the neighbouring use case the rep's own list points at (the whole committee at those accounts, a brief before the call, or a watch on those accounts), then depth 4, then depth 3. Offer, never assume, and never plan the next depth because it seemed obvious.
