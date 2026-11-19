# Tool Classifications

Tools organized by permission level and cost. Use this to understand which tools are safe to call freely vs. which require caution.

## Read-Only Tools (Free, No Side Effects)

These tools only read data. Call them freely for exploration and validation.

| Tool | Purpose |
|------|---------|
| `list_organizations` | See available orgs |
| `list_workspaces` | See workspaces |
| `list_tables` | See all tables |
| `get_table_schema` | Read field definitions |
| `list_views` | See table views |
| `list_rows` | Browse rows with search, filters, and sorting |
| `list_row_ids` | Lightweight row ID pagination for batch operations |
| `get_row_details` | Inspect a single row |
| `list_actions` | See available actions |
| `get_action_schema` | Read action configuration guide |
| `get_connected_platforms` | Check connected integrations |
| `resolve_action_options` | Load dropdown options |
| `get_run_status` | Check run progress |
| `list_runs` | See run history |
| `preview_formula` | Test a formula (no field created) |
| `list_trash` | See deleted workspaces, tables and fields restorable from the Trash |
| `get_credit_balance` | Check the org's remaining credits and plan before work at scale |

## Mutation Tools (Modify Data)

These tools create, update, or delete data. Require explicit `organizationId` when user has multiple orgs.

### Low Risk (Reversible)
| Tool | Risk | Notes |
|------|------|-------|
| `create_workspace` | Low | Can be deleted |
| `update_workspace` | Low | Rename only |
| `create_table` | Low | Can be deleted |
| `update_table` | Low | Rename, move, toggle auto-run |
| `create_field` | Low | Can be deleted |
| `create_fields` | Low | Batch create in one table; prefer it for 3 or more fields |
| `update_field` | Low | Config changes only |
| `create_rows` | Low | Can be deleted |
| `update_row` | Low | Cell values only |
| `create_view` | Low | Can be deleted |
| `update_view` | Low | Config changes |
| `set_view_filters` | Low | Can be removed |
| `delete_view_filters` | Low | Filters only |
| `set_view_sorting` | Low | Can be removed |
| `delete_view_sorting` | Low | Sorting only |
| `reorder_fields` | Low | Field order in a view |
| `update_view_fields` | Low | Show/hide/freeze/resize fields |
| `send_webhook_data` | Low | Test data ingestion |
| `duplicate_table` | Low | Creates a copy |
| `clone_workspace` | Low | Creates a copy with all tables |
| `clone_field` | Low | Creates a copy of a field with all config |
| `reorder_tables` | Low | Table order within a workspace |
| `restore_from_trash` | Low | Restores a trashed workspace, table or field within 30 days |

### Medium Risk (Data Loss Possible)
| Tool | Risk | Notes |
|------|------|-------|
| `delete_field` | Medium | Moves to the Trash for 30 days; restore with `restore_from_trash` |
| `delete_view` | Medium | View config lost |
| `delete_table` | Medium | Moves to the Trash for 30 days; restore with `restore_from_trash` |
| `delete_workspace` | Medium | Trashes the workspace with all its tables and fields for 30 days; does not need to be empty |

### High Risk (Permanent Data Loss)
| Tool | Risk | Notes |
|------|------|-------|
| `delete_rows` | High | Permanent; rows have no Trash |
| `set_auto_dedupe` | High | Deletes every row whose key column repeats, rows already in the table included; permanent. Get approval naming the table, the column and how many rows would go |

## Expensive Tools (Rate Limited)

These tools consume external API credits or trigger LLM inference. Limited to 20 calls per minute per org.

| Tool | Cost | Notes |
|------|------|-------|
| `run_field` | High | Triggers action execution (enrichment, AI, CRM sync) |
| `run_fields` | High | Triggers multiple actions with dependency ordering |

**Cost depends on the action being run.** These rates are for planning; at runtime `creditCostHint` from `list_actions` and the action's `get_action_schema` guide are authoritative (see cost-estimation.md).
- Enrichment (`enrich_company`, `enrich_contact`): 1 credit per found record; not-found results are free
- `custom_ai_agent` without web search: 0.5 to 1.5 credits/row base by model; heavy rows add a decimal overage
- `custom_ai_agent` with web search: 1 to 8 credits/row base by model; deep runs bill overage up to 3x the base. With or without web search, each row reserves 2x its base at run start and the unused part is refunded
- `custom_ai_agent` on the org's own key: free, except Baseloop web search at 0.15 credits per search (max 1.5/row). GPT-5.5, GPT-5.6 Sol, Claude Opus and Claude Fable models run only on the org's own key
- `parallel_research`: `lite` 1, `base` 3 (default), `core` 5 credits/row; higher tiers need the org's own Parallel key
- Find People (`li_find_people_at_company`): 2 credits per contact found, 1 with a connected Sales Navigator account
- LinkedIn imports (Sales Navigator companies or contacts, profile engagement): 0.5 credits per imported row; a Sales Navigator import through the org's own connected seat costs 0 but is bound by that seat's 2,500/day export quota
- CRM sync (HubSpot): Free
- Formulas: Free
- Send to Table: Free

## Preset Tools

Presets let you save a working action configuration and reuse it across tables.

### Read-Only
| Tool | Purpose |
|------|---------|
| `list_presets` | List saved action presets for an action key |

### Mutations (Low Risk)
| Tool | Risk | Notes |
|------|------|-------|
| `create_preset` | Low | Save an action config as a reusable preset |
| `update_preset` | Low | Update preset name, description, or config |
| `delete_preset` | Low | Remove a preset (cannot delete public presets) |

## Template Tools

Workspace templates let you save a workflow structure and clone it for new campaigns.

### Read-Only
| Tool | Purpose |
|------|---------|
| `list_workspace_templates` | See saved workspace templates |

### Mutations (Low Risk)
| Tool | Risk | Notes |
|------|------|-------|
| `mark_workspace_as_template` | Low | Marks an existing workspace as a template |
| `unmark_workspace_as_template` | Low | Removes template marking (workspace preserved) |
| `clone_workspace_template` | Low | Creates a new workspace from a template (structure only, no row data) |

## Execution Control Tools

| Tool | Notes |
|------|-------|
| `cancel_run` | Stops an in-progress run. Never on a healthy source import that is still processing: imports take 10 to 30+ minutes, and a paid import cannot be canceled while it processes |
| `wait_for_run` | Polls until completion (read-only, max 2 min timeout) |
