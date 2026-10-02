#!/bin/sh
set -eu
SRC=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
HOME_DIR=${HOME}
DEST=''
CHECK=0
NO_NPM=${ALLSORTED_NO_NPM:-0}
while [ "$#" -gt 0 ]; do
  case "$1" in
    --home) [ "$#" -ge 2 ] || { echo 'Provide a folder after --home.' >&2; exit 2; }; HOME_DIR=$2; shift 2;;
    --dir) [ "$#" -ge 2 ] || { echo 'Provide a folder after --dir.' >&2; exit 2; }; DEST=$2; shift 2;;
    --check) CHECK=1; shift;;
    --no-npm) NO_NPM=1; shift;;
    *) echo "Unknown option: $1" >&2; exit 2;;
  esac
done
[ -n "$DEST" ] || DEST="$HOME_DIR/allsorted-content-studio"
case "$DEST" in /*) ;; *) DEST="$PWD/$DEST";; esac
NODE=$(command -v node || true)
if [ -z "$NODE" ]; then echo 'Node.js 20.9 or later is required.' >&2; exit 1; fi
NODE_VERSION=$("$NODE" -p 'process.versions.node')
if ! "$NODE" -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<20||(a===20&&b<9)) process.exit(1)'; then echo "Node.js 20.9 or later is required. Found $NODE_VERSION." >&2; exit 1; fi

if [ "$CHECK" -eq 1 ]; then
  CHECK_ROOT=$SRC
  [ -f "$DEST/scripts/studio.mjs" ] && CHECK_ROOT=$DEST
  REQUIRED_STATUS=0
  for file in README.md DIRECTOR.md INSTALL-PROMPT.md AGENTS.md VERSION CHANGELOG.md package.json scripts/studio.mjs scripts/carousel.mjs scripts/install-files.mjs skill/SKILL.md docs/DATA-FORMATS.md brand/BRAND-BRAIN.template.md brand/BRAND-BRAIN.example.md brand/brand.example.json tools/hooklab/SKILL.md tools/ad-images/scripts/render.mjs tools/carousel-builder/bin/carousel.js tools/heygen-ad-videos/scripts/heygen.mjs tools/video-editor/index.js agents/content-checker.md agents/content-copywriter.md agents/content-carousel-maker.md agents/content-director.md agents/content-hook-writer.md agents/content-image-maker.md agents/content-video-editor.md agents/content-video-maker.md; do
    if [ ! -f "$CHECK_ROOT/$file" ]; then echo "Required file: missing $file"; REQUIRED_STATUS=1; fi
  done
  set +e
  CONTENT_STUDIO_DIR="$CHECK_ROOT" "$NODE" "$CHECK_ROOT/scripts/studio.mjs" self-test --no-render
  SELF_STATUS=$?
  set -e
  [ "$REQUIRED_STATUS" -eq 0 ] && [ "$SELF_STATUS" -eq 0 ]
  exit $?
fi

if ! { command -v google-chrome >/dev/null 2>&1 || command -v google-chrome-stable >/dev/null 2>&1 || command -v microsoft-edge >/dev/null 2>&1 || { command -v open >/dev/null 2>&1 && { open -Ra 'Google Chrome' >/dev/null 2>&1 || open -Ra 'Microsoft Edge' >/dev/null 2>&1; }; } || [ -x "$HOME_DIR/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ] || [ -x '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' ] || [ -x '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' ]; }; then echo 'Install Google Chrome or Microsoft Edge, then run this installer again.' >&2; exit 1; fi
mkdir -p "$DEST" "$HOME_DIR"
"$NODE" "$SRC/scripts/install-files.mjs" "$SRC" "$DEST" "$HOME_DIR"
# Kept for compatibility: the pinned carousel engine has zero npm dependencies.
CONTENT_STUDIO_DIR="$DEST" "$NODE" "$DEST/scripts/studio.mjs" self-test --no-render
