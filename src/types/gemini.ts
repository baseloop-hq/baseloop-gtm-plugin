import type { ClaudeMcpServer } from "./claude"

export type GeminiAgent = {
  name: string
  /** Markdown body with frontmatter, written verbatim. */
  content: string
}

export type GeminiSkill = {
  name: string
  sourceDir: string
}

export type GeminiBundle = {
  pluginName: string
  skills: GeminiSkill[]
  agents: GeminiAgent[]
  /** MCP servers to merge into ~/.gemini/settings.json. */
  mcpServers?: Record<string, ClaudeMcpServer>
}
