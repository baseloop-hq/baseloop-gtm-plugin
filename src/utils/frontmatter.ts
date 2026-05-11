import { dump, load } from "js-yaml"

export type FrontmatterResult = {
  data: Record<string, unknown>
  body: string
}

/**
 * Parse YAML frontmatter from a markdown file. Frontmatter must be delimited
 * by `---` on its own lines at the start of the file. Returns `{data, body}`;
 * `data` is empty when no frontmatter is present.
 */
export function parseFrontmatter(raw: string, sourcePath?: string): FrontmatterResult {
  const lines = raw.split(/\r?\n/)
  if (lines.length === 0 || lines[0].trim() !== "---") {
    return { data: {}, body: raw }
  }

  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === "---") {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) {
    const where = sourcePath ? ` in ${sourcePath}` : ""
    throw new Error(`Invalid YAML frontmatter${where}: missing closing --- delimiter`)
  }

  const yamlText = lines.slice(1, endIndex).join("\n")
  const body = lines.slice(endIndex + 1).join("\n")
  try {
    const parsed = load(yamlText)
    if (parsed !== null && parsed !== undefined && (typeof parsed !== "object" || Array.isArray(parsed))) {
      const where = sourcePath ? ` in ${sourcePath}` : ""
      throw new Error(`Invalid YAML frontmatter${where}: expected a mapping/object`)
    }
    const data = parsed ? (parsed as Record<string, unknown>) : {}
    return { data, body }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Invalid YAML frontmatter")) {
      throw err
    }
    const where = sourcePath ? ` in ${sourcePath}` : ""
    const hint = "Tip: quote frontmatter values containing colons (e.g. description: \"Use for X: Y\")."
    throw new Error(`Invalid YAML frontmatter${where}: ${err instanceof Error ? err.message : err}\n${hint}`)
  }
}

/** Serialize `data + body` back into a frontmatter+markdown document. */
export function formatFrontmatter(data: Record<string, unknown>, body: string): string {
  const filtered: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined) filtered[k] = v
  }
  if (Object.keys(filtered).length === 0) return body
  const yaml = dump(filtered, { lineWidth: -1 }).trimEnd()
  return `---\n${yaml}\n---\n\n${body}`
}
