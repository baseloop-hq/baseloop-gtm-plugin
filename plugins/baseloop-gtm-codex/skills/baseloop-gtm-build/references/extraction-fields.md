# Nested Data Rule: Inline Paths and Extraction Fields

**Never reference nested action data before observing it.** The action's real response shape is not knowable from documentation alone. A wrong path resolves to an empty value silently, with no error, so a guessed path fails later and quietly.

## The observation protocol (mandatory, unchanged)

For every action that produces structured output (HubSpot Lookup, `baseloop_send_http_request`, enrichment, AI agents, `lookup_single_record`, email finders, etc.):

1. Create the action field in Step 3. Do NOT wire references to its nested data yet.
2. At Rung 1 (first run on 1 row), inspect the `fullValue` with `get_row_details` using the action field's `fieldId`.
3. Derive paths from the actual JSON structure you see, never from documentation or assumption.

## Two ways to reference nested data

The decision test: **must this value be a column?** Prompts, field mappings and formula prompts all read `{{field_name.path}}` inline, so a value that only feeds a later step (a record id handed to an update action, an array handed to Send to Table, a detail a prompt or formula uses) goes inline. It gets a column only on the criteria under Extraction fields. Never extract what the action cell already displays: a waterfall email cell is the email.

### Inline path references (default when one field consumes the value)

`{{field_name.path.to.value}}` resolves directly against the action field's `fullValue`:

- `{{lookup_company_abc1.results[0].id}}`: first array item's id
- `{{fetch_users_abc1[*].email}}`: array projection, resolves to a JSON array
- `{{field_name.fullValue}}`: the whole fullValue object

Use an inline path when exactly one downstream field needs the value and nobody needs it as a visible column. No extra field, no extra schema, no cascading rename risk.

Send to Table mapping values accept the same paths without braces: `fetch_users_abc1[0].company.name` in `send_row` mode, and `column:company_data_abc1.hq.city` for parent-row fields in `send_for_each_item` mode.

### Extraction fields (when the value must be a column)

Create a data extraction field with `create_field` only when one of these holds:

- A person reads, sorts or filters it as a column.
- A run condition gates on it: rules take a `fieldId`, never a path.
- The key contains spaces or special characters. The inline grammar has no quoting, so such keys are reachable only through an extraction field's JMESPath.
- Several fields reuse it (one column to fix if the path changes).

Set:

- `type: "text"`, **always**. Non-text types silently coerce or reject values. This is the #1 silent data-loss mistake.
- `extractorFieldId`: the action field's ID.
- `extractionPath`: a JMESPath expression derived from real data, never guessed.

## Why not `{{field_name}}` alone?

Because `{{field_name}}` resolves to the action field's **display output** (e.g. `"Found"`, `"Sent"`, `"Created"`), NOT the structured data in `fullValue`. Referencing an action field directly sends display text to the next step instead of actual data. Two exceptions: an AI prompt (`custom_ai_agent`, `parallel_research`) also receives the column's `fullValue`, and a cell whose display value is the datum itself (a waterfall email) needs no path.

The most common manifestation: a `hubspot_lookup_object` field whose display output is `"Found"`, and a downstream `hubspot_update_object.recordId` configured as `{{hubspot_lookup_field}}`. The update receives the literal string `"Found"` and fails. The fix is `{{hubspot_lookup_field.results[0].id}}` (inline) or an extraction field.

## Verification

- Inline paths: after wiring, run the consumer on 1 row and confirm the resolved value matches what you saw in `fullValue`. An empty result means the path is wrong; re-inspect the real data instead of guessing again.
- Extraction fields: `create_field` and `update_field` report `matchedRows`, `sample` and `availablePaths`. Fix a wrong path in place with `update_field` on `extractionPath`: the id, name and every reference survive, and existing rows re-extract in the same call. Never delete and recreate the column, and never re-run the source to fill an extraction column.
- Extraction fields: before moving to Rung 2, verify every one uses `type: "text"`. No booleans. No numbers. No selects. Grep `get_table_schema` output if unsure.
