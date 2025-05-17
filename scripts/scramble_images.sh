#!/bin/bash

EXTENSIONS=("jpg" "jpeg" "png" "gif" "bmp" "webp")
LOGFILE="renamed_images.txt"
> "$LOGFILE"

for ext in "${EXTENSIONS[@]}"; do
  find . -maxdepth 1 -type f -iname "*.${ext}" | while read -r file; do
    extension="${file##*.}"
    clean_name="${file#./}"
    hash=$(echo -n "$clean_name" | md5sum | cut -c1-16)
    new_name="${hash}.${extension}"
    if [[ "$clean_name" != "$new_name" && ! -e "$new_name" ]]; then
      mv "$clean_name" "$new_name"
      echo "$clean_name > $new_name" >> "$LOGFILE"
      echo "Renamed: $clean_name -> $new_name"
    fi
  done
done
