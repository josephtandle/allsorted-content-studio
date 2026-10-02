param()
$ErrorActionPreference = 'Stop'
$dir=$null; $installHome=$null; $check=$false; $noNpm=($env:ALLSORTED_NO_NPM -eq '1'); $Options=$args
for ($i=0; $i -lt $Options.Count; $i++) {
  if ($Options[$i] -in @('--dir','-dir')) { $i++; if ($i -ge $Options.Count) { throw 'Provide a folder after --dir.' }; $dir=$Options[$i] }
  elseif ($Options[$i] -in @('--home','-home')) { $i++; if ($i -ge $Options.Count) { throw 'Provide a folder after --home.' }; $installHome=$Options[$i] }
  elseif ($Options[$i] -eq '--check') { $check=$true }
  elseif ($Options[$i] -eq '--no-npm') { $noNpm=$true }
  else { throw "Unknown option: $($Options[$i])" }
}
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $installHome) { $installHome = $HOME }
if (-not $dir) { $dir = Join-Path $installHome 'allsorted-content-studio' }
if (-not [System.IO.Path]::IsPathRooted($dir)) { $dir = Join-Path (Get-Location) $dir }
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js 20.9 or later is required.' }
$nodeVersion = & $node.Source -p 'process.versions.node'
$version = $nodeVersion -split '\.'
if ([int]$version[0] -lt 20 -or ([int]$version[0] -eq 20 -and [int]$version[1] -lt 9)) { throw "Node.js 20.9 or later is required. Found $nodeVersion." }
if ($check) {
  $checkRoot=$src
  if (Test-Path (Join-Path $dir 'scripts/studio.mjs')) { $checkRoot=$dir }
  $required=@('README.md','DIRECTOR.md','INSTALL-PROMPT.md','AGENTS.md','VERSION','CHANGELOG.md','package.json','scripts/studio.mjs','scripts/carousel.mjs','scripts/install-files.mjs','skill/SKILL.md','docs/DATA-FORMATS.md','brand/BRAND-BRAIN.template.md','brand/BRAND-BRAIN.example.md','brand/brand.example.json','tools/hooklab/SKILL.md','tools/ad-images/scripts/render.mjs','tools/carousel-builder/lib/slide-renderer.js','tools/heygen-ad-videos/scripts/heygen.mjs','tools/video-editor/index.js','agents/content-checker.md','agents/content-copywriter.md','agents/content-carousel-maker.md','agents/content-director.md','agents/content-hook-writer.md','agents/content-image-maker.md','agents/content-video-editor.md','agents/content-video-maker.md')
  $missing=$false
  foreach ($file in $required) { if (-not (Test-Path (Join-Path $checkRoot $file))) { Write-Output "Required file: missing $file"; $missing=$true } }
  $env:CONTENT_STUDIO_DIR=$checkRoot
  & $node.Source (Join-Path $checkRoot 'scripts/studio.mjs') self-test --no-render
  $selfStatus=$LASTEXITCODE
  if ($missing -or $selfStatus -ne 0) { exit 1 }
  exit 0
}
$browsers=@((Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'),(Join-Path ${env:ProgramFiles(x86)} 'Google/Chrome/Application/chrome.exe'),(Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe'),(Join-Path $env:LOCALAPPDATA 'Google/Chrome/Application/chrome.exe'),(Join-Path $env:LOCALAPPDATA 'Microsoft/Edge/Application/msedge.exe'))
if (-not ($browsers | Where-Object { Test-Path $_ })) { throw 'Google Chrome or Microsoft Edge is required. Install either browser, then run this installer again.' }
& $node.Source (Join-Path $src 'scripts/install-files.mjs') $src $dir $installHome
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
$carousel=Join-Path $dir 'tools/carousel-builder'
if (-not $noNpm -and -not (Test-Path (Join-Path $carousel 'node_modules'))) { Push-Location $carousel; try { npm install; if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE } } finally { Pop-Location } }
$env:CONTENT_STUDIO_DIR=$dir
& $node.Source (Join-Path $dir 'scripts/studio.mjs') self-test --no-render
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
