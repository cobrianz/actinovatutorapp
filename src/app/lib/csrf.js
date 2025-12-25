// src/app/lib/csrf.js

import crypto from "crypto";

// CSRF token configuration
export const CSRF_COOKIE_NAME = "csrfToken";
export const CSRF_HEADER_NAME = "X-CSRF-Token";
export const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a cryptographically secure CSRF token
 * @returns {string} Hex-encoded random token
 */
export function generateCsrfToken() {
    return crypto.randomBytes(CSRF_TOKEN_LENGTH).toString("hex");
}

/**
 * Validate CSRF token from request header against cookie value
 * @param {string} headerToken - Token from X-CSRF-Token header
 * @param {string} cookieToken - Token from csrfToken cookie
 * @returns {boolean} True if tokens match and are valid
 */
export function validateCsrfToken(headerToken, cookieToken) {
    // Both tokens must exist
    if (!headerToken || !cookieToken) {
        return false;
    }

    // Tokens must be strings
    if (typeof headerToken !== "string" || typeof cookieToken !== "string") {
        return false;
    }

    // Tokens must have expected length (hex = 2 chars per byte)
    const expectedLength = CSRF_TOKEN_LENGTH * 2;
    if (
        headerToken.length !== expectedLength ||
        cookieToken.length !== expectedLength
    ) {
        return false;
    }

    // Use timing-safe comparison to prevent timing attacks
    try {
        return crypto.timingSafeEqual(
            Buffer.from(headerToken, "hex"),
            Buffer.from(cookieToken, "hex")
        );
    } catch (error) {
        // timingSafeEqual throws if buffers have different lengths
        return false;
    }
}

/**
 * Set CSRF token cookie in response
 * @param {import('next/server').NextResponse} response - Next.js response object
 * @param {string} token - CSRF token to set
 * @param {boolean} isProd - Whether running in production
 */
export function setCsrfCookie(cookieStore, token, isProd = false) {
    cookieStore.set(CSRF_COOKIE_NAME, token, {
        httpOnly: false, // Must be readable by JavaScript
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        path: "/",
        maxAge: 7 * 24 * 60 * 60, // 7 days (matches access token)
    });
}
