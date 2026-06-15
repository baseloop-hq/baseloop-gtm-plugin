import path from "path"
import { ensureDir, pathExists, readText, writeText } from "./files"

/**
 * Codex install ships skills whose bodies reference Claude-Code-style
 * tools (Read, Write, Bash, Task, AskUserQuestion, etc.). Codex's primitives
 * differ. We write a managed tool-mapping block to `~/.codex/AGENTS.md` so
 * Codex can interpret skill bodies correctly without rewriting them.
 *
 * The block is delimited by markers; everything between markers is regenerated
 * on each install. Content outside the markers is preserved.
 */
export const CODEX_AGENTS_BLOCK_START = "<!-- BEGIN BASELOOP CODEX TOOL MAP -->"
export const CODEX_AGENTS_BLOCK_END = "<!-- END BASELOOP CODEX TOOL MAP -->"

const CODEX_AGENTS_BLOCK_BODY = `## Baseloop Codex Tool Mapping (Claude Compatibility)

The baseloop-gtm plugin ships skills authored against Claude Code's tool surface. Translate references in skill bodies as follows when running them on Codex.

Tool mapping:
- Read: use shell reads (cat / sed) or rg
- Write: create files via shell redirection or apply_patch
- Edit / MultiEdit: use apply_patch
- Bash: use shell_command
- Grep: use rg (fallback: grep)
- Glob: use rg --files or find
- LS: use ls via shell_command
- WebFetch / WebSearch: use curl or external doc tools
- AskUserQuestion: present choices as a numbered list in chat and wait for a reply number. Multi-select takes comma-separated numbers. Never silently skip — always wait for the user's response.
- Task (subagent dispatch): run sequentially in main thread; for parallel tool calls, use multi_tool_use.parallel
- TaskCreate / TaskUpdate / TaskList / TaskGet / TaskStop / TaskOutput: use update_plan (Codex's task-tracking primitive)
- TodoWrite / TodoRead (legacy): use update_plan
- Skill: open the referenced SKILL.md and follow it
- ExitPlanMode: ignore

Only this block is managed automatically. Edit other parts of this file freely.
`

function buildBlock(): string {
  return [CODEX_AGENTS_BLOCK_START, CODEX_AGENTS_BLOCK_BODY.trim(), CODEX_AGENTS_BLOCK_END].join("\n")
}

function upsertBlock(existing: string, block: string): string {
  const startIdx = existing.indexOf(CODEX_AGENTS_BLOCK_START)
  const endIdx = existing.indexOf(CODEX_AGENTS_BLOCK_END)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    // Append the block to the end with separator.
    const sep = existing.endsWith("\n") ? "\n" : "\n\n"
    return existing + sep + block + "\n"
  }
  const before = existing.slice(0, startIdx)
  const after = existing.slice(endIdx + CODEX_AGENTS_BLOCK_END.length)
  return before + block + after
}

/**
 * Write or update the Baseloop tool-mapping block in `<codexHome>/AGENTS.md`.
 * Creates the file when it doesn't exist; preserves user content otherwise.
 */
export async function ensureCodexAgentsFile(codexHome: string): Promise<{ created: boolean; path: string }> {
  await ensureDir(codexHome)
  const filePath = path.join(codexHome, "AGENTS.md")
  const block = buildBlock()

  if (!(await pathExists(filePath))) {
    await writeText(filePath, block + "\n")
    return { created: true, path: filePath }
  }

  const existing = await readText(filePath)
  const updated = upsertBlock(existing, block)
  if (updated !== existing) {
    await writeText(filePath, updated)
  }
  return { created: false, path: filePath }
}
