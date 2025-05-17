#!/bin/bash

# Ensure jq is available
if ! command -v jq &> /dev/null; then
  echo "jq is required but not installed. Please install it first."
  exit 1
fi

# Prompt for album details
read -p "Album ID: " album_id
read -p "Album Title: " album_title
read -p "Album Description: " album_description

mkdir -p "$album_id"
./scramble_images.sh

images_json="{}"
album_images=()

# Read and process each line from renamed_images.txt
while IFS='>' read -r original new; do
  # Handle raw filename format fallback (no '>'):
  if [[ -z "$new" ]]; then
    new=$(echo "$original" | xargs)
    id="${new%.*}"
    title="$id"
  else
    original=$(echo "$original" | xargs)
    new=$(echo "$new" | xargs)
    id="${new%.*}"
    title=$(basename "$original" | sed 's/\.[^.]*$//' | sed 's/_/ /g')
  fi

  images_json=$(jq --arg id "$id" --arg title "$title" '. + {($id): {title: $title}}' <<< "$images_json")
  album_images+=("\"$id\"")

  if [[ -f "$new" ]]; then
    mv "$new" "$album_id/"
  else
    echo "Warning: $new not found for moving."
  fi
done < renamed_images.txt

# Build album JSON
albums_json=$(jq -n \
  --arg id "$album_id" \
  --arg title "$album_title" \
  --arg desc "$album_description" \
  --argjson images "$(printf "[%s]" "$(IFS=,; echo "${album_images[*]}")")" \
  '{($id): {title: $title, description: $desc, images: $images}}'
)

echo "$images_json" > new_images.json
echo "$albums_json" > new_albums.json

echo "Done. Written to new_images.json and new_albums.json."