# Builds the native game on Windows and gathers the executable and assets into the expected output folders.

$ErrorActionPreference = "Stop"
cmake -S . -B build -G "Visual Studio 17 2022" -A x64
cmake --build build --config Release
Write-Host "Build complete: build\Release\razim_fps.exe"
