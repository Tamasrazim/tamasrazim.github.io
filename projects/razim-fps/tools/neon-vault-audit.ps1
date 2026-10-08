$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$game = Join-Path $root "projects\razim-fps"
$source = Join-Path $game "main.cpp"
$installer = Join-Path $game "installer.iss"
$textures = @(Get-ChildItem (Join-Path $game "assets\textures") -Filter "vault_*.bmp" -File)
$audio = @(Get-ChildItem (Join-Path $game "assets\audio") -Filter "*.wav" -File)

if (!(Test-Path $source)) { throw "main.cpp is missing." }
if (!(Test-Path $installer)) { throw "installer.iss is missing." }

if ($textures.Count -ne 28) { throw "Expected 28 runtime textures, found $($textures.Count)." }
if ($audio.Count -lt 5) { throw "Expected at least 5 WAV assets, found $($audio.Count)." }

$src = Get-Content $source -Raw
$iss = Get-Content $installer -Raw

if ($src -notmatch 'constexpr int TEXTURES=28') { throw "Runtime texture count is not 28." }
if ($src -notmatch 'DisableCursor\(\)') { throw "Native mouse capture missing." }
if ($src -match 'SetMousePosition\(') { throw "Cursor-warp input path detected." }
if ($src -notmatch 'MakeBeatSound') { throw "Procedural beat layer missing." }
if ($src -notmatch 'DrawBrokenPiece') { throw "Broken-piece animation missing." }
if ($src -notmatch 'screen==Screen::SETTINGS') { throw "Settings state missing." }
if ($iss -notmatch 'SetupIconFile=neon-vault.ico') { throw "Custom setup icon missing." }
if ($iss -notmatch 'UninstallDisplayIcon=\{app\}\\neon-vault.ico') { throw "Custom uninstall icon missing." }

$bytes = ($textures | Measure-Object Length -Sum).Sum + ($audio | Measure-Object Length -Sum).Sum
[pscustomobject]@{
    RuntimeTextures = $textures.Count
    AudioAssets = $audio.Count
    AssetBytes = $bytes
    AssetMBDecimal = [math]::Round($bytes / 1MB, 2)
    TargetReached = ($bytes -ge 25MB)
    Status = "PASS"
} | Format-Table -AutoSize
