import { describe, expect, test } from "bun:test"
import { promises as fs } from "fs"
import path from "path"

const SKILLS_DIR = path.resolve(import.meta.dir, "..", "plugins", "baseloop-gtm", "skills")
const CODEX_SKILLS_DIR = path.resolve(import.meta.dir, "..", "plugins", "baseloop-gtm", "codex-skills")

type Issue = { skill: string; ref: string; reason: string }

async function listSkills(): Promise<string[]> {
  const entries = await fs.readdir(SKILLS_DIR, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name)
}

function findMarkdownLinkPaths(body: string): string[] {
  // Match standard markdown link `[text](path)` where path doesn't start with http(s) or mailto.
  const matches = body.matchAll(/\[[^\]]*\]\((?!https?:|mailto:|#)([^)\s]+)\)/g)
  return [...matches].map((m) => m[1])
}

describe("reference paths", () => {
  test("every ./references/X.md path in SKILL.md resolves to a real file", async () => {
    const issues: Issue[] = []
    for (const skill of await listSkills()) {
      const skillDir = path.join(SKILLS_DIR, skill)
      const body = await fs.readFile(path.join(skillDir, "SKILL.md"), "utf8")
      for (const ref of findMarkdownLinkPaths(body)) {
        if (!ref.startsWith("./references/")) continue
        const resolved = path.join(skillDir, ref)
        try {
          await fs.access(resolved)
        } catch {
          issues.push({ skill, ref, reason: "file not found" })
        }
      }
    }
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([])
  })

  test("no SKILL.md contains a cross-skill reference path (../<skill>/references/)", async () => {
    const issues: Issue[] = []
    for (const skill of await listSkills()) {
      const skillDir = path.join(SKILLS_DIR, skill)
      const body = await fs.readFile(path.join(skillDir, "SKILL.md"), "utf8")
      for (const ref of findMarkdownLinkPaths(body)) {
        if (/^\.\.\/[^\/]+\/references\//.test(ref)) {
          issues.push({ skill, ref, reason: "cross-skill reference path forbidden" })
        }
      }
    }
    expect(issues, JSON.stringify(issues, null, 2)).toEqual([])
  })

  test("synced reference copies match their canonical source", async () => {
    const REPO_ROOT = path.resolve(import.meta.dir, "..")
    const REF_SOURCES = path.join(REPO_ROOT, "docs", "reference-sources")
    const registry = JSON.parse(await fs.readFile(path.join(REF_SOURCES, "registry.json"), "utf8")) as Record<string, string[]>

    for (const [fileName, consumers] of Object.entries(registry)) {
      const canonical = await fs.readFile(path.join(REF_SOURCES, fileName), "utf8")
      for (const skill of consumers) {
        const copyPath = path.join(SKILLS_DIR, skill, "references", fileName)
        const copy = await fs.readFile(copyPath, "utf8")
        // Strip the SYNC SOURCE header (first line + blank line) before compare.
        const stripped = copy.replace(/^<!-- SYNC SOURCE:[^\n]*-->\n\n/, "")
        expect(stripped, `${skill}/references/${fileName}: drift from canonical`).toBe(canonical)
      }
    }
  })

  test("codex skill copies match canonical codex-compatible skills", async () => {
    const canonicalSkills = (await listSkills()).filter((skill) => !["update"].includes(skill)).sort()
    const codexSkills = (await fs.readdir(CODEX_SKILLS_DIR, { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()

    expect(codexSkills).toEqual(canonicalSkills)

    for (const skill of canonicalSkills) {
      const canonicalDir = path.join(SKILLS_DIR, skill)
      const codexDir = path.join(CODEX_SKILLS_DIR, skill)
      const canonicalFiles = await listRelativeFiles(canonicalDir)
      const codexFiles = await listRelativeFiles(codexDir)
      expect(codexFiles, `${skill}: codex skill file list drift`).toEqual(canonicalFiles)

      for (const relativeFile of canonicalFiles) {
        const canonical = await fs.readFile(path.join(canonicalDir, relativeFile), "utf8")
        const codex = await fs.readFile(path.join(codexDir, relativeFile), "utf8")
        expect(codex, `${skill}/${relativeFile}: codex skill content drift`).toBe(
          codexMirrorContent(skill, relativeFile, canonical),
        )
      }
    }
  })
})

async function listRelativeFiles(root: string, dir: string = root): Promise<string[]> {
  const out: string[] = []
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      out.push(...await listRelativeFiles(root, fullPath))
    } else if (entry.isFile()) {
      out.push(path.relative(root, fullPath))
    }
  }
  return out.sort()
}

function codexMirrorContent(skill: string, relativeFile: string, content: string): string {
  if (relativeFile !== "SKILL.md") return content
  if (skill === "baseloop-gtm") return content
  return content.replace(
    new RegExp(`(^---\\n[\\s\\S]*?^name:\\s*)baseloop-gtm:${skill}(\\s*$)`, "m"),
    `$1${skill}$2`,
  )
}
