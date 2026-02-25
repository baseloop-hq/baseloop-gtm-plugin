# Action Catalog

Actions organized by workflow stage. Use `get_action_schema` to get full configuration details (the `aiDescription`) before configuring any action.

## Source Actions

Import data into Baseloop tables. These are SOURCE-type columns created via `create_table` with `sourceField`.

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `importSalesNavContacts` | LinkedIn | Import contacts from Sales Navigator search | Free |
| `importSalesNavCompanies` | LinkedIn | Import companies from Sales Navigator search | Free |
| `hubspot_import_contacts_from_list` | HubSpot | Import contacts from a HubSpot static list | Free |
| `hubspot_import_companies_from_list` | HubSpot | Import companies from a HubSpot static list | Free |

**Remember:** Source actions require the two-step process — create table with sourceField, create placeholder row, then run_field.

## Enrichment Actions

Add data to existing rows. These are action columns added with `create_column`.

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `enrich_company` | Baseloop | Company data from LinkedIn (domain, industry, size, description, HQ) | 1 credit |
| `enrich_contact` | Baseloop | Contact data from LinkedIn (email, phone, title, company, skills) | 1 credit |
| `li_find_people_at_company` | Baseloop | Find people at a company on LinkedIn (returns array) | 2 credits/contact |
| `waterfall_email_enrichment` | Baseloop | Email enrichment via multiple providers | Per email found |
| `waterfall_phone_enrichment` | Baseloop | Phone enrichment via multiple providers | Per number found |
| `builtwith_find_technology_stack` | BuiltWith | Technology stack analysis for a domain | Credits |

### Find People at Company
Returns an array of contacts. To create individual contact rows, pair with **Send to Table** in `send_for_each_item` mode using `sourceArrayPath: "fullValue"` (the root value is the array).

**People-finding strategy:** Choose based on your target audience:
- **LinkedIn-heavy audience** (tech, enterprise SaaS, B2B professionals): Use `li_find_people_at_company` alone.
- **Non-LinkedIn audience** (small businesses, non-tech industries, local services, regions with low LinkedIn adoption): Use `custom_ai_agent` with web search + JSON Schema output instead. See "AI People Finder" pattern under Custom AI Agent.
- **Mixed audience**: Use both — `li_find_people_at_company` first, then `custom_ai_agent` gated on `isNotFound` as fallback. Both feed the same destination table via Send to Table `send_for_each_item`.

## Qualification / AI Actions

Classify, score, research, or extract structured data.

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `custom_ai_agent` | Baseloop | LLM-powered classification, scoring, extraction, research | Credits (varies by model) |
| `perplexity_ask_question` | Perplexity | Web research with real-time citations | Free (own API key) |

### Custom AI Agent
The workhorse for any AI task. Supports:
- **Text output**: classification (B2B/B2C), scoring, summaries
- **Boolean output**: yes/no qualification
- **JSON Schema output**: structured extraction (e.g., list of founders with name, title, email)
- **Web search**: enable `useWebSearch` for real-time research
- **Multiple models**: OpenAI GPT-4o, Anthropic Claude, Google Gemini

When the output is an array (JSON Schema with array property), pair with Send to Table `send_for_each_item` using the array property name as `sourceArrayPath`.

