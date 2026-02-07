// Video file utilities

export const VIDEO_EXTENSIONS = [
    'mp4', 'avi', 'mov', 'mkv', 'wmv', 'flv', 'webm', 'ogg', 'm4v', '3gp', 'asf'
];

export const IMAGE_EXTENSIONS = [
    'jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp', 'ico', 'tiff', 'tif'
];

/**
 * Check if a file URL/path is a video file based on extension
 * @param {string} url - File URL or path
 * @returns {boolean} - True if it's a video file
 */
export const isVideoFile = (url) => {
    if (!url || typeof url !== 'string') return false;

    // Extract filename from URL/path
    const fileName = url.split('/').pop()?.split('?')[0] || '';
    const extension = fileName.split('.').pop()?.toLowerCase();

    return VIDEO_EXTENSIONS.includes(extension);
};

/**
 * Check if a file URL/path is an image file based on extension
 * @param {string} url - File URL or path
 * @returns {boolean} - True if it's an image file
 */
export const isImageFile = (url) => {
    if (!url || typeof url !== 'string') return false;

    // Extract filename from URL/path
    const fileName = url.split('/').pop()?.split('?')[0] || '';
    const extension = fileName.split('.').pop()?.toLowerCase();

    return IMAGE_EXTENSIONS.includes(extension);
};

/**
 * Check if a URL is a data URL (base64 encoded)
 * @param {string} url - URL to check
 * @returns {boolean} - True if it's a data URL
 */
export const isDataUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('data:');
};

/**
 * Check if a URL is a remote HTTP/HTTPS URL
 * @param {string} url - URL to check
 * @returns {boolean} - True if it's a remote URL
 */
export const isRemoteUrl = (url) => {
    if (!url || typeof url !== 'string') return false;
    return url.startsWith('http://') || url.startsWith('https://');
};

/**
 * Get the file extension from a URL/path
 * @param {string} url - File URL or path
 * @returns {string} - File extension in lowercase
 */
export const getFileExtension = (url) => {
    if (!url || typeof url !== 'string') return '';

    const fileName = url.split('/').pop()?.split('?')[0] || '';
    return fileName.split('.').pop()?.toLowerCase() || '';
};

/**
 * Convert a file path to a proper URL for serving
 * @param {string} path - File path
 * @param {string} baseUrl - Base URL for the server
 * @returns {string} - Proper URL for serving the file
 */
export const pathToUrl = (path, baseUrl = 'http://localhost:4000') => {
    if (!path) return '';

    // If it's already a complete URL, return as is
    if (isRemoteUrl(path) || isDataUrl(path)) {
        return path;
    }

    // Convert Windows-style paths to URL-style paths
    const cleanPath = path.replace(/\\/g, '/');

    // Remove drive letter if present (e.g., "C:/Users/..." -> "/Users/...")
    const urlPath = cleanPath.replace(/^[A-Za-z]:/, '');

    // Ensure path starts with /
    const normalizedPath = urlPath.startsWith('/') ? urlPath : `/${urlPath}`;

    return `${baseUrl}${normalizedPath}`;
};

/**
 * Get default thumbnail based on course category
 * @param {string} category - Course category
 * @returns {string} - Default thumbnail URL
 */
export const getDefaultThumbnail = (category) => {
    const defaultThumbnails = {
        'web-development': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNGMTlBM0UiLz48cGF0aCBkPSJNMTAwIDgwSDIwMFYxMjBIMTAwVjgwWiIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSIxNTAiIHk9IjE2MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0id2hpdGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCI+V2ViIERldmVsb3BtZW50PC90ZXh0Pjwvc3ZnPg==',
        'programming': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM2MzY2RjEiLz48cGF0aCBkPSJNMTIwIDgwTDE0MCA2MEwxNjAgODBMMTQwIDEwMEwxMjAgODBaIiBmaWxsPSJ3aGl0ZSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5Qcm9ncmFtbWluZzwvdGV4dD48L3N2Zz4=',
        'design': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiNFQzQ4OTkiLz48Y2lyY2xlIGN4PSIxNTAiIGN5PSIxMDAiIHI9IjMwIiBmaWxsPSJ3aGl0ZSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5EZXNpZ248L3RleHQ+PC9zdmc+',
        'marketing': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiMxMEI5ODEiLz48cGF0aCBkPSJNMTIwIDEwMEwxNDAgODBMMTYwIDEwMEwxNDAgMTIwTDEyMCAxMDBaIiBmaWxsPSJ3aGl0ZSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5NYXJrZXRpbmc8L3RleHQ+PC9zdmc+',
        'default': 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDMwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjMwMCIgaGVpZ2h0PSIyMDAiIGZpbGw9IiM2QjcyODAiLz48cGF0aCBkPSJNMTI1IDc1TDE3NSAxMjVIMTI1SDEwMEwxMjUgNzVaIiBmaWxsPSJ3aGl0ZSIvPjx0ZXh0IHg9IjE1MCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSJ3aGl0ZSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5Db3Vyc2U8L3RleHQ+PC9zdmc+'
    };

    const categoryKey = category?.toLowerCase().replace(/\s+/g, '-') || 'default';
    return defaultThumbnails[categoryKey] || defaultThumbnails.default;
};