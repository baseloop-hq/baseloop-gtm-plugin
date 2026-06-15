# Reference Sources

Canonical source-of-truth copies of reference files that multiple skills share.

## Why this exists

Each skill's `references/` folder must be self-contained — no cross-skill paths like `../other-skill/references/X.md`. But several behavioral rules (pitfalls, error patterns, workflow patterns) apply to more than one skill. Without a sync mechanism, keeping 2-3 hand-edited copies aligned becomes a source of drift.

This directory is the single edit target. `bun run references:sync` copies each canonical file into every consuming skill's `references/` folder, prepending a sync-source header comment so editors know where to edit first.

## How to edit

1. Edit the canonical file here (`docs/reference-sources/<name>.md`).
2. Run `bun run references:sync` from the repo root.
3. Commit the canonical change AND the updated per-skill copies together.

Do not hand-edit the per-skill copies. CI (`release:validate`) fails on drift with a message telling you to run the sync.

## Registry

`registry.json` maps each canonical file to the list of skills that consume it.

```json
{
  "pitfalls.md": ["review", "diagnose", "baseloop-gtm", "build"],
  "error-patterns.md": ["diagnose", "build", "review", "baseloop-gtm"],
  "workflow-patterns.md": ["plan", "baseloop-gtm"],
  "platform-discovery.md": ["plan", "build", "review", "diagnose", "baseloop-gtm"],
  "transport.md": ["baseloop-gtm", "plan", "build", "review", "diagnose", "lfg", "help", "setup"]
}
```

Adding a new shared reference:
1. Create the file in this directory.
2. Add an entry to `registry.json` listing the consumer skills.
3. Run `bun run references:sync`.

Removing a consumer:
1. Edit `registry.json`.
2. Delete the old per-skill copy from that consumer's `references/` folder.
3. Run `bun run references:sync` to refresh the remaining consumers.

## Sync header

Each synced copy begins with:

```
<!-- SYNC SOURCE: docs/reference-sources/<name>.md. Run `bun run references:sync` to refresh. Do not edit directly. -->
```
