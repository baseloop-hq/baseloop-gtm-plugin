# Workflow Patterns

Workflow recipes for common Baseloop GTM patterns. Each pattern shows the architecture (tables + field chains), key decisions, and autoRunCondition gating.

**Runtime rule:** Action keys in these recipes are examples from workflows that existed when the pattern was written. Before using any action, call `list_actions` to choose the current backend action and `get_action_schema` to read its live `aiDescription`. If the backend action guide conflicts with a recipe, the backend guide wins.

**Extraction note:** Patterns below that include extraction fields assume you follow the Extraction Field Rule from SKILL.md: run the source action on 1 row, inspect `fullValue` with `get_row_details`, then create extraction fields with verified paths. Never use example paths below without confirming them against actual action output.

## Table of Contents

| # | Pattern | Use When |
|---|---------|----------|
| 1 | HubSpot Import → ICP Qualification → Lead Finding → CRM Sync | Full B2B pipeline from HubSpot source |
| 2 | Content Magnet / Inbound Leads → Account Qualification | Processing inbound leads or sign-ups |
| 3 | Webhook-Sourced Workflow (External System Triggers) | Receiving data from ad platforms, dialers, outreach tools |
| 4 | Dual Entry Point Workflow | Multiple data sources converging into one pipeline |
| 5 | External Scoring Data → Enrichment → HubSpot | Working with third-party scoring/intent data |
| 6 | Shared Blocklist with Multi-Source Feeding | Dedup across multiple workflows |
| 7 | Content Magnet with Email Verification + Job Change | Inbound leads needing email quality + recency checks |
| 8 | LinkedIn Ad Engagement → Workflow | Converting LinkedIn ad engagement into pipeline |
| 9 | Call Data Analysis + Phone Number Workflow | Processing dialer/call platform data |
| 10 | LinkedIn Network Analysis (Bidirectional Lookup) | Warm intro path mapping via mutual connections |
| 11 | Outreach Reply Processing (Outreach → HubSpot → Slack) | Classifying and routing email replies |
| 12 | Multi-Dimensional Campaign Routing via Formulas | Language × persona → dynamic campaign assignment |
| 13 | Multi-Stage Company Qualification Funnel | Layered qualification (dedup → qualify → segment → enrich) |
| 14 | Job Change Detection | Detecting when contacts switch companies |
| 15 | AI-Powered Outreach Content Generation | Per-prospect personalized multi-email sequences |

---

## Pattern 1: HubSpot Import -> Full ICP Qualification -> Lead Finding -> CRM Sync

**Goal:** Import companies from HubSpot, enrich with LinkedIn company data from an external provider, qualify against ICP criteria (staff count, office count, employee distribution), find decision-makers, sync back to HubSpot with full audit trail.

### Architecture

```
HubSpot Import → Enrich & Qualify → Qualified Companies → All Leads
                                                            ├→ Email Campaign
                                                            ├→ Li+Phone
                                                            └→ Only LI
```

**Table 1: HubSpot Import** (source)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Source | `hubspot_companies_list_import` | — | Import from HubSpot static list |
| 2 | Send to Enrichment | `send_to_table` | always | Route to enrichment table |

**Table 2: Enrich & Qualify** (many fields)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | LinkedIn Slug | formula | — | Extract slug from LinkedIn URL |
| 2 | LinkedIn Enrichment | `baseloop_send_http_request` | slug `notNull` | LinkedIn company data (staff, HQ, offices, description) |
| 3 | Employee Distribution | `baseloop_send_http_request` | LinkedIn enrichment `notNull` | Employee distribution by country |
| 4 | Country Employee Counts | `custom_ai_agent` | distribution `notNull` | Extract country list from distribution data |
| 5 | Office Location Counter | `custom_ai_agent` | LinkedIn enrichment `notNull` | Count offices per country |
| 6 | Employee Movements | `custom_ai_agent` | distribution `notNull` | Headcount movement analysis |
| 7 | Segment Classification | `custom_ai_agent` | LinkedIn enrichment `notNull` | Classify company segment |
| 8 | Staff Qualification | formula | — | ≥200 employees = Qualified |
| 9 | Country Count | formula | — | Count countries (EU-27 = 1) |
| 10 | Country Qualification | formula | — | >1 country = Qualified |
| 11 | ICP Check | formula | — | All 3 quals pass = Qualified |
| 12 | HubSpot Update | `hubspot_update_object` | ICP Check `notNull` | Push enrichment back to HubSpot |
| 13 | HubSpot Engagement | `hubspot_create_engagement` | ICP Check `notNull` | Create note with ICP summary |
| 14 | Send to Qualified | `send_to_table` | ICP Check = "Qualified" | Route qualified companies |

**Table 3: Qualified Companies** (`autoRunOnNewRow: true`)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Research: Trigger Events | `custom_ai_agent` | always | Office expansions, funding (web search) |
| 2 | Research: Hiring Intel | `custom_ai_agent` | always | Hiring patterns, remote/local |
| 3-9 | Find People (7x) | `li_find_people_at_company` | research `notNull` | Multiple persona searches (see below) |
| 10 | Send to Leads | `send_to_table` | findPeople `notNull` | Route contacts to leads table |

**Multi-persona Find People** — 7 different searches per company:
- Champions: IT Manager, IT Ops Manager, IT Infrastructure Manager
- Budget holders: Rapid-Growth Startups, Tech Scale-Ups, Mid-Sized Companies, Large Companies

Each search targets different roles/seniority based on the company segment. All results flow to the same leads table.

**Table 4: All Leads** (`autoRunOnNewRow: true`)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Lookup Parent Company | `lookup_single_record` | always | Pull company data (AE, HubSpot ID, trigger events) |
| 2 | HubSpot Lookup | `hubspot_lookup_object` | always | Check if contact exists in HubSpot |
| 3 | Email Enrichment | `waterfall_email_enrichment` | always | Find work email |
| 4 | Phone Enrichment | `waterfall_phone_enrichment` | always | Find phone number |
| 5 | Timezone | `custom_ai_agent` | location `notNull` | Determine IANA timezone |
| 6 | LI Description Summary | `custom_ai_agent` | always | Summarize LinkedIn description |
| 7 | Email Check | formula | — | Domain match verification |
| 8 | Contact Summary (HTML) | formula | — | HTML note for HubSpot |
| 9 | Cold Call Summary | formula | — | Text summary for sales reps |
| 10 | HubSpot Create | `hubspot_create_object` | lookup `isNotFound` | Create contact |
| 11 | HubSpot Update | `hubspot_update_object` | lookup or create `notNull` | Update with enrichment |
| 12 | HubSpot Engagement | `hubspot_create_engagement` | always | Contact summary note |
| 13 | Email Campaign | `send_to_table` | email `notNull` | Route to email outreach |
| 14 | Li+Phone | `send_to_table` | phone `notNull` AND email `isNull` | Route to LinkedIn + phone |
| 15 | Only LI | `send_to_table` | email `isNull` AND phone `isNull` | Route to LinkedIn only |

