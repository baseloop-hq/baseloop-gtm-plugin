# Inline Diagnosis During Build

When a field fails during Rung 1, fix it in place without abandoning the build. Two attempts max — escalate to `/baseloop-gtm:baseloop-gtm-diagnose` if still broken.

## Flow

1. Read [error-patterns.md](./error-patterns.md) to load known error signatures.
2. `get_row_details` with `fieldId` — read the `errorMessage` and `fullValue`.
3. Match against known patterns:
   - Config mismatch (property name, field mapping)
   - Upstream null (the referenced field has no value)
   - Auth failure (expired OAuth, wrong API key)
   - Rate limit (API 429, hanging run)
4. Fix with `update_field`.
5. Re-run **that field only** on a failing row: `run_field` with `runAction: "custom_range"`, `selectedIds` set to that row id, and `skipCellsWithData: false`.
6. `get_row_details` again to verify.

## Rules

- **Never re-run upstream fields that already have correct data.** AI fields are non-deterministic — re-running replaces good data with different data.
- **Fix only the field whose configuration changed.** Ask: "Which field's configuration changed?" That's the one to re-run.
- **After 2 fix attempts,** suggest the user run `/baseloop-gtm:baseloop-gtm-diagnose` for a deeper investigation. Don't loop forever on the same field.
- **Read `failureReasons` first.** `get_run_status` and `wait_for_run` return why rows failed, most common first; read it before opening rows. Retest a fix on a row that failed (`custom_range`, `selectedIds` with that row id, `skipCellsWithData: false`), not with `first_one`, which may pick a row that never failed.
- **The same error twice on valid rows is an action failure:** stop re-running it. Add the plan's fallback (usually `custom_ai_agent` with web search) as a new field gated on the original's `hasError` or `isNotFound`, and continue. Never delete a column that holds results.
- **Upstream data issues recurse:** if the root cause is an upstream field returning null, diagnose that field first (go back to Step 1 for the upstream field).

## When to escalate

Stop inline-fixing and hand off to `/baseloop-gtm:baseloop-gtm-diagnose` when:

- Same error after 2 `update_field` attempts.
- Error is ambiguous — no clear match in error-patterns.md.
- Fix requires cross-table schema changes.
- Auth/rate-limit issue requires user action outside Baseloop.
