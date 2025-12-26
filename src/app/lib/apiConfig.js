// src/app/lib/apiConfig.js

/**
 * Utility to manage the API base URL for mobile app compatibility.
 * When running in Capacitor, relative paths like /api/login won't work.
 */

const IS_BROWSER = typeof window !== 'undefined';
const IS_CAPACITOR = IS_BROWSER && (
    !!window.Capacitor ||
    window.location.protocol === 'capacitor:' ||
    (window.location.hostname === 'localhost' && window.location.port !== '3000' && window.location.port !== '3001')
);

console.log('[Actinova] Environment:', {
    origin: IS_BROWSER ? window.origin : 'N/A',
    isCapacitor: IS_CAPACITOR,
    protocol: IS_BROWSER ? window.location.protocol : 'N/A',
    host: IS_BROWSER ? window.location.host : 'N/A'
});

// Replace with your actual production backend URL if NEXT_PUBLIC_API_URL is not set
const DEFAULT_API_URL = 'https://actinovatutorapp.vercel.app';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
console.log('[Actinova] API_BASE_URL configured as:', API_BASE_URL);

/**
 * Helper to get the absolute API URL for a given path.
 * @param {string} path - The relative path (e.g., '/api/login')
 * @returns {string} - The absolute URL
 */
export function getApiUrl(path) {
    if (!path) return API_BASE_URL;

    // If it's already an absolute URL, return it
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }

    // Ensure we don't have double slashes
    const cleanPath = path.startsWith('/') ? path : `/${path}`;

    // If we are in the browser (Web version) and NOT in Capacitor, use relative paths.
    // This ensures the app always talks to its own server, fixing CORS issues
    // and ensuring consistency between local, preview, and production deployments.
    if (IS_BROWSER && !IS_CAPACITOR) {
        return cleanPath;
    }

    // Default to absolute URL for Capacitor (Mobile)
    return `${API_BASE_URL}${cleanPath}`;
}

/**
 * Authenticated fetch wrapper that automatically includes Bearer token for Capacitor
 * @param {string} path - The API path (e.g., '/api/library')
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>} - Fetch response
 */
export async function authenticatedFetch(path, options = {}) {
    const url = getApiUrl(path);

    // Prepare headers
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // For Capacitor, add Bearer token from localStorage
    if (IS_CAPACITOR) {
        const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Use omit credentials for Capacitor (we're using tokens instead)
        return fetch(url, {
            ...options,
            headers,
            credentials: 'omit',
        });
    }

    // For web, use include credentials (cookies)
    return fetch(url, {
        ...options,
        headers,
        credentials: 'include',
    });
}
