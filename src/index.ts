#!/usr/bin/env bun
import path from "path"
import { defineCommand, runMain } from "citty"
import installCmd from "./commands/install"
import cleanupCmd from "./commands/cleanup"
import { readJson } from "./utils/files"

const packageJson = await readJson<{ version?: string }>(path.resolve(import.meta.dir, "..", "package.json"))
const version = packageJson.version ?? "0.0.0"

const main = defineCommand({
  meta: {
    name: "baseloop-plugin",
    version,
    description: "Convert and install the baseloop-gtm plugin to Codex and Gemini.",
  },
  subCommands: {
    install: installCmd,
    cleanup: cleanupCmd,
  },
})

await runMain(main)
