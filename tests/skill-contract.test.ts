import { describe, expect, test } from "bun:test"
import { promises as fs } from "fs"
import path from "path"
import { load } from "js-yaml"
import { parseFrontmatter } from "../src/utils/frontmatter"

const SKILLS_DIR = path.resolve(import.meta.dir, "..", "plugins", "baseloop-gtm", "skills")
const AGENTS_DIR = path.resolve(import.meta.dir, "..", "plugins", "baseloop-gtm", "agents")
const REFERENCE_SOURCES_DIR = path.resolve(import.meta.dir, "..", "docs", "reference-sources")
const VALID_PLATFORMS = new Set(["claude", "codex", "gemini"])
const RUNTIME_FIRST_SKILLS = ["plan", "build", "review", "diagnose", "engineering"]
const RUNTIME_DISCOVERY_TERMS = [
  "get_connected_platforms",
  "list_actions",
  "get_action_schema",
  "resolve_action_options",
  "get_table_schema",
  "capabilities",
  "creditCostHint",
  "connectionStatus",
]
const STATIC_INVENTORY_PATTERNS = [
  /all available actions/i,
  /all current actions/i,
  /complete action list/i,
  /complete action catalog/i,
  /cost table/i,
  /full action catalog/i,
  /static provider list/i,
  /supported actions are/i,
  /^# Action Catalog$/m,
]
const STALE_ACTION_GUIDE_PATTERNS = [
  /perplexity(?:_ask_question|_ai_agent|\s+ai)?/i,
  /builtwith(?:_find_technology_stack)?/i,
]

type SkillFrontmatter = {
  name?: string
  description?: string
  "argument-hint"?: string
  "disable-model-invocation"?: boolean
  ce_platforms?: string[]
}

async function listSkills(): Promise<string[]> {
  const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

async function readFrontmatter(skill: string): Promise<{ data: SkillFrontmatter; body: string }> {
  const raw = await fs.readFile(path.join(SKILLS_DIR, skill, "SKILL.md"), "utf8")
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/)
  if (!match) throw new Error(`${skill}/SKILL.md has no frontmatter block`)
  return { data: load(match[1]) as SkillFrontmatter, body: match[2] }
}

async function listMarkdownFiles(root: string): Promise<string[]> {
  const entries = await fs.readdir(root, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(root, entry.name)
      if (entry.isDirectory()) return listMarkdownFiles(fullPath)
      return entry.isFile() && entry.name.endsWith(".md") ? [fullPath] : []
    }),
  )
  return files.flat()
}

async function readSkillWithReferences(skill: string): Promise<string> {
  const parts = [await fs.readFile(path.join(SKILLS_DIR, skill, "SKILL.md"), "utf8")]
  const referencesDir = path.join(SKILLS_DIR, skill, "references")

  try {
    for (const file of await listMarkdownFiles(referencesDir)) {
      parts.push(await fs.readFile(file, "utf8"))
    }
  } catch (error) {
    const code = (error as { code?: string }).code
    if (code !== "ENOENT") throw error
  }

  return parts.join("\n")
}

