import { describe, expect, test } from "bun:test"
import path from "path"
import { loadClaudePlugin } from "../src/parsers/claude"
import { convertClaudeToGemini } from "../src/converters/claude-to-gemini"
import { transformContentForGemini } from "../src/utils/gemini-content"

const MINI_PLUGIN = path.resolve(import.meta.dir, "fixtures", "mini-plugin")

describe("transformContentForGemini", () => {
  test("rewrites Task agent(args) to subagent", () => {
    expect(transformContentForGemini("Task data-quality-auditor(check the data)")).toBe(
      "Use the @data-quality-auditor subagent to: check the data",
    )
  })

  test("rewrites Task agent() with empty args", () => {
    expect(transformContentForGemini("Task data-quality-auditor()")).toBe(
      "Use the @data-quality-auditor subagent",
    )
  })

  test("rewrites .claude/ paths to .gemini/", () => {
    expect(transformContentForGemini("Look in `.claude/cache/`.")).toBe("Look in `.gemini/cache/`.")
    expect(transformContentForGemini("`~/.claude/`")).toBe("`~/.gemini/`")
  })

  test("rewrites @agent-suffix references to subagent", () => {
    expect(transformContentForGemini("@data-quality-auditor handles it.")).toBe(
      "@data-quality-auditor subagent handles it.",
    )
  })
})

describe("convertClaudeToGemini", () => {
  test("includes platform-allowed skills + all agents + all MCP servers", async () => {
    const p = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(p)
    // Only `foo` skill — `codex-only` is filtered out by ce_platforms.
    expect(bundle.skills.length).toBe(1)
    expect(bundle.skills[0].name).toBe("mini-plugin:foo")
    expect(bundle.agents.length).toBe(1)
    expect(bundle.mcpServers).toBeDefined()
    expect(Object.keys(bundle.mcpServers!)).toEqual(["baseloop", "secret-server"])
  })

  test("agent content has Gemini-style frontmatter", async () => {
    const p = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(p)
    const content = bundle.agents[0].content
    expect(content.startsWith("---\n")).toBe(true)
    expect(content).toContain("kind: local")
    expect(content).toContain("name: data-quality-auditor")
    // Path transform applied to body.
    expect(content).toContain(".gemini/cache/")
    expect(content).not.toContain(".claude/cache/")
  })
})