**Common AI Agent patterns:**
- **Company Intelligence (web search)**: Visit company website + research to extract structured ICP intelligence: Core Intelligence (problem/solution/customers), Target Companies, Target Personas, Prospecting Signals. Use `outputFormat: "fields"` with 4 text fields. Include few-shot examples for consistent format. This is the most valuable company-level enrichment — do it once on the Companies table and propagate via lookup.
- **GTM Motion Classification (web search)**: Follow a decision tree: visit homepage → find primary CTA → test self-serve signup → check pricing page. Classify as PLG/SLG/Hybrid/Unknown. Include explicit false-positive rules in the prompt (e.g., "Sign in button does NOT mean PLG", "Book a FREE demo does NOT mean PLG").
- **Funding Stage Research (web search)**: Search for Crunchbase/PitchBook mentions and press releases. Extract Stage (Bootstrapped/Seed/Series A/Series B+), Amount, and Date as structured fields.
- **Company Name Matching**: Compare company names from two sources (e.g., CRM vs LinkedIn). AI fuzzy-matches to handle abbreviations, legal suffixes, and typos. Output Yes/No. Cheaper than exact string matching which fails on name variations.
- **Competitor Detection from Employee Profiles**: Feed employee LinkedIn profiles (from cross-table lookup) into an AI agent that scans summaries, skills, and role descriptions for competitor tool mentions. List specific competitors to look for.
- **Competitor Detection from Job Postings (web search)**: Given careers page URLs, visit each job listing and search for competitor mentions in requirements, tech stack, and nice-to-haves. Gate on Hiring GTM = true.
- **Website Finder/Validator (web search)**: Resolve shortened URLs (bit.ly, linktr.ee, hubs.ly), find missing websites, validate the result matches the company. Include explicit rules: never return social media URLs, app store links, or directory listings.
- **Cold Email Generation**: Use Claude or GPT-4o with a detailed system prompt including: name cleaning rules, opener construction, conditional line logic, locale-specific greetings. Include 3+ complete few-shot examples for format consistency. Feed company intelligence (from lookup) into the prompt for relevant personalization.
- **Reply Classification**: Classify prospect replies into categories (Interested, Meeting Request, OOO, Not Interested, Competitor, Do Not Contact, etc.) with Sentiment (Positive/Neutral/Not-Positive) and Reason. Use `outputFormat: "fields"` with select-type fields for consistent categorization.
- **Real Reply Detection**: For untracked replies, distinguish human-authored content (OOO, actual replies) from system-generated junk (DMARC reports, Jira auto-responses, bounce notifications). Output Pass/Junk. Gate full reply classification on this returning Pass.
- **Language Classification**: Classify leads by language based on LinkedIn languages (primary source) and location (fallback). Include detailed regional mapping (e.g., Belgian Flemish vs Walloon regions). Output a single language code for campaign routing.
- **CRM Detection from BuiltWith**: After `builtwith_find_technology_stack` returns a tech stack, use a simple AI agent to classify: HubSpot/Salesforce/Unknown. Gate on BuiltWith `isFound`.
- **AI People Finder (web search)**: Use `custom_ai_agent` with `enableWebSearch: true` + `outputFormat: "jsonSchema"` to find people at companies via web search (company websites, team pages, Crunchbase, press releases). Use an array property (e.g., `"contacts"`) containing `full_name`, `first_name`, `last_name`, `title`, `email`, `linkedin_url`. Pair with Send to Table `send_for_each_item` using the array property name as `sourceArrayPath`. Can be used in three ways:
  - **Standalone** — the only people-finding method. Best when the target audience has poor LinkedIn coverage (small businesses, non-tech industries, specific regions, local services).
  - **Fallback to LinkedIn** — gated on `li_find_people_at_company` being `isNotFound`. LinkedIn-first with AI web search as safety net. Best for mixed audiences.
  - **Never** — use `li_find_people_at_company` alone. Best when the target is LinkedIn-heavy (tech, enterprise SaaS, B2B professionals).

### Perplexity
Best for factual web research where citations matter. Use `custom_ai_agent` with web search for tasks that need more control over output format.

**OOO mining pattern**: Use Perplexity to parse Out-of-Office auto-replies and extract backup contact email addresses. System prompt: "You are a data extraction tool. You parse OOO email replies and extract the alternative contact's email address. Output ONLY a valid email address, or NONE." Gate on the outreach platform's OOO reply category. Converts dead-end replies into new lead opportunities.

## Routing Actions

Move data between tables or to external systems.

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `sendToTable` | Baseloop | Route rows between tables with upsert semantics | Free |
| `sendHttpRequest` | Baseloop | Send data to external webhooks/APIs | Free |

### Send to Table — Key Configuration

**Two modes:**
- `send_row` — each source row becomes one destination row. Field mapping values are plain column field names.
- `send_for_each_item` — expand an array column into multiple destination rows. Requires `sourceConfig` with `sourceColumnField` and `sourceArrayPath`.

**Critical rules:**
- Destination table must be empty (no pre-created columns)
- Field mapping values use plain column `name` fields (from get_table_schema), NOT `{{field_name}}`
- In `send_for_each_item`, use `column:field_name` to include parent row data
- Deduplication is automatic via origin metadata

### Send HTTP Request
Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE) with dynamic URL, body, headers, and query params. Values can reference columns via `{{field_name}}`. Supports rate limiting and timeouts.

