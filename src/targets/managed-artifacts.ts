import { promises as fs } from "fs"
import path from "path"
import {
  ensureDir,
  isManagedChildPath,
  isSafeManagedPath,
  isSafePathSegment,
  pathExists,
  sanitizePathName,
  writeJsonAtomic,
} from "../utils/files"

const MANIFEST_NAME = "install-manifest.json"

export type ManagedInstallManifest = {
  version: 1
  pluginName: string
  groups: Record<string, string[]>
}

function isManifestShape(data: unknown, pluginName: string): data is ManagedInstallManifest {
  if (!data || typeof data !== "object") return false
  const obj = data as Record<string, unknown>
  if (obj.version !== 1 || obj.pluginName !== pluginName) return false
  if (!obj.groups || typeof obj.groups !== "object" || Array.isArray(obj.groups)) return false
  return Object.values(obj.groups as Record<string, unknown>).every(
    (value) => Array.isArray(value) && value.every((item) => typeof item === "string"),
  )
}

export function sanitizeManagedPluginName(name: string): string {
  return sanitizePathName(name).replace(/[\\/]/g, "-")
}

/**
 * Read the install manifest for a given plugin under a managed directory.
 * Returns null when the manifest is absent or belongs to a different plugin.
 */
export async function readManifest(
  managedDir: string,
  pluginName: string,
): Promise<ManagedInstallManifest | null> {
  const p = path.join(managedDir, MANIFEST_NAME)
  if (!(await pathExists(p))) return null
  try {
    const data = JSON.parse(await fs.readFile(p, "utf8")) as unknown
    if (!isManifestShape(data, pluginName)) return null
    return data
  } catch {
    return null
  }
}

function isManifestEntrySafe(name: string): boolean {
  return isSafePathSegment(name)
}

export function manifestClaims(
  manifest: ManagedInstallManifest | null,
  groupName: string,
  name: string,
): boolean {
  return manifest?.groups[groupName]?.includes(name) ?? false
}

export async function assertWritableManagedTarget(
  groupDir: string,
  target: string,
  manifest: ManagedInstallManifest | null,
  groupName: string,
  name: string,
): Promise<void> {
  if (!isManifestEntrySafe(name)) {
    throw new Error(`Unsafe managed ${groupName} entry "${name}"`)
  }
  if (!isManagedChildPath(groupDir, target)) {
    throw new Error(`Refusing to write outside managed ${groupName} directory: ${target}`)
  }
  if ((await pathExists(target)) && !manifestClaims(manifest, groupName, name)) {
    throw new Error(
      `Refusing to overwrite unmanaged ${groupName} target "${target}". Remove it manually or clean up the prior install first.`,
    )
  }
}

export async function writeManifestAtomic(
  managedDir: string,
  manifest: ManagedInstallManifest,
): Promise<void> {
  await ensureDir(managedDir)
  await writeJsonAtomic(path.join(managedDir, MANIFEST_NAME), manifest)
}

export function mergeManifestClaims(
  manifest: ManagedInstallManifest | null,
  pluginName: string,
  groups: Record<string, string[]>,
): ManagedInstallManifest {
  const mergedGroups: Record<string, string[]> = {}
  for (const [groupName, current] of Object.entries(groups)) {
    mergedGroups[groupName] = Array.from(new Set([...(manifest?.groups[groupName] ?? []), ...current]))
  }
  return { version: 1, pluginName, groups: mergedGroups }
}

/**
 * Remove files that were in a previous install but are not in the new install.
 * Only removes files listed in the prior manifest under the named group, and
 * only when their path resolves under `groupDir` (no `..` escape).
 */
export async function cleanupRemovedManagedFiles(
  groupDir: string,
  manifest: ManagedInstallManifest | null,
  groupName: string,
  currentFiles: string[],
): Promise<void> {
  if (!manifest) return
  const prior = manifest.groups[groupName] ?? []
  const currentSet = new Set(currentFiles)
  for (const filename of prior) {
    if (currentSet.has(filename)) continue
    if (!isManifestEntrySafe(filename)) continue
    const target = path.join(groupDir, filename)
    if (!isSafeManagedPath(groupDir, target)) continue
    if (await pathExists(target)) {
      await fs.rm(target, { force: true })
    }
  }
}

/**
 * Remove directories listed in a prior manifest but no longer present in the
 * current install. Used for skill directories.
 */
export async function cleanupRemovedManagedDirectories(
  groupDir: string,
  manifest: ManagedInstallManifest | null,
  groupName: string,
  currentDirs: string[],
): Promise<void> {
  if (!manifest) return
  const prior = manifest.groups[groupName] ?? []
  const currentSet = new Set(currentDirs)
  for (const dir of prior) {
    if (currentSet.has(dir)) continue
    if (!isManifestEntrySafe(dir)) continue
    const target = path.join(groupDir, dir)
    if (!isSafeManagedPath(groupDir, target)) continue
    if (await pathExists(target)) {
      await fs.rm(target, { recursive: true, force: true })
    }
  }
}

/**
 * Remove a specific managed directory before re-writing its contents.
 * Pre-existing user content under this dir is wiped (per manifest discipline:
 * the manifest claims this dir as ours).
 */
export async function clearManagedDirectory(groupDir: string, target: string): Promise<void> {
  if (!isManagedChildPath(groupDir, target)) {
    throw new Error(`Refusing to clear managed directory outside ${groupDir}: ${target}`)
  }
  if (await pathExists(target)) {
    await fs.rm(target, { recursive: true, force: true })
  }
}
