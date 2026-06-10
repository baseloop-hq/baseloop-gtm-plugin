import { describe, expect, test } from "bun:test"
import { buildBaseloopGtmDescription, buildBaseloopGtmMarketplaceDescription } from "../src/release/metadata"

describe("release metadata descriptions", () => {
  test("plugin description interpolates counts and transport wording", () => {
    const description = buildBaseloopGtmDescription({ skills: 10, agents: 2, mcpServers: 1 })
    expect(description).toContain("10 skills, 2 agents")
    expect(description).toContain("CLI-ready instructions")
    expect(description).toContain("MCP compatibility")
    expect(description).not.toContain("MCP server")
  })

  test("marketplace description interpolates counts and transport wording", () => {
    const description = buildBaseloopGtmMarketplaceDescription({ skills: 10, agents: 2, mcpServers: 1 })
    expect(description).toContain("10 skills")
    expect(description).toContain("2 read-only audit agents")
    expect(description).toContain("CLI-ready instructions")
    expect(description).toContain("MCP compatibility")
  })

  test("count changes flow through to both descriptions", () => {
    expect(buildBaseloopGtmDescription({ skills: 11, agents: 3, mcpServers: 1 })).toContain("11 skills, 3 agents")
    expect(buildBaseloopGtmMarketplaceDescription({ skills: 11, agents: 3, mcpServers: 1 })).toContain("11 skills")
  })
})
