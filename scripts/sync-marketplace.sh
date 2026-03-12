#!/usr/bin/env bash
#
# Syncs .claude-plugin/marketplace.json version + description from plugin.json.
# Single-plugin repo layout: both files live in .claude-plugin/
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
PLUGIN_JSON="$ROOT_DIR/.claude-plugin/plugin.json"
MARKETPLACE="$ROOT_DIR/.claude-plugin/marketplace.json"

if [ ! -f "$PLUGIN_JSON" ]; then
  echo "sync-marketplace: plugin.json not found, skipping" >&2
  exit 0
fi

# Update the first (only) plugin entry with version + description from plugin.json
jq --slurpfile src "$PLUGIN_JSON" '
  .plugins[0].version = $src[0].version |
  .plugins[0].description = $src[0].description
' "$MARKETPLACE" > "$MARKETPLACE.tmp" && mv "$MARKETPLACE.tmp" "$MARKETPLACE"

echo "marketplace.json synced to v$(jq -r '.plugins[0].version' "$MARKETPLACE")"
