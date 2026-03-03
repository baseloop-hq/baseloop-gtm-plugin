---
name: baseloop-gtm:help
description: Show available Baseloop MCP capabilities, tool categories, and example workflows. Use when the user asks what the agent can do.
argument-hint: "[optional: specific topic like 'actions', 'tables', 'views']"
disable-model-invocation: true
allowed-tools: Bash(echo *), Read, Glob, Grep, mcp__baseloop-gtm__list_organizations, mcp__baseloop-gtm__list_tables, mcp__baseloop-gtm__list_actions, mcp__baseloop-gtm__get_connected_platforms
---

# Baseloop MCP Capabilities

Show the user what the Baseloop agent can do.

## Topic

<help_topic>$ARGUMENTS</help_topic>

If a specific topic is provided above, focus on that area. Otherwise, show the full overview.

---

## Tool Categories

### Data Exploration (read-only)
| Tool | Purpose |
|------|---------|
| `list_tables` | See all tables grouped by workspace |
| `get_table_schema` | See columns, types, and action config for a table |
| `list_views` | See views (column visibility, sort, filters) |
| `list_rows` | Browse rows with search, advanced filters, and sorting |
| `list_row_ids` | Get row IDs with pagination for batch operations (lightweight, no cell data) |
| `get_row_details` | Inspect a single row's full data, AI reasoning, and errors |
| `list_actions` | See all available enrichment/sync actions |
| `get_action_schema` | Read an action's full configuration guide |
| `get_connected_platforms` | Check which integrations are connected |
| `resolve_action_options` | Load dynamic dropdowns (HubSpot properties, campaign IDs) |
| `list_presets` | See saved action configuration presets |

### Preset Management
| Tool | Purpose |
|------|---------|
| `create_preset` | Save an action config as a reusable preset |
| `update_preset` | Update a preset's name, description, or config |
| `delete_preset` | Remove a preset |

### Table & Workspace Management
| Tool | Purpose |
|------|---------|
| `create_workspace` | Create a new workspace to organize tables |
| `update_workspace` | Rename a workspace |
| `delete_workspace` | Remove an empty workspace |
| `create_table` | Create a table (optionally with a data source) |
| `update_table` | Rename, move, or toggle auto-run on a table |
| `delete_table` | Soft-delete a table |
| `duplicate_table` | Clone a table with all columns (no row data) |
| `clone_workspace` | Clone a workspace with all tables and columns |
| `reorder_tables` | Reorder tables within a workspace |

### Column Management
| Tool | Purpose |
|------|---------|
| `create_column` | Add action, formula, extraction, or plain columns |
| `update_column` | Change column config, label, or auto-run settings |
| `delete_column` | Remove a column |
| `clone_column` | Clone a column with all its configuration |

### Row Management
| Tool | Purpose |
|------|---------|
| `create_rows` | Add rows (up to 100 per call) |
| `update_row` | Update cell values on existing rows |
| `delete_rows` | Remove rows (up to 100 per call) |

### View Management
| Tool | Purpose |
|------|---------|
| `create_view` | Create a new view for a table |
| `update_view` | Change view name or sorting |
| `delete_view` | Remove a view |
| `set_view_filters` | Add filter rules to a view |
| `delete_view_filters` | Remove all filters from a view |
| `reorder_columns` | Reorder columns in a view |
| `update_view_columns` | Show/hide/freeze/resize columns in a view |

### Webhooks
| Tool | Purpose |
|------|---------|
| `send_webhook_data` | Send test data to a webhook column |

### Execution
| Tool | Purpose |
|------|---------|
| `run_column` | Run an action/AI column on rows |
| `run_columns` | Run multiple columns with dependency ordering |
| `get_run_status` | Check progress of a running action |
| `list_runs` | See run history for a table |
| `cancel_run` | Cancel an in-progress run |
| `wait_for_run` | Poll until a run completes |

### Templates
| Tool | Purpose |
|------|---------|
| `list_workspace_templates` | See saved workspace templates |
| `mark_workspace_as_template` | Save a workspace structure as a reusable template |
| `unmark_workspace_as_template` | Remove template marking |
| `clone_workspace_template` | Create a new workspace from a template |

### AI Helpers
| Tool | Purpose |
|------|---------|
| `preview_formula` | Test a formula before creating the column |

---

## Workflow Commands

| Command | Purpose |
|---------|---------|
| `/baseloop-gtm:plan` | Design a workflow architecture from a goal |
| `/baseloop-gtm:build` | Build a planned workflow step by step |
| `/baseloop-gtm:review` | Audit an existing workflow for pitfalls and missing safeguards |
| `/baseloop-gtm:lfg` | Plan + build + test autonomously (pauses before full scale) |
| `/baseloop-gtm:diagnose` | Investigate and fix a failing column |
| `/baseloop-gtm:help` | This help page |

---

## Quick Start Examples

**"Import my HubSpot companies and enrich them"**
→ `/baseloop-gtm:lfg Import HubSpot companies, enrich with company data`

**"Find decision makers at my target companies"**
→ `/baseloop-gtm:plan Find contacts at companies, enrich, sync to HubSpot`

**"Check my workflow for issues before I scale up"**
→ `/baseloop-gtm:review ICP Pipeline workspace`

**"My enrichment column is failing"**
→ `/baseloop-gtm:diagnose enrichment column errors`

**"What actions are available?"**
→ Call `list_actions` to see all enrichment, CRM, and AI actions

**"What integrations do I have?"**
→ Call `get_connected_platforms` to see connected services

---

## Dynamic Context

Call `list_tables` and `get_connected_platforms` to see the user's current environment, then tailor suggestions based on what tables exist and which integrations are connected.
