# Cost Estimation

Estimate credit costs before running workflows at scale.

## Per-Row Cost by Action

### Free Actions (No Credits)
| Action | Notes |
|--------|-------|
| Formulas | JavaScript expressions, unlimited |
| Send to Table | Data routing between tables |
| Lookup Single/Multiple Record | Cross-table lookups |
| HubSpot Lookup/Create/Update/Engagement | CRM operations (requires OAuth) |
| Outreach enrollment (Reply, Lemlist, Instantly, Smartlead, HeyReach) | Sequence enrollment |
| Slack notifications | Channel messages |
| Source imports (LinkedIn Sales Nav, HubSpot lists) | Data import |
| Send HTTP Request | External API calls |

### Paid Actions
| Action | Cost per Row | Notes |
|--------|-------------|-------|
| `enrich_company` | 1 credit | Company LinkedIn data |
| `enrich_contact` | 1 credit | Contact LinkedIn data |
| `li_find_people_at_company` | 2 credits/contact | Returns array; cost = contacts found × 2 |
| `waterfall_email_enrichment` | Per email found | Multi-provider cascade |
| `waterfall_phone_enrichment` | Per number found | Multi-provider cascade |
| `builtwith_find_technology_stack` | Credits | Technology detection |
| `custom_ai_agent` (no web search) | 0.2-1 credit | Varies by model and prompt length |
| `custom_ai_agent` (with web search) | 4-20 credits | Varies by search depth and model |
| `vidu_generate_personalized_video` | Credits | Video generation |

## Example Workflow Cost Calculations

### Company Enrichment + Qualification
```
1,000 companies
× enrich_company (1 credit)
× custom_ai_agent qualification (0.5 credit, no web search)
= ~1,500 credits total
```

### Full Pipeline: Companies → Contacts → CRM
```
1,000 companies
× enrich_company (1 credit) = 1,000
× custom_ai_agent ICP qualification (0.5 credit) = 500
× 500 qualified companies (50% pass rate)
  × li_find_people_at_company (avg 3 contacts × 2 credits) = 3,000
× 1,500 contacts
  × enrich_contact (1 credit) = 1,500
  × HubSpot sync (free) = 0
= ~6,000 credits total
```

### Company Intelligence with Web Search
```
500 companies
× custom_ai_agent + web search (8 credits avg)
= ~4,000 credits
```

## Scaling Ladder Cost

| Rung | Rows | Purpose | Typical Cost |
|------|------|---------|-------------|
| Rung 1 | 1 row | Validate config | 1× per-row cost |
| Rung 2 | 10 rows | Validate at scale | 10× per-row cost |
| Rung 3 | Full dataset | Production run | N× per-row cost |

**Always report the Rung 3 cost estimate to the user before running at full scale.**

## Cost Optimization Tips

1. **Filter cheap before expensive** — formulas and lookups are free; gate paid actions behind them
2. **Blocklist first** — `lookup_single_record` against existing CRM before enrichment
3. **Skip enriched rows** — `run_column` defaults to `skipCellsWithData: true`
4. **Choose the right AI model** — smaller models cost less for simple classification tasks
5. **Avoid redundant web search** — only enable when the task requires real-time data
