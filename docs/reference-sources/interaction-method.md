## Interaction Method

When asking the user a question, use the platform's blocking question tool when it is available in the current harness: `AskUserQuestion` in Claude Code (call `ToolSearch` with `select:AskUserQuestion` first if its schema isn't loaded), `request_user_input` in Codex when exposed by the active mode, or `ask_user` in Gemini. Fall back to numbered options in chat only when no blocking tool exists in the harness or the call errors — not because a schema load is required. Never silently skip the question.

Ask one question at a time. Prefer a concise single-select choice when natural options exist.
