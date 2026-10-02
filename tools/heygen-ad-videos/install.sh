#!/bin/sh
set -eu
SKILL_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
DEST="$HOME/.claude/skills/heygen-ad-videos"
mkdir -p "$(dirname "$DEST")"
cp -R "$SKILL_DIR" "$DEST"
python3 - "$SKILL_DIR" "$DEST/studio-root" <<'PY'
import pathlib, sys
source, marker = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2])
for candidate in (source, *source.parents):
    if (candidate / 'VERSION').is_file() and (candidate / 'DIRECTOR.md').is_file():
        marker.write_text(str(candidate) + '\n')
        break
PY
printf 'Installed heygen-ad-videos to %s\n' "$DEST"
