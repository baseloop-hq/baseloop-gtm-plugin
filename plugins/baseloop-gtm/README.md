# Baseloop GTM

Build lead lists, enrich them from 40+ providers and push them to your CRM or sequencer, by describing the play to your agent. The plugin connects [Baseloop](https://baseloop.io) and adds 5 skills that design, build, review and fix the workflow for you.

## Example

```
> Find Heads of Sales at B2B SaaS companies in Germany and the Netherlands,
  get work email and mobile, then add them to my HeyReach campaign.

⏺ Plan (Baseloop GTM)
  1 table · Find People → Waterfall Email → Waterfall Phone → Add to campaign

⏺ create_table "Heads of Sales · Europe"
  500 people imported

⏺ run_field Waterfall Email, Waterfall Phone · first 1 row, then first 10
  Elena Varga    Head of Sales   Cargoflow   elena@cargoflow.eu     +49 157 555 0229
  Emma Lindberg  VP Sales        Quanta      emma@quanta.se         +46 70 555 0193
  ... 8 more · 9 of 10 emails found

  490 rows left. Here is the credit estimate for the full run. Run it?
```

Your agent plans the workflow, builds it one step at a time and checks each step on 1 row, then 10, before it asks you to approve the full run.

## Install

```
/plugin install baseloop-gtm --marketplace baseloop-hq/baseloop-gtm-plugin
```

Then run `/mcp`, pick **baseloop** and sign in. In the Claude apps and Cowork, connect Baseloop as a connector when asked. You need a Baseloop account with a workspace: every plan starts with a 7-day trial, no card.

Start with `/baseloop-gtm` and say what you want to build.

## Skills

| Skill | What it does |
|---|---|
| `/baseloop-gtm` | Start here. Picks the right skill for your request. |
| `/baseloop-gtm-plan` | Designs a workflow from a goal: which tables, which steps, in what order. Changes nothing. |
| `/baseloop-gtm-build` | Builds the workflow step by step and verifies each step before the next. |
| `/baseloop-gtm-diagnose` | Finds why a column errors or data stops flowing, fixes it and checks the fix. |
| `/baseloop-gtm-review` | Audits an existing workflow for known pitfalls, wasted credits and data-quality risks. Changes nothing. |

## Credits and approvals

Enrichment and other paid steps spend your workspace's Baseloop credits. The skills test on 1 row and then 10 before anything larger, and a full run starts only after you approve it with the row count and a credit estimate in front of you. Deleting existing data always asks first.

## What it runs, sends and stores

- **Connects to Baseloop.** The plugin declares one remote MCP server, `https://api-v2.baseloop.io/v1/mcp`. You sign in with your Baseloop account; the plugin ships no keys and stores none.
- **Runs the Baseloop CLI if you have it.** The plugin bundles no scripts, hooks or binaries. If you installed the `baseloop` CLI yourself, the skills run its commands (`baseloop doctor`, `baseloop tools ...`) in place of the MCP server. The CLI talks to the same Baseloop API. Without the CLI, everything goes through the MCP server.
- **Sends data only to Baseloop.** The skills call no other service. Baseloop then passes data to the enrichment providers, CRMs and sequencers you connected, for the steps you asked for.
- **Handles personal data.** Workflows read and store names, work emails, phone numbers and CRM records in your Baseloop workspace. Tables, columns and rows your agent creates stay there until you delete them or close the account. Baseloop does not receive your conversation, only the tool calls your agent makes.
- **Writes one local file, only on request.** If you ask the agent to save a workflow learning, it writes a Markdown note under `docs/solutions/` in your current project.

## More

The same skills install in Codex and Gemini CLI: see the [repository README](https://github.com/baseloop-hq/baseloop-gtm-plugin#readme).

[Website](https://baseloop.io) · [Docs](https://docs.baseloop.io) · [Help](https://help.baseloop.io) · [Privacy policy](https://baseloop.io/privacy-policy) · [Terms of service](https://baseloop.io/terms-of-service) · [License](https://github.com/baseloop-hq/baseloop-gtm-plugin/blob/main/LICENSE)
