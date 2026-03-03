# Tool Classifications

Tools organized by permission level and cost. Use this to understand which tools are safe to call freely vs. which require caution.

## Read-Only Tools (Free, No Side Effects)

These tools only read data. Call them freely for exploration and validation.

| Tool | Purpose |
|------|---------|
| `list_organizations` | See available orgs |
| `list_workspaces` | See workspaces |
| `list_tables` | See all tables |
| `get_table_schema` | Read column definitions |
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
| `preview_formula` | Test a formula (no column created) |
| `list_presets` | List saved action presets/templates |

## Mutation Tools (Modify Data)

These tools create, update, or delete data. Require explicit `organizationId` when user has multiple orgs.

### Low Risk (Reversible)
| Tool | Risk | Notes |
|------|------|-------|
| `create_workspace` | Low | Can be deleted |
| `update_workspace` | Low | Rename only |
| `create_table` | Low | Can be deleted |
| `update_table` | Low | Rename, move, toggle auto-run |
| `create_column` | Low | Can be deleted |
| `update_column` | Low | Config changes only |
| `create_rows` | Low | Can be deleted |
| `update_row` | Low | Cell values only |
| `create_view` | Low | Can be deleted |
| `update_view` | Low | Config changes |
| `set_view_filters` | Low | Can be removed |
| `delete_view_filters` | Low | Filters only |
| `set_view_sorting` | Low | Can be removed |
| `delete_view_sorting` | Low | Sorting only |
| `reorder_columns` | Low | Column order in a view |
| `update_view_columns` | Low | Show/hide/freeze/resize columns |
| `send_webhook_data` | Low | Test data ingestion |
| `duplicate_table` | Low | Creates a copy |
| `clone_workspace` | Low | Creates a copy with all tables |
| `clone_column` | Low | Creates a copy of a column with all config |
| `reorder_tables` | Low | Table order within a workspace |

### Medium Risk (Data Loss Possible)
| Tool | Risk | Notes |
|------|------|-------|
| `delete_column` | Medium | Column data lost permanently |
| `delete_rows` | Medium | Row data lost permanently |
| `delete_view` | Medium | View config lost |
| `delete_table` | Medium | Soft delete; data preserved but hidden |
| `delete_workspace` | Medium | Must be empty first |

## Expensive Tools (Rate Limited)

These tools consume external API credits or trigger LLM inference. Limited to 20 calls per minute per org.

| Tool | Cost | Notes |
|------|------|-------|
| `run_column` | High | Triggers action execution (enrichment, AI, CRM sync) |
| `run_columns` | High | Triggers multiple actions with dependency ordering |

**Cost depends on the action being run:**
- Enrichment (enrich_company, enrich_contact): ~1 credit/row
- AI Agent without web search: ~0.2-1 credit/row
- AI Agent with web search: ~4-20 credits/row
- Find People: ~2 credits/contact found
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
| `cancel_run` | Stops an in-progress run (safe) |
| `wait_for_run` | Polls until completion (read-only, max 2 min timeout) |
