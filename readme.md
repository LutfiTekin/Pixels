# Static Image Gallery

A fully static image gallery built with HTML, CSS, and JavaScript. It reads image data from predefined JSON structures and supports deep-linking, PWA features, and a modern UX.

## Features

- **Static and Client-Side:** Runs entirely in the browser without any backend server.
- **Deep Linking:** Supports direct linking to specific albums and images using URL parameters (`?album=xyz`, `?album=xyz&image=abc`, `?image=abc`).
- **Progressive Web App (PWA):**
    - Manifest for installability.
    - Service worker for offline support and caching.
    - Offline fallback page.
- **Responsive Design:** Mobile-first layout that adapts to different screen sizes.
- **Modern UX:**
    - Masonry-style layout for varying image heights.
    - Dark/light mode toggle (remembers preference).
    - Color theme picker (remembers preference).
    - Layout switch (grid, list, slideshow - basic slideshow due to GLightbox).
    - Lazy loading of thumbnails with blur-up effect.
    - EXIF metadata display (if present - needs implementation to read EXIF).
    - Preload next image in lightbox.
    - Support for images (can be extended for videos with appropriate GLightbox configuration).
    - GLightbox integration for image modal:
        - Swipe navigation.
        - Zoom functionality.
        - Keyboard navigation.
        - Download button.
        - Fullscreen toggle.
        - Share via Web Share API.
        - QR code generator.
        - Copy link button.
    - Favorites system using localStorage.
    - Tag-based filtering.
    - Real-time search bar (by title).
    - Sorting options (name asc/desc, random).
    - Displays image titles.

## Data Structure

The gallery reads data from the following JSON files:

- `/docs/lookup.json`: Maps album IDs to an array of image IDs.
- `/docs/albums/[albumId]/album.json`: Contains album metadata (`title`, `description`, `images` array).
- `/docs/albums/[albumId]/images.json`: Contains details for each image in the album (title, tags, etc.).
- `/docs/albums/[albumId]/[image files].png/jpg`: Full-size images.
- `/docs/albums/[albumId]/lowres/[image files].png/jpg`: 100px-wide low-resolution thumbnails.

## Routing Logic

- `?album=xyz`: Displays the grid gallery of the album with ID `xyz`.
- `?album=xyz&image=abc`: Displays the grid gallery of album `xyz` and opens the image with ID `abc` in the lightbox.
- `?image=abc`: Finds the album containing image `abc` using `lookup.json` and opens the image directly in the lightbox.

## Deployment

This gallery is designed for static hosting and can be deployed to platforms like:

- **GitHub Pages:** Simply push the `/docs` folder to your repository's `gh-pages` branch or configure it as the source.
- **Netlify:** Deploy by linking your repository, and Netlify will handle the static site generation.
- **Vercel:** Similar to Netlify, connect your repository to deploy the static files.
- **Any static file server:** You can also serve the contents of the `/docs` folder using any basic HTTP server configured for static files.

## Customization

- **Content:** Add or modify albums and images by updating the JSON files and placing image files in the appropriate directories. Ensure the `lookup.json` and `album.json` files are correctly referencing your image IDs.
- **Styling:** Modify the `style.css` file to change the visual appearance of the gallery.
- **Functionality:** The `main.js` file contains the core logic. You can extend or modify it to add more features or change the existing behavior.
- **PWA:** Update the `manifest.webmanifest` with your application's name, icons, and other PWA settings. Customize the caching strategy in `service-worker.js` if needed.

## Further Improvements (Optional)

- **Video Support:** Enhance the gallery and GLightbox configuration to handle video files.
- **EXIF Data Reading:** Implement a library to read EXIF metadata from images and display it in the lightbox.
- **More Layout Options:** Implement more advanced layout algorithms or customization.
- **User Authentication (Advanced):** For private galleries, you could explore client-side authentication (though it adds complexity to a purely static site).
- **Accessibility:** Further enhance ARIA attributes and keyboard navigation for better accessibility.

This README provides a good starting point for understanding and using the static image gallery. Remember to replace the placeholder icons with your own.

This gallery is a personal archive for storing and viewing image designs — whether generated, drawn, or photographed.

> Made with 🖤 for simple hosting — no backend needed.
