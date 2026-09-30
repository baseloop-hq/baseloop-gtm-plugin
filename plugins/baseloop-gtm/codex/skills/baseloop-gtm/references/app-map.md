# Baseloop App Map

This map reflects the Baseloop web app on 2026-09-30; a page can move.

Use it to tell the user where to do a step these tools cannot do: remove a schedule, connect an integration, upload a CSV, delete from the Trash for good, change billing, manage members and credit limits. Every path below is on `https://app.baseloop.io`. Two rules:

1. **Never invent UI.** If what the user asks about is not in this map, say you are not sure where it lives in the app instead of describing menus or buttons from imagination.
2. **Do before you direct.** If a tool does the step (restore from the Trash, share a workspace, pause a schedule, check connections, filter a view), offer that first. Sending the user to click through the app is the fallback.

## The shell

The left sidebar, top to bottom: the **Create** button (on a top-level page it creates a workspace, inside a workspace it creates a table), **Home** (`/`, the workspace list), **Chat** (`/chat`, the in-app chat, marked Beta), **Runs** (`/runs`), **Schedules** (`/schedules`, with the organization's active schedules as used/total), **Templates** (`/templates`), **Integrations** (`/integrations`), **Settings** (opens `/my-account`), then **Trash** (`/trash`), then recent tables and chats. At the bottom: **Use with your agent** (`/integrations/agents`), the account menu (**Contact us** reaches support) and the credit meter.

A workspace opens at `/workspaces/{workspaceId}`, a table at `/workspaces/{workspaceId}/lists/{tableId}`, and one of its views at `/workspaces/{workspaceId}/lists/{tableId}/views/{viewId}`. The ids are the ones these tools return.

Settings has its own sidebar with **Back to app** at the top. Account: **My Account** (`/my-account`), **Organization** (`/team`), **Company Profile** (`/company-profile`), **Billing** (`/billing`), **API Key** (`/api-key`). Data: **Imports** (`/imports`), **Exports** (`/exports`). **Help** at the bottom opens support.

## Where things live

| The user wants to | Send them to | Notes |
|---|---|---|
| Connect or reconnect an integration (HubSpot, Salesforce, Slack, LinkedIn, a sequencer, an enrichment provider) | **Integrations** (`/integrations`); each platform has its own page, for example `/integrations/hubspot` or `/integrations/linkedin` | Or in their terminal: `baseloop integrations connect <provider>`. Check the result with `get_connected_platforms`, then call `list_actions` again. |
| Connect Claude, Codex or another agent to Baseloop | Agent setup (`/integrations/agents`), also the sidebar's **Use with your agent** | |
| Install or configure the Chrome extension | `/integrations/chrome-extension` | |
| Remove a schedule | **Schedules** (`/schedules`): the row's `...` menu, **Remove schedule**. Or in the table: column header menu, **Edit column**, then **Remove schedule** in the **Run settings** card (an import column: the **Scheduled import** card) | These tools cannot remove one. The column keeps its data and still runs by hand. Needs Can edit workflow access. |
| See every schedule: status, frequency, next and last run, slots in use | **Schedules** (`/schedules`) | Its switch pauses one. Setting, pausing or resuming a column's schedule is `update_field` (the whole `schedule` sent back with only `enabled` changed). |
| Upload a CSV as a new table | Open the workspace, sidebar **Create**, then in **Create table** under **Start from a source**: **CSV file** | Up to 25 MB. For small data the user hands over, `create_rows` adds up to 100 rows per call. |
| Upload a CSV into an existing table | Table toolbar **More options**, **Import CSV** | Past uploads: Settings, Data, **Imports** (`/imports`). |
| Download rows as a CSV | Table toolbar **More options**, **Download CSV**: the current view's rows and visible columns | Shape the view first with `set_view_filters` and `update_view_fields`, then link the view. Past exports: Settings, Data, **Exports** (`/exports`). |
| Recover a deleted workspace, table or field | **Trash** (`/trash`) | Kept 30 days. `list_trash` and `restore_from_trash` do it: offer that first. The page also restores under a new name when the old one is taken, and has **Delete permanently**, which these tools do not. Rows have no Trash: `delete_rows` and auto-dedupe deletions are permanent. |
| See the plan, upgrade, buy credits, payment method, transaction history | **Billing** (`/billing`), Settings, Billing | `get_credit_balance` reads the balance. The sidebar's credit meter also offers Add credits or Upgrade plan. |
| Invite or remove teammates, change a role, set a member's monthly credit limit or the organization default | **Organization** (`/team`), Settings, Organization | Admins only. A member with a personal limit sees it under the sidebar's credit meter. `list_members` reads the members. |
| Change the organization name or logo | **Organization** (`/team`) | Admins only. |
| Change their own name | **My Account** (`/my-account`) | The sign-in email is read-only there; support changes it. |
| Share a workspace, change who can view, edit rows or edit the workflow, make it private | In a table: toolbar **More options**, **Manage access**. On Home: the workspace row's menu, **Manage access** | `share_workspace`, `unshare_workspace` and `set_workspace_default_access` do it. Levels: Can view, Can edit rows, Can edit workflow. Only the workspace owner or an admin can share. |
| Edit the company profile the in-app chat uses | **Company Profile** (`/company-profile`) | These tools cannot read it: ask the user for the facts a plan needs. |
| Get an API key | **API Key** (`/api-key`) | |
| See run history across every table | **Runs** (`/runs`) | For one table, `list_runs` answers directly. |
| Browse workspace templates | **Templates** (`/templates`); a preview is `/templates/{id}/preview` | `list_workspace_templates` and `clone_workspace_template` do it. The Templates page links to **Use cases** (`/use-cases`): cards that start the in-app chat (**Build with AI**) or clone a backing template (**Use template**). |

## On a table page

- Toolbar **Automations**: the two table switches, **Auto-run on new rows** and **Auto-update dependents** (`update_table` sets both).
- Column header menu, **Edit column**: the column's configuration. An action column's **Run settings** card holds its own Auto-run on new rows, its run condition and **Run on schedule**; an import column has a **Scheduled import** card. `update_field` changes all of them.
- Toolbar **More options**: **Manage access** (when the user may share), **Import CSV**, **Download CSV**.
- Double-clicking an action, webhook or input cell opens its full value (`get_row_details` reads the same data).

## Do not send users to

- Any page not in this map.
- `/find-leads`: the Find leads page is not shipped and is hidden from navigation. Lead finding runs through tables and actions.
- `/internal/admin`: internal only, never mention it.
- `/cli/auth`, `/cli/workflows`, `/integration-status`, `/dynamics-oauth`: pages the CLI or a connection flow opens on its own.
- `/zoominfo`: a public landing page. ZoomInfo connects from Integrations like every other platform.
