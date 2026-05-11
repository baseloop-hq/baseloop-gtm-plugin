import { describe, expect, test } from "bun:test"
import { findServersWithPotentialSecrets, hasPotentialSecrets, SENSITIVE_PATTERN } from "../src/utils/secrets"

describe("secrets detection", () => {
  test("SENSITIVE_PATTERN matches common secret-like names case-insensitively", () => {
    expect(SENSITIVE_PATTERN.test("API_KEY")).toBe(true)
    expect(SENSITIVE_PATTERN.test("auth_token")).toBe(true)
    expect(SENSITIVE_PATTERN.test("SECRET")).toBe(true)
    expect(SENSITIVE_PATTERN.test("PASSWORD")).toBe(true)
    expect(SENSITIVE_PATTERN.test("CREDENTIAL")).toBe(true)
    expect(SENSITIVE_PATTERN.test("PUBLIC_NAME")).toBe(false)
    expect(SENSITIVE_PATTERN.test("HOST")).toBe(false)
  })

  test("hasPotentialSecrets returns true when any env var key looks suspect", () => {
    expect(
      hasPotentialSecrets({
        a: { env: { FOO: "1", BAR_TOKEN: "x" } },
      }),
    ).toBe(true)
    expect(
      hasPotentialSecrets({
        a: { env: { FOO: "1", BAR: "x" } },
      }),
    ).toBe(false)
    expect(hasPotentialSecrets({ a: {} })).toBe(false)
  })

  test("findServersWithPotentialSecrets reports server name + suspect keys", () => {
    const out = findServersWithPotentialSecrets({
      ok: { env: { HOST: "x", PORT: "y" } },
      bad: { env: { API_KEY: "x", PUBLIC: "y", AUTH_TOKEN: "z" } },
    })
    expect(out.length).toBe(1)
    expect(out[0].serverName).toBe("bad")
    expect(out[0].envKeys.sort()).toEqual(["API_KEY", "AUTH_TOKEN"])
  })
})
