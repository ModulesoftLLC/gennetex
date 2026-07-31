$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$source = Join-Path $root 'src-tauri\target\release\bundle'
$destination = Join-Path $root 'windows'
if (-not (Test-Path -LiteralPath $source)) { throw "Installer output олдсонгүй: $source" }
New-Item -ItemType Directory -Force -Path $destination | Out-Null
$installers = Get-ChildItem -LiteralPath $source -Recurse -File | Where-Object { $_.Extension -in @('.exe', '.msi') }
if (-not $installers) { throw 'Windows .exe/.msi installer үүсээгүй байна.' }
$installers | Copy-Item -Destination $destination -Force
$installers | ForEach-Object {
  $target = Join-Path $destination $_.Name
  $stream = [System.IO.File]::OpenRead($target)
  try {
    $sha = [System.Security.Cryptography.SHA256]::Create()
    $hash = [BitConverter]::ToString($sha.ComputeHash($stream)).Replace('-', '')
  } finally {
    $stream.Dispose()
  }
  Write-Output "$($_.Name) $hash"
}
