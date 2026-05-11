import type { ClaudePlugin } from "../types/claude"
import type { CodexAgent, CodexBundle, CodexGeneratedSkill } from "../types/codex"
import { filterSkillsByPlatform } from "../types/claude"
import { normalizeCodexName, transformContentForCodex } from "../utils/codex-content"
import { sanitizePathName } from "../utils/files"

/**
 * Guard against two agents whose names would write to the same TOML filename
 * after sanitization. Codex looks up agents by filename, so a collision
 * silently overwrites — better to fail loudly at convert time.
 */
function assertNoCodexAgentFilenameCollisions(agents: CodexAgent[]): void {
  const seen = new Map<string, string>()
  for (const a of agents) {
    const filename = `${sanitizePathName(a.name)}.toml`
    const prior = seen.get(filename)
    if (prior !== undefined && prior !== a.name) {
      throw new Error(
        `Codex agent filename collision: "${prior}" and "${a.name}" both normalize to "${filename}". Rename one of the source agents.`,
      )
    }
    seen.set(filename, a.name)
  }
}

export type ClaudeToCodexOptions = {
  /**
   * If true, also bundle skills into the Codex output. Default false:
   * Codex's native plugin install reads .codex-plugin/plugin.json and
   * registers skills on its own. Setting true is for users who want the
   * Bun converter to write skills too (e.g. when Codex's native install
   * isn't being used).
   */
  includeSkills?: boolean
}

/**
 * Convert a parsed Claude plugin into a CodexBundle.
 *
 * By default the bundle contains agents only (TOML custom-agent files);
 * skills are excluded because Codex's native plugin install handles them
 * via the .codex-plugin/plugin.json manifest. Pass `includeSkills: true`
 * to also bundle skills.
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
  for (const a of plugin.agents) {
    agentTargets[normalizeCodexName(a.name)] = a.name
  }

  const agents: CodexAgent[] = plugin.agents.map((a) => {
    const transformedBody = transformContentForCodex(a.body.trim(), { skillTargets, agentTargets })
    const description = (a.description ?? `Use this agent for ${a.name} tasks`).trim()
    const toml = formatCodexAgentToml({
      name: a.name,
      description,
      instructions: transformedBody,
    })
    return { name: a.name, toml }
  })

  assertNoCodexAgentFilenameCollisions(agents)

  const generatedSkills: CodexGeneratedSkill[] = includeSkills
    ? skills.map((s) => ({ name: s.name, sourceDir: s.sourceDir }))
    : []

  return {
    pluginName: plugin.manifest.name,
    agents,
    skills: generatedSkills,
    invocationTargets: { skillTargets, agentTargets },
  }
}

/** TOML string literal — JSON-style escaped, single-line. */
function formatTomlString(value: string): string {
  return JSON.stringify(value)
}

/**
 * Render a custom-agent TOML record. Codex expects flat keys (no [agent]
 * section header) with `developer_instructions` as the body key. JSON-escaped
 * single-line strings keep the format compatible with Codex's TOML parser.
 */
function formatCodexAgentToml(input: { name: string; description: string; instructions: string }): string {
  return [
    `name = ${formatTomlString(input.name)}`,
    `description = ${formatTomlString(input.description)}`,
    `developer_instructions = ${formatTomlString(input.instructions)}`,
  ].join("\n") + "\n"
}
