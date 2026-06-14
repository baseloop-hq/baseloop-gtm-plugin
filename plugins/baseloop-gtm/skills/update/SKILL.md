---
name: baseloop-gtm:update
description: |
  Check whether the installed baseloop-gtm plugin matches the upstream version on `main`,
  and tell the user how to upgrade if not. Use when the user says "update baseloop", "is
  baseloop-gtm up to date", "check plugin version", or reports issues that might stem
  from a stale plugin install.
disable-model-invocation: true
ce_platforms: [claude]
---

# Update

<!-- INTERACTION-METHOD-START -->

## Interaction Method

When asking the user a question, use the platform's blocking question tool when it is available in the current harness: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex when exposed by the active mode, or `ask_user` in Gemini. Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.

<!-- INTERACTION-METHOD-END -->


Compare the installed plugin version against `main` HEAD on the remote repository. Recommend the upgrade command if behind. Claude Code only.

## Pre-resolved context

`${CLAUDE_SKILL_DIR}` is a Claude Code-documented substitution that resolves at skill-load time. For a marketplace install it looks like `~/.claude/plugins/cache/<marketplace>/baseloop-gtm/<version>/skills/update`, so the currently-loaded version is the basename two `dirname` levels up from the skill directory.

The upstream version comes from `plugins/baseloop-gtm/.claude-plugin/plugin.json` on `main` — not the latest GitHub Release tag, because Claude Code's marketplace installs from `main` HEAD. Comparing against release tags false-positives whenever `main` is ahead of the last tag.

**Skill directory:**
!`echo "${CLAUDE_SKILL_DIR}"`

**Latest upstream version:**
!`version=$(gh api repos/baseloop-hq/baseloop-gtm-plugin/contents/plugins/baseloop-gtm/.claude-plugin/plugin.json --jq '.content | @base64d | fromjson | .version' 2>/dev/null) && [ -n "$version" ] && echo "$version" || echo '__BASELOOP_UPDATE_VERSION_FAILED__'`

**Currently loaded version:**
!`case "${CLAUDE_SKILL_DIR}" in */plugins/cache/*/baseloop-gtm/*/skills/update) basename "$(dirname "$(dirname "${CLAUDE_SKILL_DIR}")")" ;; *) echo '__BASELOOP_UPDATE_NOT_MARKETPLACE__' ;; esac`

**Marketplace name:**
!`case "${CLAUDE_SKILL_DIR}" in */plugins/cache/*/baseloop-gtm/*/skills/update) basename "$(dirname "$(dirname "$(dirname "$(dirname "${CLAUDE_SKILL_DIR}")")")")" ;; *) echo '__BASELOOP_UPDATE_NOT_MARKETPLACE__' ;; esac`

## Decision logic

### 1. Platform gate

If **Skill directory** is empty or unresolved: tell the user this skill requires Claude Code and stop. No further action.

> "This skill requires Claude Code. The version probe relies on `${CLAUDE_SKILL_DIR}`, which only resolves under Claude Code's plugin harness."

### 2. Handle failure cases

If **Latest upstream version** equals `__BASELOOP_UPDATE_VERSION_FAILED__`:

> "Couldn't fetch the upstream version. `gh` may be missing, you may not be authenticated, or the network may be unavailable. Run `gh auth status` to check, then re-run `/baseloop-gtm:update`. Or check https://github.com/baseloop-hq/baseloop-gtm-plugin/releases manually."

If **Currently loaded version** equals `__BASELOOP_UPDATE_NOT_MARKETPLACE__`:

> "This install isn't from the marketplace cache (probably a `--plugin-dir` local checkout). Skipping version comparison. If you want to test against `main`, run `git pull` in the plugin checkout."

### 3. Compare versions

If both versions resolved cleanly:

- **Equal:** "✓ baseloop-gtm is up to date (v{version})."
- **Different:** report both versions and the upgrade path:
  > "baseloop-gtm v{installed} is installed, but v{upstream} is on main. To upgrade in Claude Code:
  > 1. Run `/plugin marketplace update {marketplace-name}`.
  > 2. Run `/plugin install baseloop-gtm@{marketplace-name}` to refresh the cache.
  >
  > Or clear the cache directly: `rm -rf ~/.claude/plugins/cache/{marketplace-name}/baseloop-gtm/` and re-run `/plugin install`."

## Output

Always end with one actionable next step. Do not run any commands on the user's behalf — only describe what they should run.

## Notes

- **No mutation.** This skill never writes to the filesystem or modifies the plugin install.
- **`!`-blocks above run at skill load.** Their output is embedded in the skill body that the model sees; the model does not invoke shell.
- **Don't loop.** If the user reports the upgrade didn't take, suggest manually clearing `~/.claude/plugins/cache/<marketplace>/baseloop-gtm/`. Don't chain repeat invocations.
