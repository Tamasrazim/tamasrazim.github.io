#!/usr/bin/env bash
set -euo pipefail

platform="${1:?Usage: prepare-ffmpeg.sh linux64|macos64|macosarm64}"
case "$platform" in
  linux64)
    archive_name="ffmpeg-master-latest-linux64-gpl.tar.xz"
    archive_url="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/$archive_name"
    ;;
  macos64)
    archive_name="ffmpeg-master-latest-macos64-gpl.zip"
    archive_url="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/$archive_name"
    ;;
  macosarm64)
    archive_name="ffmpeg-master-latest-macosarm64-gpl.zip"
    archive_url="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/$archive_name"
    ;;
  *)
    echo "Unsupported FFmpeg platform: $platform" >&2
    exit 2
    ;;
esac

work="${RUNNER_TEMP:-$(mktemp -d)}/trilyva-ffmpeg-$platform"
archive="$work/$archive_name"
extract="$work/extract"
resource="$(pwd)/resources/bin"
notice="$(pwd)/resources/FFMPEG-THIRD-PARTY-NOTICES.txt"
mkdir -p "$extract" "$resource"
trap 'rm -rf "$work"' EXIT

curl --fail --location --retry 5 --retry-connrefused "$archive_url" --output "$archive"
case "$archive_name" in
  *.zip) unzip -q "$archive" -d "$extract" ;;
  *.tar.xz) tar -xJf "$archive" -C "$extract" ;;
esac

ffmpeg_source="$(find "$extract" -type f -name ffmpeg -print -quit)"
ffprobe_source="$(find "$extract" -type f -name ffprobe -print -quit)"
if [[ -z "$ffmpeg_source" || -z "$ffprobe_source" ]]; then
  echo "The downloaded FFmpeg archive did not contain both ffmpeg and ffprobe." >&2
  exit 1
fi

install -m 0755 "$ffmpeg_source" "$resource/ffmpeg"
install -m 0755 "$ffprobe_source" "$resource/ffprobe"
version="$("$resource/ffmpeg" -version 2>&1 | head -n 1)"
license="$("$resource/ffmpeg" -L 2>&1 || true)"
{
  echo "TRILYVA FFmpeg package record"
  echo "Source: $archive_url"
  echo "Prepared UTC: $(date -u '+%Y-%m-%d %H:%M:%S')"
  echo
  echo "FFmpeg -version:"
  echo "$version"
  echo
  echo "FFmpeg -L:"
  echo "$license"
  echo
  echo "Upstream: https://github.com/BtbN/FFmpeg-Builds"
  echo "Licensing overview: https://ffmpeg.org/legal.html"
} > "$notice"
echo "Prepared $platform FFmpeg and FFprobe."
