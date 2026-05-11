import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { loadClaudePlugin } from "../src/parsers/claude"
import { convertClaudeToCodex } from "../src/converters/claude-to-codex"
import { convertClaudeToGemini } from "../src/converters/claude-to-gemini"
import { resolveCodexPaths, writeCodexBundle } from "../src/targets/codex"
import { resolveGeminiPaths, writeGeminiBundle } from "../src/targets/gemini"
import type { CodexBundle } from "../src/types/codex"
import type { GeminiBundle } from "../src/types/gemini"

const MINI_PLUGIN = path.resolve(import.meta.dir, "fixtures", "mini-plugin")

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "baseloop-cli-test-"))
})

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true })
})

describe("install codex (end-to-end)", () => {
  test("rejects invalid skill frontmatter before conversion", async () => {
    const pluginRoot = path.join(tmpRoot, "bad-plugin")
    await fs.mkdir(path.join(pluginRoot, ".claude-plugin"), { recursive: true })
    await fs.mkdir(path.join(pluginRoot, "skills", "bad"), { recursive: true })
    await fs.writeFile(
      path.join(pluginRoot, ".claude-plugin", "plugin.json"),
      JSON.stringify({ name: "bad-plugin", version: "1.0.0" }),
    )
    await fs.writeFile(
      path.join(pluginRoot, "skills", "bad", "SKILL.md"),
      "---\nname: bad-plugin:bad\nce_platforms: codex\n---\n# Bad\n",
    )

    await expect(loadClaudePlugin(pluginRoot)).rejects.toThrow(/ce_platforms.*array of strings/)
  })

  test("writes agent TOML files + manifest", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToCodex(plugin)
    const paths = resolveCodexPaths(tmpRoot, plugin.manifest.name)
    await writeCodexBundle(bundle, paths)

    const tomlPath = path.join(paths.agentsDir, "data-quality-auditor.toml")
    const tomlContent = await fs.readFile(tomlPath, "utf8")
    expect(tomlContent).toContain('name = "data-quality-auditor"')
    expect(tomlContent).toContain("developer_instructions = ")
    expect(tomlContent).not.toContain("[agent]")

    const manifestPath = path.join(paths.managedDir, "install-manifest.json")
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"))
    expect(manifest.pluginName).toBe("mini-plugin")
    expect(manifest.groups.agents).toContain("data-quality-auditor.toml")
  })

  test("dry-run writes nothing", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToCodex(plugin)
    const paths = resolveCodexPaths(tmpRoot, plugin.manifest.name)
    const report = await writeCodexBundle(bundle, paths, { dryRun: true })
    expect(report.agentsWritten.length).toBe(1)

    // Nothing actually on disk.
    let exists = true
    try {
      await fs.access(paths.agentsDir)
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })

  test("re-install is idempotent (cleanup of stale files via manifest)", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToCodex(plugin)
    const paths = resolveCodexPaths(tmpRoot, plugin.manifest.name)

    await writeCodexBundle(bundle, paths)
    const before = (await fs.readdir(paths.agentsDir)).sort()
    await writeCodexBundle(bundle, paths)
    const after = (await fs.readdir(paths.agentsDir)).sort()
    expect(after).toEqual(before)
  })

  test("refuses to overwrite unmanaged Codex agent files", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToCodex(plugin)
    const paths = resolveCodexPaths(tmpRoot, plugin.manifest.name)
    await fs.mkdir(paths.agentsDir, { recursive: true })
    await fs.writeFile(path.join(paths.agentsDir, "data-quality-auditor.toml"), "user-owned")

    await expect(writeCodexBundle(bundle, paths)).rejects.toThrow(/Refusing to overwrite unmanaged agents target/)
  })

  test("Codex install can recover after a mid-install copy failure", async () => {
    const goodSkillDir = path.join(tmpRoot, "good-skill")
    const missingSkillDir = path.join(tmpRoot, "missing-skill")
    await fs.mkdir(goodSkillDir, { recursive: true })
    await fs.writeFile(path.join(goodSkillDir, "SKILL.md"), "# Good\n")
    const bundle: CodexBundle = {
      pluginName: "partial-plugin",
      agents: [{ name: "partial-agent", toml: 'name = "partial-agent"\n' }],
      skills: [
        { name: "good-skill", sourceDir: goodSkillDir },
        { name: "missing-skill", sourceDir: missingSkillDir },
      ],
      invocationTargets: { skillTargets: {}, agentTargets: {} },
    }
    const paths = resolveCodexPaths(tmpRoot, bundle.pluginName)

    await expect(writeCodexBundle(bundle, paths)).rejects.toThrow()
    expect(await fs.access(path.join(paths.managedDir, "install-manifest.json")).then(() => true)).toBe(true)
    expect(await fs.access(path.join(paths.agentsDir, "partial-agent.toml")).then(() => true)).toBe(true)

    await fs.mkdir(missingSkillDir, { recursive: true })
    await fs.writeFile(path.join(missingSkillDir, "SKILL.md"), "# Recovered\n")
    await expect(writeCodexBundle(bundle, paths)).resolves.toBeDefined()
  })

  test("ensureCodexAgentsFile writes managed tool-mapping block", async () => {
    const { ensureCodexAgentsFile, CODEX_AGENTS_BLOCK_START, CODEX_AGENTS_BLOCK_END } = await import("../src/utils/codex-agents")
    const result = await ensureCodexAgentsFile(tmpRoot)
    expect(result.created).toBe(true)
    const content = await fs.readFile(result.path, "utf8")
    expect(content).toContain(CODEX_AGENTS_BLOCK_START)
    expect(content).toContain(CODEX_AGENTS_BLOCK_END)
    expect(content).toContain("Tool mapping")
  })

  test("ensureCodexAgentsFile preserves user content outside the markers", async () => {
    const { ensureCodexAgentsFile } = await import("../src/utils/codex-agents")
    const userContent = "# My Notes\n\nMy own custom Codex instructions go here.\n"
    const agentsPath = path.join(tmpRoot, "AGENTS.md")
    await fs.mkdir(tmpRoot, { recursive: true })
    await fs.writeFile(agentsPath, userContent)

    await ensureCodexAgentsFile(tmpRoot)
    const after = await fs.readFile(agentsPath, "utf8")
    expect(after).toContain("# My Notes")
    expect(after).toContain("My own custom Codex instructions go here.")
    expect(after).toContain("BASELOOP CODEX TOOL MAP")
  })

  test("install --to all honors explicit target roots even when default homes are absent", async () => {
    const codexHome = path.join(tmpRoot, "codex-home")
    const geminiHome = path.join(tmpRoot, "gemini-home")
    const result = Bun.spawnSync([
      "bun",
      "run",
      path.resolve(import.meta.dir, "..", "src", "index.ts"),
      "install",
      MINI_PLUGIN,
      "--to",
      "all",
      "--codex-home",
      codexHome,
      "--gemini-home",
      geminiHome,
    ])

    expect(result.exitCode).toBe(0)
    expect(await fs.access(path.join(codexHome, "agents", "data-quality-auditor.toml")).then(() => true)).toBe(true)
    expect(await fs.access(path.join(geminiHome, "settings.json")).then(() => true)).toBe(true)
  })
})

