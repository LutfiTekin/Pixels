#!/usr/bin/env bash
set -euo pipefail

# ── Setup paths ────────────────────────────────────────────────────────────────
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/.." && pwd)"
docs_dir="$root_dir/docs"
albums_dir="$docs_dir/albums"

# ── Prerequisites ─────────────────────────────────────────────────────────────
if ! command -v convert &> /dev/null; then
  echo "❌ ImageMagick 'convert' is required. Install it with Homebrew: brew install imagemagick"
  exit 1
fi

# ── CPU cores detection ────────────────────────────────────────────────────────
if [[ "$(uname)" == "Darwin" ]]; then
  cores=$(sysctl -n hw.logicalcpu)
elif getconf _NPROCESSORS_ONLN &> /dev/null; then
  cores=$(getconf _NPROCESSORS_ONLN)
else
  cores=1
fi

# ── Parallel runner choice ────────────────────────────────────────────────────
if command -v parallel &> /dev/null; then
  use_parallel=true
else
  use_parallel=false
fi

echo "🏎️  Running thumbnail generator on macOS with $cores cores. GNU parallel? $use_parallel"

# ── Loop through each album ───────────────────────────────────────────────────
for album_path in "$albums_dir"/*/; do
  album_id="$(basename "$album_path")"
  lowres_dir="$album_path/lowres"

  # clean & recreate lowres
  rm -rf "$lowres_dir"
  mkdir -p "$lowres_dir"

  echo "🖼️  Processing album '$album_id'…"

  if $use_parallel; then
    # GNU parallel version (null-delimited)
    find "$album_path" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) -print0 \
      | parallel -0 --halt soon,fail=1 -j "$cores" --bar \
        'convert {} -resize 10% '"$lowres_dir"'/{/}'
  else
    # Manual background-jobs fallback (macOS xargs -P not reliable)
    find "$album_path" -maxdepth 1 -type f \( -iname '*.png' -o -iname '*.jpg' -o -iname '*.jpeg' \) -print0 \
      | while IFS= read -r -d '' img; do
          target="$lowres_dir/$(basename "$img")"
          (
            convert "$img" -resize 10% "$target"
          ) &
          # throttle to $cores concurrent jobs
          while (( $(jobs -rp | wc -l) >= cores )); do
            sleep 0.05
          done
        done
    wait
  fi

  echo "✅ Thumbnails for '$album_id' in $lowres_dir"
done

echo "🎉 All albums processed!"