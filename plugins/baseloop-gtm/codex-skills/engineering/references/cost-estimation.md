# Cost Estimation

Estimate credit exposure before running workflows at scale. Runtime action metadata is the starting point; rung testing is the confirmation step.

## Runtime Cost Source

Use `list_actions` before estimating costs. Read each selected action's `creditCostHint`:

- `free`: expected to consume no Baseloop credits.
- `paid`: expected to consume credits per row, per result, or per run.
- `variable`: cost depends on provider behavior, model choice, search depth, output size, number of returned contacts, or similar runtime factors.

Treat `creditCostHint` as a planning hint, not a billable guarantee. If the action's `get_action_schema` guide describes cost behavior more specifically, include that in the estimate. If metadata is missing or unclear, call it out as unknown and test on a small rung before scale.

## Estimation Protocol

1. Call `list_actions` and annotate each planned action with `creditCostHint`.
2. Gate paid or variable-credit actions behind free filters, lookups, blocklists, and required upstream values.
3. Call `get_action_schema` for every paid or variable-credit action and read its `aiDescription`.
4. Estimate Rung 1 from the planned single-row path.
5. Run Rung 1 and inspect actual outputs, fan-out counts, skipped rows, and any provider-specific behavior.
6. Run Rung 2 on 10 rows and calculate observed credits per successful row when usage data is available.
7. Estimate Rung 3 from observed pass rates and fan-out counts, not only from the original row count.
8. Report the Rung 3 estimate to the user and wait for explicit approval before full-scale execution.

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

## Cost Optimization Tips

1. Filter cheap before expensive: formulas, lookups, and blocklists should run before paid or variable-credit actions.
2. Prefer connected native actions when they solve the job cleanly, but prefer `creditCostHint: "free"` alternatives when behavior is equivalent.
3. Avoid redundant web search. Enable it only when the task requires current web evidence.
4. Do company-level intelligence once, then propagate it to contact tables with `lookup_single_record`.
5. Never re-run upstream AI fields just to fix downstream configuration. Re-run only the field whose configuration changed.
6. Use `skipCellsWithData: true` when preserving existing good outputs, and explicitly set `skipCellsWithData: false` only when replacing known bad data.
