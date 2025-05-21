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

    // Initialize GLightbox properly
    const initLightbox = () => {
        // Destroy existing lightbox instance if it exists
        if (lightbox) {
            lightbox.destroy();
        }
        
        // Initialize GLightbox on all gallery links
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
            plyr: {
                css: 'https://cdn.plyr.io/3.6.8/plyr.css',
                js: 'https://cdn.plyr.io/3.6.8/plyr.js'
            },
            // Explicitly define buttons to display
            moreLength: 0,
            slideExtraAttributes: {
                poster: ''
            },
            elements: null,
            // Show navigation arrows
            prevImg: true,
            nextImg: true,
            // Explicitly enable all buttons
            buttons: [
                'close',
                'download',
                'fullscreen',
                'zoom',
                'share'
            ]
        });
        
        console.log('GLightbox initialized with buttons');
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
            link.dataset.glightbox = 'gallery';
            link.dataset.gallery = `album-${albumId}`;
            link.dataset.title = details.title || '';
            link.dataset.description = details.description || '';
            link.dataset.download = imageUrl; // Enable download button functionality

            link.appendChild(img);
            galleryItem.appendChild(link);
            galleryItem.appendChild(overlay);
            galleryItem.appendChild(favoriteButton);
            galleryContainer.appendChild(galleryItem);
        });

        // Initialize lightbox after all elements are added to DOM
        setTimeout(() => {
            initLightbox();
        }, 100);
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
        link.dataset.download = imageUrl; // Enable download button functionality
        
        link.appendChild(img);
        galleryItem.appendChild(link);
        galleryContainer.appendChild(galleryItem);
        
        // Open the lightbox automatically for single image
        setTimeout(() => {
            initLightbox();
            const glightboxLinks = document.querySelectorAll('a[data-glightbox]');
            if (glightboxLinks.length > 0) {
                // Trigger click on the first link to open the lightbox
                glightboxLinks[0].click();
            }
        }, 100);
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
                // Wait for gallery to be rendered, then open the specific image
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
            // Try to find which album contains this image
            await loadLookupData();
            for (const albumId in lookup) {
                if (lookup[albumId].includes(imageParam)) {
                    await loadAlbumData(albumId);
                    renderSingleImage(imageParam);
                    return;
                }
            }
            galleryContainer.innerHTML = '<p>Image not found.</p>';
        } else {
            await loadLookupData();
            const albumIds = Object.keys(lookup);
            if (albumIds.length > 0) {
                const firstAlbumId = albumIds[0];
                await loadAlbumData(firstAlbumId);
                renderGallery(firstAlbumId);
            }
        }
    };

    // Check if GLightbox is loaded
    if (typeof GLightbox === 'undefined') {
        console.error('GLightbox library not loaded!');
        galleryContainer.innerHTML = '<p>Error: GLightbox library not loaded. Please check your internet connection and refresh the page.</p>';
        return;
    }
    
    // Add CSS for GLightbox buttons
    const addGLightboxStyles = () => {
        const style = document.createElement('style');
        style.textContent = `
            .gclose {
                display: block !important;
            }
            .gnext, .gprev {
                display: block !important;
            }
            .gdownload, .gfullscreen, .gzoom-in, .gzoom-out, .gshare {
                display: block !important;
            }
            .glightbox-container .gslide-description {
                background: rgba(0, 0, 0, 0.7);
            }
            .glightbox-clean .gslide-description {
                background: rgba(0, 0, 0, 0.7);
            }
            .glightbox-mobile .glightbox-container .gslide-description {
                background: rgba(0, 0, 0, 0.7);
            }
            .glightbox-button-hidden {
                display: none !important;
            }
        `;
        document.head.appendChild(style);
    };

    // Initialization
    addGLightboxStyles();
    await loadLookupData();
    await handleRouteChange();
    setLayout(currentLayout);
    layoutSelector.value = currentLayout;

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

    // Add service worker registration
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registration successful');
                })
                .catch(error => {
                    console.log('ServiceWorker registration failed:', error);
                });
        });
    }
});