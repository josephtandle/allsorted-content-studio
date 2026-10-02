$ErrorActionPreference = 'Stop'
$SKILL_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path
$DEST = Join-Path $HOME '.claude/skills/heygen-ad-videos'
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $DEST) | Out-Null
Copy-Item -Path $SKILL_DIR -Destination $DEST -Recurse -Force
$Candidate = (Resolve-Path $SKILL_DIR).Path
while ($Candidate) {
  if ((Test-Path (Join-Path $Candidate 'VERSION')) -and (Test-Path (Join-Path $Candidate 'DIRECTOR.md'))) { Set-Content -LiteralPath (Join-Path $DEST 'studio-root') -Value $Candidate -NoNewline -Encoding utf8; break }
  $Parent = Split-Path -Parent $Candidate
  if (-not $Parent -or $Parent -eq $Candidate) { break }
  $Candidate = $Parent
}
Write-Output "Installed heygen-ad-videos to $DEST"
