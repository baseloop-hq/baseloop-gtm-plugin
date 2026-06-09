import { promises as fs } from "fs"
import path from "path"
import type { ManifestUpdate, PluginCounts, SyncOptions, SyncResult } from "./types"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const PLUGIN_DIR = path.join(REPO_ROOT, "plugins", "baseloop-gtm")
const PLUGIN_JSON = path.join(PLUGIN_DIR, ".claude-plugin", "plugin.json")
const CODEX_PLUGIN_JSON = path.join(PLUGIN_DIR, ".codex-plugin", "plugin.json")
const MARKETPLACE_JSON = path.join(REPO_ROOT, ".claude-plugin", "marketplace.json")

export async function countSkillDirectories(pluginDir: string): Promise<number> {
  const dir = path.join(pluginDir, "skills")
  const entries = await fs.readdir(dir, { withFileTypes: true })
  let count = 0
  for (const e of entries) {
    if (!e.isDirectory()) continue
    try {
      await fs.access(path.join(dir, e.name, "SKILL.md"))
      count++
    } catch {
      // not a real skill dir
    }
  }
  return count
}

export async function countAgentFiles(pluginDir: string): Promise<number> {
  const dir = path.join(pluginDir, "agents")
  const entries = await fs.readdir(dir, { withFileTypes: true })
  return entries.filter((e) => e.isFile() && e.name.endsWith(".agent.md")).length
}

export async function countMcpServers(pluginDir: string): Promise<number> {
  const manifestPath = path.join(pluginDir, ".claude-plugin", "plugin.json")
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8")) as {
    mcpServers?: Record<string, unknown>
  }
  return manifest.mcpServers ? Object.keys(manifest.mcpServers).length : 0
}

export async function getBaseloopGtmCounts(pluginDir: string = PLUGIN_DIR): Promise<PluginCounts> {
  const [skills, agents, mcpServers] = await Promise.all([
    countSkillDirectories(pluginDir),
    countAgentFiles(pluginDir),
    countMcpServers(pluginDir),
  ])
  return { skills, agents, mcpServers }
}

export function buildBaseloopGtmDescription(counts: PluginCounts): string {
  return (
    `GTM workflow engineering for Baseloop. ${counts.skills} skills, ${counts.agents} agents, CLI-ready instructions, and MCP compatibility for designing, building, reviewing, diagnosing, and autonomously operating data workflows that source, enrich, qualify, and route leads.`
  )
}

export function buildBaseloopGtmMarketplaceDescription(counts: PluginCounts): string {
  return (
    `Build automated GTM data workflows in Baseloop with ${counts.skills} skills, ${counts.agents} read-only audit agents, CLI-ready instructions, and MCP compatibility.`
  )
}

async function readJson(p: string): Promise<Record<string, unknown>> {
  return JSON.parse(await fs.readFile(p, "utf8")) as Record<string, unknown>
}

async function writeJson(p: string, data: unknown): Promise<void> {
  const text = JSON.stringify(data, null, 2) + "\n"
  await fs.writeFile(p, text)
}

type JsonRecord = Record<string | number, unknown>

function getNested(obj: JsonRecord, dotPath: Array<string | number>): unknown {
  let cur: unknown = obj
  for (const k of dotPath) {
    if (cur && typeof cur === "object" && k in (cur as JsonRecord)) {
      cur = (cur as JsonRecord)[k]
    } else {
      return undefined
    }
  }
  return cur
}

function setNested(obj: JsonRecord, dotPath: Array<string | number>, value: unknown): void {
  let cur: JsonRecord = obj
  for (let i = 0; i < dotPath.length - 1; i++) {
    const next = cur[dotPath[i]]
    if (!next || typeof next !== "object") {
      throw new Error(`Cannot set missing path segment "${String(dotPath[i])}"`)
    }
    cur = next as JsonRecord
  }
  cur[dotPath[dotPath.length - 1]] = value
}

export async function syncReleaseMetadata(options: SyncOptions = {}): Promise<SyncResult> {
  const { write = false } = options
  const counts = await getBaseloopGtmCounts()
  const pluginDescription = buildBaseloopGtmDescription(counts)
  const marketplaceDescription = buildBaseloopGtmMarketplaceDescription(counts)

  const targets: Array<{ path: string; dotPath: string[]; expected: string }> = [
    { path: PLUGIN_JSON, dotPath: ["description"], expected: pluginDescription },
    { path: CODEX_PLUGIN_JSON, dotPath: ["description"], expected: pluginDescription },
    { path: MARKETPLACE_JSON, dotPath: ["plugins", "0", "description"], expected: marketplaceDescription },
  ]

  const updates: ManifestUpdate[] = []
  const errors: string[] = []

  for (const t of targets) {
    try {
      const data = await readJson(t.path)
      // Handle array index in dotPath (string "0" → 0)
      const resolvedPath = t.dotPath.map((k) => (/^\d+$/.test(k) ? Number(k) : k))
      const cur = getNested(data, resolvedPath)
      const current = (cur as string) ?? ""

      const update: ManifestUpdate = {
        path: path.relative(REPO_ROOT, t.path),
        field: t.dotPath.join("."),
        current,
        expected: t.expected,
        changed: current !== t.expected,
      }
      updates.push(update)

      if (write && update.changed) {
        setNested(data, resolvedPath, t.expected)
        await writeJson(t.path, data)
      }
    } catch (err) {
      errors.push(`${t.path}: ${err instanceof Error ? err.message : err}`)
    }
  }

  return { updates, errors }
}
