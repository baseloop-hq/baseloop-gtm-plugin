/**
 * Registry of skill directories that existed in past versions of the plugin and
 * should be removed when a user upgrades to a version that has renamed or
 * removed them. Entries are keyed by the minimum manifest version whose code
 * knows the directories are stale. Release-please owns future version bumps, so
 * do not key new cleanup entries to a guessed future release number.
 *
 * Strict scope: only renames or removals that would otherwise leave orphan
 * files in user installs. General-purpose legacy cleanup is out of scope.
 *
 * To add an entry:
 *  1. Add the stale directory under the current manifest version.
 *  2. The update skill (and converter installs once Phase 4 lands) will sweep
 *     listed directories from user installs when the user upgrades to that
 *     version or later.
 *
 * Never add a stale skill name without a clear rename target — this is not a
 * place to delete user content.
 */
export const STALE_SKILL_DIRS_BY_VERSION: Record<string, string[]> = {
  // Root entrypoint lineage:
  // skills/gtm-engineering/ -> skills/engineering/ -> skills/baseloop-gtm/.
  // Users upgrading across either rename can leave old directories in their
  // plugin cache; sweeping them prevents stale loads.
  "0.8.0": ["gtm-engineering", "engineering"],
}

/**
 * All stale skill names across all versions. Useful when a sweep doesn't know
 * the source version and wants to be conservative — e.g., a fresh install
 * that may have inherited any historical layout.
 */
export function allStaleSkillDirs(): string[] {
  const all = new Set<string>()
  for (const dirs of Object.values(STALE_SKILL_DIRS_BY_VERSION)) {
    for (const d of dirs) all.add(d)
  }
  return [...all]
}
