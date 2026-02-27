#!/usr/bin/env bash
#
# Syncs .claude-plugin/marketplace.json from individual plugin.json files.
# Source of truth: plugins/*/.claude-plugin/plugin.json
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MARKETPLACE="$ROOT_DIR/.claude-plugin/marketplace.json"

# Read marketplace shell (owner, metadata) — everything except "plugins"
marketplace_base=$(jq 'del(.plugins)' "$MARKETPLACE")

# Build plugins array from each plugin's plugin.json
plugins="[]"
for plugin_dir in "$ROOT_DIR"/plugins/*/; do
  plugin_json="$plugin_dir/.claude-plugin/plugin.json"
  [ -f "$plugin_json" ] || continue

  dir_name=$(basename "$plugin_dir")

  # Map plugin.json fields → marketplace entry
  entry=$(jq --arg source "./plugins/$dir_name" '{
    name: .name,
    description: .description,
    version: .version,
    author: .author,
    homepage: (.homepage // .author.url // null),
    tags: .keywords,
    source: $source
  }' "$plugin_json")

  plugins=$(echo "$plugins" | jq --argjson entry "$entry" '. + [$entry]')
done

# Merge base + plugins and write
echo "$marketplace_base" | jq --argjson plugins "$plugins" '. + {plugins: $plugins}' > "$MARKETPLACE"

echo "marketplace.json synced with $(echo "$plugins" | jq length) plugin(s)"
