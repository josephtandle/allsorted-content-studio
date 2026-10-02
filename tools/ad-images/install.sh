#!/bin/sh
set -eu
SOURCE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
TARGET_DIR="${HOME}/.claude/skills/ad-images"
mkdir -p "$TARGET_DIR"
cp -R "$SOURCE_DIR"/. "$TARGET_DIR"/
python3 - "$SOURCE_DIR" "$TARGET_DIR/studio-root" <<'PY'
import pathlib, sys
source, marker = pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2])
for candidate in (source, *source.parents):
    if (candidate / 'VERSION').is_file() and (candidate / 'DIRECTOR.md').is_file():
        marker.write_text(str(candidate) + '\n')
        break
PY
python3 - "$TARGET_DIR/SKILL.md" "$TARGET_DIR" <<'PY'
import pathlib, sys
skill = pathlib.Path(sys.argv[1])
target = sys.argv[2].replace('\\', '/')
skill.write_text(skill.read_text().replace('{{SKILL_DIR}}', target))
PY
printf 'Installed Ad Images at %s\nRestart your agent system or open a new session to use it.\n' "$TARGET_DIR"
