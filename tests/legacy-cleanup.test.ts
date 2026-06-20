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
  test("registry contains known stale skill directories with rename targets", () => {
    expect(Object.keys(STALE_SKILL_DIRS_BY_VERSION)).toEqual(["0.8.0", "0.9.0"])
    expect(STALE_SKILL_DIRS_BY_VERSION["0.8.0"]).toEqual([
      { stale: "gtm-engineering", target: "baseloop-gtm" },
      { stale: "engineering", target: "baseloop-gtm" },
    ])
    expect(STALE_SKILL_DIRS_BY_VERSION["0.9.0"]).toEqual([
      { stale: "start", target: "baseloop-gtm" },
      { stale: "plan", target: "baseloop-gtm-plan" },
      { stale: "build", target: "baseloop-gtm-build" },
      { stale: "review", target: "baseloop-gtm-review" },
      { stale: "diagnose", target: "baseloop-gtm-diagnose" },
    ])
  })

  test("sweeps old root-skill lineage once the rename target landed", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "gtm-engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "baseloop-gtm"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "baseloop-gtm", "SKILL.md"), "new content")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0" })

    expect(report.removed.length).toBe(2)
    expect(report.removed.some((removed) => removed.endsWith("gtm-engineering"))).toBe(true)
    expect(report.removed.some((removed) => removed.endsWith("engineering"))).toBe(true)
    expect(report.removed.some((removed) => removed.endsWith("baseloop-gtm"))).toBe(false)
    expect(report.preserved.length).toBe(0)

    // Stale directories gone, live skill intact.
    await expect(fs.access(path.join(tmpRoot, "gtm-engineering"))).rejects.toThrow()
    await expect(fs.access(path.join(tmpRoot, "engineering"))).rejects.toThrow()
    expect(await fs.access(path.join(tmpRoot, "baseloop-gtm")).then(() => true)).toBe(true)
  })

  test("preserves the current root skill when the baseloop target is absent", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "gtm-engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "old content")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0" })

    expect(report.removed.length).toBe(0)
    expect(report.preserved.length).toBe(2)
    expect(await fs.access(path.join(tmpRoot, "engineering")).then(() => true)).toBe(true)
    expect(await fs.access(path.join(tmpRoot, "gtm-engineering")).then(() => true)).toBe(true)
  })

  test("preserves the live root skill when the rename target is absent", async () => {
    // The real layout of older installs: engineering/ IS the live root skill
    // and baseloop-gtm/ does not exist yet. A sweep here (or during an
    // interrupted upgrade that runs before new files land) must not delete it.
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "gtm-engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "live content")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.1" })

    expect(report.removed.length).toBe(0)
    expect(report.preserved.length).toBe(2)
    expect(report.preserved.some((preserved) => preserved.endsWith("engineering"))).toBe(true)
    expect(await fs.access(path.join(tmpRoot, "engineering")).then(() => true)).toBe(true)
    expect(await fs.access(path.join(tmpRoot, "gtm-engineering")).then(() => true)).toBe(true)
  })

  test("sweeps engineering/ after the baseloop root skill rename", async () => {
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
    await fs.mkdir(path.join(tmpRoot, "start"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "start", "SKILL.md"), "old 2.x content")
    await fs.mkdir(path.join(tmpRoot, "baseloop-gtm"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "baseloop-gtm", "SKILL.md"), "new content")

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.9.0" })

    expect(report.removed.some((removed) => removed.endsWith("gtm-engineering"))).toBe(true)
    expect(report.removed.some((removed) => removed.endsWith("engineering"))).toBe(true)
    expect(report.removed.some((removed) => removed.endsWith("start"))).toBe(true)
    expect(report.removed.some((removed) => removed.endsWith("baseloop-gtm"))).toBe(false)
    expect(await fs.access(path.join(tmpRoot, "baseloop-gtm")).then(() => true)).toBe(true)
    await expect(fs.access(path.join(tmpRoot, "gtm-engineering"))).rejects.toThrow()
    await expect(fs.access(path.join(tmpRoot, "engineering"))).rejects.toThrow()
    await expect(fs.access(path.join(tmpRoot, "start"))).rejects.toThrow()
  })

  test("versioned sweeps ignore prerelease and build metadata suffixes", async () => {
    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "baseloop-gtm"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "baseloop-gtm", "SKILL.md"), "new content")

    const prerelease = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0-rc.1" })
    expect(prerelease.removed.some((removed) => removed.endsWith("engineering"))).toBe(true)

    await fs.mkdir(path.join(tmpRoot, "engineering"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "engineering", "SKILL.md"), "old content")

    const buildMetadata = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0+build.7" })
    expect(buildMetadata.removed.some((removed) => removed.endsWith("engineering"))).toBe(true)
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
    await fs.mkdir(path.join(tmpRoot, "start"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "start", "SKILL.md"), "old content")
    await fs.mkdir(path.join(tmpRoot, "baseloop-gtm"), { recursive: true })
    await fs.writeFile(path.join(tmpRoot, "baseloop-gtm", "SKILL.md"), "new content")

    const report = await sweepLegacyArtifacts(tmpRoot)

    expect(report.removed.length).toBe(3)
    await expect(fs.access(path.join(tmpRoot, "gtm-engineering"))).rejects.toThrow()
    await expect(fs.access(path.join(tmpRoot, "engineering"))).rejects.toThrow()
    await expect(fs.access(path.join(tmpRoot, "start"))).rejects.toThrow()
    expect(await fs.access(path.join(tmpRoot, "baseloop-gtm")).then(() => true)).toBe(true)
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
    await fs.mkdir(path.join(tmpRoot, "baseloop-gtm"), { recursive: true })

    const report = await sweepLegacyArtifacts(tmpRoot, { forVersion: "0.8.0", dryRun: true })
    expect(report.removed.length).toBe(1)

    // Still on disk after dry-run.
    expect(await fs.access(path.join(tmpRoot, "gtm-engineering", "marker")).then(() => true)).toBe(true)
  })

  test("does not touch unrelated user files siblings", async () => {
    await fs.mkdir(path.join(tmpRoot, "gtm-engineering"), { recursive: true })
    await fs.mkdir(path.join(tmpRoot, "baseloop-gtm"), { recursive: true })
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