**Power user pattern — custom API enrichment**: Many teams use `sendHttpRequest` to hit third-party APIs (e.g., RapidAPI LinkedIn endpoints) for enrichment not covered by built-in actions. The response is stored as JSON, then AI agents or data extraction columns pull specific fields out. This is the basis of the "standard enrichment stack" pattern:
1. Formula: extract LinkedIn slug from URL
2. HTTP Request: call RapidAPI with slug → get staff count, HQ, offices, description
3. HTTP Request: call employee distribution API
4. AI agents: extract structured data from JSON responses

**Advanced pattern — dynamic campaign routing via HTTP**: For standard outreach enrollment, use the built-in outreach actions (see [Outreach Actions](#outreach-actions) below). However, when you need **dynamic campaign routing computed by formulas** (e.g., Language × Job Title Cluster → campaign ID in a single HTTP request), use `sendHttpRequest` to POST leads directly to the outreach platform API with a formula-computed campaign ID in the URL path. URL: `https://api.outreach-platform.com/campaigns/{{campaign_id_formula}}/leads`. Body: `{"lead_list": [{"first_name": "{{firstname}}", "email": "{{email}}"}]}`. This replaces N separate enrollment columns with 3 formulas + 1 HTTP request.

**Power user pattern — Slack Block Kit notifications**: Use `sendHttpRequest` to POST to Slack webhook URLs with rich Block Kit JSON formatting. Include section blocks with fields (name, email, LinkedIn, company, campaign, HubSpot URL) and a reply text section. Set `Content-Type: application/json` header. Gate with autoRunCondition to filter which events trigger notifications (e.g., exclude bounces and OOO from outreach reply alerts).

## Cross-Table Lookup Actions

Look up data across Baseloop tables.

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `lookup_single_record` | Baseloop | Find one row in another table by matching column values | Free |
| `lookup_multiple_records` | Baseloop | Find multiple rows in another table | Free |

### Lookup Single Record — Key Patterns

**Lookup back to parent**: When contacts are created via Send to Table from a companies table, use `lookup_single_record` on the contacts table to pull company-level data back (AE assignment, HubSpot ID, qualification status, trigger event summaries). This is essential for CRM sync — you need the company HubSpot ID to create associated contacts.

**Blocklist check**: Use `lookup_single_record` against a "Master CRM Blocklist" table (closed-won + churned accounts) as the first gate before enrichment. Gate downstream columns on blocklist lookup being `isNotFound`.

**Reverse lookup (ad attribution check)**: Given a list of target accounts, use `lookup_single_record` against a high-volume engagement table (e.g., ad analytics data) to check: "is this account already engaging with our ads?" The lookup result acts as an intent signal.

### Lookup Multiple Records — Key Patterns

**Bidirectional network analysis**: Use `lookup_multiple_records` in both directions between a Companies table and a People table. Companies → find contacts who work there, People → find which target companies they connect to. This identifies warm introduction paths.

**Dedup counting**: Use `lookup_multiple_records` against another table and extract the `Count` field to check how many matching records exist. Useful for: "how many contacts do we already have at this company?"

## CRM Sync Actions

Create, update, and lookup records in CRMs. Always follow the **lookup before create** pattern.

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `hubspot_lookup_object` | HubSpot | Search for company/contact/deal/lead by filter | Free |
| `hubspot_create_object` | HubSpot | Create company or contact with field mapping | Free |
| `hubspot_update_object` | HubSpot | Update existing company or contact | Free |
| `hubspot_create_engagement` | HubSpot | Create note, call, meeting, task, or email on a record | Free |
| `hubspot_get_engagements` | HubSpot | Retrieve engagements for a contact | Free |

### HubSpot Lookup → Extract → Update/Create Pattern
1. Add `hubspot_lookup_object` column — search by email or domain (include `hs_object_id` in propertiesConfig)
2. Add a **data extraction column** for `hs_object_id`: `extractionPath: "results[0].properties.hs_object_id"` from the Lookup column. Add extraction columns for any other properties you need downstream.
3. Add `hubspot_update_object` column — gate on lookup `isFound`, use **extraction column** in `recordId` (NOT the lookup column directly)
4. Add `hubspot_create_object` column — gate on lookup `isNotFound`
5. Pass the company HubSpot ID (from extraction column or previous create) so contacts get associated

### HubSpot Engagement Notes as Audit Trail
Create separate `hubspot_create_engagement` columns for each workflow outcome:
- **ICP Qualified** — full summary with enrichment data
- **FTE Disqualified** — note with staff count
- **Country Count Disqualified** — note with country distribution
- **LinkedIn Not Found** — note explaining auto-qualification wasn't possible

Gate each on its specific condition. This creates a full CRM audit trail explaining every routing decision.

### HubSpot Property Resolution
Use `resolve_action_options` to get valid HubSpot property names. Don't guess property internal names — they differ from display names (e.g., `hs_lead_status` not `Lead Status`).

## Outreach Actions

Add leads to email/LinkedIn outreach sequences.

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `reply_create_contact` | Reply.io | Add contact to Reply sequence | Free |
| `lemlist_add_to_campaign` | Lemlist | Add prospect to Lemlist campaign | Free |
| `instantly_add_to_campaign` | Instantly | Add prospect to Instantly campaign | Free |
| `smartlead_add_to_campaign` | Smartlead | Add prospect to Smartlead campaign | Free |
| `heyreach_add_to_campaign` | HeyReach | Add prospect to HeyReach campaign | Free |

All outreach actions require an email address. Use `resolve_action_options` to get available campaign IDs.

## Notification Actions

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `slack_send_message_to_channel` | Slack | Send message to a Slack channel | Free |

### Slack Notifications
Use with autoRunCondition to send alerts when specific conditions are met (e.g., high-score lead detected, enrichment failed). Supports title, message text, and attachments.

## Other Actions

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `vidu_generate_personalized_video` | Vidu | Create personalized videos at scale | Credits |
| `lagrowthmachine_create_or_update_lead` | LaGrowthMachine | Create/update lead in LGM | Free |

## Webhook Ingestion

Not an action column, but a column type. Webhook columns receive data POSTed from external systems. The webhook URL is generated when the column is created.

**Key patterns:**
- **Ad platform engagement**: Ad analytics platforms push LinkedIn ad engagement data (company name, LinkedIn URL, engagement level). High volume in production.
- **Phone enrichment providers**: Push new phone numbers with contact record IDs. Pair with `hubspot_update_object` to sync to CRM automatically.
- **Call/dialer platforms**: Dialer platforms push call data (outcome, disposition, transcript, email, phone number, direction). Use a formula to classify disposition as Interested/Not Interested, then two `sendHttpRequest` columns POST to the outreach platform API (e.g., Lemlist `/leads/interested/` and `/leads/not_interested/` endpoints) to feed call outcomes back. Gate each HTTP request on the formula result. This closes the cold call → email outreach feedback loop.
- **Follower/intent events**: Follower tracking tools push company follower events. Triggers enrichment workflow via `autoRunOnNewRow: true`.
- **LinkedIn connection exports**: Bulk import of LinkedIn connections for network analysis.
- **Outreach platform events**: Email outreach platforms push all email events (sent, reply, bounce, OOO) with 16+ fields (event_type, reply_category, campaign_name, lead_email, reply text, timestamps). High volume in production. Branch processing by event_type and reply_category via autoRunConditions.

Always pair webhook columns with `autoRunOnNewRow: true` on the table so processing starts automatically when data arrives.

**Testing webhooks:** Use `send_webhook_data` to send sample JSON data to a webhook column for testing. Pass the webhook column's fieldId and a JSON payload. This lets you verify the webhook-sourced table processes data correctly before pointing external systems at it.

## Email Verification via HTTP Request

Not a built-in action, but a common `sendHttpRequest` pattern. Call email verification APIs (MillionVerifier, ZeroBounce, etc.) to check email quality before routing to outreach.

**Response fields to extract:**
- `mv_freemail` — is it a freemail address (gmail, yahoo)?
- `mv_quality` — good, bad, unknown
- `mv_result` — deliverable, undeliverable, risky
- `mv_subresult` — specific sub-status

**Gate outreach routing** on quality being acceptable. Write a "NOTE: Bad Email" HubSpot engagement note for failed verifications.

## Technology Stack Detection

| Action Key | Provider | Purpose | Cost |
|---|---|---|---|
| `builtwith_find_technology_stack` | BuiltWith | Detect technology stack for a domain (CRM, analytics, frameworks) | Credits |

### BuiltWith → CRM Detection Chain
Use `builtwith_find_technology_stack` to detect what CRM a company uses, then chain a `custom_ai_agent` to classify the result into HubSpot/Salesforce/Unknown. Gate the AI on BuiltWith returning data (`isFound`). This pattern:
- Determines prospect relevance (e.g., only target HubSpot users)
- Drives conditional email personalization ("connect HubSpot" vs "connect your CRM")
- Is more reliable than AI guessing from the website — BuiltWith detection is deterministic

## Formulas

Not an action, but a column type. Formulas are **free** and evaluate JavaScript expressions across row data. Use `preview_formula` to iterate on the formula before creating the column. Common uses:
- Concatenate fields (`firstName + " " + lastName`)
- Conditional logic (`industry === "SaaS" ? "Yes" : "No"`)
- Extract domains from URLs
- Format dates
- Calculate scores from multiple fields
- **Job change detection**: Extract latest company name from LinkedIn positions data, compare against CRM company name. Return true/false/unsure.
- **Company Change Alert**: Generate HTML alert when company name mismatch detected (old vs new)
- **Contacted Within 30 Days**: Check `hs_last_contacted_date` to gate re-enrichment
- **Content attribution tags**: Literal formulas returning "Report" or "Industry Report Q1 2026" for campaign tracking
- **Record ID extraction**: Parse HubSpot Record IDs from external system URLs (e.g., dialer platform link URLs)
- **Domain match with regional variants**: Compare email domain against company domain, accepting `.fr` vs `.com` as matches
- **Merge fields**: Combine HubSpot phone with enrichment phone, prioritizing whichever exists
- **Country counting with EU-27 as 1**: Count unique countries in an employee distribution, treating all EU countries as a single region
- **Language inference from email domain**: Return "IT" if email domain ends with `.it`, "EN" otherwise. Simple heuristic for multi-language campaign routing.
- **Job title clustering**: Classify job titles into named clusters by keyword matching (e.g., "Compliance & AML", "Risk & Audit", "Executive/General Management", "Legal, Security & Innovation"). Each cluster maps to different outreach messaging.
- **Multi-dimensional category mapping**: Combine two formula outputs (language × job title cluster) into a single lookup key that returns an external system ID (e.g., outreach campaign ID). Encodes the full routing matrix in one formula.
- **Locale-specific entity detection**: Check if a text field contains locale-specific terms (e.g., Italian legal terms: "Studio", "Legale", "Avvocati", "S.r.l.", "S.p.A."). Returns YES/NO for filtering.
- **Domain match with bounce detection**: Extract domain from CRM email, compare to company website domain (accept regional variants like `.fr` vs `.com`), and also check outbound sentiment for "Bounced" → output "Bad Email". Three-way result (Match / No Match / Bad Email) in one formula.
- **Merged email selection**: Pick CRM email if domain matches, otherwise use enriched email. Ensures best available email for outreach.
- **Traffic threshold for channel routing**: Return "Qualified for Inbound" if monthly traffic ≥ 50K, else "Disqualified for Inbound". Free formula gates entire channel routing decisions.
- **Employment status check**: Return "Active" if current employers field is not empty, "Disqualified" otherwise. Gates the job change detection chain.
- **Lifecycle stage label mapping**: Convert CRM lifecycle stage codes to readable labels (Lead, MQL, User, Customer, PQL). Useful for display and gating.
- **Outreach attribution tracking**: Return "Outbound Email" if campaign enrollment = "Added", empty otherwise. Used for CRM attribution.
- **Website URL merge with link shortener detection**: Prioritize AI-found website when original contains bit.ly or linktr domains. Ensures clean domains downstream.
- **Competitor signal merge**: Check if either employee-profile or job-posting competitor fields contain known competitor keywords. Combines two independent detection signals into one status.

## Data Extraction Columns

Not an action, but a column type. **Required whenever you need to reference a specific field from an action column's structured result.**

`{{column_name}}` resolves to the column's display output (e.g., `"Found"`, `"Sent"`), NOT the raw data in `fullValue`. To access specific fields from any action's result, create a data extraction column with `create_column` using `extractorFieldId` + `extractionPath` (JMESPath).

**When to create extraction columns:**
- HubSpot Lookup → need `hs_object_id` for Update/Create association → `results[0].properties.hs_object_id`
- HubSpot Lookup → need any property for downstream actions → `results[0].properties.<property_name>`
- sendHttpRequest → need specific response fields → path depends on API response shape
- enrichment actions → need specific enrichment fields → `email`, `phone`, `linkedin_url`, etc.
- lookup_single_record → need specific column values from the looked-up row → `<field_name>`
- Custom AI Agent (JSON Schema) → need individual fields from structured output → `<property_name>`

**Common mistake:** Using `{{hubspot_lookup_column}}` directly in a HubSpot Update `recordId` or an HTTP Request body. This resolves to `"Found"` (the display value), not the actual data. Always extract first.
