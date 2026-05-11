import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { detectInstalledTools } from "../src/utils/detect-tools"

let tmpHome: string

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), "baseloop-detect-test-"))
})

afterEach(async () => {
  await fs.rm(tmpHome, { recursive: true, force: true })
})

describe("detectInstalledTools", () => {
  test("reports both targets as not detected when no install dirs exist", async () => {
    const result = await detectInstalledTools(tmpHome)
    expect(result.find((r) => r.name === "codex")?.detected).toBe(false)
    expect(result.find((r) => r.name === "gemini")?.detected).toBe(false)
  })

  test("detects codex when ~/.codex exists", async () => {
    await fs.mkdir(path.join(tmpHome, ".codex"), { recursive: true })
    const result = await detectInstalledTools(tmpHome)
    expect(result.find((r) => r.name === "codex")?.detected).toBe(true)
    expect(result.find((r) => r.name === "gemini")?.detected).toBe(false)
  })

  test("detects gemini when ~/.gemini exists", async () => {
    await fs.mkdir(path.join(tmpHome, ".gemini"), { recursive: true })
    const result = await detectInstalledTools(tmpHome)
    expect(result.find((r) => r.name === "gemini")?.detected).toBe(true)
  })

  test("detects both when both dirs exist", async () => {
    await fs.mkdir(path.join(tmpHome, ".codex"), { recursive: true })
    await fs.mkdir(path.join(tmpHome, ".gemini"), { recursive: true })
    const result = await detectInstalledTools(tmpHome)
    for (const r of result) {
      expect(r.detected).toBe(true)
    }
  })
})