### Key Decisions
- **Standard enrichment stack**: LinkedIn slug formula → external enrichment HTTP request → employee distribution HTTP request → AI agents for structured extraction → formula gates. This reusable sequence appears across workflows.
- **Formula-based ICP gates**: Three cheap formula checks (staff ≥200, country count >1, office count >1) combine into one ICP Check before expensive AI research.
- **Multi-persona findPeople**: 7 different search queries per company targeting different buyer roles. Each company segment gets different budget-holder searches.
- **Lookup back to parent**: Leads table uses `lookup_single_record` to pull company data (AE assignment, HubSpot ID, trigger events) from the qualified companies table.
- **Triple campaign routing**: Leads sorted into 3 outreach channels based on available contact info.
- **HubSpot audit trail**: Engagement notes created at every stage — qualified, disqualified (with reason), research findings.
- **`autoRunOnNewRow: true`** on downstream tables: When Send to Table creates rows, all fields cascade automatically.

---

## Pattern 2: Content Magnet / Inbound Leads -> Account Qualification

**Goal:** Leads come in from content downloads (reports, webinars). Qualify the account, not just the contact. Create engagement notes explaining why each account was qualified or disqualified.

### Architecture

```
1. ALL LEADS (webhook) → 2. Account Qualification → 3. Enrich Qualified Leads
                                ↕ blocklist check
```

**Table 1: ALL LEADS** (source: webhook from content platform)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| — | Input | webhook/import | — | Content type, contact info, email verification results |

Tracks content attribution: `content_type` (report, webinar) and `content_name` (specific asset). Also receives email verification data (`email_freemail`, `email_quality`, `email_result`).

**Table 2: Account Qualification** (`autoRunOnNewRow: true`, many fields)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | LinkedIn URL Finder | `custom_ai_agent` | LI URL missing | Find company LinkedIn URL when missing |
| 2 | LinkedIn Slug | formula | — | Extract slug from found URL |
| 3 | Blocklist Lookup | `lookup_single_record` | always | Check against master blocklist table |
| 4 | LinkedIn Enrichment | `baseloop_send_http_request` | slug `notNull` | LinkedIn company data |
| 5 | Employee Distribution | `baseloop_send_http_request` | LinkedIn enrichment `notNull` | Employee distribution |
| 6 | Employee Location Summary | `custom_ai_agent` | distribution `notNull` | Country extraction |
| 7 | Office Locations Counter | `custom_ai_agent` | LinkedIn enrichment `notNull` | Office count per country |
| 8 | FTE Qualification | formula | — | ≥200 = Qualified |
| 9 | Country Qualification | formula | — | ≥2 countries = Qualified |
| 10 | Office Qualification | formula | — | ≥2 offices = Qualified |
| 11-16 | Engagement Notes (6x) | `hubspot_create_engagement` | varies | Different note per outcome |
| 17 | Send to Enrichment | `send_to_table` | all quals pass | Route qualified leads |

### Key Decisions
- **AI-powered LinkedIn URL finding**: When HubSpot data doesn't include a LinkedIn URL, an AI agent searches for it before external enrichment can proceed.
- **Blocklist check**: `lookup_single_record` against a "Master CRM Blocklist" table (closed-won + churned accounts). Gates all downstream processing.
- **6 different engagement notes**: FTE disqualified, country count disqualified, office count disqualified, LinkedIn not found, LinkedIn not accessible, ICP qualified. Full CRM audit trail explaining every decision.
- **Content attribution preserved**: Content type/name flows through the workflow so outreach can reference which asset the lead downloaded.

---

## Pattern 3: Webhook-Sourced Workflow (External System Triggers)

**Goal:** External system (e.g., LinkedIn follower events) pushes data via webhook → enrich → qualify → find people → sync to HubSpot.

### Architecture

```
Qualified Accounts (webhook) → Qualified Contacts
         ↕ blocklist
         ↕ HubSpot lookup/create
```

**Table 1: Qualified Accounts** (source: webhook)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Webhook | webhook | — | External system pushes company data |
| 2 | Blocklist Lookup | `lookup_single_record` | always | Check against blocklist |
| 3 | LinkedIn Enrichment | `baseloop_send_http_request` | blocklist `isNotFound` | LinkedIn enrichment |
| 4 | Office Count | `custom_ai_agent` | LinkedIn enrichment `notNull` | Count offices |
| 5 | Qualification Status | `custom_ai_agent` | LinkedIn enrichment `notNull` | Movement analysis |
| 6 | Segment Classification | `custom_ai_agent` | LinkedIn enrichment `notNull` | Classify segment |
| 7 | ICP Check | `custom_ai_agent` | all enrichment `notNull` | Final ICP decision |
| 8 | HubSpot Lookup | `hubspot_lookup_object` | ICP = Qualified | Check if company exists |
| 9 | HubSpot Create | `hubspot_create_object` | lookup `isNotFound` | Create company |
| 10 | HubSpot Update | `hubspot_update_object` | lookup or create `notNull` | Update with data |
| 11 | Find People | `li_find_people_at_company` | ICP = Qualified | Find contacts |
| 12 | HubSpot Engagement | `hubspot_create_engagement` | always | Audit note |

### Key Decisions
- **Webhook source**: No import action needed. External system POSTs data to the table's webhook URL. `autoRunOnNewRow` handles the rest.
- **Blocklist as first gate**: Cheapest check (lookup against existing table) runs before any enrichment.
- **Bidirectional HubSpot sync**: Read existing records, create missing ones, update all with enrichment data.

---

## Pattern 4: Dual Entry Point Workflow

**Goal:** Multiple data sources (HubSpot import + third-party data CSV) feed into the same downstream workflow for trigger event research and lead finding.

### Architecture

```
0. Enrichment | CRM Source      ──┬→ 1. Trigger Events
0. Enrichment | External Source ──┤
                                   └→ 2. Lead Finder → 3. All Leads
```

**Tables 0a + 0b: Enrichment** (two source tables, same field structure)
Both run the standard enrichment stack independently, then **dual Send to Table** routes to two downstream tables simultaneously.

**Table 1: Trigger Events** (`autoRunOnNewRow: true`)
- AI research: office/funding expansions, hiring intel (web search enabled)
- AI summaries of research findings
- HubSpot engagement notes with research results

**Table 2: Lead Finder** (`autoRunOnNewRow: true`)
- 7x `li_find_people_at_company` (same multi-persona pattern)
- Results flow to All Leads