describe("skill contract", () => {
  test("unterminated frontmatter fails closed", () => {
    expect(() => parseFrontmatter("---\nname: baseloop-gtm:setup\nce_platforms: [claude]\n# Missing delimiter")).toThrow(
      /missing closing --- delimiter/,
    )
  })

  test("non-mapping frontmatter fails closed", () => {
    expect(() => parseFrontmatter("---\n- name: baseloop-gtm:bad\n---\n# Bad")).toThrow(
      /expected a mapping\/object/,
    )
  })

  test("every skill has a SKILL.md with parseable frontmatter", async () => {
    for (const skill of await listSkills()) {
      const { data } = await readFrontmatter(skill)
      expect(data, `${skill}: frontmatter empty`).toBeTruthy()
    }
  })

  test("frontmatter name matches baseloop-gtm:<folder>", async () => {
    for (const skill of await listSkills()) {
      const { data } = await readFrontmatter(skill)
      expect(data.name, `${skill}: missing name`).toBeDefined()
      expect(data.name).toBe(`baseloop-gtm:${skill}`)
    }
  })

  test("frontmatter has a non-empty description", async () => {
    for (const skill of await listSkills()) {
      const { data } = await readFrontmatter(skill)
      expect(data.description, `${skill}: missing description`).toBeDefined()
      expect(data.description!.trim().length).toBeGreaterThan(20)
    }
  })

  test("ce_platforms (when set) is a subset of valid platforms", async () => {
    for (const skill of await listSkills()) {
      const { data } = await readFrontmatter(skill)
      if (!data.ce_platforms) continue
      for (const p of data.ce_platforms) {
        expect(VALID_PLATFORMS.has(p), `${skill}: invalid platform "${p}"`).toBe(true)
      }
    }
  })

  test("every SKILL.md has Interaction Method markers", async () => {
    for (const skill of await listSkills()) {
      const { body } = await readFrontmatter(skill)
      expect(body.includes("<!-- INTERACTION-METHOD-START -->"), `${skill}: missing START marker`).toBe(true)
      expect(body.includes("<!-- INTERACTION-METHOD-END -->"), `${skill}: missing END marker`).toBe(true)
    }
  })

  test("environment-probe skills (setup, update) are double-gated", async () => {
    for (const skill of ["setup", "update"]) {
      const { data } = await readFrontmatter(skill)
      expect(data["disable-model-invocation"], `${skill}: should have disable-model-invocation: true`).toBe(true)
      expect(data.ce_platforms, `${skill}: should have ce_platforms set`).toBeDefined()
      expect(data.ce_platforms).toContain("claude")
    }
  })

  test("shipped skill docs avoid static action inventory wording", async () => {
    const files = [
      ...(await listMarkdownFiles(SKILLS_DIR)),
      ...(await listMarkdownFiles(AGENTS_DIR)),
      ...(await listMarkdownFiles(REFERENCE_SOURCES_DIR)),
    ]

    for (const file of files) {
      const text = await fs.readFile(file, "utf8")
      for (const pattern of STATIC_INVENTORY_PATTERNS) {
        expect(pattern.test(text), `${path.relative(path.dirname(SKILLS_DIR), file)} matches ${pattern}`).toBe(false)
      }
    }
  })

  test("shipped skill docs avoid stale action guide references", async () => {
    const files = [
      ...(await listMarkdownFiles(SKILLS_DIR)),
      ...(await listMarkdownFiles(AGENTS_DIR)),
      ...(await listMarkdownFiles(REFERENCE_SOURCES_DIR)),
    ]

    for (const file of files) {
      const text = await fs.readFile(file, "utf8")
      for (const pattern of STALE_ACTION_GUIDE_PATTERNS) {
        expect(pattern.test(text), `${path.relative(path.dirname(SKILLS_DIR), file)} matches ${pattern}`).toBe(false)
      }
    }
  })

  test("runtime-first skills include platform discovery primitives", async () => {
    for (const skill of RUNTIME_FIRST_SKILLS) {
      const text = await readSkillWithReferences(skill)
      for (const term of RUNTIME_DISCOVERY_TERMS) {
        expect(text.includes(term), `${skill}: missing ${term}`).toBe(true)
      }
    }
  })

  test("plan and build use outcome-focused credit guidance", async () => {
    const planText = await readSkillWithReferences("plan")
    expect(planText).toContain("best expected business outcome per credit")
    expect(planText).toContain("Outcome rationale")
    expect(planText).toContain("Core")
    expect(planText).toContain("High confidence")
    expect(planText).not.toContain('prefer `creditCostHint: "free"`')

    const buildText = await readSkillWithReferences("build")
    expect(buildText).toContain("Preserve the plan's value tier")
    expect(buildText).toContain("Avoid substituting a lower-cost action")
    expect(buildText).toContain("cost and expected outcome")
    expect(buildText).not.toContain('prefer `creditCostHint: "free"`')
  })
})
