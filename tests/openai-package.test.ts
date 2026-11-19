import { describe, expect, test } from "bun:test"
import { promises as fs } from "fs"
import path from "path"

// Limits from https://developers.openai.com/plugins/deploy/submission. The OpenAI
// plugin directory (ChatGPT and Codex) takes the Codex package as a ZIP upload.
const CODEX_PACKAGE_ROOT = path.resolve(import.meta.dir, "..", "plugins", "baseloop-gtm-codex")
const PLUGIN_JSON = path.join(CODEX_PACKAGE_ROOT, ".codex-plugin", "plugin.json")
const MCP_JSON = path.join(CODEX_PACKAGE_ROOT, ".mcp.json")

type TestCase = Record<string, string>
type Manifest = {
  name: string
  version: string
  description: string
  author: { name: string }
  hooks?: unknown
  apps?: unknown
  interface: Record<string, unknown> & { defaultPrompt: string[]; capabilities: string[] }
  extensions: {
    "com.openai": {
      review: { test_cases: { positive: TestCase[]; negative: TestCase[] } }
      publication: { release_notes: string }
    }
  }
}

async function readJson<T>(p: string): Promise<T> {
  return JSON.parse(await fs.readFile(p, "utf8")) as T
}

function pngSize(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) }
}

describe("OpenAI plugin directory package", () => {
  test("package identity fields are set", async () => {
    const plugin = await readJson<Manifest>(PLUGIN_JSON)
    expect(plugin.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    expect(plugin.name.length).toBeLessThanOrEqual(64)
    expect(plugin.version).toMatch(/^\d+\.\d+\.\d+$/)
    expect(plugin.description.length).toBeGreaterThan(0)
    expect(plugin.description.length).toBeLessThanOrEqual(4000)
    expect(plugin.author.name).toBeTypeOf("string")
  })

  test("listing fields are present and inside their limits", async () => {
    const { interface: listing } = await readJson<Manifest>(PLUGIN_JSON)
    expect((listing.displayName as string).length).toBeLessThanOrEqual(30)
    expect((listing.shortDescription as string).length).toBeLessThanOrEqual(30)
    expect((listing.longDescription as string).length).toBeLessThanOrEqual(4000)
    expect((listing.developerName as string).length).toBeLessThanOrEqual(80)
    expect(listing.category).toBeTypeOf("string")
    expect(listing.capabilities.length).toBeLessThanOrEqual(20)
    for (const key of ["websiteURL", "supportURL", "privacyPolicyURL", "termsOfServiceURL"]) {
      expect(listing[key] as string).toMatch(/^https:\/\/[^@]+$/)
    }
  })

  test("default prompts are plain language, at most three of 128 characters", async () => {
    const { interface: listing } = await readJson<Manifest>(PLUGIN_JSON)
    expect(listing.defaultPrompt.length).toBeLessThanOrEqual(3)
    for (const prompt of listing.defaultPrompt) {
      expect(prompt.length).toBeLessThanOrEqual(128)
      expect(prompt.startsWith("/")).toBe(false)
    }
  })

  test("listing text advertises no pricing and names no competitor", async () => {
    const { interface: listing } = await readJson<Manifest>(PLUGIN_JSON)
    const text = [listing.displayName, listing.shortDescription, listing.longDescription].join(" ")
    expect(text).not.toMatch(/free trial|\btrial\b|discount|flat price|\$\d|\bClay\b/i)
    expect(listing.displayName as string).not.toMatch(/\b(MCP|Plugin)\b/i)
  })

  test("logo and composer icon are square PNGs inside the package", async () => {
    const { interface: listing } = await readJson<Manifest>(PLUGIN_JSON)
    for (const key of ["logo", "composerIcon"]) {
      const rel = listing[key] as string
      expect(rel.startsWith("./")).toBe(true)
      const { width, height } = pngSize(await fs.readFile(path.join(CODEX_PACKAGE_ROOT, rel)))
      expect(width).toBe(height)
      expect(width).toBeGreaterThanOrEqual(48)
      expect(width).toBeLessThanOrEqual(4096)
    }
  })

  test("review material has five positive and three negative cases", async () => {
    const { review, publication } = (await readJson<Manifest>(PLUGIN_JSON)).extensions["com.openai"]
    expect(review.test_cases.positive.length).toBe(5)
    expect(review.test_cases.negative.length).toBe(3)
    for (const testCase of review.test_cases.positive) {
      for (const key of ["description", "prompt", "tools_triggered", "expected_behavior"]) {
        expect(testCase[key].length).toBeGreaterThan(0)
      }
    }
    for (const testCase of review.test_cases.negative) {
      expect(testCase.description.length).toBeGreaterThan(0)
      expect(testCase.prompt.length).toBeGreaterThan(0)
    }
    expect(publication.release_notes.length).toBeGreaterThan(0)
  })

  test("package carries nothing the portal rejects", async () => {
    const plugin = await readJson<Manifest>(PLUGIN_JSON)
    expect(plugin.hooks).toBeUndefined()
    expect(plugin.apps).toBeUndefined()
    const raw = await fs.readFile(PLUGIN_JSON, "utf8")
    expect(raw).not.toContain("test_credentials")
    expect(raw).not.toContain("reviewer_instructions")
    await expect(fs.access(path.join(CODEX_PACKAGE_ROOT, ".app.json"))).rejects.toThrow()
    await expect(fs.access(path.join(CODEX_PACKAGE_ROOT, "hooks"))).rejects.toThrow()
  })

  test("the MCP server declares OAuth with dynamic registration and no secrets", async () => {
    const mcp = await readJson<{ mcpServers: Record<string, Record<string, unknown>> }>(MCP_JSON)
    expect(Object.keys(mcp.mcpServers)).toEqual(["baseloop"])
    const server = mcp.mcpServers.baseloop
    expect(server.url as string).toMatch(/^https:\/\//)
    expect(server.headers).toBeUndefined()
    const auth = (server.extensions as { "com.openai": { auth: { type: string; client: Record<string, unknown> } } })[
      "com.openai"
    ].auth
    expect(auth.type).toBe("oauth")
    expect(auth.client.mode).toBe("dcr")
    expect(auth.client.clientId).toBeUndefined()
    expect(auth.client.clientSecret).toBeUndefined()
  })
})