### Key Decisions
- **Parallel entry points**: Same workflow processes companies from different sources. Each gets its own enrichment table so sources can run on different schedules.
- **Dual routing**: One enrichment table routes to BOTH trigger events AND lead finder simultaneously. Two Send to Table fields on the same table.
- **Match verification**: AI agents compare HubSpot company names against LinkedIn names and verify domain matches. Catches data quality issues early.

---

## Pattern 5: External Scoring Data -> Enrichment -> HubSpot

**Goal:** Take pre-scored company data from an external source (e.g., data provider with propensity scores), enrich with LinkedIn data, and sync to HubSpot.

### Architecture

```
Company Enrichment → Find People → All Leads
```

**Table 1: Company Enrichment** (`autoRunOnNewRow: true`)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| — | Input | import/webhook | — | Pre-computed scores (account_tier, combined_score, growth_score) |
| 1 | HubSpot Lookup | `hubspot_lookup_object` | always | Check if company exists |
| 2 | HubSpot Create | `hubspot_create_object` | lookup `isNotFound` | Create in HubSpot |
| 3 | Standard enrichment stack | ... | ... | External enrichment + AI agents + formula gates |
| 4 | HubSpot Update | `hubspot_update_object` | enrichment done | Push back enrichment + scores |
| 5 | HubSpot Engagement | `hubspot_create_engagement` | always | ICP summary note |
| 6 | Send to Find People | `send_to_table` | ICP = Qualified | Route qualified companies |

### Key Decisions
- **External scores as input**: The table receives pre-computed ML scores (account_tier, acquisition_score, growth_expansion_score). These augment the standard enrichment stack.
- **HubSpot sync first**: Lookup/create happens before enrichment so the HubSpot record ID is available for later updates.
- **Workspace cloning as templates**: This exact structure gets cloned for each new campaign. Create the template once, clone for each batch.

---

## Cross-Cutting Strategies

### Standard Enrichment Stack
This exact sequence appears in most workflows:
1. Formula: LinkedIn slug extraction
2. HTTP Request: LinkedIn company enrichment data (staff, HQ, offices, description)
3. HTTP Request: Employee distribution data
4. AI Agent: Country employee counts (extract from distribution)
5. AI Agent: Office location counter (count per country)
6. AI Agent: Employee movements/qualification status
7. AI Agent: Segment classification
8. Formulas: Staff qualification (≥200), country count (EU=1), ICP check (all pass)

### autoRunOnNewRow Strategy
- **Source/enrichment tables**: `autoRunOnNewRow: false` — run manually or on schedule
- **Downstream tables** (populated by Send to Table): `autoRunOnNewRow: true` — cascade automatically when rows arrive

### HubSpot Engagement Notes as Audit Trail
Write a note to HubSpot for every outcome — qualified (with ICP summary), disqualified (with specific reason: FTE too small, country count too low, LinkedIn not found). This creates a CRM audit trail.

### Blocklist/Exclusion Tables
Maintain a "Master CRM Blocklist" table with closed-won + churned accounts. Use `lookup_single_record` as the first gate before spending credits on enrichment.

---

## Pattern 6: Shared Blocklist with Multi-Source Feeding

**Goal:** Maintain a single exclusion registry (closed-won + churned accounts) that multiple workflows reference before spending credits on enrichment.

### Architecture

```
HubSpot Import (Closed Won)  ──┐
HubSpot Import (Churned)     ──┼── Send to Table ──→ Master CRM Blocklist
HubSpot Import (New Batch)   ──┘         ↑ lookup_single_record FROM:
                                          ├─ Workflow A: Qualification
                                          ├─ Workflow B: Account Qualification
                                          ├─ Workflow C: Qualified Accounts
                                          └─ Workflow D: Company Enrichment
```

**Source Tables** (multiple HubSpot import tables, `autoRunOnNewRow: true`)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Source | `hubspot_companies_list_import` | — | Import from specific HubSpot list |
| 2 | Send to Blocklist | `send_to_table` | always | Route to master blocklist |

**Master CRM Blocklist** (destination)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| — | Input | receives from Send to Table | — | domain, name, owner, industry, LinkedIn URL |
| 1 | External Sync | `baseloop_send_http_request` | always | Optional: sync blocklist to external systems |

### Key Decisions
- **Multi-source feeding**: Each HubSpot deal stage (closed-won, churned, etc.) gets its own import table, all feeding the same master blocklist. New exclusion criteria = new import table.
- **Cross-workspace reference**: The blocklist lives in its own workspace. Other workspaces reference it via `lookup_single_record` by domain. The blocklist is never modified by consuming workflows.
- **Cheapest gate**: `lookup_single_record` costs zero credits and runs before any enrichment. Gate all downstream fields on blocklist lookup being `isNotFound`.

---

## Pattern 7: Content Magnet with Email Verification + Job Change Detection

**Goal:** Inbound content download leads → verify email quality → qualify account → enrich qualified leads with LinkedIn profile data → detect job changes → update CRM.

### Architecture

```
A. Leads (IT Audit Report)    ──┬── Send to ALL LEADS ──→ 1. ALL LEADS (passive)
B. Leads (State of IT Report)  ──┘         │
                                            ↓ Send to Account Qualification
                                   2. Account Qualification (6 engagement notes)
                                            │
                                            ↓ Send to Enrichment
                                   3. Enrich Qualified Leads (job change detection)
```

**Content-Specific Source Tables** (one per asset)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Source | `hubspot_contacts_list_import` | — | Import contacts who downloaded this asset |
| 2 | Lookup Company | `hubspot_lookup_object` | always | Get company domain + additional domains |
| 3 | Email Verification | `baseloop_send_http_request` | always | Email verification (freemail, quality, result) |
| 4 | Content Type | formula | — | Literal: "Report" |
| 5 | Content Name | formula | — | Literal: specific asset name for attribution |
| 6 | LinkedIn URL Finder | `custom_ai_agent` | LI URL missing | AI-powered URL discovery |
| 7 | Send to Account Qual | `send_to_table` | always | Route to qualification |
| 8 | Send to ALL LEADS | `send_to_table` | always | Route to passive aggregation |
| 9 | NOTE: Bad Email | `hubspot_create_engagement` | email_quality = "bad" | CRM note for bad emails |

