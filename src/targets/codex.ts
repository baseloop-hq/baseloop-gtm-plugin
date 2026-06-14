import os from "os"
import path from "path"
import type { CodexBundle } from "../types/codex"
import { copySkillDir, ensureDir, sanitizePathName, writeText } from "../utils/files"
import { transformContentForCodex } from "../utils/codex-content"
import {
  cleanupRemovedManagedDirectories,
  cleanupRemovedManagedFiles,
  assertWritableManagedTarget,
  clearManagedDirectory,
  mergeManifestClaims,
  readManifest,
  sanitizeManagedPluginName,
  writeManifestAtomic,
  type ManagedInstallManifest,
} from "./managed-artifacts"

export type CodexTargetPaths = {
  /** Root of the Codex install (e.g. `~/.codex` or a custom override). */
  codexHome: string
  /** Where the install manifest for this plugin is recorded. */
  managedDir: string
  /** Legacy custom-agent directory, used only for cleanup of prior installs. */
  agentsDir: string
  /** Directory where skill folders land (only when --include-skills). */
  skillsDir: string
}

export function resolveCodexPaths(codexHome?: string, pluginName: string = "baseloop-gtm"): CodexTargetPaths {
  const root = codexHome ? path.resolve(codexHome) : path.join(os.homedir(), ".codex")
  const sanitized = sanitizeManagedPluginName(pluginName)
  return {
    codexHome: root,
    managedDir: path.join(root, sanitized),
    agentsDir: path.join(root, "agents"),
    skillsDir: path.join(root, "skills", sanitized),
  }
}

export type WriteCodexOptions = {
  dryRun?: boolean
  /** Returns a list of operations performed. Useful for tests + dry-run output. */
}

export type CodexWriteReport = {
  agentsWritten: string[]
  skillsWritten: string[]
  agentsRemoved: string[]
  skillsRemoved: string[]
}

export async function writeCodexBundle(
  bundle: CodexBundle,
  paths: CodexTargetPaths,
  options: WriteCodexOptions = {},
): Promise<CodexWriteReport> {
  const { dryRun = false } = options
  const report: CodexWriteReport = {
    agentsWritten: [],
    skillsWritten: [],
    agentsRemoved: [],
    skillsRemoved: [],
  }

  const manifest = await readManifest(paths.managedDir, bundle.pluginName)
  const currentAgents = bundle.agents.map((a) => `${sanitizePathName(a.name)}.toml`)
  const currentSkills = bundle.skills.map((s) => sanitizePathName(s.name))

  if (!dryRun) {
    await ensureDir(paths.codexHome)
    if (bundle.agents.length > 0) await ensureDir(paths.agentsDir)
    if (bundle.skills.length > 0) await ensureDir(paths.skillsDir)
  }

  // Track what's being removed for the report.
  const priorAgents = manifest?.groups.agents ?? []
  for (const f of priorAgents) {
    if (!currentAgents.includes(f)) report.agentsRemoved.push(f)
  }
  const priorSkills = manifest?.groups.skills ?? []
  for (const d of priorSkills) {
    if (!currentSkills.includes(d)) report.skillsRemoved.push(d)
  }

  if (!dryRun) {
    await cleanupRemovedManagedFiles(paths.agentsDir, manifest, "agents", currentAgents)
    await cleanupRemovedManagedDirectories(paths.skillsDir, manifest, "skills", currentSkills)
  }

  if (!dryRun) {
    for (const filename of currentAgents) {
      await assertWritableManagedTarget(paths.agentsDir, path.join(paths.agentsDir, filename), manifest, "agents", filename)
    }
    for (const dirname of currentSkills) {
      await assertWritableManagedTarget(paths.skillsDir, path.join(paths.skillsDir, dirname), manifest, "skills", dirname)
    }
  }

  const activeManifest = dryRun
    ? manifest
    : mergeManifestClaims(manifest, bundle.pluginName, { agents: currentAgents, skills: currentSkills })
  if (!dryRun) {
    await writeManifestAtomic(paths.managedDir, activeManifest)
  }

  // Legacy agents.
  for (const a of bundle.agents) {
    const filename = `${sanitizePathName(a.name)}.toml`
    if (!dryRun) {
      const dest = path.join(paths.agentsDir, filename)
      await assertWritableManagedTarget(paths.agentsDir, dest, activeManifest, "agents", filename)
      await writeText(dest, a.toml)
    }
    report.agentsWritten.push(filename)
  }

  // Optionally write skills.
  for (const s of bundle.skills) {
    const dirname = sanitizePathName(s.name)
    if (!dryRun) {
      const dest = path.join(paths.skillsDir, dirname)
      await assertWritableManagedTarget(paths.skillsDir, dest, activeManifest, "skills", dirname)
      // Wipe before re-write so removed sub-files don't linger (P2 fix).
      await clearManagedDirectory(paths.skillsDir, dest)
      // Pass the converter's invocation maps so skill-internal refs like
      // /baseloop-gtm:plan rewrite to "the baseloop-gtm:plan skill", not
      // /prompts:baseloop-gtm_plan (P2 fix).
      await copySkillDir(s.sourceDir, dest, (content) =>
        transformContentForCodex(content, bundle.invocationTargets),
      )
    }
    report.skillsWritten.push(dirname)
  }

  if (!dryRun) {
    const updated: ManagedInstallManifest = {
      version: 1,
      pluginName: bundle.pluginName,
      groups: {
        agents: currentAgents,
        skills: currentSkills,
      },
    }
    await writeManifestAtomic(paths.managedDir, updated)
  }

  return report
}
