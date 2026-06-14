import type { ClaudePlugin } from "../types/claude"
import type { GeminiBundle, GeminiSkill } from "../types/gemini"
import { filterSkillsByPlatform } from "../types/claude"

/**
 * Convert a parsed Claude plugin into a GeminiBundle. Gemini has no native
 * plugin spec, so skills and MCP server config flow through the converter.
 * Standalone custom agents are intentionally not emitted; review and diagnose
 * run inline.
 */
export function convertClaudeToGemini(plugin: ClaudePlugin): GeminiBundle {
  const skills = filterSkillsByPlatform(plugin.skills, "gemini")

  const skillBundle: GeminiSkill[] = skills.map((s) => ({
    name: s.name,
    sourceDir: s.sourceDir,
  }))

  return {
    pluginName: plugin.manifest.name,
    skills: skillBundle,
    agents: [],
    mcpServers: plugin.mcpServers,
  }
}