**Table 3: Enrich Qualified Leads** (`autoRunOnNewRow: true`)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Lookup Contact | `hubspot_lookup_object` | always | Get current CRM data |
| 2 | Lookup Company | `hubspot_lookup_object` | always | Get company domain, LinkedIn URL |
| 3 | Profile Search | `baseloop_send_http_request` | always | Search for LinkedIn profile URL |
| 4 | Profile Enrichment | `baseloop_send_http_request` | profile URL `notNull` | Enrich LinkedIn profile (positions history) |
| 5 | Latest Job Title | formula | — | Extract most recent title from positions |
| 6 | Latest Company Name | formula | — | Extract current company from positions |
| 7 | Company Name Match | formula | — | Compare old vs new company (true/false/unsure) |
| 8 | Company Change Alert | formula | — | HTML alert when mismatch detected |
| 9 | IT Manager Filter | formula | — | Check if title matches target role |
| 10 | Phone | `waterfall_phone_enrichment` | always | Find phone number |
| 11 | Update Object | `hubspot_update_object` | always | Push enriched data to CRM |
| 12 | Create Engagement | `hubspot_create_engagement` | always | Enrichment summary note |

### Key Decisions
- **Multi-asset funnel merging**: Each content asset (report, webinar) gets its own source table with literal content-source formulas. All merge into a single ALL LEADS table, then flow to centralized account qualification.
- **Email verification gate**: Email verification API via `baseloop_send_http_request` runs before routing. Bad emails get a CRM engagement note. This prevents wasting enrichment credits on invalid contacts.
- **Job change detection**: The enrichment table pulls current LinkedIn profile data, extracts the latest company name, and compares against CRM records. Mismatches trigger a "Company Change Alert" — a signal that the contact may have moved to a new company.
- **Passive aggregation table**: ALL LEADS stores every inbound lead with content attribution but runs no processing. It's a reporting/analytics table.

---

## Pattern 8: LinkedIn Ad Engagement → Workflow

**Goal:** LinkedIn ad engagement data (from an ad analytics platform) triggers enrichment of engaged companies. Separately, verify which target accounts are already engaging with ads.

### Architecture

```
Ad Engagement Source (high-volume webhook) → Send to Table → Enrich & Qualify → downstream workflow
Target Account Check → lookup_single_record against Ad Engagement Source (reverse lookup)
```

**Ad Engagement Source** (webhook, high volume)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Webhook | webhook | — | Receives: Company Name, LinkedIn URL, Engagement Level |
| 2 | Send to Table | `send_to_table` | always | Route engaged companies to enrichment |

**Target Account Check** (reverse lookup table)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| — | Input | import/manual | — | Target companies with ad metrics (impressions, clicks, conversions) |
| 1 | Lookup Ad Engagement | `lookup_single_record` | always | Check if company appears in ad engagement data |

### Key Decisions
- **Ad engagement as signal source**: Companies engaging with LinkedIn ads get funneled into the standard enrichment workflow. Ad engagement = intent signal.
- **Reverse lookup for account coverage**: Given a list of target accounts, use `lookup_single_record` against the ad engagement table to answer: "which of our target accounts are already engaging with our ads?" This validates ad targeting.
- **High-volume webhook ingestion**: Thousands of rows via webhook, no processing on the source table — just route to enrichment where the standard stack runs.

---

## Pattern 9: Call Data Analysis + Phone Number Workflow

**Goal:** Analyze sales call outcomes from a dialer platform by enriching call data with CRM context. Separately, receive new phone numbers from enrichment providers and push to HubSpot.

### Architecture

```
Call Data (import) → HubSpot Lookup (enrich with CRM data)
Phone Provider (webhook) → HubSpot Update (push new numbers)
```

**Call Data Table**
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| — | Input | import | — | Call data: user, disposition, duration, prospect, transcript, recording |
| 1 | Record ID | formula | — | Extract HubSpot Record ID from dialer link URL |
| 2 | Lookup Object | `hubspot_lookup_object` | always | Pull CRM context: last contacted, create date, LinkedIn URL, campaigns |

**New Phone Numbers Table** (`autoRunOnNewRow: true`)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Webhook | webhook | — | Receives: phone number, email, name, data provider, record ID |
| 2 | Update Object | `hubspot_update_object` | always | Push new phone number to HubSpot contact |

### Key Decisions
- **Call analytics enrichment**: Dialer call data lacks CRM context. By looking up each prospect in HubSpot, you can analyze call outcomes against CRM fields (last contacted date, campaigns, create date). This powers call strategy optimization.
- **Formula-based ID extraction**: The dialer link URL contains the HubSpot Record ID. A formula extracts it, enabling the HubSpot lookup.
- **Zero-touch phone number workflow**: External phone enrichment providers push new numbers via webhook → `autoRunOnNewRow: true` → HubSpot update. Fully automated, no manual intervention.
- **Region-specific tables**: US and EMEA phone numbers get separate tables, allowing different processing rules or providers per region.

---

## Pattern 10: LinkedIn Network Analysis (Bidirectional Cross-Table Lookup)

**Goal:** Analyze a team member's LinkedIn connections to find contacts at target companies, and find which companies in the target list have known connections.

### Architecture

```
Companies (webhook) ←→ People (webhook)
    ↕ HubSpot Lookup                    ↕ lookup_multiple_records
```

**Companies Table**
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Webhook | webhook | — | Company data from LinkedIn export |
| 2 | Lookup People | `lookup_multiple_records` | always | Find connections at this company |
| 3 | Lookup People (alt) | `lookup_multiple_records` | always | Second lookup (different matching criteria) |
| 4 | HubSpot Lookup | `hubspot_lookup_object` | always | Pull account tier, owner, external data ID |
| 5 | HubSpot Lookup (engagement) | `hubspot_lookup_object` | always | Pull Notes Last Contacted separately |

**People Table**
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Webhook | webhook | — | Contact data from LinkedIn export |
| 2 | Lookup Companies | `lookup_multiple_records` | always | Find which target companies this person connects to |

### Key Decisions
- **Bidirectional cross-table lookup**: Companies → lookup_multiple_records → People, AND People → lookup_multiple_records → Companies. Creates a network graph: "which connections work at target accounts?"
- **Multiple HubSpot lookups on same table**: One lookup for account data, a separate lookup for engagement data. Different HubSpot endpoints or property sets may require separate queries.
- **Warm introduction identification**: By matching LinkedIn connections against target accounts, sales reps can identify warm introduction paths instead of cold outreach.

---

## Additional Cross-Cutting Strategies

### Template Cloning for Campaign Batches
Build a workflow workspace once (with the full enrichment + qualification + lead finding + CRM sync chain), then clone it for each new campaign or data batch. Each clone gets:
- Its own data (separate from other batches)
- The same field structure and autoRunConditions
- A "Table Source" field to track which batch rows came from

Example: "One-off | Enrichment from HubSpot" (empty template) → "One-off | Enrichment from HubSpot - Feb 14th" (active clone with imported data).

### Dual-Domain HubSpot Lookup
When external enrichment returns a different domain than the input (common with subsidiaries, regional domains, or rebrands), do two HubSpot lookups:
1. Lookup based on the input domain
2. Lookup based on the enrichment-discovered domain
Merge results with a formula (prioritize the one that found a match). This prevents missed CRM matches.

