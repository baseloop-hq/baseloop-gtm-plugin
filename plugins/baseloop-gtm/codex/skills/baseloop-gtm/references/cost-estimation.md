# Cost Estimation

Estimate credit exposure before running workflows at scale, and explain the expected workflow quality or coverage benefits. Runtime action metadata is the starting point; rung testing is the confirmation step.

## Runtime Cost Source

Use `list_actions` before estimating costs. Read each selected action's `creditCostHint`:

- `free`: expected to consume no Baseloop credits.
- `paid`: expected to consume credits per row, per result, or per run.
- `variable`: cost depends on provider behavior, model choice, search depth, output size, number of returned contacts, or similar runtime factors.

Treat `creditCostHint` as a planning hint, not a billable guarantee. If the action's `get_action_schema` guide describes cost behavior more specifically, include that in the estimate. If metadata is missing or unclear, call it out as unknown and test on a small rung before scale.

## Estimation Protocol

1. Call `list_actions` and annotate each planned action with `creditCostHint`.
2. Gate credit-consuming actions behind free filters, lookups, blocklists, and required upstream values when the gate preserves the promised workflow quality.
3. Call `get_action_schema` for every credit-consuming action and read its `aiDescription`.
4. Estimate Rung 1 from the planned single-row path.
5. Run Rung 1 and inspect actual outputs, fan-out counts, skipped rows, and any provider-specific behavior.
6. Run Rung 2 on 10 rows and calculate observed credits per successful row when usage data is available.
7. Estimate Rung 3 from observed pass rates and fan-out counts, not only from the original row count.
8. Report the Rung 3 estimate, including expected quality or coverage gains from higher-confidence steps, and wait for explicit approval before full-scale execution.

## Cost Shapes

Most workflow costs fall into a few shapes:

- **Per input row:** one action run per source row.
- **Per returned result:** people-finding or enrichment fan-out where cost scales with contacts or records found.
- **Per model/search workload:** AI and research actions where prompt length, web search, model choice, and output size affect consumption.
- **External account cost:** actions that are free in Baseloop but may consume quota or budget in a connected provider.

Use the live action guide to identify which shape applies.

## Example Estimate Format

Use examples like this for user-facing plans:

```text
Rung 1 estimate: 1 company
- Source import: creditCostHint free
- Company enrichment: creditCostHint paid
- Qualification formula: free
- AI fallback: creditCostHint variable, gated on missing domain

Rung 2 estimate: 10 companies
- Expected paid runs: 10 enrichment runs
- Expected variable runs: only rows missing domain after enrichment

Rung 3 estimate: 1,000 companies
- Estimate from Rung 2 observed pass rate and fallback rate
- Requires approval before execution
```

Avoid static action credit lists in the plugin. If a user needs current costs, rely on backend metadata, action guides, and observed rung behavior.

## Outcome-Per-Credit Guidance

1. Optimize for workflow outcome per credit, not simply the lowest-cost path.
2. Filter cheap before expensive when the cheap filter is reliable: formulas, lookups, and blocklists should run before credit-consuming actions.
3. Prefer connected native actions when they solve the job cleanly. Use `creditCostHint` to explain cost/value tradeoffs, and avoid weakening the workflow just because a lower-credit alternative exists.
4. Keep enrichment, AI research, validation, fallback, or QA steps when they materially improve coverage, confidence, CRM integrity, deduplication, contact quality, deliverability, or downstream conversion.
5. Avoid redundant web search. Enable it when the task requires current web evidence, missing data recovery, or confidence that deterministic sources cannot provide.
6. Do company-level intelligence once, then propagate it to contact tables with `lookup_single_record`.
7. Never re-run upstream AI fields just to fix downstream configuration. Re-run only the field whose configuration changed.
8. Use `skipCellsWithData: true` when preserving existing good outputs, and explicitly set `skipCellsWithData: false` only when replacing known bad data.
