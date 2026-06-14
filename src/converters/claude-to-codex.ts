import type { ClaudePlugin } from "../types/claude"
import type { CodexBundle, CodexGeneratedSkill } from "../types/codex"
import { filterSkillsByPlatform } from "../types/claude"
import { normalizeCodexName, transformContentForCodex } from "../utils/codex-content"

export type ClaudeToCodexOptions = {
  /**
   * If true, bundle skills into the Codex output. Default false: Codex's native
   * plugin install reads .codex-plugin/plugin.json and registers skills on its
   * own. Setting true is for users who want the Bun converter to write skills too
   * (e.g. when Codex's native install isn't being used).
   */
  includeSkills?: boolean
}

/**
 * Convert a parsed Claude plugin into a CodexBundle.
 *
 * By default the bundle is empty because Codex's native plugin install handles
 * skills via the .codex-plugin/plugin.json manifest. Pass `includeSkills: true`
 * for a standalone skills copy. Standalone custom agents are intentionally not
 * emitted; review and diagnose run inline.
 */
export function convertClaudeToCodex(
  plugin: ClaudePlugin,
  options: ClaudeToCodexOptions = {},
): CodexBundle {
  const includeSkills = options.includeSkills ?? false

  const skills = filterSkillsByPlatform(plugin.skills, "codex")

  // Build target maps so content transform can rewrite names cleanly.
  // Use ALL plugin skills, not just the codex-allowed subset — references to
  // Claude-only skills (e.g. ce_platforms: [claude]) inside skill bodies should
  // still render as "the <name> skill" rather than fall through to the unknown-
  // slash branch and become bogus /prompts:<name> strings.
  const skillTargets: Record<string, string> = {}
  for (const s of plugin.skills) {
    skillTargets[normalizeCodexName(s.name)] = s.name
  }
  const agentTargets: Record<string, string> = {}

  const generatedSkills: CodexGeneratedSkill[] = includeSkills
    ? skills.map((s) => ({ name: s.name, sourceDir: s.sourceDir }))
    : []

  return {
    pluginName: plugin.manifest.name,
    agents: [],
    skills: generatedSkills,
    invocationTargets: { skillTargets, agentTargets },
  }
}
