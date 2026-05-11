import type { ClaudePlugin } from "../types/claude"
import type { GeminiAgent, GeminiBundle, GeminiSkill } from "../types/gemini"
import { filterSkillsByPlatform } from "../types/claude"
import { formatFrontmatter } from "../utils/frontmatter"
import { transformContentForGemini } from "../utils/gemini-content"

/**
 * Convert a parsed Claude plugin into a GeminiBundle. Unlike Codex, Gemini
 * has no native plugin spec, so the bundle is full-service: skills, agents,
 * and MCP server config all flow through the converter.
 */
export function convertClaudeToGemini(plugin: ClaudePlugin): GeminiBundle {
  const skills = filterSkillsByPlatform(plugin.skills, "gemini")

  const skillBundle: GeminiSkill[] = skills.map((s) => ({
    name: s.name,
    sourceDir: s.sourceDir,
  }))

  const agents: GeminiAgent[] = plugin.agents.map((a) => {
    const transformedBody = transformContentForGemini(a.body.trim())
    const frontmatter: Record<string, unknown> = {
      name: a.name,
      description: a.description ?? `Use the ${a.name} subagent for relevant tasks`,
      kind: "local",
    }
    return {
      name: a.name,
      content: formatFrontmatter(frontmatter, transformedBody) + "\n",
    }
  })

  return {
    pluginName: plugin.manifest.name,
    skills: skillBundle,
    agents,
    mcpServers: plugin.mcpServers,
  }
}
