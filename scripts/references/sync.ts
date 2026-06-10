#!/usr/bin/env bun
/**
 * Sync shared reference files from `docs/reference-sources/` into each
 * consuming skill's `references/` folder. Also injects the canonical
 * Interaction Method block between `<!-- INTERACTION-METHOD-START -->` and
 * `<!-- INTERACTION-METHOD-END -->` markers in every SKILL.md.
 *
 * Flags:
 *   --check   Exit non-zero if any consumer copy drifts from its source,
 *             or if any SKILL.md's Interaction Method block drifts. Prints
 *             a diff-friendly message naming the offending file. Used by CI.
 *
 * Default:   Write the current canonical content into every consumer copy
 *            and into every SKILL.md between its interaction-method markers.
 */
import { promises as fs } from "fs"
import path from "path"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const REF_SOURCES_DIR = path.join(REPO_ROOT, "docs", "reference-sources")
const SKILLS_DIR = path.join(REPO_ROOT, "plugins", "baseloop-gtm", "skills")
const REGISTRY_PATH = path.join(REF_SOURCES_DIR, "registry.json")
const INTERACTION_METHOD_PATH = path.join(REF_SOURCES_DIR, "interaction-method.md")
const INTERACTION_START = "<!-- INTERACTION-METHOD-START -->"
const INTERACTION_END = "<!-- INTERACTION-METHOD-END -->"

type Registry = Record<string, string[]>

type DriftReport = {
  file: string
  reason: string
}

const checkOnly = process.argv.includes("--check")
const drifts: DriftReport[] = []

function syncHeader(sourceRelPath: string): string {
  return `<!-- SYNC SOURCE: ${sourceRelPath}. Run \`bun run references:sync\` to refresh. Do not edit directly. -->\n\n`
}

function stripSyncHeader(content: string): string {
  const marker = "<!-- SYNC SOURCE:"
  if (!content.startsWith(marker)) return content
  const endOfLine = content.indexOf("\n")
  if (endOfLine === -1) return ""
  const rest = content.slice(endOfLine + 1)
  return rest.startsWith("\n") ? rest.slice(1) : rest
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

async function syncSharedReferences(): Promise<void> {
  const registryRaw = await fs.readFile(REGISTRY_PATH, "utf8")
  const registry: Registry = JSON.parse(registryRaw)

  for (const [fileName, consumers] of Object.entries(registry)) {
    const sourcePath = path.join(REF_SOURCES_DIR, fileName)
    const sourceRelPath = path.relative(REPO_ROOT, sourcePath)
    const body = await fs.readFile(sourcePath, "utf8")
    const expected = syncHeader(sourceRelPath) + body

    for (const skill of consumers) {
      const targetDir = path.join(SKILLS_DIR, skill, "references")
      const targetPath = path.join(targetDir, fileName)

      if (checkOnly) {
        if (!(await pathExists(targetPath))) {
          drifts.push({ file: path.relative(REPO_ROOT, targetPath), reason: "missing" })
          continue
        }
        const actual = await fs.readFile(targetPath, "utf8")
        if (actual !== expected) {
          drifts.push({ file: path.relative(REPO_ROOT, targetPath), reason: "drift" })
        }
      } else {
        await fs.mkdir(targetDir, { recursive: true })
        await fs.writeFile(targetPath, expected)
      }
    }
  }
}

async function syncInteractionMethodBlocks(): Promise<void> {
  if (!(await pathExists(INTERACTION_METHOD_PATH))) return
  const blockBody = (await fs.readFile(INTERACTION_METHOD_PATH, "utf8")).trim()

  const skillEntries = await fs.readdir(SKILLS_DIR, { withFileTypes: true })
  for (const entry of skillEntries) {
    if (!entry.isDirectory()) continue
    const skillPath = path.join(SKILLS_DIR, entry.name, "SKILL.md")
    if (!(await pathExists(skillPath))) continue

    const current = await fs.readFile(skillPath, "utf8")
    const startIdx = current.indexOf(INTERACTION_START)
    const endIdx = current.indexOf(INTERACTION_END)
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) continue

    const before = current.slice(0, startIdx + INTERACTION_START.length)
    const after = current.slice(endIdx)
    const expected = `${before}\n\n${blockBody}\n\n${after}`

    if (checkOnly) {
      if (current !== expected) {
        drifts.push({
          file: path.relative(REPO_ROOT, skillPath),
          reason: "interaction-method drift",
        })
      }
    } else {
      if (current !== expected) {
        await fs.writeFile(skillPath, expected)
      }
    }
  }
}

await syncSharedReferences()
await syncInteractionMethodBlocks()

if (checkOnly && drifts.length > 0) {
  console.error("Reference drift detected:")
  for (const d of drifts) {
    console.error(`  - ${d.file} (${d.reason})`)
  }
  console.error("\nRun `bun run references:sync` to fix.")
  process.exit(1)
}

if (!checkOnly) {
  console.log("References synced.")
}
