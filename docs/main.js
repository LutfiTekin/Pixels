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
    let lightbox;
    let favorites = JSON.parse(localStorage.getItem('favorites') || '[]');
    let currentLayout = localStorage.getItem('layout') || 'grid';
    let isShowingFavorites = false;

    // Initialize GLightbox
    const initLightbox = (elements) => {
        if (lightbox) {
            lightbox.destroy();
        }
        lightbox = GLightbox({
            elements: elements,
            touchNavigation: true,
            keyboardNavigation: true,
            zoomable: true,
            draggable: true,
            buttons: ['download', 'fullscreen', 'close'],
            plugins: [
                {
                    init: (instance) => {
                        instance.on('slide_before_change', (prev, next) => {
                            preloadNextImage(instance.elements, next);
                        });
                    }
                },
                'share', 'qrCode', 'copyLink'
            ]
        });
    };

    const preloadNextImage = (elements, nextIndex) => {
        if (elements && elements[nextIndex]) {
            const nextImage = new Image();
            nextImage.src = elements[nextIndex].href;
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
        if (isShowingFavorites) {
            renderGallery(currentAlbumId, true);
        }
    };

    const isImageFavorite = (albumId, imageId) => {
        return favorites.includes(`${albumId}-${imageId}`);
    };

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

        const filteredAndSortedImages = filterAndSortImages(albumData.images, albumId);

        galleryContainer.innerHTML = '';
        const lightboxElements = [];

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
            img.onload = () => {
                img.classList.remove('loading');
            };

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
            link.dataset.glightbox = `album-${albumId}`;
            link.dataset.title = details.title || '';
            if (details.description) {
                link.dataset.description = details.description;
            }

            link.appendChild(img);
            galleryItem.appendChild(link);
            galleryItem.appendChild(overlay);
            galleryItem.appendChild(favoriteButton);
            galleryContainer.appendChild(galleryItem);

            lightboxElements.push({
                href: imageUrl,
                type: 'image',
                title: details.title || '',
                description: details.description || ''
            });
        });

        initLightbox(lightboxElements);
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

        const imageUrl = `albums/${foundAlbumId}/${imageId}.png`;
        const details = imageDetails[foundAlbumId][imageId];

        initLightbox([{
            href: imageUrl,
            type: 'image',
            title: details.title || '',
            description: details.description || ''
        }]);
    };

    const loadAlbumData = async (albumId) => {
        try {
            const albumResponse = await fetch(`albums/${albumId}/album.json`);
            albums[albumId] = await albumResponse.json();
            const imagesResponse = await fetch(`albums/${albumId}/images.json`);
            imageDetails[albumId] = await imagesResponse.json();
        } catch (error) {
            console.error('Error loading album data:', error);
            galleryContainer.innerHTML = '<p>Failed to load album data.</p>';
            return false;
        }
        return true;
    };

    const loadLookupData = async () => {
        try {
            const response = await fetch('lookup.json');
            lookup = await response.json();
        } catch (error) {
            console.error('Error loading lookup data:', error);
        }
    };

    const handleRouteChange = async () => {
        const params = new URLSearchParams(window.location.search);
        const albumParam = params.get('album');
        const imageParam = params.get('image');

        if (albumParam) {
            if (!albums[albumParam]) {
                await loadAlbumData(albumParam);
            }
            renderGallery(albumParam);
            if (imageParam && imageDetails[albumParam]?.[imageParam]) {
                const imageUrl = `albums/${albumParam}/${imageParam}.png`;
                const details = imageDetails[albumParam][imageParam];
                initLightbox([{
                    href: imageUrl,
                    type: 'image',
                    title: details.title || '',
                    description: details.description || ''
                }]);
            }
        } else if (imageParam) {
            let foundAlbumId = null;
            let foundImageId = null;
            for (const albumId in lookup) {
                if (lookup[albumId].includes(imageParam)) {
                    foundAlbumId = albumId;
                    foundImageId = imageParam;
                    break;
                }
            }
            if (foundAlbumId) {
                if (!albums[foundAlbumId]) {
                    await loadAlbumData(foundAlbumId);
                }
                renderSingleImage(foundImageId);
            }
        } else {
            const albumIds = Object.keys(lookup);
            if (albumIds.length > 0) {
                const firstAlbumId = albumIds[0];
                await loadAlbumData(firstAlbumId);
                renderGallery(firstAlbumId);
            }
        }
    };

    // Initialization
    await loadLookupData();
    await handleRouteChange();
    setLayout(currentLayout);

    // Event Listeners
    window.addEventListener('popstate', handleRouteChange);

    layoutSelector.addEventListener('change', (event) => {
        setLayout(event.target.value);
    });

    searchInput.addEventListener('input', () => {
        renderGallery(currentAlbumId, true);
    });

    sortOptions.addEventListener('change', () => {
        renderGallery(currentAlbumId, true);
    });

    favoritesToggle.addEventListener('click', () => {
        isShowingFavorites = !isShowingFavorites;
        favoritesToggle.textContent = isShowingFavorites ? 'Show All' : 'Show Favorites';
        renderGallery(currentAlbumId, true);
    });
});