/**
 * Detect env-var keys on MCP server configs that may carry secrets. Used by
 * Gemini target before merging mcpServers into settings.json — the user gets
 * a clear warning naming each suspect key.
 */
export const SENSITIVE_PATTERN = /key|token|secret|password|credential|api_key/i

type ServerLike = { env?: Record<string, string> }

export function hasPotentialSecrets(servers: Record<string, ServerLike>): boolean {
  for (const s of Object.values(servers)) {
    if (s.env) {
      for (const k of Object.keys(s.env)) {
        if (SENSITIVE_PATTERN.test(k)) return true
      }
    }
  }
  return false
}

export type SuspectServer = {
  serverName: string
  envKeys: string[]
}

export function findServersWithPotentialSecrets(
  servers: Record<string, ServerLike>,
): SuspectServer[] {
  const out: SuspectServer[] = []
  for (const [serverName, s] of Object.entries(servers)) {
    if (!s.env) continue
    const envKeys = Object.keys(s.env).filter((k) => SENSITIVE_PATTERN.test(k))
    if (envKeys.length > 0) out.push({ serverName, envKeys })
  }
  return out
}
