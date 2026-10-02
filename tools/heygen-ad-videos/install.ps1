$ErrorActionPreference = 'Stop'
$SKILL_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$DEST = Join-Path $HOME '.claude/skills/heygen-ad-videos'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $DEST) | Out-Null
Copy-Item -Path $SKILL_DIR -Destination $DEST -Recurse -Force
Write-Output "Installed heygen-ad-videos to $DEST"
