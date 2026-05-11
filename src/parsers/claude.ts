import { promises as fs } from "fs"
import path from "path"
import type {
  ClaudeAgent,
  ClaudeManifest,
  ClaudeMcpServer,
  ClaudePlugin,
  ClaudeSkill,
} from "../types/claude"
import { pathExists, readJson, readText } from "../utils/files"
import { parseFrontmatter } from "../utils/frontmatter"

/**
 * Read a plugin directory (containing .claude-plugin/plugin.json + skills/ +
 * agents/) and produce a fully-parsed ClaudePlugin object. Throws on
 * structural problems (missing manifest, malformed frontmatter, etc.) so
 * downstream targets can rely on the shape.
 */
export async function loadClaudePlugin(root: string): Promise<ClaudePlugin> {
  const absRoot = path.resolve(root)
  const manifestPath = path.join(absRoot, ".claude-plugin", "plugin.json")
  if (!(await pathExists(manifestPath))) {
    throw new Error(`Plugin manifest not found at ${manifestPath}`)
  }
  const manifest = await readJson<ClaudeManifest>(manifestPath)
  if (typeof manifest.name !== "string" || manifest.name.trim() === "") {
    throw new Error(`${manifestPath}: missing required field 'name'`)
  }

  const agents = await loadAgents(path.join(absRoot, "agents"))
  const skills = await loadSkills(path.join(absRoot, "skills"))

  const mcpServers: Record<string, ClaudeMcpServer> | undefined = manifest.mcpServers

  return { root: absRoot, manifest, agents, skills, mcpServers }
}

function optionalString(data: Record<string, unknown>, key: string, filePath: string): string | undefined {
  const value = data[key]
  if (value === undefined) return undefined
  if (typeof value !== "string") throw new Error(`${filePath}: frontmatter '${key}' must be a string`)
  return value
}

function optionalBoolean(data: Record<string, unknown>, key: string, filePath: string): boolean | undefined {
  const value = data[key]
  if (value === undefined) return undefined
  if (typeof value !== "boolean") throw new Error(`${filePath}: frontmatter '${key}' must be a boolean`)
  return value
}

function optionalStringArray(data: Record<string, unknown>, key: string, filePath: string): string[] | undefined {
  const value = data[key]
  if (value === undefined) return undefined
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`${filePath}: frontmatter '${key}' must be an array of strings`)
  }
  return value
}

function frontmatterName(data: Record<string, unknown>, fallback: string, filePath: string): string {
  const name = optionalString(data, "name", filePath) ?? fallback
  if (name.trim() === "") throw new Error(`${filePath}: frontmatter 'name' must not be empty`)
  return name
}

async function loadAgents(dir: string): Promise<ClaudeAgent[]> {
  if (!(await pathExists(dir))) return []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const agents: ClaudeAgent[] = []
  for (const e of entries) {
    if (!e.isFile()) continue
    if (!e.name.endsWith(".agent.md") && !e.name.endsWith(".md")) continue
    if (e.name === "README.md") continue
    const filePath = path.join(dir, e.name)
    const raw = await readText(filePath)
    const { data, body } = parseFrontmatter(raw, filePath)
    const name = frontmatterName(data, e.name.replace(/\.(agent\.)?md$/, ""), filePath)
    agents.push({
      name,
      description: optionalString(data, "description", filePath),
      model: optionalString(data, "model", filePath),
      body,
      sourcePath: filePath,
    })
  }
  return agents
}

async function loadSkills(dir: string): Promise<ClaudeSkill[]> {
  if (!(await pathExists(dir))) return []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const skills: ClaudeSkill[] = []
  for (const e of entries) {
    if (!e.isDirectory()) continue
    const skillDir = path.join(dir, e.name)
    const skillPath = path.join(skillDir, "SKILL.md")
    if (!(await pathExists(skillPath))) continue
    const raw = await readText(skillPath)
    const { data } = parseFrontmatter(raw, skillPath)
    skills.push({
      name: frontmatterName(data, e.name, skillPath),
      description: optionalString(data, "description", skillPath),
      argumentHint: optionalString(data, "argument-hint", skillPath),
      disableModelInvocation: optionalBoolean(data, "disable-model-invocation", skillPath),
      ce_platforms: optionalStringArray(data, "ce_platforms", skillPath),
      sourceDir: skillDir,
      skillPath,
    })
  }
  return skills
}
