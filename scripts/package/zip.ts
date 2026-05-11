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
 */
import { promises as fs } from "fs"
import path from "path"
import { spawn } from "child_process"

const REPO_ROOT = path.resolve(import.meta.dir, "..", "..")
const PLUGIN_DIR_NAME = "baseloop-gtm"
const PLUGIN_PARENT = path.join(REPO_ROOT, "plugins")
const PLUGIN_DIR = path.join(PLUGIN_PARENT, PLUGIN_DIR_NAME)
const PLUGIN_MANIFEST = path.join(PLUGIN_DIR, ".claude-plugin", "plugin.json")
const DIST_DIR = path.join(REPO_ROOT, "dist")

async function readVersion(): Promise<string> {
  const manifest = JSON.parse(await fs.readFile(PLUGIN_MANIFEST, "utf8")) as { version: string }
  if (!manifest.version) {
    throw new Error(`No version in ${PLUGIN_MANIFEST}`)
  }
  return manifest.version
}

function runZip(zipPath: string): Promise<void> {
  // Run from PLUGIN_PARENT so the archive contains `baseloop-gtm/...` at root.
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
    const child = spawn("zip", args, { cwd: PLUGIN_PARENT, stdio: "inherit" })
    child.on("error", reject)
    child.on("exit", (code) => {
      if (code === 0) resolve()
      else reject(new Error(`zip exited with code ${code}`))
    })
  })
}

const version = await readVersion()
await fs.mkdir(DIST_DIR, { recursive: true })

const zipPath = path.join(DIST_DIR, `${PLUGIN_DIR_NAME}-${version}.zip`)
// Wipe a stale zip with the same name so the output is reproducible.
try {
  await fs.unlink(zipPath)
} catch {
  // not present, fine
}

console.log(`Packaging ${PLUGIN_DIR_NAME} v${version}...`)
await runZip(zipPath)

const stat = await fs.stat(zipPath)
const sizeKb = (stat.size / 1024).toFixed(1)

console.log(`\n✓ wrote ${path.relative(REPO_ROOT, zipPath)} (${sizeKb} KB)`)
console.log(`\nUpload in Claude Desktop:`)
console.log(`  Cowork tab → Customize → Browse plugins → Personal → + → Add from file`)
console.log(`  Pick: ${zipPath}`)
