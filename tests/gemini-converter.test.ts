import { describe, expect, test } from "bun:test"
import path from "path"
import { loadClaudePlugin } from "../src/parsers/claude"
import { convertClaudeToGemini } from "../src/converters/claude-to-gemini"
import { transformContentForGemini } from "../src/utils/gemini-content"

const MINI_PLUGIN = path.resolve(import.meta.dir, "fixtures", "mini-plugin")

describe("transformContentForGemini", () => {
  test("rewrites .claude/ paths to .gemini/", () => {
    expect(transformContentForGemini("Look in `.claude/cache/`.")).toBe("Look in `.gemini/cache/`.")
    expect(transformContentForGemini("`~/.claude/`")).toBe("`~/.gemini/`")
  })
})

describe("convertClaudeToGemini", () => {
  test("includes platform-allowed skills + all MCP servers", async () => {
    const p = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(p)
    // Only `foo` skill — `codex-only` is filtered out by ce_platforms.
    expect(bundle.skills.length).toBe(1)
    expect(bundle.skills[0].name).toBe("mini-plugin:foo")
    expect(bundle.agents.length).toBe(0)
    expect(bundle.mcpServers).toBeDefined()
    expect(Object.keys(bundle.mcpServers!)).toEqual(["baseloop", "secret-server"])
  })

  test("does not emit standalone subagents", async () => {
    const p = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(p)
    expect(bundle.agents).toEqual([])
  })
})
