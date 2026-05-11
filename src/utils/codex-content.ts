/**
 * Rewrite Claude-Code-flavored skill/agent body content for Codex.
 *
 * Transforms applied:
 *  1. `Task agent-name(args)` -> `Spawn the custom agent \`X\`` (when X is a known agent)
 *     or `Use the $X skill to: args`.
 *  2. Slash references (`/foo`) -> `the X skill` (when X is a known skill name)
 *     or `/prompts:foo` for unknown ones.
 *  3. `~/.claude/` and `.claude/` -> `~/.codex/` and `.codex/`.
 *  4. `@agent-foo` references -> `custom agent \`X\`` or `$X skill`.
 *
 * `targets` lets the caller resolve names to canonical Codex identifiers.
 */
export type CodexInvocationTargets = {
  /** Maps invocation name (e.g. "baseloop-gtm:plan") to skill identifier on Codex. */
  skillTargets?: Record<string, string>
  /** Maps short or namespaced agent name to the Codex custom-agent name. */
  agentTargets?: Record<string, string>
}

const PROTECTED_PATH_SEGMENTS = new Set(["dev", "tmp", "etc", "usr", "var", "bin", "home"])

export function normalizeCodexName(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return "item"
  return trimmed
    .replace(/[^\w:-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/:/g, "_")
    || "item"
}

function resolveAgent(value: string, agentTargets: Record<string, string> = {}): string | null {
  const candidates = [value, value.split(":").pop() ?? value]
  for (const c of candidates) {
    const norm = normalizeCodexName(c)
    if (agentTargets[norm]) return agentTargets[norm]
  }
  return null
}

export function transformContentForCodex(body: string, targets?: CodexInvocationTargets): string {
  let result = body
  const skillTargets = targets?.skillTargets ?? {}
  const agentTargets = targets?.agentTargets ?? {}

  // 1. `Task agent(args)` patterns.
  const taskPattern = /^(\s*-?\s*)Task\s+([a-z][a-z0-9:-]*)\(([^)]*)\)/gm
  result = result.replace(taskPattern, (_match, prefix: string, agentName: string, args: string) => {
    const trimmedArgs = args.trim()
    const target = resolveAgent(agentName, agentTargets)
    if (target) {
      return trimmedArgs
        ? `${prefix}Spawn the custom agent \`${target}\` with task: ${trimmedArgs}`
        : `${prefix}Spawn the custom agent \`${target}\``
    }
    const finalSegment = agentName.includes(":") ? agentName.split(":").pop()! : agentName
    const skill = normalizeCodexName(finalSegment)
    return trimmedArgs ? `${prefix}Use the $${skill} skill to: ${trimmedArgs}` : `${prefix}Use the $${skill} skill`
  })

  // 2. Slash references.
  // The negative lookbehind excludes characters that appear immediately before
  // a non-slash-command slash:
  //   :  → protocol scheme (https:/) or namespace (X:/)
  //   \w → word char (path/segment, file.ext/X)
  //   > } ] ) → close-brackets following an inline element
  //   .  → relative-path links (./pitfalls.md, ../foo)
  //   /  → consecutive slashes inside URL paths (//, /a/b/c)
  //   *  → glob path patterns (**/foo/**)
  // What remains as legitimate slash-command context: line start, whitespace,
  // and inline punctuation like `(` `[` `"` `'` — i.e. the natural triggers
  // for a Claude-style invocation.
  const slashPattern = /(?<![:\w>}\]\)\.\/*])\/([a-z][a-z0-9_:-]*?)(?=[\s,."')\]}`]|$)/gi
  result = result.replace(slashPattern, (match, commandName: string) => {
    if (commandName.includes("/")) return match
    if (PROTECTED_PATH_SEGMENTS.has(commandName)) return match
    const norm = normalizeCodexName(commandName)
    if (skillTargets[norm]) return `the ${skillTargets[norm]} skill`
    return `/prompts:${norm}`
  })

  // 3. .claude/ paths.
  result = result.replace(/~\/\.claude\//g, "~/.codex/").replace(/\.claude\//g, ".codex/")

  // 4. @agent-name references (only those with recognized "-agent/-reviewer/-..." suffix).
  const agentRefPattern =
    /@([a-z][a-z0-9-]*-(?:agent|reviewer|researcher|analyst|specialist|oracle|sentinel|guardian|strategist|checker|auditor|optimizer))/gi
  result = result.replace(agentRefPattern, (_match, agentName: string) => {
    const target = resolveAgent(agentName, agentTargets)
    if (target) return `custom agent \`${target}\``
    return `$${normalizeCodexName(agentName)} skill`
  })

  return result
}
