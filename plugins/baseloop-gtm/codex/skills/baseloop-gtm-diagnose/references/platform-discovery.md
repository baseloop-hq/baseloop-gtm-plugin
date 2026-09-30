<!-- SYNC SOURCE: docs/reference-sources/platform-discovery.md. Run `bun run references:sync` to refresh. Do not edit directly. -->

# Platform Discovery

Baseloop's backend is the source of truth for platform availability, action metadata, and action configuration. Plugin markdown teaches workflow patterns; it must not be treated as an action inventory or schema cache.

## Runtime Source of Truth

Before choosing or configuring provider-specific workflow steps:

1. Call `get_connected_platforms` to learn which providers are connected for the organization.
2. Call `list_actions` to load the current backend action list and metadata.
3. Filter candidate actions by `capabilities` when the workflow needs a semantic job such as CRM lookup, source import, outreach enrollment, AI web research, or notification send.
4. Prefer actions that can run now (`connectionMode` `none` or `optional`, or `required` with `connectionStatus: connected`) and whose metadata does not include `deprecationNotice`. A missing required connection does not remove the action from the plan: see `connectionStatus` below.
5. Prefer stable actions over `isBeta` actions unless the user explicitly asks for beta behavior or no stable equivalent exists.
6. Optimize for business outcome per credit, not for the lowest-cost path. Treat `creditCostHint` as context for the workflow tradeoff, not as an automatic tie-breaker. Do not replace enrichment, AI research, validation, QA, or fallback steps with cheaper alternatives when that would materially reduce workflow quality or user value.
7. When multiple actions still tie, break ties deterministically. For tied finalists, call `get_action_schema` as needed, then prefer the action whose `capabilities` most exactly match the needed capability, then the action whose schema can be satisfied from fields already present on the table, then actions with `hasDetailedGuide: true`. If multiple actions still tie, ask the user to choose between the tied action display names with cost, connection, and lifecycle notes; do not pick by `list_actions` order.
8. Call `get_action_schema` before configuring any action field or source field. Use the live config schema, `aiDescription`, `allowedScheduleUnits`, and returned table-aware defaults.
9. Call `resolve_action_options` for dropdowns, enum fields, CRM properties, campaign IDs, Salesforce API names, Send to Table array paths, and any dynamic option set.
10. Call `get_table_schema` before writing field references. Action input templates must use explicit `{{field_name}}` tokens from the live schema, while Send to Table mappings use plain field names.

## Metadata Semantics

Use backend action metadata as hints for planning and safeguards:

- `provider`: which platform or Baseloop module owns the action.
- `capabilities`: sparse semantic tags for discovery. Use generic tags first, then provider tags as tie-breakers. Examples: `crm.lookup`, `crm.create`, `crm.update`, `crm.activity`, `crm.source`, `source.import`, `outreach.enroll`, `ai.web_research`, `ai.structured_output`, `notification.send`.
- `connectionMode`: `required` (cannot run until `connectionPlatform` is connected), `optional` (runs on Baseloop credits with no connection; a connected account only changes price and limits, for example Find People and Sales Navigator imports), or `none`.
- `connectionPlatform`: the platform the connection answer is about, when exactly one applies.
- `requiresConnection`: legacy alias kept for older clients. Read `connectionMode` and `connectionPlatform` instead.
- `connectionStatus`: `connected` or `missing` for `connectionPlatform` in this org. `missing` blocks only when `connectionMode` is `required`: then build and run everything else, leave the dependent steps configured but unrun, and name the connection the user must add. Call `list_actions` again after the org connects or disconnects a platform.
- `canAccess`, `minimumPlan`, `lockedReason`: whether the org's plan includes the action. When `canAccess` is false, do not plan the action: name the plan it needs (`minimumPlan`) and offer the nearest alternative.
- `sourceCapabilities.webhook` (top level of the `list_actions` response): whether the org's plan includes inbound webhooks (`canAccess`). Without it `create_table` refuses a webhook source; offer rows routed in from another table or `create_rows` instead.
- `creationMethod`: whether the action is a source/table-creation action or a field action.
- `hasDetailedGuide`: whether `get_action_schema` includes richer `aiDescription` guidance. Read it before designing or building that action.
- `isBeta`, `isNew`, `deprecationNotice`: lifecycle signals. Prefer non-deprecated stable actions.
- `creditCostHint`: coarse credit guidance such as `free`, `paid`, or `variable`. Treat it as a planning and ROI hint, then confirm with rung testing before scale.
- `allowedScheduleUnits`: valid schedule units for source actions and for action fields that can be scheduled. Never invent schedule units.
- `scheduleAccess`: whether the org's plan allows schedules. If it does not, say so instead of trying to switch one on.

## Planning Rule

Static examples can name common action families, but final action choice must come from `list_actions`. If an action mentioned in plugin docs is missing, renamed, hidden, legacy, deprecated, or disconnected in the runtime list, adapt to the current runtime response and explain the setup or migration needed.

Capability examples:

- Need a CRM lookup: filter `list_actions` for `capabilities` containing `crm.lookup`, then choose among connected providers such as HubSpot, Salesforce, or future CRM actions.
- Need a CRM write: use `crm.create`, `crm.update`, or `crm.activity` instead of hardcoding one provider's action key.
- Need outreach enrollment: use `outreach.enroll`, then pick the connected provider and live campaign schema.
- Need AI research (`ai.web_research`): default open-ended, multi-source, cited research (ICP fit, funding, hiring, account briefs) to `parallel_research`, which takes typed `outputFields`. Its `processor` tier sets the credits per row: `lite` 1, `base` 3 (the default), `core` 5; `core2x`, `pro` and `ultra` run only on the user's own Parallel.ai key. `custom_ai_agent` judges evidence the row already has (score, classify, extract, write). Use `custom_ai_agent` with web search for research only when the user names it, the answer is an array Send to Table fans out, or a specific model is required. With `enableWebSearch: true`, `custom_ai_agent` takes no system prompt and no examples: gather with web search in one column, judge with web search off and the profile in the system prompt in the next.
- Need notification: use `notification.send`, then configure the returned action schema and dynamic destination options.

## Build Rule

Never configure an action from examples alone. The minimum build path for an action field is:

1. `list_actions` for current metadata and connection status.
2. `get_action_schema` for the live flattened config schema and guide.
3. `get_table_schema` for source field names.
4. `resolve_action_options` for every dynamic field.
5. `create_field` or `create_table` with config derived from the live schema.

## Review and Diagnose Rule

When auditing or fixing an existing action field, compare the stored action key and config against the current `list_actions` metadata and `get_action_schema` response. Flag disconnected providers, deprecated or legacy actions, stale option values, missing autoRunConditions on paid or variable-credit actions, and configs that no longer match the live schema.
