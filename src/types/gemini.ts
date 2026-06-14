import type { ClaudeMcpServer } from "./claude"

export type GeminiAgent = {
  name: string
  /** Markdown body with frontmatter. Retained only to clean prior installs. */
  content: string
}

export type GeminiSkill = {
  name: string
  sourceDir: string
}

export type GeminiBundle = {
  pluginName: string
  skills: GeminiSkill[]
  /** Empty for current installs; retained to clean prior agent manifests. */
  agents: GeminiAgent[]
  /** MCP servers to merge into ~/.gemini/settings.json. */
  mcpServers?: Record<string, ClaudeMcpServer>
}
