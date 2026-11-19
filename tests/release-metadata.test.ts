import { describe, expect, test } from "bun:test"
import { buildBaseloopGtmDescription, buildBaseloopGtmMarketplaceDescription } from "../src/release/metadata"

describe("release metadata descriptions", () => {
  test("plugin description interpolates counts and says what the plugin does", () => {
    const description = buildBaseloopGtmDescription({ skills: 10, agents: 0, mcpServers: 1 })
    expect(description).toContain("10 skills")
    expect(description).not.toContain("agents")
    expect(description).toContain("lead lists")
    expect(description).toContain("LinkedIn outreach")
    expect(description).not.toContain("MCP")
  })

  test("marketplace description interpolates counts and says what the plugin does", () => {
    const description = buildBaseloopGtmMarketplaceDescription({ skills: 10, agents: 0, mcpServers: 1 })
    expect(description).toContain("10 skills")
    expect(description).not.toContain("agents")
    expect(description).toContain("lead lists")
    expect(description).toContain("LinkedIn outreach")
  })

  test("count changes flow through to both descriptions", () => {
    expect(buildBaseloopGtmDescription({ skills: 11, agents: 0, mcpServers: 1 })).toContain("11 skills")
    expect(buildBaseloopGtmMarketplaceDescription({ skills: 11, agents: 0, mcpServers: 1 })).toContain("11 skills")
  })
})
