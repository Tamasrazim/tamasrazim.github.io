#!/usr/bin/env bash
set -euo pipefail

platform="${1:?Usage: prepare-ffmpeg.sh linux64|macos64|macosarm64}"
work="${RUNNER_TEMP:-$(mktemp -d)}/trilyva-ffmpeg-$platform"
extract="$work/extract"
resource="$(pwd)/resources/bin"
notice="$(pwd)/resources/FFMPEG-THIRD-PARTY-NOTICES.txt"
mkdir -p "$extract" "$resource"
trap 'rm -rf "$work"' EXIT

case "$platform" in
  linux64)
    archive_name="ffmpeg-master-latest-linux64-gpl.tar.xz"
    archive_url="https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/$archive_name"
    archive="$work/$archive_name"
    mkdir -p "$work"
    curl --fail --location --retry 5 --retry-connrefused "$archive_url" --output "$archive"
    tar -xJf "$archive" -C "$extract"
    ffmpeg_source="$(find "$extract" -type f -name ffmpeg -print -quit)"
    ffprobe_source="$(find "$extract" -type f -name ffprobe -print -quit)"
    source_description="$archive_url"
    ;;
  macos64|macosarm64)
    case "$platform" in
      macos64) architecture="amd64" ;;
      macosarm64) architecture="arm64" ;;
    esac
    # The provider's redirect URL must include the build channel (snapshot or release).
    ffmpeg_url="https://ffmpeg.martin-riedl.de/redirect/latest/macos/$architecture/snapshot/ffmpeg.zip"
    ffprobe_url="https://ffmpeg.martin-riedl.de/redirect/latest/macos/$architecture/snapshot/ffprobe.zip"
    mkdir -p "$extract/ffmpeg" "$extract/ffprobe" "$work"
    curl --fail --location --retry 5 --retry-connrefused "$ffmpeg_url" --output "$work/ffmpeg.zip"
    curl --fail --location --retry 5 --retry-connrefused "$ffprobe_url" --output "$work/ffprobe.zip"
    unzip -q "$work/ffmpeg.zip" -d "$extract/ffmpeg"
    unzip -q "$work/ffprobe.zip" -d "$extract/ffprobe"
    ffmpeg_source="$(find "$extract/ffmpeg" -type f -name ffmpeg -print -quit)"
    ffprobe_source="$(find "$extract/ffprobe" -type f -name ffprobe -print -quit)"
    source_description="FFmpeg: $ffmpeg_url ; FFprobe: $ffprobe_url"
    ;;
  *)
    echo "Unsupported FFmpeg platform: $platform" >&2
    exit 2
    ;;
esac

if [[ -z "$ffmpeg_source" || ! -f "$ffmpeg_source" || -z "$ffprobe_source" || ! -f "$ffprobe_source" ]]; then
  echo "The downloaded FFmpeg archive did not contain both executable binaries." >&2
  exit 1
fi

install -m 0755 "$ffmpeg_source" "$resource/ffmpeg"
install -m 0755 "$ffprobe_source" "$resource/ffprobe"
version="$("$resource/ffmpeg" -version 2>&1 | head -n 1)"
license="$("$resource/ffmpeg" -L 2>&1 || true)"
{
  echo "TRILYVA FFmpeg package record"
  echo "Sources: $source_description"
  echo "Prepared UTC: $(date -u '+%Y-%m-%d %H:%M:%S')"
  echo
  echo "FFmpeg -version:"
  echo "$version"
  echo
  echo "FFmpeg -L:"
  echo "$license"
  echo
  echo "Upstream build information: https://ffmpeg.martin-riedl.de/"
  echo "Licensing overview: https://ffmpeg.org/legal.html"
} > "$notice"
echo "Prepared $platform FFmpeg and FFprobe."