### Recency Gating
Before spending credits on recently worked accounts, add a "Contacted Within 30 Days" formula:
- Input: `hs_last_contacted_date` from HubSpot lookup
- Logic: return "true" if last contact < 30 days ago
- Gate downstream enrichment on this being "false" or empty

### Multi-Content-Asset Attribution
When multiple content assets feed the same workflow, tag each with:
- "Content Type" formula (literal: "Report", "Webinar", etc.)
- "Content Name" formula (literal: specific asset name)
These flow through Send to Table so outreach can reference which asset the lead engaged with.

### Webhook as Universal Data Ingestion
Every external system integration uses webhooks: ad analytics platforms (engagement data), follower tracking tools (intent events), phone providers (new numbers), dialer platforms (call data), LinkedIn exports. The pattern is always:
1. Webhook field receives the data
2. `autoRunOnNewRow: true` triggers processing
3. Action fields cascade automatically

This is the preferred pattern over polling or manual imports for any real-time data source.

### Per-Person Per-Segment Sourcing Tables
Instead of one monolithic contacts import, create separate tables per country × vertical × team member. Name them explicitly: "{name} - Pharma - ITA", "{name} - Transport - ITA", "Batch#2 - LUX - Compliance". Benefits:
- Multiple team members can import simultaneously without conflicts
- Each table = one Sales Nav saved search (clear ownership)
- Campaign iterations get prefixed (Batch#2 = second round)
- All tables share identical schema — templatizable

### Dynamic URL Construction via Formula
When routing to an external API that has multiple endpoints (e.g., different outreach campaign IDs), compute the endpoint path via formulas instead of creating N separate HTTP request fields. The formula result becomes part of the URL: `https://api.example.com/campaigns/{{formula_computed_id}}/leads`. One action field handles all routing permutations.

### People-Finding Strategy: LinkedIn vs AI Web Search
Choose the right people-finding approach based on the target audience. **Do not default to building both** — ask about the audience first.

**Option A: LinkedIn only** (`li_find_people_at_company`)
- Best for: tech companies, enterprise SaaS, B2B professionals, large companies with strong LinkedIn presence
- Cost: lower per-contact credit cost
- Pros: Structured data (title, company, headline), reliable for LinkedIn-active industries
- Use this when the user says "find decision-makers", "find founders" at tech/enterprise/B2B companies

**Option B: AI web search only** (`custom_ai_agent` with `enableWebSearch: true` + `outputFormat: "jsonSchema"`)
- Best for: small businesses, non-tech industries (agriculture, construction, local services), regions with low LinkedIn adoption, or when the user explicitly prefers web search
- Cost: higher variable credit cost, depending on model and web search depth
- Pros: Searches company websites, team pages, Crunchbase, press releases — finds people LinkedIn misses
- Use this when the user's audience isn't on LinkedIn, or when they explicitly ask for web-based people finding
- JSON Schema: array of contacts with `full_name`, `first_name`, `last_name`, `title`, `email`, `linkedin_url`
- Route results via Send to Table `send_for_each_item` (same pattern as LinkedIn results)

**Option C: Both with fallback** (LinkedIn first, AI web search for misses)
- Best for: mixed audiences where some companies are LinkedIn-active and others aren't
- How: `li_find_people_at_company` runs first, then `custom_ai_agent` gated on Find People field being `isNotFound`
- Both paths feed the **same destination table** via Send to Table `send_for_each_item`, so downstream workflow (enrichment, CRM sync, outreach) is identical regardless of how the contact was found
- Cost: lower per-contact cost for LinkedIn hits plus higher variable cost for web-search misses

**Decision signal:** If the user describes their target as "SMBs", "local businesses", "non-tech", or mentions a region with low LinkedIn adoption → default to Option B. If they describe "enterprise", "SaaS", "tech companies" → default to Option A. If unclear or mixed, suggest Option C and explain the tradeoff.

### OOO Auto-Reply Mining
Use the current AI/web-research action returned by `list_actions` to parse Out-of-Office replies and extract backup/alternative contact email addresses. Gate on the outreach platform's OOO reply category. Prompt pattern: "Extract the email address of the alternative/backup contact person. Output ONLY the email address, or NONE if not found." This converts dead-end OOO responses into new lead opportunities.

### Outreach Reply Slack Notification Filtering
When processing outreach replies via webhook, filter Slack notifications to exclude noise:
- Exclude bounces (reply_category = 4)
- Exclude OOO auto-replies (reply_category = 6)
- Only notify for meaningful replies that need human review
Use separate action fields for OOO mining (gated on category = 6) vs Slack notifications (gated on category != 4 AND != 6).

---

## Pattern 11: Outreach Reply Processing Workflow (Outreach Platform → HubSpot → Slack)

**Goal:** Process all outreach email events from an outreach platform via webhook. Update HubSpot with sentiment, create engagement notes, notify Slack for meaningful replies, and mine OOO replies for backup contacts.

### Architecture

```
Outreach Platform (webhook: all events)
  │
  ├─[EMAIL_REPLY] → HubSpot Lookup (contact by email)
  │                    → HubSpot Lookup (company by associated ID)
  │                    → HubSpot Update (outbound_sentiment)
  │                    → HubSpot Engagement (email timeline note)
  │
  ├─[EMAIL_REPLY + OOO] → AI/web-research action from list_actions (extract backup contact email)
  │
  ├─[EMAIL_REPLY + not bounce/OOO] → Slack notification (rich blocks)
  │
  └─ Send to Table → replies archive
```

**Outreach Replies Table** (webhook, high volume)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Webhook | webhook | — | Receives all outreach event fields |
| 2 | SM - Lead Category ID | formula | — | Map category name → numeric ID |
| 3 | Lookup Object | `hubspot_lookup_object` | event_type = EMAIL_REPLY | Contact lookup by email |
| 4 | Lookup Company | `hubspot_lookup_object` | Lookup Object `isFound` + EMAIL_REPLY | Company lookup by associated company ID (two-hop) |
| 5 | Update Object | `hubspot_update_object` | Lookup Object `isFound` | Set outbound_sentiment on contact |
| 6 | Create Engagement | `hubspot_create_engagement` | Update Object `isFound` | Email timeline as engagement note |
| 7 | OOO backup-contact research | current AI/web-research action from `list_actions` | reply_category = 6 + EMAIL_REPLY | Extract backup contact from OOO |
| 8 | Send Slack Message | `baseloop_send_http_request` | EMAIL_REPLY + category != 4 + != 6 | Rich Slack notification |
| 9 | Send to Table | `send_to_table` | always | Archive to downstream table |

### Key Decisions
- **Webhook receives ALL events**: Sent emails, replies, bounces, OOO — all event types land in one table. Run conditions branch the processing by event type and reply category.
- **Two-hop HubSpot lookup**: Contact by email → extract associated company ID → Company by ID. Gets company name for Slack notification context.
- **Sequential gating**: Create Engagement gates on Update Object success (not just Lookup). This ensures HubSpot is updated before the audit trail note is created.
- **OOO mining**: AI/web research parses OOO auto-replies to extract backup contact email. Separate from the main reply flow — gated on reply_category = 6 specifically.
- **Filtered Slack**: Excludes bounces (4) and OOO (6) from Slack notifications. Only meaningful replies that need human attention trigger alerts.
- **Slack rich blocks via HTTP**: Uses `baseloop_send_http_request` to Slack webhook URL with Block Kit JSON (section blocks with fields for name, email, LinkedIn, company, campaign, HubSpot URL, and reply text).

---

## Pattern 12: Multi-Dimensional Campaign Routing via Formula Chain

**Goal:** Route HubSpot contacts to the correct outreach campaign based on two dimensions: language (inferred from email domain) and job title cluster (inferred from title keywords). 8 possible campaigns from 2 dimensions.

> **Note:** This pattern uses `baseloop_send_http_request` for enrollment because it needs **dynamic formula-based campaign routing** — the campaign ID is computed at runtime and placed in the API URL path. For standard single-campaign enrollment, use the current outreach campaign actions returned by `list_actions`; their `get_action_schema` guides are simpler to configure.

### Architecture

```
Input: HubSpot Company Record ID
  → HubSpot Lookup (company by ID)
  → HubSpot Lookup (contacts by associated company ID)
    → extracts: Email, Job Title, First Name
  → Language Code formula (email domain → IT/EN)
  → Job Title Cluster formula (title → 4 clusters)
  → Category Mapping Code formula (Language × Cluster → campaign ID)
  → Send HTTP Request (POST to outreach API, campaign ID in URL path)
```

**HubSpot Enrollment Table** (high-volume table)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | company-object-search | `hubspot_lookup_object` | always | Verify company exists in HubSpot |
| 2 | contact-object-search | `hubspot_lookup_object` | always | Find contact by associated company ID, extract email + title |
| 3 | Language Code | formula | — | Email domain .it → "IT", else → "EN" |
| 4 | Job Title Cluster | formula | — | Classify into 4 clusters by keyword matching |
| 5 | Category Mapping Code | formula | — | Language × Cluster → outreach campaign ID |
| 6 | Send HTTP Request | `baseloop_send_http_request` | always | POST to `…/campaigns/{{category_mapping_code}}/leads` |

**The Job Title Clusters:**
Create a small set of persona clusters from title keywords, such as executive, technical, operational, and legal/risk functions. Keep the cluster labels explicit enough for campaign mapping, but generic enough to reuse across campaigns.

**The Routing Matrix:**
| Language | Cluster | Campaign ID |
|---|---|---|
| Language A | Cluster A | {campaign_A} |
| Language A | Cluster B | {campaign_B} |
| Language B | Cluster A | {campaign_C} |
| Language B | Cluster B | {campaign_D} |

### Key Decisions
- **Formula chain replaces N routing fields**: a few formulas plus one HTTP request replace many separate outreach enrollment fields with complex gating.
- **Dynamic URL path**: The campaign ID is computed by formulas and placed directly in the API URL path: `https://api.outreach-platform.com/campaigns/{{category_mapping_code}}/leads`. The HTTP request body stays the same for all campaigns.
- **Language inferred from email domain**: map country-code domains to locale-specific campaigns, with a default language fallback for everything else.
- **Contact lookup by associated company ID**: The table starts with company Record IDs, then finds the contact at that company. This is the reverse of the typical flow (usually starts with contacts).
- **Extensible dimensions**: Add a third dimension (e.g., company size) by adding one more formula to the chain. The mapping formula grows but the HTTP request field stays the same.

---

## Pattern 13: Multi-Stage Company Qualification Funnel

**Goal:** Take raw LinkedIn imports from multiple sourcing tables, dedup and validate websites, qualify companies (business model, competitor detection, CRM usage), split into segments, then deep-enrich only qualified companies with intelligence, funding, hiring signals, and traffic data.

### Architecture

```
Multiple LinkedIn import tables (region and company-size partitioned)
  → Qualification RAW Leads (dedup aggregation)
    → Companies Dedup (AI website validation)
      → Companies Qualification (business model, technology stack, competitor)
        ├→ FIT SaaS/Platform Companies
        ├→ FIT Service Companies
        ├→ Potential Partners: Consultants
        └→ Potential Partners: RevOps Agencies
            ↓
    SaaS/Service Campaign workspace:
      Companies: Master List (intelligence, funding, hiring, traffic, competitor)
        → People: Master List (persona classification)
          ├→ Outbound (AI email sequence + outreach platform)
          ├→ CRM Enrichment (same chain for existing CRM contacts)
          └→ Inbound/PLG (traffic-qualified leads)
```

**Table 1: Companies Dedup** (`autoRunOnNewRow: true`)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Company Website Finder | `custom_ai_agent` | website null OR contains bit.ly/linktr/hubs.ly | Resolve shortened URLs, find missing websites |
| 2 | Merged Company Website | formula | — | Prioritize found website over LinkedIn-provided one |
| 3 | Send to Table | `send_to_table` | always | Route to qualification |

**Table 2: Companies Qualification** (`autoRunOnNewRow: true`)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Company Status | `custom_ai_agent` | always | Validate website is live, get basic info |
| 2 | Company HQ Region | `custom_ai_agent` | always | Classify HQ region |
| 3 | Research Business Model | `custom_ai_agent` | always | Classify: SaaS/Platform/Service/Agency |
| 4 | Research Company Type | `custom_ai_agent` | always | Classify company type |
| 5 | Competitor Research | `custom_ai_agent` | always | Check for competitor usage |
| 6 | Technology stack detection | current technology-stack action from `list_actions` | always | Detect technology stack |
| 7 | CRM Detection | `custom_ai_agent` | technology stack result `isFound` | Extract CRM from tech stack: HubSpot/Salesforce/Unknown |
| 8 | SaaS/Platform | `send_to_table` | business model = "SaaS" or "Platform" | Route to FIT SaaS |
| 9 | Service | `send_to_table` | business model = "Service" | Route to FIT Service |
| 10 | RevOps Agency | `send_to_table` | company type = "Agency" | Route to Partners |

**Table 3: Companies Master List** (many fields)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | ❌ Exclusion | `lookup_multiple_records` | always | Check against HubSpot exclusion list |
| 2 | Lookup Object | `hubspot_lookup_object` | always | Get CRM lifecycle stage, campaign status |
| 3 | Company Intelligence | `custom_ai_agent` (web search) | always | Extract: company overview, target market, personas, prospecting signals |
| 4 | Go-To-Market Motion | `custom_ai_agent` (web search) | always | Classify: PLG/SLG/Hybrid |
| 5 | Funding Stage | `custom_ai_agent` (web search) | always | Stage/Amount/Date |
| 6 | Hiring Signals | `custom_ai_agent` (web search) | always | Find careers page URL |
| 7 | Extract GTM Roles | `custom_ai_agent` (web search) | careers URL != "Not Found" | List open GTM roles + job URLs |
| 8 | Competitor Check: Open Jobs | `custom_ai_agent` (web search) | Hiring GTM = true | Check job descriptions for competitor mentions |
| 9 | Competitor Check: Leads | `custom_ai_agent` | lookup result `notNull` | Scan employee profiles for competitor signals |
| 10 | Competitor Usage Status | formula | — | Merge both competitor signals |
| 11 | Domain Traffic | `baseloop_send_http_request` | always | Traffic estimation API |
| 12 | Traffic Level | formula | — | ≥50K = "Qualified for Inbound" |
| 13 | Merged Company HS ID | formula | — | Pick lookup ID or created ID |
| 14 | Update/Create Object | `hubspot_update/create_object` | gated | CRM sync |

### Key Decisions
- **Website validation before everything**: Shortened URLs (bit.ly, linktr.ee) and missing websites break all downstream enrichment. Fix once at the dedup stage.
- **Technology-stack evidence for CRM detection**: Technology-stack detection is more reliable than AI guessing from the website. The AI agent classifies the detected stack output.
- **Triple-signal competitor detection**: Employee profiles + job postings + formula merge. Two independent AI research paths catch different signals (existing usage vs planned adoption via hiring).
- **Traffic as channel routing signal**: Domain traffic determines whether leads go to Outbound (low traffic) or Inbound/PLG (high traffic). Free formula check gates an entire channel.
- **Intelligence done once at company level**: Company Intelligence, GTM Motion, Funding, Hiring — all done on the Companies Master List. Downstream contact tables pull all these fields via `lookup_single_record`. Never duplicate company research per contact.
- **Segment split creates parallel workspaces**: SaaS and Service companies get identical workflow structures but separate workspaces. Each workspace has: Companies Master List → People Master List → Outbound/CRM Enrichment/Inbound/SL Leads.
- **Partner identification as routing outcome**: Qualification doesn't just split SaaS/Service — it also routes consultants and agencies to a separate Partners workspace.

---

## Pattern 14: Job Change Detection Workflow

**Goal:** Import contacts from a HubSpot list, check if they still work at the same company, and route them based on employment status: still employed (update CRM), changed jobs (enrich new company, create in CRM), or unemployed.

### Architecture

```
HubSpot Contact Import
  → Enrich Contact (get current employer from LinkedIn)
  → Formula: Employment Status (Active if employers not empty)
  → AI: Still at current company? (match employer to HubSpot company)
  → If NO: AI extracts new company URL + job title
    → Enrich New Company
    → HubSpot Lookup + Create Company
    → Update Contact in HubSpot
  → Route to 3 destinations:
    ├→ Still at company (+ updated this month)
    ├→ New company started
    └→ Unemployed
```

**Check Job Changes Table** (many fields)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | HubSpot Contacts | `hubspot_contacts_list_import` | — | Import contacts with company name, email, LinkedIn URL |
| 2 | Enriched Status > 1mo | formula | — | Check if last enriched date is current month |
| 3 | Enrich Contact | `enrich_contact` | always | Get current employers from LinkedIn |
| 4 | Employment Status | formula | — | "Active" if current employers not empty, else "Disqualified" |
| 5 | Still at current company? | `custom_ai_agent` | Employment Status = "Active" | Match current employer to HubSpot company name |
| 6 | New Company Started | `custom_ai_agent` | match result = "No" | Extract new company LinkedIn URL + job title |
| 7 | Enrich Company | `enrich_company` | new company URL `notNull` | Get new company details |
| 7a | Resolve Company Domain | `custom_ai_agent` | email `notNull` AND companyWebsite is `null` | AI web search to find company domain when enrichment didn't return it. Skip if companyWebsite already populated. |
| 8 | Lookup Object | `hubspot_lookup_object` | company domain `notNull` (from enrichment or AI) | Look up company by domain in CRM |
| 9 | Create Company | `hubspot_create_object` | lookup `isNotFound` | Create new company with name, domain, industry |
| 9a | Company HubSpot ID | formula or extraction | — | Consolidate company ID from Lookup (if found) or Create (if new) |
| 10 | Update Contact | `hubspot_update_object` | company ID `notNull` | Update contact with `associateWithObject: true`, `associatedObjectType: "companies"`, `associatedObjectHubspotId` from consolidated company ID |
| 11 | NEW Email | `waterfall_email_enrichment` | new company `notNull` | Get new email at new company |
| 12 | Still working | `send_to_table` | match = "Yes" | Route to "still employed" table |
| 13 | Updated this month | `send_to_table` | match = "No" | Route to "changed jobs" table |
| 14 | Unemployed | `send_to_table` | Employment Status = "Disqualified" | Route to "unemployed" table |

### Key Decisions
- **AI for company name matching**: Company names differ between HubSpot and LinkedIn (abbreviations, legal suffixes). An AI agent fuzzy-matches instead of exact string comparison. Use a formula to normalize before comparing: lowercase, remove dots, strip common legal suffixes (Inc, LLC, Ltd, GmbH, Corp, etc.), and trim whitespace. Watch for false positives with domain-style names and names containing taglines or symbols.
- **Conditional AI extraction**: Only extract new company details if the person changed jobs (match = "No"). Don't waste credits on people still at the same company.
- **Three routing destinations**: Each employment status gets its own destination table for different follow-up workflows (re-engage, new company pitch, pause).
- **Email re-enrichment at new company**: If someone changed jobs, their old email is likely invalid. Run waterfall email enrichment to get their new work email.
- **Company object creation is mandatory**: Never update a contact's company as flat text. The workflow must create the Company object in HubSpot and associate the contact with it. This preserves HubSpot's relationship graph, reporting, deal pipelines, and ABM features.
- **Domain resolution fallback**: `enrich_contact` may return null for `companyWebsite`. When this happens, an AI agent with web search resolves the domain before the HubSpot company lookup. Gate this step so it only runs when needed.
- **Consolidated company ID**: The contact update needs a single company HubSpot ID regardless of whether the company was found via lookup or newly created. A formula or extraction field merges both sources.

---

## Pattern 15: AI-Powered Outreach Content Generation

> **Advanced pattern.** Most Baseloop users focus on enrichment → qualification → routing, with email copy written in the outreach platform. This pattern goes further — using Baseloop's AI agents to **generate the outreach content itself**. Consider this when you need hyper-personalized email sequences that vary per prospect based on company intelligence, CRM detection, or language. If the outreach platform's built-in personalization (merge fields, conditional blocks) is sufficient, stick with the standard routing patterns (Patterns 1-14).

**Goal:** Use Baseloop as the **content generation engine** for outreach campaigns. AI agents write personalized multi-email sequences using company intelligence, CRM detection, and language classification. Formulas assemble final emails with conditional value propositions. The composed content is enrolled directly into an outreach platform.

### Architecture

```
Companies Master List (intelligence, CRM detection, competitor status)
  → Send to Table → People/Contacts table
    → lookup_single_record (pull company context fields)
    → Language Classification AI
    → lookup_multiple_records (SDR/BDR team match)
    → Email #1 AI (few-shot examples, conditional logic)
    → Email #2 AI
    → Email #3 AI
    → Email #4 AI
    → Email #5 AI
    → Full Email #1 formula (conditional CRM text + greeting)
    → Full Email #2-5 formulas
    → Domain Match formula (3-way: Match / No Match / Bad Email)
    → Merged Email formula (CRM email vs enriched email)
    → Outreach enrollment
```

**Contacts/Outbound Table** (many fields)
| # | Field | Action | autoRunCondition | Purpose |
|---|---|---|---|---|
| 1 | Lookup Company | `lookup_single_record` | always | Pull: company intelligence, personas, GTM motion, CRM detection, competitor status, HubSpot ID, funding stage |
| 2 | Language | `custom_ai_agent` | always | Classify language from LinkedIn languages + location fallback |
| 3 | SDR/BDR Lookup | `lookup_multiple_records` | always | Check if a rep already covers this company |
| 4 | Email #1 | `custom_ai_agent` | lookup `notNull` | Generate personalized cold email using intelligence + persona context |
| 5 | Email #2 | `custom_ai_agent` | Email #1 `notNull` | Follow-up email (different angle) |
| 6 | Email #3 | `custom_ai_agent` | Email #2 `notNull` | Third touch |
| 7 | Email #4 | `custom_ai_agent` | Email #3 `notNull` | Fourth touch |
| 8 | Email #5 | `custom_ai_agent` | Email #4 `notNull` | Final touch (breakup email) |
| 9 | Full Email #1 | formula | — | Assemble: opener + conditional CRM line + body + greeting |
| 10 | Full Email #2-5 | formula (4x) | — | Same assembly pattern for each email |
| 11 | Domain Match | formula | — | Three-way check: Match / No Match / Bad Email |
| 12 | Merged Email | formula | — | Pick CRM email (if match) else enriched email |
| 13 | Enroll in Campaign | outreach action or `baseloop_send_http_request` | Full Email #1 `notNull` | Send composed emails to outreach platform |

### Email AI Agent Configuration

Each email AI field uses a detailed system prompt with:
- **Name cleaning**: Strip emojis, titles (Prof., Dr.), prefixes. Use first name only.
- **Opener construction**: Reference the prospect's role + company intelligence. Never generic.
- **Conditional SDR line**: If SDR/BDR lookup found a rep, include "{{rep_name}} on my team already works with companies like yours." If not, omit entirely.
- **Locale-specific greetings**: French → "Cordialement", Italian → "Cordiali saluti", English → "Best".
- **3+ complete few-shot examples**: Full input → full output. This is the single most important element for consistent format.
- **Model selection**: use a stronger writing model for nuanced first-touch copy and a faster model for simpler follow-ups.

### Formula-Assembled Final Email

The AI generates the personalized parts, but a formula controls the value proposition:

```
// Pseudo-logic for Full Email #1 assembly:
opener_from_ai
+ "\n\n"
+ (using_crm === "HubSpot" ? "connect HubSpot" : "connect your CRM")
+ " to " + value_proposition_from_ai
+ "\n\n" + closing_question_from_ai
+ "\n\n" + locale_greeting
```

This gives you **precision control over the value prop** (deterministic, testable) while AI handles **personalization** (opener, question, tone). If the CRM detection changes, only the formula needs updating — no AI re-runs.

### Key Decisions
- **Company intelligence is the fuel**: The quality of AI-generated emails depends entirely on the intelligence gathered at the company level (ICP research, GTM motion, competitor status, funding). Do this once on the Companies Master List and propagate via lookup.
- **One AI field per email**: Don't try to generate all 5 emails in one AI call. Separate fields let you re-run individual emails, use different models per email, and gate each on the previous (sequential dependency).
- **Formulas for conditional text, AI for personalization**: Never ask the AI to handle conditional value propositions — it's non-deterministic. Use formulas for the parts that must be precise (CRM mention, pricing tier), AI for the parts that should vary (opener, question, angle).
- **Language classification drives everything**: Language determines greeting, tone, and which campaign to enroll in. Classify once, use everywhere.
- **SDR/BDR team awareness**: Cross-table lookup against a team table personalizes emails with rep names. This small touch dramatically increases reply rates.
- **Domain match before sending**: The three-way domain check (Match/No Match/Bad Email) ensures you're sending to the right email. Bad emails get filtered out before outreach enrollment.

---

## Cross-Cutting Strategies (continued)

### Domain Match with Bounce Detection
Use a formula that performs three checks in one:
1. Extract domain from CRM email
2. Compare to company website domain (accept regional variants like `.fr` vs `.com`)
3. Check outbound sentiment for "Bounced" → output "Bad Email"

Three-way result (Match / No Match / Bad Email) gates which email to use. Pair with a "Merged Email" formula that picks the CRM email if domain matches, otherwise falls back to the enriched email.

### Dialer → Outreach Platform Feedback Loop
When a dialer platform pushes call outcomes via webhook:
1. Formula classifies disposition as Interested / Not Interested
2. Two `baseloop_send_http_request` fields POST to the outreach platform API — one for interested, one for not interested — each gated on the formula result
3. This closes the loop: cold call outcomes automatically update the email sequence platform

### Real Reply Detection for Untracked Replies
Outreach platforms may forward "untracked replies" — emails that arrived but weren't matched to a tracked thread. Before running reply classification, add a dedicated AI agent that runs only on `UNTRACKED_REPLIES` event type. It distinguishes:
- **Pass**: Human-authored content (OOO messages, actual replies, "no longer at company")
- **Junk**: System-generated noise (DMARC reports, Jira auto-responses, mailing list digests, bounce notifications)

Gate the full reply classification workflow on this agent returning "Pass".

### Outreach Platform Category Update via API
After classifying a reply, POST back to the outreach platform API to update the lead's category and optionally pause the sequence. Use a formula to map human-readable category names to numeric IDs that the API expects. This keeps the outreach platform in sync with Baseloop's AI classification.
