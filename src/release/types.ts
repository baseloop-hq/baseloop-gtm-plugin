export type PluginCounts = {
  skills: number
  agents: number
  mcpServers: number
}

export type DescriptionTarget = {
  /** Path relative to repo root. */
  path: string
  /** JSONPath-style key into the file (dot notation). */
  field: string
  /** Function that produces the desired value given current counts. */
  build: (counts: PluginCounts) => string
}

export type ManifestUpdate = {
  path: string
  field: string
  current: string
  expected: string
  changed: boolean
}

export type SyncResult = {
  updates: ManifestUpdate[]
  errors: string[]
}

export type SyncOptions = {
  write?: boolean
}
