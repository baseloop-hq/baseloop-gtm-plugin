/** A custom-agent record converted from a ClaudeAgent. */
export type CodexAgent = {
  /** Filesystem-safe name (e.g. "data-quality-auditor"). */
  name: string
  /** TOML-formatted body that Codex installs verbatim. */
  toml: string
}

/** A skill bundled for optional Codex install (default off — native install handles skills). */
export type CodexGeneratedSkill = {
  name: string
  /** Path to source skill dir; copied as-is to the target. */
  sourceDir: string
}

/**
 * Invocation-target maps used by the content transform to rewrite skill /
 * agent references into Codex-canonical names. Carried on the bundle so the
 * write-time skill copy can reuse the same maps the converter built.
 */
export type CodexInvocationTargets = {
  skillTargets: Record<string, string>
  agentTargets: Record<string, string>
}

export type CodexBundle = {
  pluginName: string
  agents: CodexAgent[]
  /** Empty by default; populated only when `--include-skills` is set. */
  skills: CodexGeneratedSkill[]
  /** Invocation maps for content transforms. Built by convertClaudeToCodex. */
  invocationTargets: CodexInvocationTargets
}
