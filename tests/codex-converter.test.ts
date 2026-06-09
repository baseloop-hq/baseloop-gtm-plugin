import { describe, expect, test } from "bun:test"
import path from "path"
import { loadClaudePlugin } from "../src/parsers/claude"
import { convertClaudeToCodex } from "../src/converters/claude-to-codex"
import { transformContentForCodex } from "../src/utils/codex-content"

const MINI_PLUGIN = path.resolve(import.meta.dir, "fixtures", "mini-plugin")

describe("transformContentForCodex", () => {
  test("rewrites Task agent(args) when agent is known", () => {
    const out = transformContentForCodex("Task data-quality-auditor(check the data)", {
      agentTargets: { "data-quality-auditor": "data-quality-auditor" },
    })
    expect(out).toBe("Spawn the custom agent `data-quality-auditor` with task: check the data")
  })

  test("rewrites Task agent() when agent is known and args empty", () => {
    const out = transformContentForCodex("Task data-quality-auditor()", {
      agentTargets: { "data-quality-auditor": "data-quality-auditor" },
    })
    expect(out).toBe("Spawn the custom agent `data-quality-auditor`")
  })

  test("rewrites Task to skill when agent unknown", () => {
    const out = transformContentForCodex("Task unknown-thing(do work)")
    expect(out).toBe("Use the $unknown-thing skill to: do work")
  })

  test("rewrites slash command to /prompts:X when not a known skill", () => {
    const out = transformContentForCodex("Run /unknown-thing now.")
    expect(out).toBe("Run /prompts:unknown-thing now.")
  })

  test("rewrites slash command to 'the X skill' when known", () => {
    const out = transformContentForCodex("Run /baseloop-gtm:plan now.", {
      skillTargets: { "baseloop-gtm_plan": "baseloop-gtm:plan" },
    })
    expect(out).toBe("Run the baseloop-gtm:plan skill now.")
  })

  test("rewrites root slash command to known root skill", () => {
    const out = transformContentForCodex("Run /baseloop-gtm now.", {
      skillTargets: { "baseloop-gtm": "baseloop-gtm" },
    })
    expect(out).toBe("Run the baseloop-gtm skill now.")
  })

  test("rewrites .claude/ paths to .codex/", () => {
    expect(transformContentForCodex("Look in `.claude/cache/`.")).toBe("Look in `.codex/cache/`.")
    expect(transformContentForCodex("`~/.claude/agents/`")).toBe("`~/.codex/agents/`")
  })

  test("rewrites @agent-suffix references", () => {
    const out = transformContentForCodex("@data-quality-auditor handles it.", {
      agentTargets: { "data-quality-auditor": "data-quality-auditor" },
    })
    expect(out).toBe("custom agent `data-quality-auditor` handles it.")
  })

  test("does not rewrite protected path-like slash refs (.dev, /tmp, etc.)", () => {
    expect(transformContentForCodex("Path /tmp/foo")).toBe("Path /tmp/foo")
    expect(transformContentForCodex("Path /usr/bin")).toBe("Path /usr/bin")
  })

  test("does not rewrite relative markdown link paths (./X.md, ../X.md)", () => {
    expect(transformContentForCodex("[pitfalls](./pitfalls.md)")).toBe("[pitfalls](./pitfalls.md)")
    expect(transformContentForCodex("[refs](./references/error-patterns.md)")).toBe(
      "[refs](./references/error-patterns.md)",
    )
    expect(transformContentForCodex("[up](../baseloop-gtm/SKILL.md)")).toBe(
      "[up](../baseloop-gtm/SKILL.md)",
    )
  })

  test("does not rewrite URL path slashes (https://host/segment)", () => {
    expect(transformContentForCodex("See https://api.example.com/foo for details.")).toBe(
      "See https://api.example.com/foo for details.",
    )
    expect(transformContentForCodex("`https://baseloop.io/docs/api/v2`")).toBe(
      "`https://baseloop.io/docs/api/v2`",
    )
    expect(transformContentForCodex("http://example.com/a/b/c")).toBe(
      "http://example.com/a/b/c",
    )
  })

  test("does not rewrite glob-like path patterns", () => {
    expect(transformContentForCodex("Match `**/foo/**` recursively.")).toBe(
      "Match `**/foo/**` recursively.",
    )
  })

  test("still rewrites legitimate slash-command refs at line start / after space", () => {
    expect(
      transformContentForCodex("Run /unknown-thing now.")
    ).toBe("Run /prompts:unknown-thing now.")
    expect(
      transformContentForCodex("/baseloop-gtm:plan runs first.", {
        skillTargets: { "baseloop-gtm_plan": "baseloop-gtm:plan" },
      })
    ).toBe("the baseloop-gtm:plan skill runs first.")
  })
})

describe("convertClaudeToCodex", () => {
  test("default mode: agents only, skills empty", async () => {
    const p = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToCodex(p)
    expect(bundle.skills.length).toBe(0)
    expect(bundle.agents.length).toBe(1)
    expect(bundle.agents[0].name).toBe("data-quality-auditor")
  })

  test("includeSkills: true bundles skills", async () => {
    const p = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToCodex(p, { includeSkills: true })
    // Both skills allowed on codex (foo has no ce_platforms; codex-only includes codex).
    expect(bundle.skills.length).toBe(2)
  })

  test("agent TOML uses Codex's flat format (no [agent] header, developer_instructions key, JSON-string values)", async () => {
    const p = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToCodex(p)
    const toml = bundle.agents[0].toml
    // No section header.
    expect(toml).not.toContain("[agent]")
    // Flat keys.
    expect(toml).toContain('name = "data-quality-auditor"')
    expect(toml.split("\n")[1]).toMatch(/^description = "/)
    // The body key is `developer_instructions`, not `instructions`.
    expect(toml).toContain("developer_instructions = ")
    expect(toml).not.toMatch(/^instructions = /m)
    // JSON-style escaped string (no triple-quoted form).
    expect(toml).not.toContain('"""')
    // Path was transformed inside the body.
    expect(toml).toContain(".codex/cache/")
    expect(toml).not.toContain(".claude/cache/")
  })

  test("filename collision throws clearly", async () => {
    // Build a synthetic plugin with two agents whose names collide after sanitize.
    const p = await loadClaudePlugin(MINI_PLUGIN)
    const collidingPlugin = {
      ...p,
      agents: [
        { name: "data:quality:auditor", description: "x", body: "x", sourcePath: "x" },
        { name: "data-quality-auditor", description: "y", body: "y", sourcePath: "y" },
      ],
    }
    expect(() => convertClaudeToCodex(collidingPlugin as typeof p)).toThrow(/filename collision/)
  })
})
