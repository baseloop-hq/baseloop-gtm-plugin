/**
 * Registry of skill directories that existed in past versions of the plugin and
 * should be removed when a user upgrades to a version that has renamed or
 * removed them. Entries are keyed by the version that introduced the rename.
 *
 * Strict scope: only renames or removals that would otherwise leave orphan
 * files in user installs. General-purpose legacy cleanup is out of scope.
 *
 * To add an entry:
 *  1. Bump the plugin version that ships the rename.
 *  2. Add `<version>: ["old-skill-dir-name", ...]`.
 *  3. The update skill (and converter installs once Phase 4 lands) will sweep
 *     listed directories from user installs when the user upgrades to that
 *     version or later.
 *
 * Never add a stale skill name without a clear rename target — this is not a
 * place to delete user content.
 */
export const STALE_SKILL_DIRS_BY_VERSION: Record<string, string[]> = {
  // 0.x → 1.0 cutover: skills/gtm-engineering/ → skills/engineering/.
  // Users upgrading from 0.x leave the old directory in their plugin cache;
  // sweeping it on update prevents stale loads.
  "1.0.0": ["gtm-engineering"],
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
