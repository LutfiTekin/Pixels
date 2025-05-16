#!/bin/bash

# Check if jq is installed
if ! command -v jq &> /dev/null; then
  echo "jq is not installed. Attempting to install..."

  if [ -f /etc/debian_version ]; then
    sudo apt update && sudo apt install -y jq
  elif [ -f /etc/redhat-release ]; then
    sudo yum install -y epel-release && sudo yum install -y jq
  elif [ -f /etc/arch-release ]; then
    sudo pacman -Sy --noconfirm jq
  elif command -v brew &> /dev/null; then
    brew install jq
  else
    echo "Unsupported OS. Please install 'jq' manually."
    exit 1
  fi

  if ! command -v jq &> /dev/null; then
    echo "jq installation failed. Exiting."
    exit 1
  fi
fi

# Ask for album metadata
read -p "Album ID: " album_id
read -p "Album Title: " album_title
read -p "Album Description: " album_description

# Subfolder for images
mkdir -p "$album_id"

# Run the scrambling script
./scramble_images.sh

# Init output JSON strings
images_json="{}"
album_images=()

# Process renamed files
while read -r line; do
  filename="${line##*/}"
  id="${filename%.*}"
  orig_name=$(basename "$(grep "$filename" renamed_images.txt | cut -d'>' -f1)" | sed 's/\.[^.]*$//')
  title="${orig_name//_/ }"

  # Append to image JSON
  images_json=$(jq --arg id "$id" --arg title "$title" \
    '. + {($id): {title: $title}}' <<< "$images_json")

  # Add ID to album image list
  album_images+=("\"$id\"")

  # Move image to album folder
  mv "$filename" "$album_id/"
done < renamed_images.txt

# Build albums JSON
albums_json=$(jq -n \
  --arg id "$album_id" \
  --arg title "$album_title" \
  --arg desc "$album_description" \
  --argjson images "$(printf "[%s]" "$(IFS=,; echo "${album_images[*]}")")" \
  '{($id): {title: $title, description: $desc, images: $images}}'
)

# Write output
echo "$images_json" > new_images.json
echo "$albums_json" > new_albums.json

echo "Done. JSON written to new_images.json and new_albums.json"
