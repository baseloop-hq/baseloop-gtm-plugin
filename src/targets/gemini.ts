import os from "os"
import path from "path"
import type { GeminiBundle } from "../types/gemini"
import {
  backupFile,
  copySkillDir,
  ensureDir,
  pathExists,
  readJson,
  sanitizePathName,
  writeJsonAtomic,
  writeText,
} from "../utils/files"
import { transformContentForGemini } from "../utils/gemini-content"
import { findServersWithPotentialSecrets } from "../utils/secrets"
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

export type GeminiTargetPaths = {
  geminiHome: string
  managedDir: string
  skillsDir: string
  agentsDir: string
  settingsPath: string
}

export function resolveGeminiPaths(
  geminiHome?: string,
  pluginName: string = "baseloop-gtm",
): GeminiTargetPaths {
  const root = geminiHome ? path.resolve(geminiHome) : path.join(os.homedir(), ".gemini")
  const sanitized = sanitizeManagedPluginName(pluginName)
  return {
    geminiHome: root,
    // Plugin-scoped manifest so multiple plugins keep separate install records.
    managedDir: path.join(root, sanitized),
    // Skills land flat under ~/.gemini/skills/<skill-name>/. Gemini's skill
    // discovery only recurses one level deep — putting them in a plugin
    // subfolder makes them invisible.
    skillsDir: path.join(root, "skills"),
    agentsDir: path.join(root, "agents"),
    settingsPath: path.join(root, "settings.json"),
  }
}

export type WriteGeminiOptions = {
  dryRun?: boolean
  /** When provided, secrets warnings are forwarded here. Defaults to console.warn. */
  warn?: (message: string) => void
}

export type GeminiWriteReport = {
  skillsWritten: string[]
  agentsWritten: string[]
  skillsRemoved: string[]
  agentsRemoved: string[]
  mcpServersMerged: string[]
  secretsWarnings: string[]
  settingsBackup: string | null
}

export async function writeGeminiBundle(
  bundle: GeminiBundle,
  paths: GeminiTargetPaths,
  options: WriteGeminiOptions = {},
): Promise<GeminiWriteReport> {
  const { dryRun = false, warn = (m: string) => console.warn(m) } = options
  const report: GeminiWriteReport = {
    skillsWritten: [],
    agentsWritten: [],
    skillsRemoved: [],
    agentsRemoved: [],
    mcpServersMerged: [],
    secretsWarnings: [],
    settingsBackup: null,
  }

  const manifest = await readManifest(paths.managedDir, bundle.pluginName)
  const currentSkills = bundle.skills.map((s) => sanitizePathName(s.name))
  const currentAgents = bundle.agents.map((a) => `${sanitizePathName(a.name)}.md`)

  for (const d of manifest?.groups.skills ?? []) {
    if (!currentSkills.includes(d)) report.skillsRemoved.push(d)
  }
  for (const f of manifest?.groups.agents ?? []) {
    if (!currentAgents.includes(f)) report.agentsRemoved.push(f)
  }

  const hasMcpServers = Boolean(bundle.mcpServers && Object.keys(bundle.mcpServers).length > 0)
  let existingSettings: Record<string, unknown> = {}
  if (hasMcpServers && !dryRun && (await pathExists(paths.settingsPath))) {
    try {
      existingSettings = await readJson<Record<string, unknown>>(paths.settingsPath)
    } catch (err) {
      throw new Error(
        `Existing ${paths.settingsPath} could not be parsed; leaving it unchanged (${err instanceof Error ? err.message : err})`,
      )
    }
  }

  if (!dryRun) {
    await ensureDir(paths.geminiHome)
    if (bundle.skills.length > 0) await ensureDir(paths.skillsDir)
    if (bundle.agents.length > 0) await ensureDir(paths.agentsDir)
    await cleanupRemovedManagedDirectories(paths.skillsDir, manifest, "skills", currentSkills)
    await cleanupRemovedManagedFiles(paths.agentsDir, manifest, "agents", currentAgents)
  }

  if (!dryRun) {
    for (const dirname of currentSkills) {
      await assertWritableManagedTarget(paths.skillsDir, path.join(paths.skillsDir, dirname), manifest, "skills", dirname)
    }
    for (const filename of currentAgents) {
      await assertWritableManagedTarget(paths.agentsDir, path.join(paths.agentsDir, filename), manifest, "agents", filename)
    }
  }

  const activeManifest = dryRun
    ? manifest
    : mergeManifestClaims(manifest, bundle.pluginName, { skills: currentSkills, agents: currentAgents })
  if (!dryRun) {
    await writeManifestAtomic(paths.managedDir, activeManifest)
  }

  // Skills.
  for (const s of bundle.skills) {
    const dirname = sanitizePathName(s.name)
    if (!dryRun) {
      const dest = path.join(paths.skillsDir, dirname)
      await assertWritableManagedTarget(paths.skillsDir, dest, activeManifest, "skills", dirname)
      // Wipe before re-write so removed reference/asset files don't linger
      // across upgrades (P2 fix). Safe because the dest is inside the managed
      // skills dir, which only the converter writes to.
      await clearManagedDirectory(paths.skillsDir, dest)
      await copySkillDir(s.sourceDir, dest, transformContentForGemini)
    }
    report.skillsWritten.push(dirname)
  }

  // Agents.
  for (const a of bundle.agents) {
    const filename = `${sanitizePathName(a.name)}.md`
    if (!dryRun) {
      const dest = path.join(paths.agentsDir, filename)
      await assertWritableManagedTarget(paths.agentsDir, dest, activeManifest, "agents", filename)
      await writeText(dest, a.content)
    }
    report.agentsWritten.push(filename)
  }

  // MCP merge — secrets warning, backup, merge.
  if (hasMcpServers && bundle.mcpServers) {
    const suspect = findServersWithPotentialSecrets(bundle.mcpServers)
    for (const s of suspect) {
      const msg = `MCP server \`${s.serverName}\` has env var(s) that may contain secrets: ${s.envKeys.join(", ")}. Review before committing ${path.basename(paths.settingsPath)} to version control.`
      report.secretsWarnings.push(msg)
      warn(`⚠️  ${msg}`)
    }

    if (!dryRun) {
      const backup = await backupFile(paths.settingsPath)
      report.settingsBackup = backup
      const existingMcp =
        existingSettings.mcpServers && typeof existingSettings.mcpServers === "object"
          ? (existingSettings.mcpServers as Record<string, unknown>)
          : {}
      const merged: Record<string, unknown> = {
        ...existingSettings,
        mcpServers: { ...existingMcp, ...bundle.mcpServers },
      }
      await writeJsonAtomic(paths.settingsPath, merged)
    }

    report.mcpServersMerged = Object.keys(bundle.mcpServers)
  }

  if (!dryRun) {
    const updated: ManagedInstallManifest = {
      version: 1,
      pluginName: bundle.pluginName,
      groups: {
        skills: currentSkills,
        agents: currentAgents,
      },
    }
    await writeManifestAtomic(paths.managedDir, updated)
  }

  return report
}
