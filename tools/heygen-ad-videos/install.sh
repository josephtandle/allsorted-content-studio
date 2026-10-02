#!/bin/sh
set -eu
SKILL_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DEST="$HOME/.claude/skills/heygen-ad-videos"
mkdir -p "$(dirname "$DEST")"
cp -R "$SKILL_DIR" "$DEST"
printf 'Installed heygen-ad-videos to %s\n' "$DEST"
