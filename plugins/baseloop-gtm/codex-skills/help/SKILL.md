---
name: help
description: Show available Baseloop capabilities, CLI/MCP transport behavior, tool categories, and example workflows. Use when the user asks what the agent can do.
argument-hint: "[optional: specific topic like 'actions', 'tables', 'views']"
---

# Baseloop GTM Capabilities

<!-- INTERACTION-METHOD-START -->

## Interaction Method

When asking the user a question, use the platform's blocking question tool when it is available in the current harness: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex when exposed by the active mode, or `ask_user` in Gemini. Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

<!-- INTERACTION-METHOD-END -->


Show the user what the Baseloop agent can do.

## Topic

<help_topic>$ARGUMENTS</help_topic>

If a specific topic is provided above, focus on that area. Otherwise, show the full overview.

## Start Here

Use `/baseloop-gtm` as the default entrypoint. It chooses the right workflow skill and selects one Baseloop transport for the session. Read [transport.md](./references/transport.md) when you need the CLI/MCP invocation contract. If a help topic requires live Baseloop data and no transport has already been used successfully in this workflow, select whichever transport is available and healthy before calling live tools.

---

## Tool Categories

### Data Exploration (read-only)
| Tool | Purpose |
|------|---------|
| `get_current_user` | Get the current user's identity and organization |
| `list_organizations` | See all organizations the user belongs to |
| `list_workspaces` | See all workspaces with table counts |
| `list_tables` | See all tables grouped by workspace |
| `get_table_schema` | See fields, types, and action config for a table |
| `list_views` | See views (field visibility, sort, filters) |
| `list_rows` | Browse rows with search, advanced filters, and sorting |
| `list_row_ids` | Get row IDs with pagination for batch operations (lightweight, no cell data) |
| `get_row_details` | Inspect a single row's full data, AI reasoning, and errors |
| `list_actions` | See the current backend action list and metadata |
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
| `duplicate_table` | Clone a table with all fields (no row data) |
| `clone_workspace` | Clone a workspace with all tables and fields |
| `reorder_tables` | Reorder tables within a workspace |

### Field Management
| Tool | Purpose |
|------|---------|
| `create_field` | Add action, formula, extraction, or plain fields |
| `update_field` | Change field config, label, or auto-run settings |
| `delete_field` | Remove a field |
| `clone_field` | Clone a field with all its configuration |

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
| `set_view_sorting` | Set sorting rules on a view |
| `delete_view_sorting` | Remove all sorting from a view |
| `reorder_fields` | Reorder fields in a view |
| `update_view_fields` | Show/hide/freeze/resize fields in a view |

### Webhooks
| Tool | Purpose |
|------|---------|
| `send_webhook_data` | Send test data to a webhook field |

### Execution
| Tool | Purpose |
|------|---------|
| `run_field` | Run an action/AI field on rows |
| `run_fields` | Run multiple fields with dependency ordering |
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
| `preview_formula` | Test a formula before creating the field |

---

## Workflow Skills

| Skill | Purpose |
|---------|---------|
| `/baseloop-gtm` | Root router — choose workflow and transport |
| `/baseloop-gtm:setup` | Diagnose CLI/MCP readiness, connected platforms, and workspace access |
| `/baseloop-gtm:plan` | Design a workflow architecture from a goal |
| `/baseloop-gtm:build` | Build a planned workflow step by step |
| `/baseloop-gtm:review` | Audit an existing workflow for pitfalls and missing safeguards |
| `/baseloop-gtm:lfg` | Plan + build + test autonomously (pauses before full scale) |
| `/baseloop-gtm:diagnose` | Investigate and fix a failing field |
| `/baseloop-gtm:save-learning` | Capture a workflow learning to `docs/solutions/` for future reuse |
| Installed version check | Claude Code has a dedicated update skill; on other hosts, use the host's plugin manager or compare the installed package with the upstream release metadata. |
| `/baseloop-gtm:help` | This help page |

---

## Quick Start Examples

**"Import my HubSpot companies and enrich them"**
→ `/baseloop-gtm Import HubSpot companies, enrich with company data`

**"Find decision makers at my target companies"**
→ `/baseloop-gtm Find contacts at companies, enrich, sync to HubSpot`

**"Check my workflow for issues before I scale up"**
→ `/baseloop-gtm review ICP Pipeline workspace`

**"My enrichment field is failing"**
→ `/baseloop-gtm diagnose enrichment field errors`

**"What actions are available?"**
→ Use the selected transport to call `list_actions` and see the current enrichment, CRM, and AI action metadata. If no transport is selected yet, select one first.

**"What integrations do I have?"**
→ Use the selected transport to call `get_connected_platforms` and see connected services. If no transport is selected yet, select one first.

---

## Dynamic Context

Use the selected transport to call `list_tables` and `get_connected_platforms`, then tailor suggestions based on what tables exist and which integrations are connected. If no transport is selected yet, select one first.
