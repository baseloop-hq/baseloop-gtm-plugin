#!/usr/bin/env bun
/**
 * Release validation. Run by CI on every PR; runnable locally any time.
 *
 * Checks:
 *  - release-please config + manifest are structurally valid (when present).
 *  - Plugin metadata descriptions match what release:sync-metadata would produce.
 *  - Reference-source duplication has no drift.
 *
 * Exits non-zero on any drift with a clear, actionable message.
 */
import { syncReleaseMetadata } from "../../src/release/metadata"
import { validateReleasePleaseConfig } from "../../src/release/config"
import { spawnSync } from "child_process"
import path from "path"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")

let hasErrors = false

// 1. release-please config integrity
const configErrors = await validateReleasePleaseConfig()
if (configErrors.length > 0) {
  console.error("✗ release-please configuration errors:")
  for (const e of configErrors) console.error(`    ${e}`)
  hasErrors = true
} else {
  console.log("✓ release-please config")
}

// 2. metadata-sync drift
const metadata = await syncReleaseMetadata({ write: false })
if (metadata.errors.length > 0) {
  console.error("✗ metadata read errors:")
  for (const e of metadata.errors) console.error(`    ${e}`)
  hasErrors = true
}
const drifted = metadata.updates.filter((u) => u.changed)
if (drifted.length > 0) {
  console.error("✗ metadata drift detected:")
  for (const u of drifted) {
    console.error(`    ${u.path} :: ${u.field}`)
    console.error(`      current:  ${u.current}`)
    console.error(`      expected: ${u.expected}`)
  }
  console.error("\nRun: bun run release:sync-metadata")
  hasErrors = true
} else {
  console.log("✓ plugin metadata in sync")
}

// 3. reference-sync drift (delegates to scripts/references/sync.ts --check)
const refCheck = spawnSync("bun", ["run", path.join(REPO_ROOT, "scripts", "references", "sync.ts"), "--check"], {
  cwd: REPO_ROOT,
  stdio: "inherit",
})
if (refCheck.status !== 0) {
  hasErrors = true
} else {
  console.log("✓ reference duplication in sync")
}

if (hasErrors) {
  process.exit(1)
}

console.log("\nAll release-validation checks passed.")
