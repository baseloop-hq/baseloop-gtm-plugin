import { describe, expect, test } from "bun:test"
import { promises as fs } from "fs"
import path from "path"
import { load } from "js-yaml"

const REPO_ROOT = path.resolve(import.meta.dir, "..")
const PLUGIN_JSON = path.join(REPO_ROOT, "plugins", "baseloop-gtm", ".claude-plugin", "plugin.json")
const CODEX_PLUGIN_JSON = path.join(REPO_ROOT, "plugins", "baseloop-gtm", ".codex-plugin", "plugin.json")
const CODEX_MCP_JSON = path.join(REPO_ROOT, "plugins", "baseloop-gtm", ".mcp.json")
const MARKETPLACE_JSON = path.join(REPO_ROOT, ".claude-plugin", "marketplace.json")
const AGENTS_MARKETPLACE_JSON = path.join(REPO_ROOT, ".agents", "plugins", "marketplace.json")
const PACKAGE_JSON = path.join(REPO_ROOT, "package.json")

async function readJson<T>(p: string): Promise<T> {
  return JSON.parse(await fs.readFile(p, "utf8")) as T
}

describe("marketplace consistency", () => {
  test("plugin.json has required public-release fields", async () => {
    const plugin = await readJson<Record<string, unknown>>(PLUGIN_JSON)
    expect(plugin.name).toBe("baseloop-gtm")
    expect(plugin.version).toBeTypeOf("string")
    expect(plugin.description).toBeTypeOf("string")
    expect(plugin.license).toBe("SEE LICENSE IN LICENSE")
    expect(plugin.repository).toBeTypeOf("string")
    expect(plugin.homepage).toBeTypeOf("string")
    expect(plugin.mcpServers).toBeTypeOf("object")
  })

  test("marketplace.json structure is valid", async () => {
    const market = await readJson<{
      name: string
      owner: { name: string; email: string }
      metadata: { version: string }
      plugins: Array<Record<string, unknown>>
    }>(MARKETPLACE_JSON)
    expect(market.name).toBe("baseloop")
    expect(market.metadata.version).toBeTypeOf("string")
    expect(market.plugins.length).toBe(1)
    expect(market.plugins[0].name).toBe("baseloop-gtm")
    expect(market.plugins[0].source).toBe("./plugins/baseloop-gtm")
  })

  test("plugin and marketplace descriptions are non-empty (intentionally different — separate builders)", async () => {
    const plugin = await readJson<{ description: string }>(PLUGIN_JSON)
    const market = await readJson<{ plugins: Array<{ description: string }> }>(MARKETPLACE_JSON)
    expect(plugin.description.length).toBeGreaterThan(40)
    expect(market.plugins[0].description.length).toBeGreaterThan(40)
  })

  test("marketplace.json has no per-plugin version field (drift-prone, dropped per release-please convention)", async () => {
    const market = await readJson<{ plugins: Array<Record<string, unknown>> }>(MARKETPLACE_JSON)
    expect(market.plugins[0]).not.toHaveProperty("version")
  })

  test("agents marketplace descriptor structure is valid", async () => {
    const market = await readJson<{
      name: string
      interface: { displayName: string }
      plugins: Array<{
        name: string
        source: { source: string; path: string }
        policy: { installation: string; authentication: string }
        category: string
        version?: string
      }>
    }>(AGENTS_MARKETPLACE_JSON)

    expect(market.name).toBe("baseloop-gtm-plugin")
    expect(market.interface.displayName).toBe("Baseloop GTM")
    expect(market.plugins.length).toBe(1)
    expect(market.plugins[0].name).toBe("baseloop-gtm")
    expect(market.plugins[0].source).toEqual({
      source: "local",
      path: "./plugins/baseloop-gtm",
    })
    expect(market.plugins[0].policy).toEqual({
      installation: "AVAILABLE",
      authentication: "ON_INSTALL",
    })
    expect(market.plugins[0].category).toBe("Productivity")
    expect(market.plugins[0]).not.toHaveProperty("version")
  })

  test("codex manifest references MCP config by path", async () => {
    const plugin = await readJson<{ mcpServers: string; skills: string }>(CODEX_PLUGIN_JSON)
    expect(plugin.skills).toBe("./codex-skills/")
    expect(plugin.mcpServers).toBe("./.mcp.json")

    const mcp = await readJson<{ mcpServers: Record<string, unknown> }>(CODEX_MCP_JSON)
    expect(mcp.mcpServers).toHaveProperty("baseloop")
  })

  test("codex starter prompts only reference codex-compatible skills", async () => {
    const plugin = await readJson<{ interface: { defaultPrompt: string[] } }>(CODEX_PLUGIN_JSON)
    expect(plugin.interface.defaultPrompt).not.toContain("/baseloop-gtm:update")
  })

  test("codex native skill tree excludes Claude-only skills", async () => {
    const plugin = await readJson<{ skills: string }>(CODEX_PLUGIN_JSON)
    const codexSkillsDir = path.join(REPO_ROOT, "plugins", "baseloop-gtm", plugin.skills)
    const entries = (await fs.readdir(codexSkillsDir, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
    expect(entries).not.toContain("update")

    for (const entry of entries) {
      const raw = await fs.readFile(path.join(codexSkillsDir, entry, "SKILL.md"), "utf8")
      const match = raw.match(/^---\n([\s\S]*?)\n---/)
      expect(match, `${entry}: missing frontmatter`).not.toBeNull()
      const frontmatter = load(match![1]) as { name?: string; ce_platforms?: string[] }
      const expectedName = entry === "baseloop-gtm" ? "baseloop-gtm" : entry
      expect(frontmatter.name, `${entry}: Codex skill name should be plugin-local`).toBe(expectedName)
      expect(frontmatter.name?.startsWith("baseloop-gtm:"), `${entry}: Codex skill name is double-namespaced`).toBe(false)
      expect(frontmatter.ce_platforms === undefined || frontmatter.ce_platforms.includes("codex")).toBe(true)
    }
  })

  test("package.json has expected scripts", async () => {
    const pkg = await readJson<{ scripts: Record<string, string> }>(PACKAGE_JSON)
    expect(pkg.scripts).toHaveProperty("test")
    expect(pkg.scripts).toHaveProperty("references:sync")
    expect(pkg.scripts).toHaveProperty("references:check")
  })

  test("contact email uses baseloop.io (not .com)", async () => {
    const market = await readJson<{ owner: { email: string } }>(MARKETPLACE_JSON)
    expect(market.owner.email.endsWith("@baseloop.io")).toBe(true)
  })

  test("GitHub Actions use immutable action refs", async () => {
    const workflowsDir = path.join(REPO_ROOT, ".github", "workflows")
    const workflowFiles = (await fs.readdir(workflowsDir)).filter((file) => file.endsWith(".yml") || file.endsWith(".yaml"))
    const mutableRefs: string[] = []

    for (const file of workflowFiles) {
      const lines = (await fs.readFile(path.join(workflowsDir, file), "utf8")).split("\n")
      lines.forEach((line, index) => {
        const match = line.match(/\buses:\s*([^@\s]+)@([^\s#]+)/)
        if (!match) return
        const ref = match[2]
        if (!/^[0-9a-f]{40}$/i.test(ref)) {
          mutableRefs.push(`${file}:${index + 1}: ${match[0]}`)
        }
      })
    }

    expect(mutableRefs, mutableRefs.join("\n")).toEqual([])
  })

  test("release workflow keeps dependency install out of write-scoped jobs", async () => {
    const workflow = load(await fs.readFile(path.join(REPO_ROOT, ".github", "workflows", "release-pr.yml"), "utf8")) as {
      jobs: Record<string, { permissions?: Record<string, string>; steps?: Array<Record<string, unknown>> }>
    }
    const writeScopedJobs = Object.entries(workflow.jobs).filter(([, job]) =>
      Object.values(job.permissions ?? {}).some((permission) => permission === "write"),
    )

    for (const [jobName, job] of writeScopedJobs) {
      const steps = job.steps ?? []
      expect(
        steps.some((step) => typeof step.run === "string" && step.run.includes("bun install")),
        `${jobName}: write-scoped job must not install dependencies`,
      ).toBe(false)
      for (const step of steps) {
        if (typeof step.uses === "string" && step.uses.startsWith("actions/checkout@")) {
          expect(
            (step.with as Record<string, unknown> | undefined)?.["persist-credentials"],
            `${jobName}: checkout credentials should not persist`,
          ).toBe(false)
        }
      }
    }
  })

  test("release workflow uploads GTM assets only for baseloop-gtm component releases", async () => {
    const workflow = load(await fs.readFile(path.join(REPO_ROOT, ".github", "workflows", "release-pr.yml"), "utf8")) as {
      jobs: Record<
        string,
        {
          if?: string
          needs?: string | string[]
          outputs?: Record<string, string>
          permissions?: Record<string, string>
          steps?: Array<Record<string, unknown>>
        }
      >
    }
    const releaseJob = workflow.jobs["release-pr"]
    const buildJob = workflow.jobs["build-gtm-assets"]
    const uploadJob = workflow.jobs["upload-gtm-assets"]

    expect(releaseJob.outputs?.gtm_release_created).toContain("plugins/baseloop-gtm--release_created")
    expect(releaseJob.outputs?.gtm_tag_name).toContain("plugins/baseloop-gtm--tag_name")
    expect(buildJob.if).toBe("needs.release-pr.outputs.gtm_release_created == 'true'")
    expect(uploadJob.if).toBe("needs.release-pr.outputs.gtm_release_created == 'true'")
    expect(buildJob.permissions?.contents).toBe("read")
    expect(uploadJob.permissions?.contents).toBe("write")

    const buildScript = buildJob.steps?.find((step) => step.name === "Package and checksum GTM assets")?.run
    expect(buildScript).toContain('VERSION="${TAG_NAME#baseloop-gtm-v}"')
    expect(buildScript).toContain('ZIP="dist/baseloop-gtm-${VERSION}.zip"')
    expect(buildScript).toContain('bun run package:zip')
    expect(buildScript).toContain('[[ ! -f "$ZIP" ]]')
    expect(buildScript).toContain('(cd dist && sha256sum "baseloop-gtm-${VERSION}.zip" > checksums.txt)')
    expect(buildScript).toContain('cp "$ZIP" release-assets/')
    expect(buildScript).toContain("cp dist/checksums.txt release-assets/")

    const artifactPaths = (buildJob.steps?.find((step) => step.name === "Upload GTM asset artifact")?.with as
      | Record<string, unknown>
      | undefined)?.path
    expect(artifactPaths).toBe("release-assets/")

    const uploadScript = uploadJob.steps?.find((step) => step.name === "Upload GTM release assets")?.run
    expect(uploadScript).toContain('gh release upload "$TAG_NAME"')
    expect(uploadScript).toContain('"release-assets/baseloop-gtm-${VERSION}.zip"')
    expect(uploadScript).toContain('"release-assets/checksums.txt"')
    expect(uploadScript).toContain('--repo "$GITHUB_REPOSITORY"')
    expect(uploadScript).toContain("--clobber")
  })
})
