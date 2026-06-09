import { promises as fs } from "fs"
import path from "path"
import { allStaleSkillDirs, STALE_SKILL_DIRS_BY_VERSION } from "../data/legacy-artifacts"

export type SweepReport = {
  removed: string[]
  preserved: string[]
  errors: Array<{ path: string; error: string }>
}

export type SweepOptions = {
  /** Include entries at or below this version. Omit to remove all known stale dirs. */
  forVersion?: string
  /** Skip the actual removal; just return what would be removed. */
  dryRun?: boolean
}

function dirsForVersion(version: string | undefined): string[] {
  if (!version) return allStaleSkillDirs()
  const selected = new Set<string>()
  for (const [cutoverVersion, dirs] of Object.entries(STALE_SKILL_DIRS_BY_VERSION)) {
    if (compareSemver(cutoverVersion, version) <= 0) {
      for (const dir of dirs) selected.add(dir)
    }
  }
  return [...selected]
}

function compareSemver(left: string, right: string): number {
  const leftParts = left.split(".").map((part) => Number.parseInt(part, 10))
  const rightParts = right.split(".").map((part) => Number.parseInt(part, 10))
  for (let i = 0; i < 3; i++) {
    const l = Number.isFinite(leftParts[i]) ? leftParts[i] : 0
    const r = Number.isFinite(rightParts[i]) ? rightParts[i] : 0
    if (l !== r) return l - r
  }
  return 0
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
