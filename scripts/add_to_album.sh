#!/usr/bin/env bash
set -euo pipefail

# ── Resolve directories ───────────────────────────────────────────────
script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root_dir="$(cd "$script_dir/.." && pwd)"
docs_dir="$root_dir/docs"
albums_dir="$docs_dir/albums"
lookup_file="$docs_dir/lookup.json"

# ── Prerequisites ─────────────────────────────────────────────────────
if ! command -v jq &> /dev/null; then
  echo "❌ jq is required but not installed."
  exit 1
fi

# ── Ask for album id ──────────────────────────────────────────────────
read -p "Album ID to add images: " album_id
album_dir="$albums_dir/$album_id"

if [[ ! -d "$album_dir" ]]; then
  echo "❌ Album folder not found: $album_dir"
  exit 2
fi

# ── Scramble images (creates renamed_images.txt) ──────────────────────
"$script_dir/scramble_images.sh"

# ── Prepare new images and update JSONs ───────────────────────────────
album_images_json="$album_dir/images.json"
album_json="$album_dir/album.json"

# Load current images
images_json="{}"
[[ -f "$album_images_json" ]] && images_json="$(cat "$album_images_json")"

album_json_images=()
if [[ -f "$album_json" ]]; then
  album_json_images=($(jq -r '.images[]' "$album_json"))
fi

new_album_images=()
while IFS='>' read -r original new; do
  original="$(echo "$original" | xargs)"
  new="$(echo "${new:-$original}" | xargs)"
  id="${new%.*}"
  title="$(basename "$original" | sed 's/\.[^.]*$//' | sed 's/_/ /g')"

  # skip if already present
  if printf '%s\n' "${album_json_images[@]}" | grep -qx "$id"; then
    continue
  fi

  images_json="$(jq --arg id "$id" --arg title "$title" '. + {($id): {title: $title}}' <<<"$images_json")"
  new_album_images+=("\"$id\"")

  # move the file
  if [[ -f "$script_dir/$new" ]]; then
    mv "$script_dir/$new" "$album_dir/"
  fi
done < "$script_dir/renamed_images.txt"

# If nothing new, exit early
if [[ "${#new_album_images[@]}" -eq 0 ]]; then
  echo "No new images to add."
  exit 0
fi

# Update album images.json
echo "$images_json" > "$album_images_json"

# Update album.json (keep old images + new ones)
updated_album_json=$(jq --argjson new_imgs "[$(IFS=,; echo "${new_album_images[*]}")]" \
  '.images += $new_imgs | .images |= unique' "$album_json")
echo "$updated_album_json" > "$album_json"

# Update global lookup.json
if [[ ! -f "$lookup_file" ]]; then
  echo "{}" > "$lookup_file"
fi
lookup_imgs=$(jq ".\"$album_id\" // []" "$lookup_file")
for id in "${new_album_images[@]}"; do
  lookup_imgs=$(jq --arg id $(echo $id | tr -d '"') '. + [$id] | unique' <<<"$lookup_imgs")
done
jq --arg id "$album_id" --argjson imgs "$lookup_imgs" '. + {($id): $imgs}' "$lookup_file" > "${lookup_file}.tmp" \
  && mv "${lookup_file}.tmp" "$lookup_file"

echo "✅ Added new images to album '$album_id': [${new_album_images[*]}]"
echo "🔄 Regenerating thumbnails…"

# ── Run generate_thumbnails.sh ────────────────────────────────────────
"$script_dir/generate_thumbnails.sh"

echo "🎉 Done."