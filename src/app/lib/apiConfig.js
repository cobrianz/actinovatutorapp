// src/app/lib/apiConfig.js

/**
 * Utility to manage the API base URL for mobile app compatibility.
 * When running in Capacitor, relative paths like /api/login won't work.
 */

const IS_BROWSER = typeof window !== 'undefined';
const IS_CAPACITOR = IS_BROWSER && window.origin.startsWith('capacitor://');

// Replace with your actual production backend URL if NEXT_PUBLIC_API_URL is not set
const DEFAULT_API_URL = 'https://actinova-backend.vercel.app';

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

    // For local development in the browser, favor relative paths to use the local Next.js API.
    // This avoids CORS issues and allows testing local API changes directly.
    if (IS_BROWSER && !IS_CAPACITOR && process.env.NODE_ENV === 'development') {
        return cleanPath;
    }

    // Default to absolute URL for Capacitor and Prod
    return `${API_BASE_URL}${cleanPath}`;
}