describe("install gemini (end-to-end)", () => {
  test("writes skills + agents + merges MCP into settings.json", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(plugin)
    const paths = resolveGeminiPaths(tmpRoot, plugin.manifest.name)
    const warnings: string[] = []
    const report = await writeGeminiBundle(bundle, paths, {
      warn: (m) => warnings.push(m),
    })

    expect(report.skillsWritten.length).toBeGreaterThan(0)
    expect(report.agentsWritten.length).toBe(1)
    expect(report.mcpServersMerged).toContain("baseloop")
    expect(report.mcpServersMerged).toContain("secret-server")

    // settings.json wrote with both servers.
    const settings = JSON.parse(await fs.readFile(paths.settingsPath, "utf8"))
    expect(settings.mcpServers).toHaveProperty("baseloop")
    expect(settings.mcpServers).toHaveProperty("secret-server")

    // Secrets warning fired for secret-server (has MY_API_KEY).
    expect(warnings.some((m) => m.includes("secret-server") && m.includes("MY_API_KEY"))).toBe(true)
  })

  test("refuses to overwrite unmanaged Gemini skill directories", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(plugin)
    const paths = resolveGeminiPaths(tmpRoot, plugin.manifest.name)
    await fs.mkdir(path.join(paths.skillsDir, "mini-plugin-foo"), { recursive: true })
    await fs.writeFile(path.join(paths.skillsDir, "mini-plugin-foo", "SKILL.md"), "user-owned")

    await expect(writeGeminiBundle(bundle, paths, { warn: () => {} })).rejects.toThrow(
      /Refusing to overwrite unmanaged skills target/,
    )
  })

  test("Gemini install can recover after a mid-install copy failure", async () => {
    const goodSkillDir = path.join(tmpRoot, "good-skill")
    const missingSkillDir = path.join(tmpRoot, "missing-skill")
    await fs.mkdir(goodSkillDir, { recursive: true })
    await fs.writeFile(path.join(goodSkillDir, "SKILL.md"), "# Good\n")
    const bundle: GeminiBundle = {
      pluginName: "partial-plugin",
      skills: [
        { name: "good-skill", sourceDir: goodSkillDir },
        { name: "missing-skill", sourceDir: missingSkillDir },
      ],
      agents: [],
      mcpServers: {},
    }
    const paths = resolveGeminiPaths(tmpRoot, bundle.pluginName)

    await expect(writeGeminiBundle(bundle, paths, { warn: () => {} })).rejects.toThrow()
    expect(await fs.access(path.join(paths.managedDir, "install-manifest.json")).then(() => true)).toBe(true)
    expect(await fs.access(path.join(paths.skillsDir, "good-skill", "SKILL.md")).then(() => true)).toBe(true)

    await fs.mkdir(missingSkillDir, { recursive: true })
    await fs.writeFile(path.join(missingSkillDir, "SKILL.md"), "# Recovered\n")
    await expect(writeGeminiBundle(bundle, paths, { warn: () => {} })).resolves.toBeDefined()
  })

  test("rejects unsafe generated path segments before writing skills", async () => {
    const bundle: GeminiBundle = {
      pluginName: "mini-plugin",
      skills: [{ name: "!!!", sourceDir: path.join(MINI_PLUGIN, "skills", "foo") }],
      agents: [],
      mcpServers: {},
    }
    const paths = resolveGeminiPaths(tmpRoot, bundle.pluginName)

    await expect(writeGeminiBundle(bundle, paths, { warn: () => {} })).rejects.toThrow(/Unsafe path segment/)
  })

  test("preserves user-existing MCP servers in settings.json", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(plugin)
    const paths = resolveGeminiPaths(tmpRoot, plugin.manifest.name)

    // Pre-seed an existing settings.json with a user-owned MCP server.
    await fs.mkdir(paths.geminiHome, { recursive: true })
    await fs.writeFile(
      paths.settingsPath,
      JSON.stringify({ mcpServers: { "user-server": { url: "https://user.example/mcp" } } }, null, 2),
    )

    await writeGeminiBundle(bundle, paths, { warn: () => {} })
    const settings = JSON.parse(await fs.readFile(paths.settingsPath, "utf8"))
    expect(settings.mcpServers).toHaveProperty("user-server")
    expect(settings.mcpServers).toHaveProperty("baseloop")
  })

  test("fails closed when Gemini settings.json is malformed", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(plugin)
    const paths = resolveGeminiPaths(tmpRoot, plugin.manifest.name)
    await fs.mkdir(paths.geminiHome, { recursive: true })
    await fs.writeFile(paths.settingsPath, "{not json")

    await expect(writeGeminiBundle(bundle, paths, { warn: () => {} })).rejects.toThrow(/could not be parsed/)
    expect(await fs.readFile(paths.settingsPath, "utf8")).toBe("{not json")
    await expect(fs.access(paths.skillsDir)).rejects.toThrow()
    await expect(fs.access(paths.agentsDir)).rejects.toThrow()
    await expect(fs.access(path.join(paths.managedDir, "install-manifest.json"))).rejects.toThrow()
  })

  test("dry-run leaves settings.json absent", async () => {
    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(plugin)
    const paths = resolveGeminiPaths(tmpRoot, plugin.manifest.name)
    await writeGeminiBundle(bundle, paths, { dryRun: true, warn: () => {} })
    let exists = true
    try {
      await fs.access(paths.settingsPath)
    } catch {
      exists = false
    }
    expect(exists).toBe(false)
  })
})

