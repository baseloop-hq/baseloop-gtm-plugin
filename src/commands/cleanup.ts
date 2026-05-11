import { promises as fs } from "fs"
import path from "path"
import { defineCommand } from "citty"
import { resolveCodexPaths } from "../targets/codex"
import { resolveGeminiPaths } from "../targets/gemini"
import { isSafeManagedPath, isSafePathSegment, pathExists } from "../utils/files"
import { readManifest } from "../targets/managed-artifacts"

const TARGETS = ["codex", "gemini"] as const

export default defineCommand({
  meta: {
    name: "cleanup",
    description: "Remove a previous install of the baseloop-gtm plugin.",
  },
  args: {
    target: {
      type: "string",
      required: true,
      description: "Target: codex | gemini",
    },
    "codex-home": {
      type: "string",
      description: "Override Codex install root.",
    },
    "gemini-home": {
      type: "string",
      description: "Override Gemini install root.",
    },
    "dry-run": {
      type: "boolean",
      description: "Print what would be removed without removing.",
    },
  },
  async run({ args }) {
    const target = String(args.target)
    if (!TARGETS.includes(target as (typeof TARGETS)[number])) {
      console.error(`Unknown target "${target}". Supported: ${TARGETS.join(" | ")}`)
      process.exit(1)
    }
    const dryRun = Boolean(args["dry-run"])
    const pluginName = "baseloop-gtm"

    if (target === "codex") {
      const paths = resolveCodexPaths(args["codex-home"] ? String(args["codex-home"]) : undefined, pluginName)
      await cleanupTarget(target, paths.managedDir, paths.codexHome, [
        { groupName: "agents", groupDir: paths.agentsDir },
        { groupName: "skills", groupDir: paths.skillsDir },
      ], pluginName, dryRun)
    } else {
      const paths = resolveGeminiPaths(args["gemini-home"] ? String(args["gemini-home"]) : undefined, pluginName)
      await cleanupTarget(target, paths.managedDir, paths.geminiHome, [
        { groupName: "skills", groupDir: paths.skillsDir },
        { groupName: "agents", groupDir: paths.agentsDir },
      ], pluginName, dryRun)
    }
  },
})

async function cleanupTarget(
  targetName: string,
  managedDir: string,
  rootDir: string,
  groups: Array<{ groupName: string; groupDir: string }>,
  pluginName: string,
  dryRun: boolean,
): Promise<void> {
  const manifest = await readManifest(managedDir, pluginName)
  if (!manifest) {
    console.log(`[${targetName}] No install manifest found at ${managedDir}. Nothing to clean up.`)
    return
  }

  console.log(`[${targetName}] ${dryRun ? "DRY RUN: would remove" : "removing"} files listed in manifest at ${managedDir}`)
  let total = 0

  for (const { groupName, groupDir } of groups) {
    const items = manifest.groups[groupName] ?? []
    for (const name of items) {
      const target = path.join(groupDir, name)
      if (!isSafePathSegment(name) || !isSafeManagedPath(groupDir, target)) {
        console.warn(`  skipped (unsafe path): ${target}`)
        continue
      }
      if (await pathExists(target)) {
        console.log(`  ${dryRun ? "would remove" : "remove"} ${target}`)
        if (!dryRun) {
          await fs.rm(target, { recursive: true, force: true })
        }
        total++
      }
    }
  }

  // Remove the managed directory itself (manifest + any sibling state).
  if (await pathExists(managedDir)) {
    if (!isSafeManagedPath(rootDir, managedDir)) {
      console.warn(`  skipped (unsafe managed dir): ${managedDir}`)
    } else {
      console.log(`  ${dryRun ? "would remove" : "remove"} ${managedDir}`)
      if (!dryRun) {
        await fs.rm(managedDir, { recursive: true, force: true })
      }
      total++
    }
  }

  console.log(`[${targetName}] ${dryRun ? "would remove" : "removed"} ${total} item(s).`)
}
