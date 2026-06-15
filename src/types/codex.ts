/** Legacy custom-agent record. Kept only so installs can clean old manifests. */
export type CodexAgent = {
  /** Filesystem-safe name. */
  name: string
  /** TOML-formatted body. */
  toml: string
}

/** A skill bundled for optional Codex install (default off — native install handles skills). */
export type CodexGeneratedSkill = {
  name: string
  /** Path to source skill dir; copied as-is to the target. */
  sourceDir: string
}

/**
 * Invocation-target maps used by the content transform to rewrite skill
 * references into Codex-canonical names. `agentTargets` is retained for legacy
 * transform compatibility but Baseloop does not emit standalone agents.
 */
export type CodexInvocationTargets = {
  skillTargets: Record<string, string>
  agentTargets: Record<string, string>
}

export type CodexBundle = {
  pluginName: string
  /** Empty for current installs; retained to clean prior agent manifests. */
  agents: CodexAgent[]
  /** Empty by default; populated only when `--include-skills` is set. */
  skills: CodexGeneratedSkill[]
  /** Invocation maps for content transforms. Built by convertClaudeToCodex. */
  invocationTargets: CodexInvocationTargets
}
