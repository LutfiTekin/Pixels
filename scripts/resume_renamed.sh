#!/usr/bin/env bash
set -euo pipefail

# Resolve directories
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/.." && pwd)"
docs_dir="$root_dir/docs"
albums_dir="$docs_dir/albums"

# Ensure jq is available
if ! command -v jq &> /dev/null; then
  echo "❌ jq is required but not installed. Please install jq."
  exit 1
fi

# Prompt for album details
read -p "Album ID: " album_id
read -p "Album Title: " album_title
read -p "Album Description: " album_description

# Paths
album_dir="$albums_dir/$album_id"
renamed_file="$script_dir/renamed_images.txt"
lookup_file="$docs_dir/lookup.json"

# Prepare album directory
mkdir -p "$album_dir"

# NOTE: Skipping scramble_images.sh as per request.
# The 'renamed_images.txt' file is expected to be pre-existing and correctly populated.

# Build images.json and collect image IDs
images_json="{}"
album_images=()

if [[ ! -f "$renamed_file" ]]; then
  echo "❌ Error: '$renamed_file' not found. Please run scramble_images.sh first or ensure the file exists."
  exit 1
fi

while IFS='>' read -r original new; do
  # normalize fields
  original="$(echo "$original" | xargs)"
  new="$(echo "${new:-$original}" | xargs)"
  id="${new%.*}"
  title="$(basename "$original" | sed 's/\.[^.]*$//' | sed 's/_/ /g')"

  # accumulate JSON
  images_json="$(jq --arg id "$id" --arg title "$title" '. + {($id): {title: $title}}' <<<"$images_json")"
  album_images+=("\"$id\"")

  # move file into docs/albums/{albumid}/
  if [[ -f "$script_dir/$new" ]]; then
    mv "$script_dir/$new" "$album_dir/"
  else
    echo "⚠️  Warning: '$new' not found in $script_dir, skipping."
  fi
done < "$renamed_file"

# Write images.json under the album dir
echo "$images_json" > "$album_dir/images.json"

# Build and write album.json under the album dir
album_json="$(jq -n \
  --arg title "$album_title" \
  --arg desc  "$album_description" \
  --argjson images "[$(IFS=,; echo "${album_images[*]}")]" \
  '{title: $title, description: $desc, images: $images}'
)"
echo "$album_json" > "$album_dir/album.json"

# ── Update global lookup.json ─────────────────────────────────────────────────

# Bootstrap lookup.json if missing
if [[ ! -f "$lookup_file" ]]; then
  echo "{}" > "$lookup_file"
fi

jq --arg id "$album_id" \
   --argjson imgs "[$(IFS=,; echo "${album_images[*]}")]" \
   '. + {($id): $imgs}' \
   "$lookup_file" > "${lookup_file}.tmp" \
&& mv "${lookup_file}.tmp" "$lookup_file"

echo "✅ Added album '$album_id' → [${album_images[*]}] into $lookup_file"
echo "🎉 Done! Files in: $album_dir (images.json, album.json) and updated lookup.json."