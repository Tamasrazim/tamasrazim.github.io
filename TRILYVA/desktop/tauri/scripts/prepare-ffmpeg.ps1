$ErrorActionPreference = "Stop"

# Prepare a static FFmpeg build for the current Windows x64 desktop package.
$archiveUrl = "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip"
$work = Join-Path $env:TEMP "trilyva-ffmpeg"
if ($env:RUNNER_TEMP) { $work = Join-Path $env:RUNNER_TEMP "trilyva-ffmpeg" }
$archive = Join-Path $work "ffmpeg.zip"
$extract = Join-Path $work "extract"
$resource = Join-Path $PSScriptRoot "..\resources\bin"
$noticePath = Join-Path $PSScriptRoot "..\resources\FFMPEG-THIRD-PARTY-NOTICES.txt"

New-Item -ItemType Directory -Force -Path $work, $extract, $resource | Out-Null
Invoke-WebRequest -Uri $archiveUrl -OutFile $archive
Expand-Archive -LiteralPath $archive -DestinationPath $extract -Force

$ffmpeg = Get-ChildItem -LiteralPath $extract -Recurse -File -Filter "ffmpeg.exe" | Select-Object -First 1
$ffprobe = Get-ChildItem -LiteralPath $extract -Recurse -File -Filter "ffprobe.exe" | Select-Object -First 1
if (-not $ffmpeg -or -not $ffprobe) { throw "The downloaded package did not contain ffmpeg.exe and ffprobe.exe." }

Copy-Item -LiteralPath $ffmpeg.FullName -Destination (Join-Path $resource "ffmpeg.exe") -Force
Copy-Item -LiteralPath $ffprobe.FullName -Destination (Join-Path $resource "ffprobe.exe") -Force

$version = (& (Join-Path $resource "ffmpeg.exe") -version 2>&1 | Out-String).Trim()
$license = (& (Join-Path $resource "ffmpeg.exe") -L 2>&1 | Out-String).Trim()
$details = @(
  "TRILYVA FFmpeg package record"
  "Source: $archiveUrl"
  "Prepared: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss K')"
  ""
  "FFmpeg -version:"
  $version
  ""
  "FFmpeg -L:"
  $license
  ""
  "Upstream: https://github.com/BtbN/FFmpeg-Builds"
  "Licensing overview: https://ffmpeg.org/legal.html"
)
Set-Content -LiteralPath $noticePath -Value ($details -join [Environment]::NewLine) -Encoding UTF8
Write-Host "Prepared FFmpeg: $((Get-Item (Join-Path $resource 'ffmpeg.exe')).Length) bytes"
Write-Host "Prepared FFprobe: $((Get-Item (Join-Path $resource 'ffprobe.exe')).Length) bytes"
