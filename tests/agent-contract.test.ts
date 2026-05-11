import { describe, expect, test } from "bun:test"
import { promises as fs } from "fs"
import path from "path"
import { load } from "js-yaml"

const AGENTS_DIR = path.resolve(import.meta.dir, "..", "plugins", "baseloop-gtm", "agents")

type AgentFrontmatter = {
  name?: string
  description?: string
  model?: string
}

async function listAgentFiles(): Promise<string[]> {
  const entries = await fs.readdir(AGENTS_DIR, { withFileTypes: true })
  return entries.filter((e) => e.isFile() && e.name.endsWith(".agent.md")).map((e) => e.name)
}

async function readAgent(filename: string): Promise<AgentFrontmatter> {
  const raw = await fs.readFile(path.join(AGENTS_DIR, filename), "utf8")
  const match = raw.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) throw new Error(`${filename} has no frontmatter block`)
  return load(match[1]) as AgentFrontmatter
}

describe("agent contract", () => {
  test("every agent file has parseable frontmatter", async () => {
    const files = await listAgentFiles()
    expect(files.length).toBeGreaterThan(0)
    for (const f of files) {
      const data = await readAgent(f)
      expect(data, `${f}: frontmatter empty`).toBeTruthy()
    }
  })

  test("frontmatter name matches filename (without .agent.md suffix)", async () => {
    for (const f of await listAgentFiles()) {
      const data = await readAgent(f)
      const expected = f.replace(/\.agent\.md$/, "")
      expect(data.name, `${f}: missing name`).toBeDefined()
      expect(data.name).toBe(expected)
    }
  })

  test("frontmatter has a non-empty description", async () => {
    for (const f of await listAgentFiles()) {
      const data = await readAgent(f)
      expect(data.description, `${f}: missing description`).toBeDefined()
      expect(data.description!.trim().length).toBeGreaterThan(20)
    }
  })
})
