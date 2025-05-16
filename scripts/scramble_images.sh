#!/bin/bash

# File extensions to include
EXTENSIONS=("jpg" "jpeg" "png" "gif" "bmp" "webp")
LOGFILE="renamed_images.txt"

# Clear or create log file
> "$LOGFILE"

for ext in "${EXTENSIONS[@]}"; do
  find . -maxdepth 1 -type f -iname "*.${ext}" | while read -r file; do
    # Get file extension
    extension="${file##*.}"
    # Strip leading './' for cleaner names
    clean_name="${file#./}"
    # Generate MD5 hash and take first 16 characters
    hash=$(echo -n "$clean_name" | md5sum | cut -c1-16)
    # Form new filename
    new_name="${hash}.${extension}"
    # Rename the file if the new name doesn't already exist
    if [[ "$clean_name" != "$new_name" && ! -e "$new_name" ]]; then
      mv "$clean_name" "$new_name"
      echo "$new_name" >> "$LOGFILE"
      echo "Renamed: $clean_name -> $new_name"
    fi
  done
done