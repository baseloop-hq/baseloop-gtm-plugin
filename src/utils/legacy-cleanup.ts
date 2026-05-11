import { promises as fs } from "fs"
import path from "path"
import { allStaleSkillDirs, STALE_SKILL_DIRS_BY_VERSION } from "../data/legacy-artifacts"

export type SweepReport = {
  removed: string[]
  preserved: string[]
  errors: Array<{ path: string; error: string }>
}

export type SweepOptions = {
  /** Only remove entries listed under this version (and lower if specified). */
  forVersion?: string
  /** Skip the actual removal; just return what would be removed. */
  dryRun?: boolean
}

function dirsForVersion(version: string | undefined): string[] {
  if (!version) return allStaleSkillDirs()
  // Naive: include the named version. A semver-aware include-all-≤-version
  // can be added later if we ever cross multiple cutovers.
  return STALE_SKILL_DIRS_BY_VERSION[version] ?? []
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/**
 * Sweep stale skill directories from a target install root.
 *
 * `targetSkillsDir` is the path to the user's `skills/` directory (e.g.
 * `~/.claude/plugins/cache/<marketplace>/baseloop-gtm/<version>/skills`).
 *
 * Only directories explicitly registered in `STALE_SKILL_DIRS_BY_VERSION`
 * are touched. User-authored sibling files and unrelated directories are
 * never modified.
 */
export async function sweepLegacyArtifacts(
  targetSkillsDir: string,
  options: SweepOptions = {},
): Promise<SweepReport> {
  const report: SweepReport = { removed: [], preserved: [], errors: [] }

  if (!(await exists(targetSkillsDir))) {
    return report
  }

  for (const dirName of dirsForVersion(options.forVersion)) {
    const candidate = path.join(targetSkillsDir, dirName)
    if (!(await exists(candidate))) {
      continue
    }
    if (options.dryRun) {
      report.removed.push(candidate)
      continue
    }
    try {
      await fs.rm(candidate, { recursive: true, force: true })
      report.removed.push(candidate)
    } catch (err) {
      report.errors.push({ path: candidate, error: err instanceof Error ? err.message : String(err) })
    }
  }

  return report
}
