# Agents — Persona Catalog

Two specialized read-only auditors. All run against a user-specified workspace or table; none mutate data.

## Selection tiers

### General-purpose — invoke for deeper review

| Agent | Focus | Selected when |
|---|---|---|
| [`data-quality-auditor`](./data-quality-auditor.agent.md) | Row-level data integrity: null values, invalid domains, duplicate companies, broken extraction paths, type coercion, data mismatch between sources | Any review that covers a table with data rows. Run before scaling from Rung 2 to Rung 3. |

### Conditional — run when the workflow touches CRM sync

| Agent | Focus | Selected when |
|---|---|---|
| [`crm-integrity-checker`](./crm-integrity-checker.agent.md) | CRM sync integrity: duplicate records, orphan contacts, missing associations, enum mismatches, incomplete engagement trails, lookup-before-create gaps | The workflow contains any `hubspot_*`, CRM-sync, or `lookup_single_record`-against-CRM field. Also run on user report of duplicates/missing associations in HubSpot. |

## Conventions

- Every agent embeds the relevant shared-reference focus areas in its prompt so direct Codex/Gemini installs do not depend on relative files existing beside the global agent file.
- Every agent returns a severity-tagged findings list (Critical / Warning / Info) consistent with `/baseloop-gtm:review`'s output format.
- No agent mutates workspace state. All findings are suggestions for the user or a follow-up `/baseloop-gtm:diagnose` invocation.

## Not listed here

We intentionally don't ship a catalog of 50 personas. These two cover the direct-audit surfaces users invoke most often: data quality and CRM integrity. Cost optimization stays embedded in the workflow skills and shared references where planning, review, and scale-up decisions happen.
