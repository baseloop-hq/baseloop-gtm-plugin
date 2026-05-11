#!/usr/bin/env bun
/**
 * Preview what the next release would look like.
 *
 * Pre-release-please: prints the current plugin counts and the description
 * strings the metadata builder would produce.
 *
 * Once release-please is wired up (Phase 3 U12), this can also wrap
 * `npx release-please release-pr --dry-run` for end-to-end preview.
 */
import {
  buildBaseloopGtmDescription,
  buildBaseloopGtmMarketplaceDescription,
  getBaseloopGtmCounts,
} from "../../src/release/metadata"

const counts = await getBaseloopGtmCounts()
console.log("Plugin inventory")
console.log(`  skills:      ${counts.skills}`)
console.log(`  agents:      ${counts.agents}`)
console.log(`  mcp servers: ${counts.mcpServers}`)
console.log()
console.log("plugin.json description (canonical):")
console.log(`  ${buildBaseloopGtmDescription(counts)}`)
console.log()
console.log("marketplace.json description (canonical):")
console.log(`  ${buildBaseloopGtmMarketplaceDescription(counts)}`)
