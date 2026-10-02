$ErrorActionPreference = 'Stop'
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = Join-Path $HOME '.claude/skills/ad-images'
$ParentDir = Split-Path -Parent $TargetDir
New-Item -ItemType Directory -Force -Path $ParentDir | Out-Null
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path (Join-Path $SourceDir '*') -Destination $TargetDir -Recurse -Force
$Candidate = (Resolve-Path $SourceDir).Path
while ($Candidate) {
  if ((Test-Path (Join-Path $Candidate 'VERSION')) -and (Test-Path (Join-Path $Candidate 'DIRECTOR.md'))) { Set-Content -LiteralPath (Join-Path $TargetDir 'studio-root') -Value $Candidate -NoNewline -Encoding utf8; break }
  $Parent = Split-Path -Parent $Candidate
  if (-not $Parent -or $Parent -eq $Candidate) { break }
  $Candidate = $Parent
}
$SkillFile = Join-Path $TargetDir 'SKILL.md'
$SkillText = Get-Content -LiteralPath $SkillFile -Raw
$SkillText = $SkillText.Replace('{{SKILL_DIR}}', $TargetDir.Replace('\', '/'))
Set-Content -LiteralPath $SkillFile -Value $SkillText -Encoding utf8
Write-Host "Installed Ad Images at $TargetDir"
Write-Host 'Restart your agent system or open a new session to use it.'
