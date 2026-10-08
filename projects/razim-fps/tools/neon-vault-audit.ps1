$ErrorActionPreference = "Stop"

$game = Split-Path -Parent $PSScriptRoot
$source = Join-Path $game "main.cpp"
$installer = Join-Path $game "installer.iss"
$textures = @(Get-ChildItem (Join-Path $game "assets\textures") -Filter "vault_*.bmp" -File)
$audio = @(Get-ChildItem (Join-Path $game "assets\audio") -Filter "*.wav" -File)

if (!(Test-Path $source)) { throw "main.cpp is missing." }
if (!(Test-Path $installer)) { throw "installer.iss is missing." }

if ($textures.Count -ne 30) { throw "Expected 30 runtime textures, found $($textures.Count)." }
if ($audio.Count -lt 5) { throw "Expected at least 5 WAV assets, found $($audio.Count)." }

$src = Get-Content $source -Raw
$iss = Get-Content $installer -Raw

if ($src -notmatch 'constexpr int TEXTURES=30') { throw "Runtime texture count is not 30." }
if ($src -notmatch 'DisableCursor\(\)') { throw "Native mouse capture missing." }
if ($src -match 'SetMousePosition\(') { throw "Cursor-warp input path detected." }
if ($src -notmatch 'MakeBeatSound') { throw "Procedural beat layer missing." }
if ($src -notmatch 'DrawBrokenPiece') { throw "Broken-piece animation missing." }
if ($src -notmatch 'screen==Screen::SETTINGS') { throw "Settings state missing." }
if ($src -notmatch 'IsMouseButtonPressed\(MOUSE_BUTTON_LEFT\)') { throw "Clickable UI input missing." }
if ($src -notmatch 'DrawBrokenPiece') { throw "Broken-piece animation path missing." }
if ($src -notmatch 'float ux=std::max\(1.0f,s.x/2.2f\)') { throw "Dimension-aware material tiling missing." }
if ($src -notmatch 'Vector3Distance\(h.base,l.start\)<6.0f') { throw "Hazard start-clearance validation missing." }
if ($iss -notmatch 'SetupIconFile=neon-vault.ico') { throw "Custom setup icon missing." }
if ($iss -notmatch 'UninstallDisplayIcon=\{app\}\\neon-vault.ico') { throw "Custom uninstall icon missing." }
if ($iss -notmatch 'WizardForm.Caption') { throw "Custom installer branding missing." }
if ($iss -notmatch 'InitializeUninstall\(\)') { throw "Custom uninstaller branding missing." }

$bytes = ($textures | Measure-Object Length -Sum).Sum + ($audio | Measure-Object Length -Sum).Sum
[pscustomobject]@{
    RuntimeTextures = $textures.Count
    AudioAssets = $audio.Count
    AssetBytes = $bytes
    AssetMBDecimal = [math]::Round($bytes / 1MB, 2)
    TargetReached = ($bytes -ge 25MB)
    Status = "PASS"
} | Format-Table -AutoSize
