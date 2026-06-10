import { describe, expect, test, beforeEach, afterEach } from "bun:test"
import { promises as fs } from "fs"
import path from "path"
import os from "os"
import { sweepLegacyArtifacts } from "../src/utils/legacy-cleanup"
import { STALE_SKILL_DIRS_BY_VERSION } from "../src/data/legacy-artifacts"

let tmpRoot: string

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "baseloop-legacy-test-"))
})

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true })
})

describe("legacy cleanup", () => {
  test("registry contains known stale skill directories", () => {
    expect(Object.keys(STALE_SKILL_DIRS_BY_VERSION)).toEqual(["0.8.0"])
    expect(STALE_SKILL_DIRS_BY_VERSION["0.8.0"]).toEqual(["gtm-engineering", "engineering"])
  })

  test("sweeps old root-skill lineage from a simulated 0.x install", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "gtm-engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "new content")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0" })

    expect(report.removed.length).toBe(2)
    expect(report.removed.some((removed) => removed.endsWith("gtm-engineering"))).toBe(true)
    expect(report.removed.some((removed) => removed.endsWith("engineering"))).toBe(true)

    // Stale directories gone.
    let stalePresent = true
    try {
      await fs.access(path.join(tmpRoot, "gtm-engineering"))
    } catch {
      stalePresent = false
    }
    expect(stalePresent).toBe(false)
    await expect(fs.access(path.join(tmpRoot, "engineering"))).rejects.toThrow()
  })

  test("sweeps engineering/ after the root skill rename", async () => {
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "baseloop-gtm"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "baseloop-gtm", "SKILL.md"), "new content")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0" })

    expect(report.removed.length).toBe(1)
    expect(report.removed[0]).toContain("engineering")
    expect(await fs.access(path.join(tmpRoot, "baseloop-gtm")).then(() => true)).toBe(true)
    await expect(fs.access(path.join(tmpRoot, "engineering"))).rejects.toThrow()
  })

  test("versioned sweeps include earlier stale skill directories", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "gtm-engineering", "SKILL.md"), "old 0.x content")
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "old 1.x content")
    await fs.mkdir(path.join(tmpRoot, "baseloop-gtm"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "baseloop-gtm", "SKILL.md"), "new content")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.9.0" })

    expect(report.removed.some((removed) => removed.endsWith("gtm-engineering"))).toBe(true)
    expect(report.removed.some((removed) => removed.endsWith("engineering"))).toBe(true)
    expect(await fs.access(path.join(tmpRoot, "baseloop-gtm")).then(() => true)).toBe(true)
    await expect(fs.access(path.join(tmpRoot, "gtm-engineering"))).rejects.toThrow()
    await expect(fs.access(path.join(tmpRoot, "engineering"))).rejects.toThrow()
  })

  test("no-op when forVersion predates all cleanup entries", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "gtm-engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "old content")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.7.0" })

    expect(report.removed.length).toBe(0)
    expect(await fs.access(path.join(tmpRoot, "gtm-engineering")).then(() => true)).toBe(true)
    expect(await fs.access(path.join(tmpRoot, "engineering")).then(() => true)).toBe(true)
  })

  test("version-less sweep removes all known stale dirs", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "gtm-engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "old content")

    const report = await sweepLegacyArtifacts(tmpRoot)

    expect(report.removed.length).toBe(2)
    await expect(fs.access(path.join(tmpRoot, "gtm-engineering"))).rejects.toThrow()
    await expect(fs.access(path.join(tmpRoot, "engineering"))).rejects.toThrow()
  })

  test("no-op when stale dir doesn't exist", async () => {
    await fs.mkdir(path.join(tmpRoot, "current-skill"), { recursive: true })
    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0" })
    expect(report.removed.length).toBe(0)
    expect(report.errors.length).toBe(0)
  })

  test("dry-run reports what would be removed but doesn't delete", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "gtm-engineering", "marker"), "x")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0", dryRun: true })
    expect(report.removed.length).toBe(1)

    // Still on disk after dry-run.
    expect(await fs.access(path.join(tmpRoot, "gtm-engineering", "marker")).then(() => true)).toBe(true)
  })

  test("does not touch unrelated user files siblings", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "user-notes.md"), "my notes")
    await fs.mkdir(path.join(tmpRoot, "my-custom-skill"), { recursive: true })

    await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0" })

    expect(await fs.access(path.join(tmpRoot, "user-notes.md")).then(() => true)).toBe(true)
    expect(await fs.access(path.join(tmpRoot, "my-custom-skill")).then(() => true)).toBe(true)
  })

  test("graceful when target directory is missing", async () => {
    const report = await sweepLegacyArtifacts(path.join(tmpRoot, "nonexistent"))
    expect(report.removed.length).toBe(0)
    expect(report.errors.length).toBe(0)
  })
})
