param()
$ErrorActionPreference = 'Stop'
$dir=$null; $installHome=$null; $Options=$args
for ($i=0; $i -lt $Options.Count; $i++) { if ($Options[$i] -in @('--dir','-dir')) { $i++; if ($i -ge $Options.Count) { throw 'Provide a folder after --dir.' }; $dir=$Options[$i] } elseif ($Options[$i] -in @('--home','-home')) { $i++; if ($i -ge $Options.Count) { throw 'Provide a folder after --home.' }; $installHome=$Options[$i] } else { throw "Unknown option: $($Options[$i])" } }
$src = Split-Path -Parent $MyInvocation.MyCommand.Path
if (-not $installHome) { $installHome = $HOME }
if (-not $dir) { $dir = Join-Path $installHome 'allsorted-content-studio' }
if (-not [System.IO.Path]::IsPathRooted($dir)) { $dir = Join-Path (Get-Location) $dir }
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) { throw 'Node.js 20.9 or later is required. Install Node.js, then run this installer again.' }
$version = (& $node.Source -p 'process.versions.node') -split '\.'
if ([int]$version[0] -lt 20 -or ([int]$version[0] -eq 20 -and [int]$version[1] -lt 9)) { throw "Node.js 20.9 or later is required. Found $($version -join '.')." }
$browsers = @((Join-Path $env:ProgramFiles 'Google/Chrome/Application/chrome.exe'), (Join-Path ${env:ProgramFiles(x86)} 'Google/Chrome/Application/chrome.exe'), (Join-Path $env:ProgramFiles 'Microsoft/Edge/Application/msedge.exe'), (Join-Path $env:LOCALAPPDATA 'Google/Chrome/Application/chrome.exe'), (Join-Path $env:LOCALAPPDATA 'Microsoft/Edge/Application/msedge.exe'))
if (-not ($browsers | Where-Object { Test-Path $_ })) { throw 'Google Chrome or Microsoft Edge is required. Install either browser, then run this installer again.' }
$protected = @('brand/BRAND-BRAIN.md','brand/brand.json','learnings/LEARNINGS.md')
function SyncTree($source,$target,$prefix='') {
  New-Item -ItemType Directory -Force -Path $target | Out-Null
  Get-ChildItem -LiteralPath $source -Force | ForEach-Object {
    $rel = if ($prefix) { "$prefix/$($_.Name)" } else { $_.Name }
    if ($rel -match '(^|/)\.test-data(/|$)') { return }
    if ($rel -eq 'tools/carousel-builder/node_modules' -or $rel.StartsWith('tools/carousel-builder/node_modules/')) { return }
    if ($rel -match '^runs/' -or $protected -contains $rel) { return }
    $destPath = Join-Path $target $_.Name
    if ($_.PSIsContainer) { SyncTree $_.FullName $destPath $rel }
    else {
      $copy = -not (Test-Path $destPath)
      if (-not $copy) { $copy = (Get-FileHash $_.FullName).Hash -ne (Get-FileHash $destPath).Hash }
      if ($copy) { Copy-Item -LiteralPath $_.FullName -Destination $destPath -Force }
    }
  }
}
if (-not (Test-Path (Join-Path $dir 'VERSION')) -or (Get-Content -Raw (Join-Path $dir 'VERSION')) -ne (Get-Content -Raw (Join-Path $src 'VERSION'))) { SyncTree $src $dir }
$skills = Join-Path $installHome '.claude/skills'; $agents = Join-Path $installHome '.claude/agents'
New-Item -ItemType Directory -Force -Path $skills,$agents | Out-Null
SyncTree (Join-Path $dir 'skill') (Join-Path $skills 'content-studio')
SyncTree (Join-Path $dir 'tools/ad-images') (Join-Path $skills 'ad-images')
SyncTree (Join-Path $dir 'tools/heygen-ad-videos') (Join-Path $skills 'heygen-ad-videos')
$hook = Join-Path $skills 'hooklab'; New-Item -ItemType Directory -Force -Path $hook | Out-Null
Get-ChildItem (Join-Path $dir 'tools/hooklab') -Recurse -File | Where-Object { $_.FullName -notmatch '[\\/]personal[\\/]' } | ForEach-Object { $relative=$_.FullName.Substring((Join-Path $dir 'tools/hooklab').Length).TrimStart('\','/'); $destPath=Join-Path $hook $relative; New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destPath) | Out-Null; if (-not (Test-Path $destPath) -or (Get-FileHash $_.FullName).Hash -ne (Get-FileHash $destPath).Hash) { Copy-Item $_.FullName $destPath -Force } }
New-Item -ItemType Directory -Force -Path (Join-Path $hook 'personal') | Out-Null
Get-ChildItem (Join-Path $dir 'tools/hooklab/personal') -File | ForEach-Object { $target=Join-Path $hook ('personal/'+$_.Name); if (-not (Test-Path $target)) { Copy-Item $_.FullName $target } }
Get-ChildItem (Join-Path $dir 'agents') -Filter '*.md' | ForEach-Object { $destPath=Join-Path $agents $_.Name; if (-not (Test-Path $destPath) -or (Get-FileHash $_.FullName).Hash -ne (Get-FileHash $destPath).Hash) { Copy-Item $_.FullName $destPath -Force } }
foreach ($scan in @($dir,(Join-Path $skills 'content-studio'),(Join-Path $skills 'ad-images'),(Join-Path $skills 'heygen-ad-videos'),$hook,$agents)) { Get-ChildItem $scan -Recurse -Filter '*.md' -File | ForEach-Object { $text=Get-Content -Raw $_.FullName; $updated=$text.Replace('CONTENT_STUDIO_DIR',$dir); if ($updated -ne $text) { Set-Content -NoNewline $_.FullName $updated } } }
$carousel = Join-Path $dir 'tools/carousel-builder'
if (-not (Test-Path (Join-Path $carousel 'node_modules'))) { Push-Location $carousel; try { npm install } finally { Pop-Location } }
$env:CONTENT_STUDIO_DIR=$dir
& $node.Source (Join-Path $dir 'scripts/studio.mjs') self-test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
