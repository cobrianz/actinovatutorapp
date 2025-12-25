// src/app/lib/csrfClient.js
// Client-side CSRF token utilities

/**
 * Get CSRF token from cookies
 * @returns {string|null} CSRF token or null if not found
 */
export function getCsrfToken() {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(/csrfToken=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Create headers object with CSRF token for fetch requests
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} Headers object with CSRF token
 */
export function createCsrfHeaders(additionalHeaders = {}) {
    const csrfToken = getCsrfToken();

    return {
        "Content-Type": "application/json",
        ...(csrfToken && { "X-CSRF-Token": csrfToken }),
        ...additionalHeaders,
    };
}

/**
 * Wrapper for fetch that automatically includes CSRF token and credentials
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise<Response>} Fetch response
 */
export async function csrfFetch(url, options = {}) {
    const method = options.method?.toUpperCase() || "GET";
    const needsCsrf = ["POST", "PUT", "DELETE", "PATCH"].includes(method);

    const headers = {
        ...options.headers,
    };

    // Add CSRF token for state-changing methods
    if (needsCsrf) {
        const csrfToken = getCsrfToken();
        if (csrfToken) {
            headers["X-CSRF-Token"] = csrfToken;
        }
    }

    return fetch(url, {
        ...options,
        credentials: options.credentials || "include",
        headers,
    });
}
