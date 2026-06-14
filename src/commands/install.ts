import path from "path"
import { defineCommand } from "citty"
import { loadClaudePlugin } from "../parsers/claude"
import { convertClaudeToCodex } from "../converters/claude-to-codex"
import { convertClaudeToGemini } from "../converters/claude-to-gemini"
import { resolveCodexPaths, writeCodexBundle } from "../targets/codex"
import { resolveGeminiPaths, writeGeminiBundle } from "../targets/gemini"
import { ensureCodexAgentsFile } from "../utils/codex-agents"
import { detectInstalledTools } from "../utils/detect-tools"

const TARGETS = ["codex", "gemini", "all"] as const
type TargetArg = (typeof TARGETS)[number]

export default defineCommand({
  meta: {
    name: "install",
    description: "Install the baseloop-gtm plugin to a target platform.",
  },
  args: {
    plugin: {
      type: "positional",
      required: false,
      description: "Path to the plugin directory (defaults to ./plugins/baseloop-gtm).",
    },
    to: {
      type: "string",
      required: true,
      description: "Target: codex | gemini | all",
    },
    "codex-home": {
      type: "string",
      description: "Override Codex install root (default: ~/.codex).",
    },
    "gemini-home": {
      type: "string",
      description: "Override Gemini install root (default: ~/.gemini).",
    },
    "dry-run": {
      type: "boolean",
      description: "Print the file-write plan without writing.",
    },
    "include-skills": {
      type: "boolean",
      description: "Codex only: bundle skills too (default: native plugin install handles them).",
    },
  },
  async run({ args }) {
    const target = String(args.to) as TargetArg
    if (!TARGETS.includes(target)) {
      console.error(`Unknown target "${target}". Supported: ${TARGETS.join(" | ")}`)
      process.exit(1)
    }

    const pluginPath = args.plugin
      ? path.resolve(String(args.plugin))
      : path.resolve("plugins/baseloop-gtm")

    const dryRun = Boolean(args["dry-run"])
    const includeSkills = Boolean(args["include-skills"])

    const plugin = await loadClaudePlugin(pluginPath)
    console.log(`Loaded plugin "${plugin.manifest.name}" v${plugin.manifest.version}`)
    console.log(`  Skills: ${plugin.skills.length}, MCP: ${Object.keys(plugin.mcpServers || {}).length}`)

    const targets = target === "all" ? (["codex", "gemini"] as const) : ([target] as const)
    let detected: Awaited<ReturnType<typeof detectInstalledTools>> | null = null
    if (target === "all") {
      detected = await detectInstalledTools()
    }

    let allOk = true
    let attempted = 0
    for (const t of targets) {
      if (target === "all" && detected) {
        const hasExplicitRoot =
          (t === "codex" && args["codex-home"]) ||
          (t === "gemini" && args["gemini-home"])
        const found = detected.find((d) => d.name === t)
        if (!hasExplicitRoot && !found?.detected) {
          console.log(`\n[${t}] skipped — ${found?.reason ?? "not installed"}`)
          continue
        }
      }
      attempted++
      console.log(`\n[${t}] ${dryRun ? "DRY RUN" : "installing"}...`)
      try {
        if (t === "codex") {
          const bundle = convertClaudeToCodex(plugin, { includeSkills })
          const paths = resolveCodexPaths(args["codex-home"] ? String(args["codex-home"]) : undefined, plugin.manifest.name)
          const report = await writeCodexBundle(bundle, paths, { dryRun })
          summarizeCodex(t, paths.codexHome, report)
          if (!dryRun && includeSkills) {
            const { created, path: agentsPath } = await ensureCodexAgentsFile(paths.codexHome)
            console.log(`  ${created ? "wrote" : "updated"} tool-mapping block in ${agentsPath}`)
          }
        } else if (t === "gemini") {
          const bundle = convertClaudeToGemini(plugin)
          const paths = resolveGeminiPaths(args["gemini-home"] ? String(args["gemini-home"]) : undefined, plugin.manifest.name)
          const report = await writeGeminiBundle(bundle, paths, { dryRun })
          summarizeGemini(t, paths.geminiHome, report)
        }
      } catch (err) {
        allOk = false
        console.error(`[${t}] failed: ${err instanceof Error ? err.message : err}`)
      }
    }

    if (attempted === 0) {
      allOk = false
      console.error("No install targets were available. Install Codex/Gemini first, pass --codex-home/--gemini-home, or choose a specific --to target.")
    }

    if (!allOk) {
      process.exit(target === "all" ? 2 : 1)
    }
  },
})

function summarizeCodex(target: string, root: string, report: Awaited<ReturnType<typeof writeCodexBundle>>): void {
  console.log(`  root: ${root}`)
  console.log(`  skills written:   ${report.skillsWritten.length}`)
  if (report.skillsRemoved.length) console.log(`  skills removed:   ${report.skillsRemoved.length}`)
  if (report.agentsRemoved.length) console.log(`  legacy agents removed: ${report.agentsRemoved.length} (${report.agentsRemoved.join(", ")})`)
}

function summarizeGemini(target: string, root: string, report: Awaited<ReturnType<typeof writeGeminiBundle>>): void {
  console.log(`  root: ${root}`)
  console.log(`  skills written:    ${report.skillsWritten.length}`)
  if (report.skillsRemoved.length) console.log(`  skills removed:    ${report.skillsRemoved.length}`)
  if (report.agentsRemoved.length) console.log(`  legacy agents removed: ${report.agentsRemoved.length}`)
  console.log(`  MCP servers merged: ${report.mcpServersMerged.length} (${report.mcpServersMerged.join(", ")})`)
  if (report.settingsBackup) console.log(`  settings backup:   ${report.settingsBackup}`)
  if (report.secretsWarnings.length) console.log(`  ⚠️  ${report.secretsWarnings.length} potential-secret warning(s) — see above.`)
}
