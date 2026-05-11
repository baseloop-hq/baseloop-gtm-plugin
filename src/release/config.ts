import { promises as fs } from "fs"
import path from "path"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const RELEASE_PLEASE_CONFIG = path.join(REPO_ROOT, ".github", "release-please-config.json")
const RELEASE_PLEASE_MANIFEST = path.join(REPO_ROOT, ".github", ".release-please-manifest.json")

type ReleasePleaseConfig = {
  packages?: Record<string, { "package-name"?: string }>
  plugins?: Array<unknown>
}

export async function validateReleasePleaseConfig(): Promise<string[]> {
  const errors: string[] = []

  // Check files exist (allow missing in early Phase 3 — only validate when present).
  let configPresent = true
  let manifestPresent = true
  try {
    await fs.access(RELEASE_PLEASE_CONFIG)
  } catch {
    configPresent = false
  }
  try {
    await fs.access(RELEASE_PLEASE_MANIFEST)
  } catch {
    manifestPresent = false
  }

  if (!configPresent && !manifestPresent) {
    // release-please not yet configured — that's allowed before U12 lands.
    return []
  }

  if (!configPresent) {
    errors.push(`${path.relative(REPO_ROOT, RELEASE_PLEASE_CONFIG)}: missing (manifest exists)`)
    return errors
  }
  if (!manifestPresent) {
    errors.push(`${path.relative(REPO_ROOT, RELEASE_PLEASE_MANIFEST)}: missing (config exists)`)
    return errors
  }

  let config: ReleasePleaseConfig
  let manifest: Record<string, string>
  try {
    config = JSON.parse(await fs.readFile(RELEASE_PLEASE_CONFIG, "utf8"))
  } catch (err) {
    errors.push(`release-please-config.json: invalid JSON (${err})`)
    return errors
  }
  try {
    manifest = JSON.parse(await fs.readFile(RELEASE_PLEASE_MANIFEST, "utf8"))
  } catch (err) {
    errors.push(`.release-please-manifest.json: invalid JSON (${err})`)
    return errors
  }

  if (!config.packages || typeof config.packages !== "object") {
    errors.push("release-please-config.json: missing 'packages' object")
    return errors
  }

  // Every package key in the config must have a matching manifest entry.
  for (const pkg of Object.keys(config.packages)) {
    if (!(pkg in manifest)) {
      errors.push(`manifest is missing entry for package "${pkg}"`)
    }
  }
  // Every manifest entry must have a matching config package.
  for (const pkg of Object.keys(manifest)) {
    if (!(pkg in config.packages)) {
      errors.push(`config has no package entry for manifest key "${pkg}"`)
    }
  }

  const linkedVersions = config.plugins?.find((plugin): plugin is { type: string; components: string[] } => {
    return (
      typeof plugin === "object" &&
      plugin !== null &&
      (plugin as Record<string, unknown>).type === "linked-versions" &&
      Array.isArray((plugin as Record<string, unknown>).components)
    )
  })
  const packageNames = Object.values(config.packages)
    .map((pkg) => pkg["package-name"])
    .filter((name): name is string => typeof name === "string")
  const versionBearingPackages = ["cli", "baseloop-gtm", "marketplace"]
  for (const packageName of versionBearingPackages) {
    if (packageNames.includes(packageName) && !linkedVersions?.components.includes(packageName)) {
      errors.push(`linked-versions is missing version-bearing component "${packageName}"`)
    }
  }

  return errors
}
