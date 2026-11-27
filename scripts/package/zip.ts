#!/usr/bin/env bun
/**
 * Package the plugin into a zip suitable for "Add plugin from file" upload
 * in Claude Desktop's Cowork tab.
 *
 * Output: dist/baseloop-gtm-<version>.zip
 *
 * The zip contains the plugin directory at its root (so the uploaded archive
 * unpacks as `baseloop-gtm/.claude-plugin/...`), excludes OS cruft, and
 * is regenerated each run.
 *
 * Use this for local-dev iteration. Production users install via the
 * marketplace, not via uploaded zips.
 *
 * With `--openai` it packages the Codex package instead, for upload to the
 * OpenAI plugin directory (platform.openai.com/plugins), which takes a ZIP
 * with the plugin in one top-level folder.
 *
 * Output: dist/baseloop-gtm-openai-<version>.zip
 *
 * The OpenAI build is the Codex package with the files under
 * scripts/package/openai-overrides/ laid over it, path for path. An override
 * may only replace a file the package already has. Today there is one: the
 * outbound campaign recipe, which OpenAI's skill scan refuses under its
 * "Spam mass abuse" policy, is replaced by a short note. Codex installs from
 * the repository are not affected: they read the package as committed.
 */
import { promises as fs } from "fs"
import os from "os"
import path from "path"
import { spawn } from "child_process"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const OPENAI = process.argv.includes("--openai")
const PLUGIN_DIR_NAME = OPENAI ? "baseloop-gtm-codex" : "baseloop-gtm"
const ZIP_BASENAME = OPENAI ? "baseloop-gtm-openai" : "baseloop-gtm"
const PLUGIN_PARENT = path.join(REPO_ROOT, "plugins")
const PLUGIN_DIR = path.join(PLUGIN_PARENT, PLUGIN_DIR_NAME)
const PLUGIN_MANIFEST = OPENAI
  ? path.join(PLUGIN_DIR, ".codex-plugin", "plugin.json")
  : path.join(PLUGIN_DIR, ".claude-plugin", "plugin.json")
const DIST_DIR = path.join(REPO_ROOT, "dist")
const OPENAI_OVERRIDES_DIR = path.join(REPO_ROOT, "scripts", "package", "openai-overrides")

async function readVersion(): Promise<string> {
  const manifest = JSON.parse(await fs.readFile(PLUGIN_MANIFEST, "utf8")) as { version: string }
  if (!manifest.version) {
    throw new Error(`No version in ${PLUGIN_MANIFEST}`)
  }
  return manifest.version
}

async function listFiles(dir: string, prefix = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map((entry) => {
      const relative = path.join(prefix, entry.name)
      return entry.isDirectory() ? listFiles(path.join(dir, entry.name), relative) : Promise.resolve([relative])
    }),
  )
  return files.flat()
}

/** Copies the Codex package to a temp folder and lays the OpenAI overrides over it. Returns the folder holding the copy. */
async function stageOpenAiPackage(): Promise<string> {
  const stageParent = await fs.mkdtemp(path.join(os.tmpdir(), "baseloop-gtm-openai-"))
  const staged = path.join(stageParent, PLUGIN_DIR_NAME)
  await fs.cp(PLUGIN_DIR, staged, { recursive: true })
  for (const relative of await listFiles(OPENAI_OVERRIDES_DIR)) {
    const target = path.join(staged, relative)
    try {
      await fs.access(target)
    } catch {
      throw new Error(`OpenAI override ${relative} replaces no file in ${PLUGIN_DIR_NAME}`)
    }
    await fs.copyFile(path.join(OPENAI_OVERRIDES_DIR, relative), target)
    console.log(`  override: ${relative}`)
  }
  return stageParent
}

function runZip(zipPath: string, cwd: string): Promise<void> {
  // Run from the plugin's parent folder so the archive contains `baseloop-gtm/...` at root.
  // -r: recurse, -X: strip extra metadata (uid/gid/extra attrs), -q: quiet.
  // -x: exclude OS cruft and irrelevant files.
  const args = [
    "-r",
    "-X",
    "-q",
    zipPath,
    PLUGIN_DIR_NAME,
    "-x",
    `${PLUGIN_DIR_NAME}/**/.DS_Store`,
    `${PLUGIN_DIR_NAME}/**/__MACOSX/*`,
    `${PLUGIN_DIR_NAME}/**/node_modules/*`,
    `${PLUGIN_DIR_NAME}/**/*.log`,
  ]
  return new Promise((resolve, reject) => {
    const child = spawn("zip", args, { cwd, stdio: "inherit" })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`zip exited with code ${code}`))
    })
  })
}

const version = await readVersion()
await fs.mkdir(DIST_DIR, { recursive: true })

const zipPath = path.join(DIST_DIR, `${ZIP_BASENAME}-${version}.zip`)
// Wipe a stale zip with the same name so the output is reproducible.
try {
  await fs.unlink(zipPath)
} catch {
  // not present, fine
}

console.log(`Packaging ${PLUGIN_DIR_NAME} v${version}...`)
const stageParent = OPENAI ? await stageOpenAiPackage() : null
try {
  await runZip(zipPath, stageParent ?? PLUGIN_PARENT)
} finally {
  if (stageParent) await fs.rm(stageParent, { recursive: true, force: true })
}

const stat = await fs.stat(zipPath)
const sizeKb = (stat.size / 1024).toFixed(1)

console.log(`\n✓ wrote ${path.relative(REPO_ROOT, zipPath)} (${sizeKb} KB)`)
if (OPENAI) {
  console.log(`\nUpload to the OpenAI plugin directory:`)
  console.log(`  platform.openai.com/plugins → Upload new or existing plugin → With MCP`)
} else {
  console.log(`\nUpload in Claude Desktop:`)
  console.log(`  Cowork tab → Customize → Browse plugins → Personal → + → Add from file`)
}
console.log(`  Pick: ${zipPath}`)
