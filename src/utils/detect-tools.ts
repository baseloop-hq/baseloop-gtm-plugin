import os from "os"
import path from "path"
import { pathExists } from "./files"

export type DetectedTool = {
  name: "codex" | "gemini"
  detected: boolean
  reason: string
}

/**
 * Detect whether Codex / Gemini are likely installed locally by checking the
 * standard config directories. Used by `install --to all` to skip missing
 * targets, and by Baseloop GTM setup guidance to suggest install commands.
 */
export async function detectInstalledTools(home: string = os.homedir()): Promise<DetectedTool[]> {
  const codexPath = path.join(home, ".codex")
  const geminiPath = path.join(home, ".gemini")
  const [codexExists, geminiExists] = await Promise.all([pathExists(codexPath), pathExists(geminiPath)])
  return [
    {
      name: "codex",
      detected: codexExists,
      reason: codexExists ? `${codexPath} exists` : `${codexPath} not found`,
    },
    {
      name: "gemini",
      detected: geminiExists,
      reason: geminiExists ? `${geminiPath} exists` : `${geminiPath} not found`,
    },
  ]
}
