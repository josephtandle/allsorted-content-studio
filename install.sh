#!/bin/sh
set -eu
SRC=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
HOME_DIR=${HOME}
DEST=''
while [ "$#" -gt 0 ]; do
  case "$1" in
    --home) HOME_DIR=$2; shift 2;;
    --dir) DEST=$2; shift 2;;
    *) echo "Unknown option: $1" >&2; exit 2;;
  esac
done
if [ -z "$DEST" ]; then DEST="$HOME_DIR/allsorted-content-studio"; fi
case "$DEST" in /*) ;; *) DEST="$PWD/$DEST";; esac
NODE=$(command -v node || true)
if [ -z "$NODE" ]; then echo 'Node.js 20.9 or later is required. Install Node.js, then run this installer again.' >&2; exit 1; fi
NODE_VERSION=$($NODE -p 'process.versions.node')
$NODE -e 'const [a,b]=process.versions.node.split(".").map(Number); if(a<20||(a===20&&b<9)) process.exit(1)' || { echo "Node.js 20.9 or later is required. Found $NODE_VERSION." >&2; exit 1; }
if ! { command -v google-chrome >/dev/null 2>&1 || command -v google-chrome-stable >/dev/null 2>&1 || command -v microsoft-edge >/dev/null 2>&1 || { command -v open >/dev/null 2>&1 && { open -Ra 'Google Chrome' >/dev/null 2>&1 || open -Ra 'Microsoft Edge' >/dev/null 2>&1; }; } || [ -x "$HOME_DIR/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" ]; }; then echo 'Install Google Chrome, then run this installer again.' >&2; exit 1; fi
mkdir -p "$DEST"
if [ ! -f "$DEST/VERSION" ] || ! cmp -s "$SRC/VERSION" "$DEST/VERSION"; then
  rsync -a --exclude='node_modules/' --exclude='.test-data/' --exclude='runs/*' --exclude='brand/BRAND-BRAIN.md' --exclude='brand/brand.json' --exclude='learnings/LEARNINGS.md' "$SRC/" "$DEST/"
fi
mkdir -p "$DEST/learnings"
if [ ! -f "$DEST/learnings/LEARNINGS.md" ]; then cp "$SRC/learnings/LEARNINGS.template.md" "$DEST/learnings/LEARNINGS.md"; fi
mkdir -p "$HOME_DIR/.claude/skills" "$HOME_DIR/.claude/agents"
rsync -a "$DEST/skill/" "$HOME_DIR/.claude/skills/content-studio/"
rsync -a "$DEST/tools/ad-images/" "$HOME_DIR/.claude/skills/ad-images/"
rsync -a "$DEST/tools/heygen-ad-videos/" "$HOME_DIR/.claude/skills/heygen-ad-videos/"
HOOK="$HOME_DIR/.claude/skills/hooklab"
mkdir -p "$HOOK"
rsync -a --delete --exclude='/personal/' "$DEST/tools/hooklab/" "$HOOK/"
mkdir -p "$HOOK/personal"
rsync -a --ignore-existing "$DEST/tools/hooklab/personal/" "$HOOK/personal/"
for file in "$DEST"/agents/*.md; do rsync -a "$file" "$HOME_DIR/.claude/agents/"; done
$NODE - "$DEST" "$HOME_DIR/.claude/skills/content-studio" "$HOME_DIR/.claude/skills/ad-images" "$HOME_DIR/.claude/skills/heygen-ad-videos" "$HOOK" "$HOME_DIR/.claude/agents" <<'NODE'
const fs=require('node:fs'),path=require('node:path');const root=process.argv[2];function walk(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(e.isFile()&&p.endsWith('.md')){const s=fs.readFileSync(p,'utf8');const n=s.replaceAll('CONTENT_STUDIO_DIR',root);if(n!==s)fs.writeFileSync(p,n);}}}const roots=[root,process.argv[3],process.argv[4],process.argv[5],process.argv[6],process.argv[7]];for(const base of roots)if(base&&fs.existsSync(base))walk(base);
NODE
if [ ! -d "$DEST/tools/carousel-builder/node_modules" ]; then (cd "$DEST/tools/carousel-builder" && npm install); fi
CONTENT_STUDIO_DIR="$DEST" "$NODE" "$DEST/scripts/studio.mjs" self-test
