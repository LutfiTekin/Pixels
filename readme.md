# Static Gallery Viewer

This is a simple static gallery viewer that displays images grouped into albums, using only HTML, CSS, and JavaScript.

## ✨ Features
- Image grid gallery view by album
- Modal popup with title, description, and download button
- Swipe navigation for mobile users
- URL deep-linking support via `?album=...&image=...`
- Clean fallback for missing album or image

## 🗂 How It Works
- Image metadata is stored in `images.json`
- Album structure (with image IDs and titles) is in `albums.json`
- The actual images are stored under `images/{albumId}/{imageId}.png`
  - (Note: to reduce repo size, image files are not included in this public version)

## 📦 Files
- `index.html` — Main gallery page
- `albums.json` — Lists available albums and their images
- `images.json` — Maps image IDs to titles and descriptions
- `images/` — Folder that contains actual image files (not included here)

## 🖼 Usage
1. Open `index.html` in your browser
2. Provide an album via URL param:
   ```
   ?album=lzgcards
   ```
3. To deep-link to a specific image:
   ```
   ?album=lzgcards&image=bd833563537b6b1c
   ```

## 📱 Mobile
- Tap to open an image
- Swipe left/right to navigate
- Tap outside the image to close modal

---

This gallery is a personal archive for storing and viewing image designs — whether generated, drawn, or photographed.

> Made with 🖤 for simple hosting — no backend needed.
