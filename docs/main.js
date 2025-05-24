document.addEventListener('DOMContentLoaded', async () => {
    const galleryContainer = document.getElementById('gallery-container');
    const layoutSelector = document.getElementById('layout-selector');
    const searchInput = document.getElementById('search-input');
    const sortOptions = document.getElementById('sort-options');
    const favoritesToggle = document.getElementById('favorites-toggle');

    let albums = {};
    let imageDetails = {};
    let lookup = {};
    let currentAlbumId = null;
    let lightbox = null;
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let currentLayout = localStorage.getItem('layout') || 'grid';
    let isShowingFavorites = false;
    const defaultTitle = 'Static Image Gallery';

    // Function to update the document title based on context
    const updateDocumentTitle = (context, albumId, imageId) => {
        if (context === 'album' && albumId && albums[albumId]) {
            document.title = `${albums[albumId].title || albumId} - Image Gallery`;
        } else if (context === 'image' && albumId && imageId && imageDetails[albumId]?.[imageId]) {
            document.title = `${imageDetails[albumId][imageId].title || imageId} - Image Gallery`;
        } else {
            document.title = defaultTitle;
        }
    };

    // Create custom download button
    const createDownloadButton = (imageUrl, imageName) => {
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'custom-download-btn';
        downloadBtn.innerHTML = '📥';
        downloadBtn.title = 'Download Image';
        downloadBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                const response = await fetch(imageUrl);
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${imageName || 'image'}.png`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                window.open(imageUrl, '_blank');
            }
        };
        return downloadBtn;
    };

    // Create custom share button (with direct link)
    const createShareButton = (imageUrl, imageTitle) => {
        const shareBtn = document.createElement('button');
        shareBtn.className = 'custom-share-btn';
        shareBtn.innerHTML = '🔗';
        shareBtn.title = 'Share Image';
        shareBtn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();

            let albumId = null, imageId = null;
            const match = imageUrl.match(/albums\/([^/]+)\/([^/.]+)\.(png|jpg|jpeg|webp|gif)/i);
            if (match) {
                albumId = match[1];
                imageId = match[2];
            }
            let directUrl = window.location.origin + window.location.pathname;
            if (albumId && imageId) {
                directUrl += `?album=${encodeURIComponent(albumId)}&image=${encodeURIComponent(imageId)}`;
            }
            const shareData = {
                title: imageTitle || 'Image from Gallery',
                text: `Check out this image: ${imageTitle || 'Untitled'}`,
                url: directUrl
            };

            try {
                if (navigator.share) {
                    await navigator.share(shareData);
                } else {
                    await navigator.clipboard.writeText(directUrl);
                    showToast('Image URL copied to clipboard!');
                }
            } catch {
                try {
                    await navigator.clipboard.writeText(directUrl);
                    showToast('Image URL copied to clipboard!');
                } catch {
                    showToast('Unable to share. Try copying the URL manually.');
                }
            }
        };
        return shareBtn;
    };

    // Show toast notifications
    const showToast = (message) => {
        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);
        setTimeout(() => { toast.classList.add('show'); }, 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { document.body.removeChild(toast); }, 300);
        }, 3000);
    };

    // Place custom buttons at the bottom above the caption
    const addCustomButtons = () => {
        const existingButtons = document.querySelectorAll('.custom-download-btn, .custom-share-btn');
        existingButtons.forEach(btn => btn.remove());
        const currentSlide = document.querySelector('.gslide.current');
        if (!currentSlide) return;

        const imageUrl = currentSlide.querySelector('img')?.src;
        const slideTitle = currentSlide.querySelector('.gslide-title')?.textContent;

        if (imageUrl) {
            const highResUrl = imageUrl.replace('/lowres/', '/');
            const downloadBtn = createDownloadButton(highResUrl, slideTitle);
            const shareBtn = createShareButton(highResUrl, slideTitle);

            // Place toolbar above the caption at the bottom
            const description = currentSlide.querySelector('.gslide-description');
            let customToolbar = currentSlide.querySelector('.custom-toolbar');
            if (!customToolbar) {
                customToolbar = document.createElement('div');
                customToolbar.className = 'custom-toolbar';
                if (description) {
                    description.parentNode.insertBefore(customToolbar, description);
                } else {
                    currentSlide.appendChild(customToolbar);
                }
            }
            customToolbar.innerHTML = '';
            customToolbar.appendChild(downloadBtn);
            customToolbar.appendChild(shareBtn);
        }
    };

    // Initialize GLightbox with events
    const initLightbox = () => {
        if (lightbox) lightbox.destroy();
        lightbox = GLightbox({
            selector: 'a[data-glightbox]',
            touchNavigation: true,
            keyboardNavigation: true,
            zoomable: true,
            draggable: true,
            loop: true,
            autoplayVideos: false,
            openEffect: 'zoom',
            closeEffect: 'fade',
            cssEfects: {
                fade: { in: 'fadeIn', out: 'fadeOut' },
                zoom: { in: 'zoomIn', out: 'zoomOut' }
            },
            moreLength: 0,
            slideExtraAttributes: { poster: '' },
            elements: null,
            prevImg: true,
            nextImg: true
        });
        lightbox.on('open', () => setTimeout(() => { addCustomButtons(); updateUrlAndTitle(); }, 100));
        lightbox.on('slide_changed', () => setTimeout(() => { addCustomButtons(); updateUrlAndTitle(); }, 100));
        lightbox.on('close', () => {
            const newUrl = new URL(window.location);
            newUrl.searchParams.delete('image');
            history.replaceState({}, '', newUrl);
            updateDocumentTitle('album', currentAlbumId);
            if (albums[currentAlbumId]) {
                document.getElementById('album-title').textContent = albums[currentAlbumId].title || 'Image Gallery';
                document.getElementById('album-description').textContent = albums[currentAlbumId].description || '';
            }
        });
    };

    // Update URL and title on slide change
    const updateUrlAndTitle = () => {
        const currentSlide = document.querySelector('.gslide.current');
        if (!currentSlide) return;
        const imageUrl = currentSlide.querySelector('img')?.src;
        const slideTitle = currentSlide.querySelector('.gslide-title')?.textContent;
        let imageId = null;
        if (imageUrl) {
            const imageMatch = imageUrl.match(/\/([^\/]+)\.(png|jpg|jpeg|gif|webp)$/i);
            if (imageMatch && imageMatch[1]) imageId = imageMatch[1];
        }
        if (!imageId && slideTitle && currentAlbumId && imageDetails[currentAlbumId]) {
            for (const imgId in imageDetails[currentAlbumId]) {
                if (imageDetails[currentAlbumId][imgId].title === slideTitle.trim()) {
                    imageId = imgId;
                    break;
                }
            }
        }
        if (imageId && currentAlbumId) {
            const newUrl = new URL(window.location);
            newUrl.searchParams.set('album', currentAlbumId);
            newUrl.searchParams.set('image', imageId);
            history.replaceState({}, '', newUrl);
            updateDocumentTitle('image', currentAlbumId, imageId);
        }
    };

    const setLayout = (layout) => {
        galleryContainer.className = layout === 'masonry' ? 'masonry' : 'gallery';
        galleryContainer.classList.add(layout);
        currentLayout = layout;
        localStorage.setItem('layout', layout);
    };

    const toggleFavorite = (albumId, imageId, button) => {
        const favoriteKey = `${albumId}-${imageId}`;
        const isFavorite = favorites.includes(favoriteKey);
        if (isFavorite) {
            favorites = favorites.filter(fav => fav !== favoriteKey);
            button.classList.remove('favorited');
        } else {
            favorites.push(favoriteKey);
            button.classList.add('favorited');
        }
        localStorage.setItem('favorites', JSON.stringify(favorites));
        if (isShowingFavorites) renderGallery(currentAlbumId, true);
    };

    const isImageFavorite = (albumId, imageId) => favorites.includes(`${albumId}-${imageId}`);

    const filterAndSortImages = (albumImages, albumId) => {
        let filteredImages = albumImages;
        const searchTerm = searchInput.value.toLowerCase();

        filteredImages = filteredImages.filter(imageId => {
            const details = imageDetails[albumId]?.[imageId];
            if (!details) return false;
            return details.title?.toLowerCase().includes(searchTerm);
        });

        if (isShowingFavorites) {
            filteredImages = filteredImages.filter(imageId => isImageFavorite(albumId, imageId));
        }

        const sortValue = sortOptions.value;
        if (sortValue === 'name-asc') {
            filteredImages.sort((a, b) => (imageDetails[albumId]?.[a]?.title || '').localeCompare(imageDetails[albumId]?.[b]?.title || ''));
        } else if (sortValue === 'name-desc') {
            filteredImages.sort((a, b) => (imageDetails[albumId]?.[b]?.title || '').localeCompare(imageDetails[albumId]?.[a]?.title || ''));
        } else if (sortValue === 'random') {
            filteredImages.sort(() => Math.random() - 0.5);
        }
        return filteredImages;
    };

    const renderGallery = async (albumId, force = false) => {
        if (!albumId || (!albums[albumId] && !force)) {
            galleryContainer.innerHTML = '<p>Album not found.</p>';
            return;
        }

        currentAlbumId = albumId;
        const albumData = albums[albumId];
        const imagesData = imageDetails[albumId];

        if (!albumData || !imagesData) {
            galleryContainer.innerHTML = '<p>Album data or image details not found.</p>';
            return;
        }

        updateDocumentTitle('album', albumId);
        document.getElementById('album-title').textContent = albumData.title || 'Image Gallery';
        document.getElementById('album-description').textContent = albumData.description || '';

        const filteredAndSortedImages = filterAndSortImages(albumData.images, albumId);

        galleryContainer.innerHTML = '';

        if (filteredAndSortedImages.length === 0) {
            galleryContainer.innerHTML = '<p>No images found matching your criteria.</p>';
            return;
        }

        filteredAndSortedImages.forEach(imageId => {
            const details = imagesData[imageId];
            if (!details) return;

            const imageUrl = `albums/${albumId}/${imageId}.png`;
            const thumbUrl = `albums/${albumId}/lowres/${imageId}.png`;

            const galleryItem = document.createElement('div');
            galleryItem.classList.add('gallery-item');

            const img = document.createElement('img');
            img.src = thumbUrl;
            img.alt = details.title || '';
            img.classList.add('loading');
            img.onload = () => img.classList.remove('loading');

            const overlay = document.createElement('div');
            overlay.classList.add('overlay');
            overlay.textContent = details.title || '';

            const favoriteButton = document.createElement('button');
            favoriteButton.classList.add('favorite-button');
            favoriteButton.innerHTML = isImageFavorite(albumId, imageId) ? '❤️' : '🤍';
            favoriteButton.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                toggleFavorite(albumId, imageId, favoriteButton);
            });

            const link = document.createElement('a');
            link.href = imageUrl;
            link.dataset.glightbox = 'gallery';
            link.dataset.gallery = `album-${albumId}`;
            link.dataset.title = details.title || '';
            link.dataset.description = details.description || '';
            link.dataset.imageId = imageId;

            img.dataset.imageId = imageId;
            img.dataset.albumId = albumId;

            link.appendChild(img);
            galleryItem.appendChild(link);
            galleryItem.appendChild(overlay);
            galleryItem.appendChild(favoriteButton);
            galleryContainer.appendChild(galleryItem);
        });

        setTimeout(() => { initLightbox(); }, 100);
    };

    const renderSingleImage = async (imageId) => {
        let foundAlbumId = null;
        for (const album in lookup) {
            if (lookup[album].includes(imageId)) {
                foundAlbumId = album;
                break;
            }
        }
        if (!foundAlbumId || !imageDetails[foundAlbumId]?.[imageId]) {
            galleryContainer.innerHTML = '<p>Image not found.</p>';
            return;
        }
        currentAlbumId = foundAlbumId;
        const imageUrl = `albums/${foundAlbumId}/${imageId}.png`;
        const thumbUrl = `albums/${foundAlbumId}/lowres/${imageId}.png`;
        const details = imageDetails[foundAlbumId][imageId];

        updateDocumentTitle('image', foundAlbumId, imageId);
        galleryContainer.innerHTML = '';

        const galleryItem = document.createElement('div');
        galleryItem.classList.add('gallery-item');

        const img = document.createElement('img');
        img.src = thumbUrl;
        img.alt = details.title || '';

        const link = document.createElement('a');
        link.href = imageUrl;
        link.dataset.glightbox = 'gallery';
        link.dataset.title = details.title || '';
        link.dataset.description = details.description || '';
        link.dataset.imageId = imageId;

        link.appendChild(img);
        galleryItem.appendChild(link);
        galleryContainer.appendChild(galleryItem);

        setTimeout(() => {
            initLightbox();
            const glightboxLinks = document.querySelectorAll('a[data-glightbox]');
            if (glightboxLinks.length > 0) glightboxLinks[0].click();
        }, 100);
    };

    const loadAlbumData = async (albumId) => {
        try {
            const albumResponse = await fetch(`albums/${albumId}/album.json`);
            albums[albumId] = await albumResponse.json();
            const imagesResponse = await fetch(`albums/${albumId}/images.json`);
            imageDetails[albumId] = await imagesResponse.json();
        } catch (error) {
            galleryContainer.innerHTML = '<p>Failed to load album data.</p>';
            return false;
        }
        return true;
    };

    const loadLookupData = async () => {
        try {
            const response = await fetch('lookup.json');
            lookup = await response.json();
        } catch (error) {}
    };

    const handleRouteChange = async () => {
        const params = new URLSearchParams(window.location.search);
        const albumParam = params.get('album');
        const imageParam = params.get('image');

        if (albumParam) {
            if (!albums[albumParam]) await loadAlbumData(albumParam);
            renderGallery(albumParam);
            if (imageParam && imageDetails[albumParam]?.[imageParam]) {
                setTimeout(() => {
                    const links = document.querySelectorAll(`a[data-glightbox="gallery"]`);
                    for (let i = 0; i < links.length; i++) {
                        if (links[i].href.includes(imageParam)) {
                            links[i].click();
                            break;
                        }
                    }
                }, 200);
            }
        } else if (imageParam) {
            await loadLookupData();
            let found = false;
            for (const albumId in lookup) {
                if (lookup[albumId].includes(imageParam)) {
                    await loadAlbumData(albumId);
                    renderSingleImage(imageParam);
                    found = true;
                    break;
                }
            }
            if (!found) {
                galleryContainer.innerHTML = '<p>Image not found.</p>';
                document.title = defaultTitle;
            }
        } else {
            await loadLookupData();
            let allImages = [];
            for (const [albumId, imageIds] of Object.entries(lookup)) {
                imageIds.forEach(imageId => {
                    allImages.push({ albumId, imageId });
                });
            }
            allImages = allImages.sort(() => Math.random() - 0.5).slice(0, 10);
            const involvedAlbums = [...new Set(allImages.map(img => img.albumId))];
            for (const albumId of involvedAlbums) {
                if (!albums[albumId]) await loadAlbumData(albumId);
            }
            galleryContainer.innerHTML = '';
            document.getElementById('album-title').textContent = 'Random Images';
            document.getElementById('album-description').textContent = 'A random selection from all albums';
            allImages.forEach(({ albumId, imageId }) => {
                const details = imageDetails[albumId]?.[imageId] || {};
                const imageUrl = `albums/${albumId}/${imageId}.png`;
                const thumbUrl = `albums/${albumId}/lowres/${imageId}.png`;

                const galleryItem = document.createElement('div');
                galleryItem.classList.add('gallery-item');

                const img = document.createElement('img');
                img.src = thumbUrl;
                img.alt = details.title || '';
                img.classList.add('loading');
                img.onload = () => img.classList.remove('loading');

                const overlay = document.createElement('div');
                overlay.classList.add('overlay');
                overlay.textContent = details.title || imageId;

                const link = document.createElement('a');
                link.href = imageUrl;
                link.dataset.glightbox = 'gallery';
                link.dataset.gallery = `album-${albumId}`;
                link.dataset.title = details.title || imageId;
                link.dataset.description = details.description || '';
                link.dataset.imageId = imageId;

                img.dataset.imageId = imageId;
                img.dataset.albumId = albumId;

                link.appendChild(img);
                galleryItem.appendChild(link);
                galleryItem.appendChild(overlay);
                galleryContainer.appendChild(galleryItem);
            });
            setTimeout(() => { initLightbox(); }, 100);
        }
    };

    // Add CSS for custom toolbar at the bottom above the caption
    const addCustomStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .custom-toolbar {
                display: flex;
                justify-content: flex-end;
                gap: 12px;
                padding: 0 16px 10px 16px;
                position: relative;
                z-index: 9999;
            }
            .custom-download-btn, .custom-share-btn {
                background: rgba(0, 0, 0, 0.7);
                border: none;
                color: white;
                font-size: 20px;
                width: 40px;
                height: 40px;
                border-radius: 50%;
                cursor: pointer;
                transition: background-color 0.3s ease;
                display: flex;
                align-items: center;
                justify-content: center;
                position: static;
            }
            .custom-download-btn:hover, .custom-share-btn:hover {
                background: rgba(0,0,0,0.9);
            }
            @media (max-width: 600px) {
                .custom-download-btn, .custom-share-btn {
                    width: 32px;
                    height: 32px;
                    font-size: 16px;
                }
                .custom-toolbar {
                    gap: 8px;
                    padding-bottom: 8px;
                }
            }
            .toast-notification {
                position: fixed;
                top: 50px;
                right: 20px;
                background: rgba(0, 0, 0, 0.8);
                color: white;
                padding: 12px 20px;
                border-radius: 5px;
                z-index: 10000;
                transform: translateX(100%);
                transition: transform 0.3s ease;
            }
            .toast-notification.show {
                transform: translateX(0);
            }
        `;
        document.head.appendChild(style);
    };

    // Initialization
    addCustomStyles();
    await loadLookupData();
    await handleRouteChange();
    setLayout(currentLayout);
    layoutSelector.value = currentLayout;

    window.addEventListener('popstate', handleRouteChange);
    layoutSelector.addEventListener('change', (event) => setLayout(event.target.value));
    searchInput.addEventListener('input', () => renderGallery(currentAlbumId, true));
    sortOptions.addEventListener('change', () => renderGallery(currentAlbumId, true));
    favoritesToggle.addEventListener('click', () => {
        isShowingFavorites = !isShowingFavorites;
        favoritesToggle.textContent = isShowingFavorites ? 'Show All' : 'Show Favorites';
        renderGallery(currentAlbumId, true);
    });

    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(() => {})
                .catch(() => {});
        });
    }
});