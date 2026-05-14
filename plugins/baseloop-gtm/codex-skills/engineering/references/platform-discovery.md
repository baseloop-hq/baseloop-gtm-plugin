<!-- SYNC SOURCE: docs/reference-sources/platform-discovery.md. Run `bun run references:sync` to refresh. Do not edit directly. -->

# Platform Discovery

Baseloop's backend is the source of truth for platform availability, action metadata, and action configuration. Plugin markdown teaches workflow patterns; it must not be treated as an action inventory or schema cache.

## Runtime Source of Truth

Before choosing or configuring provider-specific workflow steps:

1. Call `get_connected_platforms` to learn which providers are connected for the organization.
2. Call `list_actions` to load the current backend action list and metadata.
3. Filter candidate actions by `capabilities` when the workflow needs a semantic job such as CRM lookup, source import, outreach enrollment, AI web research, or notification send.
4. Prefer actions whose provider is connected, whose `connectionStatus` is connected or not required, and whose metadata does not include `deprecationNotice`.
5. Prefer stable actions over `isBeta` actions unless the user explicitly asks for beta behavior or no stable equivalent exists.
6. When equivalent actions can solve the same problem, prefer `creditCostHint: "free"` before paid or variable credit hints.
7. When multiple actions still tie, break ties deterministically. For tied finalists, call `get_action_schema` as needed, then prefer the action whose `capabilities` most exactly match the needed capability, then the action whose schema can be satisfied from fields already present on the table, then actions with `hasDetailedGuide: true`. If multiple actions still tie, ask the user to choose between the tied action display names with cost, connection, and lifecycle notes; do not pick by `list_actions` order.
8. Call `get_action_schema` before configuring any action field or source field. Use the live config schema, `aiDescription`, `allowedScheduleUnits`, and returned table-aware defaults.
9. Call `resolve_action_options` for dropdowns, enum fields, CRM properties, campaign IDs, Salesforce API names, Send to Table array paths, and any dynamic option set.
10. Call `get_table_schema` before writing field references. Action input templates must use explicit `{{field_name}}` tokens from the live schema, while Send to Table mappings use plain field names.

## Metadata Semantics

Use backend action metadata as hints for planning and safeguards:

- `provider`: which platform or Baseloop module owns the action.
- `capabilities`: sparse semantic tags for discovery. Use generic tags first, then provider tags as tie-breakers. Examples: `crm.lookup`, `crm.create`, `crm.update`, `crm.activity`, `crm.source`, `source.import`, `outreach.enroll`, `ai.web_research`, `ai.structured_output`, `notification.send`.
- `requiresConnection`: whether a provider connection is required. If absent, do not invent a top-level requirement; the action may have no connection requirement or may expose mixed auth modes in `get_action_schema`/`aiDescription`.
- `connectionStatus`: org-specific connection availability. Do not use disconnected actions unless the plan clearly calls out the required setup step.
- `creationMethod`: whether the action is a source/table-creation action or a field action.
- `hasDetailedGuide`: whether `get_action_schema` includes richer `aiDescription` guidance. Read it before designing or building that action.
- `isBeta`, `isNew`, `deprecationNotice`: lifecycle signals. Prefer non-deprecated stable actions.
- `creditCostHint`: coarse credit guidance such as `free`, `paid`, or `variable`. Treat it as a planning hint, then confirm with rung testing before scale.
- `allowedScheduleUnits`: valid schedule units for source actions. Never invent schedule units.

## Planning Rule

Static examples can name common action families, but final action choice must come from `list_actions`. If an action mentioned in plugin docs is missing, renamed, hidden, legacy, deprecated, or disconnected in the runtime list, adapt to the current runtime response and explain the setup or migration needed.

Capability examples:

- Need a CRM lookup: filter `list_actions` for `capabilities` containing `crm.lookup`, then choose among connected providers such as HubSpot, Salesforce, or future CRM actions.
- Need a CRM write: use `crm.create`, `crm.update`, or `crm.activity` instead of hardcoding one provider's action key.
- Need outreach enrollment: use `outreach.enroll`, then pick the connected provider and live campaign schema.
- Need AI research: use `ai.web_research`; compare lifecycle status, `creditCostHint`, capability fit, schema requirements, `hasDetailedGuide`, and `aiDescription`; if still tied, ask instead of choosing by list order.
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
