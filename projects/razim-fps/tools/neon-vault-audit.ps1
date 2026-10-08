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

foreach ($texture in $textures) {
    $bmp = [System.IO.File]::ReadAllBytes($texture.FullName)
    if ($bmp.Length -ne 750054) { throw "Texture size invalid: $($texture.Name) ($($bmp.Length) bytes)." }
    if ([System.Text.Encoding]::ASCII.GetString($bmp, 0, 2) -ne "BM") { throw "Texture is not a BMP: $($texture.Name)." }
    if ([BitConverter]::ToInt32($bmp, 18) -ne 500 -or [BitConverter]::ToInt32($bmp, 22) -ne 500) { throw "Texture dimensions are not 500x500: $($texture.Name)." }
    if ([BitConverter]::ToInt16($bmp, 28) -ne 24) { throw "Texture is not 24-bit RGB: $($texture.Name)." }
}

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
if ($src -notmatch 'boundaryJoin') { throw "Intentional boundary-corner joins are not accounted for." }
if ($src -match '\(i%3-1\)\*3\.[25]f') { throw "Unsigned size_t fallback coordinate underflow detected." }
if ($src -notmatch 'int\(i%3\)-1') { throw "Signed fallback coordinate calculation missing." }
if ($src -notmatch 'moveSubsteps') { throw "Swept movement collision protection missing." }
if ($src -notmatch 'memoryOrder') { throw "Memory sequence validation missing." }
if ($src -notmatch 'crystals<3\|\|int\(l\.switches\.size\(\)\)<3') { throw "Combo objective completeness validation missing." }
if ($iss -notmatch 'SetupIconFile=neon-vault.ico') { throw "Custom setup icon missing." }
if ($iss -notmatch 'UninstallDisplayIcon=\{app\}\\neon-vault.ico') { throw "Custom uninstall icon missing." }
if ($iss -notmatch 'WizardForm.Caption') { throw "Custom installer branding missing." }
if ($iss -notmatch 'InitializeUninstall\(\)') { throw "Custom uninstaller branding missing." }

$bytes = ($textures | Measure-Object Length -Sum).Sum + ($audio | Measure-Object Length -Sum).Sum
if ($bytes -lt 25000000) { throw "Runtime asset bank is below the 25 MB target: $bytes bytes." }
[pscustomobject]@{
    RuntimeTextures = $textures.Count
    AudioAssets = $audio.Count
    AssetBytes = $bytes
    AssetMBDecimal = [math]::Round($bytes / 1000000.0, 2)
    TargetReached = ($bytes -ge 25000000)
    Status = "PASS"
} | Format-Table -AutoSize
