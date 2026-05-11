/**
 * Internal representation of a parsed Claude Code plugin. Targets read this.
 *
 * Only the fields we actually use are typed — additional plugin.json keys are
 * preserved on `manifest` for round-trip but otherwise ignored.
 */
export type ClaudeMcpServer = {
  type?: string
  command?: string
  args?: string[]
  url?: string
  env?: Record<string, string>
  headers?: Record<string, string>
}

export type ClaudeManifest = {
  name: string
  version: string
  description?: string
  author?: { name?: string; email?: string; url?: string }
  homepage?: string
  repository?: string
  license?: string
  keywords?: string[]
  mcpServers?: Record<string, ClaudeMcpServer>
}

export type ClaudeAgent = {
  name: string
  description?: string
  model?: string
  body: string
  sourcePath: string
}

export type ClaudeSkill = {
  name: string
  description?: string
  argumentHint?: string
  disableModelInvocation?: boolean
  ce_platforms?: string[]
  sourceDir: string
  skillPath: string
}

export type ClaudePlugin = {
  root: string
  manifest: ClaudeManifest
  agents: ClaudeAgent[]
  skills: ClaudeSkill[]
  mcpServers?: Record<string, ClaudeMcpServer>
}

/**
 * Filter skills to those allowed on a given platform. A skill without
 * `ce_platforms` is platform-agnostic and runs everywhere.
 */
export function filterSkillsByPlatform(skills: ClaudeSkill[], platform: string): ClaudeSkill[] {
  return skills.filter((s) => !s.ce_platforms || s.ce_platforms.includes(platform))
}
