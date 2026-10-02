$ErrorActionPreference = 'Stop'
$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$TargetDir = Join-Path $HOME '.claude/skills/ad-images'
$ParentDir = Split-Path -Parent $TargetDir
New-Item -ItemType Directory -Force -Path $ParentDir | Out-Null
New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path (Join-Path $SourceDir '*') -Destination $TargetDir -Recurse -Force
$SkillFile = Join-Path $TargetDir 'SKILL.md'
$SkillText = Get-Content -LiteralPath $SkillFile -Raw
$SkillText = $SkillText.Replace('{{SKILL_DIR}}', $TargetDir.Replace('\', '/'))
Set-Content -LiteralPath $SkillFile -Value $SkillText -Encoding utf8
Write-Host "Installed Ad Images at $TargetDir"
Write-Host 'Restart your agent system or open a new session to use it.'
