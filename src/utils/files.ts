import { promises as fs } from "fs"
import path from "path"

export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true })
}

export async function readText(p: string): Promise<string> {
  return fs.readFile(p, "utf8")
}

export async function readJson<T>(p: string): Promise<T> {
  return JSON.parse(await readText(p)) as T
}

export async function writeText(p: string, content: string): Promise<void> {
  await ensureDir(path.dirname(p))
  await fs.writeFile(p, content)
}

export async function writeJson(p: string, data: unknown): Promise<void> {
  await writeText(p, JSON.stringify(data, null, 2) + "\n")
}

export async function writeTextAtomic(p: string, content: string): Promise<void> {
  await ensureDir(path.dirname(p))
  const tmp = path.join(path.dirname(p), `.${path.basename(p)}.${process.pid}.${Date.now()}.tmp`)
  try {
    await fs.writeFile(tmp, content)
    await fs.rename(tmp, p)
  } catch (err) {
    await fs.rm(tmp, { force: true }).catch(() => {})
    throw err
  }
}

export async function writeJsonAtomic(p: string, data: unknown): Promise<void> {
  await writeTextAtomic(p, JSON.stringify(data, null, 2) + "\n")
}

/**
 * Sanitize a name for use as a path segment. Strips path separators and
 * non-printable characters. Used when converting plugin/skill/agent names
 * (which may contain colons) into filesystem-safe paths.
 */
export function sanitizePathName(name: string): string {
  const sanitized = name.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "")
  if (!isSafePathSegment(sanitized)) {
    throw new Error(`Unsafe path segment generated from "${name}"`)
  }
  return sanitized
}

export function isSafePathSegment(segment: string): boolean {
  return (
    segment.length > 0 &&
    segment !== "." &&
    segment !== ".." &&
    !segment.includes("/") &&
    !segment.includes("\\")
  )
}

/**
 * Back up a file to `<file>.<timestamp>.bak` if it exists. Returns the backup
 * path, or null when the file didn't exist.
 */
export async function backupFile(p: string): Promise<string | null> {
  if (!(await pathExists(p))) return null
  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backup = `${p}.${stamp}.bak`
  await fs.copyFile(p, backup)
  return backup
}

/** Recursively copy a skill directory, optionally transforming markdown content. */
export async function copySkillDir(
  source: string,
  dest: string,
  transform?: (content: string) => string,
): Promise<void> {
  await ensureDir(dest)
  const entries = await fs.readdir(source, { withFileTypes: true })
  for (const e of entries) {
    const src = path.join(source, e.name)
    const dst = path.join(dest, e.name)
    if (e.isDirectory()) {
      await copySkillDir(src, dst, transform)
    } else if (e.isFile()) {
      if (transform && e.name.endsWith(".md")) {
        const raw = await readText(src)
        await writeText(dst, transform(raw))
      } else {
        await fs.copyFile(src, dst)
      }
    }
  }
}

/** True iff `candidate` is inside `root` (no `..` escape). */
export function isSafeManagedPath(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root)
  const resolvedCandidate = path.resolve(candidate)
  return resolvedCandidate === resolvedRoot || resolvedCandidate.startsWith(resolvedRoot + path.sep)
}

/** True iff `candidate` is strictly inside `root`; equal-to-root is unsafe for destructive writes. */
export function isManagedChildPath(root: string, candidate: string): boolean {
  const resolvedRoot = path.resolve(root)
  const resolvedCandidate = path.resolve(candidate)
  return resolvedCandidate.startsWith(resolvedRoot + path.sep)
}
