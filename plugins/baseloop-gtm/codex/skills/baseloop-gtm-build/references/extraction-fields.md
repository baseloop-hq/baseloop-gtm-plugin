# Nested Data Rule: Inline Paths and Extraction Fields

**Never reference nested action data before observing it.** The action's real response shape is not knowable from documentation alone. A wrong path resolves to an empty value silently, with no error, so a guessed path fails later and quietly.

## The observation protocol (mandatory, unchanged)

For every action that produces structured output (HubSpot Lookup, `baseloop_send_http_request`, enrichment, AI agents, `lookup_single_record`, email finders, etc.):

1. Create the action field in Step 3. Do NOT wire references to its nested data yet.
2. At Rung 1 (first run on 1 row), inspect the `fullValue` with `get_row_details` using the action field's `fieldId`.
3. Derive paths from the actual JSON structure you see, never from documentation or assumption.

## Two ways to reference nested data

The decision test: **is this value part of the deliverable, or is it wiring?** Values the user will read, sort, filter, or export (found emails, scores, enrichment results) belong in visible extraction columns; a table of opaque action fields with everything hidden inside `fullValue` is not a usable deliverable. Values that only connect one step to the next (a record id handed to an update action, an array handed to Send to Table) go inline. When unsure, prefer the visible column: users trust what they can see.

### Inline path references (default when one field consumes the value)

`{{field_name.path.to.value}}` resolves directly against the action field's `fullValue`:

- `{{lookup_company_abc1.results[0].id}}`: first array item's id
- `{{fetch_users_abc1[*].email}}`: array projection, resolves to a JSON array
- `{{field_name.fullValue}}`: the whole fullValue object

Use an inline path when exactly one downstream field needs the value and nobody needs it as a visible column. No extra field, no extra schema, no cascading rename risk.

Send to Table mapping values accept the same paths without braces: `fetch_users_abc1[0].company.name` in `send_row` mode, and `column:company_data_abc1.hq.city` for parent-row fields in `send_for_each_item` mode.

### Extraction fields (when the value deserves a column)

Create a data extraction field with `create_field` when any of these hold:

- The value should be visible, sortable, or filterable as a column.
- **A formula needs it.** Formulas cannot take inline paths; they only reference whole fields. There is no inline alternative here.
- Several downstream fields consume the same value (one column to fix if the path changes).
- The key contains spaces or special characters. The inline grammar has no quoting, so such keys are reachable only through an extraction field's JMESPath.

Set:

- `type: "text"`, **always**. Non-text types silently coerce or reject values. This is the #1 silent data-loss mistake.
- `extractorFieldId`: the action field's ID.
- `extractionPath`: a JMESPath expression derived from real data, never guessed.

## Why not `{{field_name}}` alone?

Because `{{field_name}}` resolves to the action field's **display output** (e.g. `"Found"`, `"Sent"`, `"Created"`), NOT the structured data in `fullValue`. Referencing an action field directly sends display text to the next step instead of actual data.

The most common manifestation: a `hubspot_lookup_object` field whose display output is `"Found"`, and a downstream `hubspot_update_object.recordId` configured as `{{hubspot_lookup_field}}`. The update receives the literal string `"Found"` and fails. The fix is `{{hubspot_lookup_field.results[0].id}}` (inline) or an extraction field.

## Verification

- Inline paths: after wiring, run the consumer on 1 row and confirm the resolved value matches what you saw in `fullValue`. An empty result means the path is wrong; re-inspect the real data instead of guessing again.
- Extraction fields: before moving to Rung 2, verify every one uses `type: "text"`. No booleans. No numbers. No selects. Grep `get_table_schema` output if unsure.
