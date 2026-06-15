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
 * Every entry carries the rename target that replaced it. The sweep removes a
 * stale directory only when its target exists in the same skills dir, so a
 * sweep can never delete the live root skill from an install where the rename
 * has not landed yet (e.g. a 0.8.x layout, or an interrupted upgrade that
 * swept before copying new files).
 *
 * To add an entry:
 *  1. Add the stale directory under the current manifest version, with the
 *     directory name that replaced it as `target`.
 *  2. The update skill (and converter installs once Phase 4 lands) will sweep
 *     listed directories from user installs when the user upgrades to that
 *     version or later and the target directory is present.
 */
export type StaleSkillDir = {
  /** Directory name to remove from user installs. */
  stale: string
  /** Live skill directory that replaced it; sweep requires it to exist. */
  target: string
}

export const STALE_SKILL_DIRS_BY_VERSION: Record<string, StaleSkillDir[]> = {
  // Root entrypoint lineage:
  // skills/gtm-engineering/ -> skills/engineering/ -> skills/baseloop-gtm/.
  // Users upgrading across either rename can leave old directories in their
  // plugin cache; sweeping them prevents stale loads. Both point at the
  // current live name: an install that has baseloop-gtm/ no longer needs
  // either ancestor.
  "0.8.0": [
    { stale: "gtm-engineering", target: "baseloop-gtm" },
    { stale: "engineering", target: "baseloop-gtm" },
  ],
}

/**
 * All stale skill entries across all versions. Useful when a sweep doesn't
 * know the source version and wants to be conservative — e.g., a fresh
 * install that may have inherited any historical layout.
 */
export function allStaleSkillDirs(): StaleSkillDir[] {
  const byStaleName = new Map<string, StaleSkillDir>()
  for (const entries of Object.values(STALE_SKILL_DIRS_BY_VERSION)) {
    for (const entry of entries) byStaleName.set(entry.stale, entry)
  }
  return [...byStaleName.values()]
}
