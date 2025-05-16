#!/bin/bash

# File extensions to include
EXTENSIONS=("jpg" "jpeg" "png" "gif" "bmp" "webp")

for ext in "${EXTENSIONS[@]}"; do
  find . -maxdepth 1 -type f -iname "*.${ext}" | while read -r file; do
    # Get file extension
    extension="${file##*.}"
    # Generate MD5 hash and take first 16 characters
    hash=$(echo -n "$file" | md5sum | cut -c1-16)
    # Form new filename
    new_name="${hash}.${extension}"
    # Rename the file if the new name doesn't already exist
    if [[ "$file" != "./$new_name" && ! -e "$new_name" ]]; then
      mv "$file" "$new_name"
      echo "Renamed: $file -> $new_name"
    fi
  done
done