describe("cleanup CLI", () => {
  test("ignores malformed install manifests instead of trusting them", async () => {
    const paths = resolveGeminiPaths(tmpRoot, "baseloop-gtm")
    await fs.mkdir(paths.managedDir, { recursive: true })
    await fs.writeFile(
      path.join(paths.managedDir, "install-manifest.json"),
      JSON.stringify({
        version: 1,
        pluginName: "baseloop-gtm",
        groups: { skills: "../settings.json" },
      }),
    )

    const plugin = await loadClaudePlugin(MINI_PLUGIN)
    const bundle = convertClaudeToGemini(plugin)
    await writeGeminiBundle(bundle, paths, { warn: () => {} })
    const manifest = JSON.parse(await fs.readFile(path.join(paths.managedDir, "install-manifest.json"), "utf8"))
    expect(manifest.groups.skills).toContain("mini-plugin-foo")
  })

  test("skips manifest entries that escape managed group directories", async () => {
    const paths = resolveGeminiPaths(tmpRoot, "baseloop-gtm")
    await fs.mkdir(path.join(paths.skillsDir, "old-skill"), { recursive: true })
    await fs.writeFile(path.join(paths.skillsDir, "old-skill", "SKILL.md"), "old")
    await fs.writeFile(paths.settingsPath, "{}")
    await fs.writeFile(path.join(paths.geminiHome, "AGENTS.md"), "user-owned")
    await fs.mkdir(paths.managedDir, { recursive: true })
    await fs.writeFile(
      path.join(paths.managedDir, "install-manifest.json"),
      JSON.stringify({
        version: 1,
        pluginName: "baseloop-gtm",
        groups: {
          skills: ["old-skill", "../settings.json", "."],
          agents: ["../AGENTS.md"],
        },
      }),
    )

    const result = Bun.spawnSync([
      "bun",
      "run",
      path.resolve(import.meta.dir, "..", "src", "index.ts"),
      "cleanup",
      "--target",
      "gemini",
      "--gemini-home",
      tmpRoot,
    ])

    expect(result.exitCode).toBe(0)
    expect(await fs.access(paths.settingsPath).then(() => true)).toBe(true)
    expect(await fs.access(path.join(paths.geminiHome, "AGENTS.md")).then(() => true)).toBe(true)
    await expect(fs.access(path.join(paths.skillsDir, "old-skill"))).rejects.toThrow()
  })
})
