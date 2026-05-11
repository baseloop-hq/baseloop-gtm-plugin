---
name: baseloop-gtm:setup
description: |
  Diagnose the Baseloop plugin environment and report what's ready, what's missing, and how to fix it.
  Probes MCP auth, connected platforms, and workspace access. Use when onboarding,
  troubleshooting connection issues, or verifying the plugin is wired up correctly.
disable-model-invocation: true
ce_platforms: [claude]
argument-hint: "[optional: workspace name to verify access against]"
---

# Setup

<!-- INTERACTION-METHOD-START -->

## Interaction Method

When asking the user a question, use the platform's blocking question tool: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex, `ask_user` in Gemini, `ask_user` in Pi (requires the `pi-ask-user` extension). Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

<!-- INTERACTION-METHOD-END -->


Diagnose the Baseloop GTM plugin environment. Tell the user exactly what works, what doesn't, and what to do about it.

This skill is **read-only**. It never creates or modifies workspace data.

---

## Phase 1: MCP authentication

Call `list_workspaces`.

- **Success (≥1 workspace returned):** MCP is connected. Continue to Phase 2.
- **Failure (tool error, auth error, or empty array with auth indication):** stop here. Report:
  > "Baseloop MCP is not connected. Open Claude Code's MCP settings and authenticate the `baseloop` server. Once connected, run `/baseloop-gtm:setup` again."
- **Success but 0 workspaces:** MCP is connected but the user hasn't created a workspace yet. Report:
  > "MCP is connected, but you have no workspaces yet. Visit https://app.baseloop.io to create one, then run `/baseloop-gtm:setup` again."

## Phase 2: Connected integrations

Call `get_connected_platforms`.

For each platform in the response, report status. Specifically flag:
- **HubSpot** — needed for CRM sync workflows. If not connected: "HubSpot is not connected. Connect it from the Baseloop UI to enable CRM sync skills."
- **LinkedIn / LinkedIn Sales Navigator** — needed for `li_find_people_at_company`. If missing: note as optional, only required for LinkedIn-based people-finding workflows.
- **Slack** — optional for notifications. Missing is fine unless the user mentions Slack.

Don't gate the rest of setup on integration status — the user may not need every platform.

## Phase 3: Workspace verification

If `<workspace>` was provided as an argument:
1. Match it against `list_workspaces` output by name (case-insensitive). If no match, ask the user using the platform's blocking question tool to pick a workspace from the list.
2. Call `list_tables` filtered to the chosen workspace.
3. Report table count and a few names.

If no argument was provided, ask the user (blocking question tool) which workspace to verify against. List up to 5 workspaces; if more, allow free-text input.

If `list_tables` returns 0 tables: that's normal for an empty workspace. Report and suggest next-step skills.

## Phase 4: Final report

Format the report as a structured summary the user can scan. Example:

```
## Baseloop GTM Setup Report

✓ MCP connected (3 workspaces)
✓ HubSpot connected
✗ LinkedIn Sales Navigator not connected (optional)
✓ Workspace "ICP Pipeline" accessible (12 tables)

### What you can do now
- /baseloop-gtm:engineering — start here if new to Baseloop; mental model + design principles
- /baseloop-gtm:plan — design a new workflow
- /baseloop-gtm:review ICP Pipeline — audit your existing workflow
- /baseloop-gtm:diagnose — investigate a failing field
- /baseloop-gtm:help — see all skills and tool categories

### What to fix (optional)
- LinkedIn Sales Navigator: connect from Baseloop UI if you plan to find contacts via LinkedIn.
```

If everything is healthy, end with: "Ready to go. Try `/baseloop-gtm:plan` to start a new workflow."

If anything failed, end with the most actionable fix the user should do next.

---

## Notes

- **Never mutate.** This skill only calls read tools (`list_workspaces`, `get_connected_platforms`, `list_tables`).
- **Never re-attempt failed auth automatically.** Tell the user what to fix; don't loop.
- **Don't probe further than needed.** If MCP is broken (Phase 1), don't call other tools — they will all fail with the same error and add noise.
