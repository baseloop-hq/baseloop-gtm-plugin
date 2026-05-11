/**
 * Rewrite Claude-Code-flavored skill/agent body content for Gemini.
 *
 * Transforms applied:
 *  1. `Task agent-name(args)` -> `Use the @X subagent to: args`.
 *  2. `~/.claude/` and `.claude/` -> `~/.gemini/` and `.gemini/`.
 *  3. `@agent-foo` references -> `@X subagent`.
 *
 * Slash references are not rewritten — Gemini's slash-command syntax differs
 * but the converted skills retain their Claude-style invocations, which the
 * model recognizes and matches at runtime.
 */
function normalizeName(value: string): string {
  return value.trim().replace(/[^\w-]+/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "") || "item"
}

export function transformContentForGemini(body: string): string {
  let result = body

  // 1. Task agent calls (handle namespaced names like x:y:agent).
  const taskPattern = /^(\s*-?\s*)Task\s+([a-z][a-z0-9:-]*)\(([^)]*)\)/gm
  result = result.replace(taskPattern, (_match, prefix: string, agentName: string, args: string) => {
    const finalSegment = agentName.includes(":") ? agentName.split(":").pop()! : agentName
    const target = normalizeName(finalSegment)
    const trimmed = args.trim()
    return trimmed
      ? `${prefix}Use the @${target} subagent to: ${trimmed}`
      : `${prefix}Use the @${target} subagent`
  })

  // 2. Path rewrites.
  result = result.replace(/~\/\.claude\//g, "~/.gemini/").replace(/\.claude\//g, ".gemini/")

  // 3. @agent-name references with recognized "-X" suffix.
  const agentRefPattern =
    /@([a-z][a-z0-9-]*-(?:agent|reviewer|researcher|analyst|specialist|oracle|sentinel|guardian|strategist|checker|auditor|optimizer))(?!\s+subagent\b)/gi
  result = result.replace(agentRefPattern, (_match, agentName: string) => {
    return `@${normalizeName(agentName)} subagent`
  })

  return result
}
