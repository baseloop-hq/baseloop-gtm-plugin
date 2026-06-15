#!/usr/bin/env bun
/**
 * Auto-sync plugin description strings from current skill/MCP counts.
 *
 * Default mode: prints diff (dry-run). Pass --write to apply.
 */
import { syncReleaseMetadata } from "../../src/release/metadata"

const write = process.argv.includes("--write")
const result = await syncReleaseMetadata({ write })

for (const u of result.updates) {
  if (u.changed) {
    console.log(`${write ? "wrote" : "would update"} ${u.path}`)
    console.log(`  before: ${u.current}`)
    console.log(`  after:  ${u.expected}`)
  } else {
    console.log(`unchanged ${u.path}`)
  }
}

if (result.errors.length > 0) {
  console.error("\nErrors:")
  for (const e of result.errors) console.error(`  ${e}`)
  process.exit(1)
}
