# Extraction Field Rule

**Never create extraction fields during initial field creation.** The action's real response shape is not knowable from documentation alone — always observe it first.

## The rule

For every action that produces structured output (HubSpot Lookup, `baseloop_send_http_request`, enrichment, AI agents, `lookup_single_record`, email finders, etc.):

1. Create the action field in Step 3 — do NOT create downstream extraction fields yet.
2. At Rung 1 (first run on 1 row), inspect the `fullValue` with `get_row_details` using the action field's `fieldId`.
3. Derive the extraction path from the actual JSON structure you see.
4. Then create extraction fields with `create_field`, setting:
   - `type: "text"` — **always**. Non-text types silently coerce or reject values. This is the #1 silent data-loss mistake.
   - `extractorFieldId` — the action field's ID.
   - `extractionPath` — a JMESPath expression derived from real data, never guessed.
5. Resume creating downstream fields that reference the extracted values.

## Why not skip to downstream fields?

Because `{{field_name}}` resolves to the action field's **display output** (e.g. `"Found"`, `"Sent"`, `"Created"`), NOT the structured data in `fullValue`. Referencing an action field directly sends display text to the next step instead of actual data.

The most common manifestation: a `hubspot_lookup_object` field whose display output is `"Found"`, and a downstream `hubspot_update_object.recordId` configured as `{{hubspot_lookup_field}}`. The update receives the literal string `"Found"` and fails.

## Type-safety check

Before moving to Rung 2, verify every extraction field uses `type: "text"`. No booleans. No numbers. No selects. Grep `get_table_schema` output if unsure.
