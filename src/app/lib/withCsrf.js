// src/app/lib/withCsrf.js

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { validateCsrfToken, CSRF_HEADER_NAME, CSRF_COOKIE_NAME } from "./csrf";

/**
 * Higher-order function that wraps API route handlers with CSRF protection
 * Only validates CSRF tokens for state-changing methods (POST, PUT, DELETE, PATCH)
 * GET, HEAD, and OPTIONS requests bypass CSRF validation
 *
 * @param {Function} handler - The API route handler function
 * @returns {Function} Wrapped handler with CSRF protection
 */
export function withCsrf(handler) {
    return async function csrfProtectedHandler(request, context) {
        const method = request.method.toUpperCase();

        // Skip CSRF validation for safe methods
        const safeMethods = ["GET", "HEAD", "OPTIONS"];
        if (safeMethods.includes(method)) {
            return handler(request, context);
        }

        // For state-changing methods, validate CSRF token
        try {
            const headersList = await headers();
            const cookieStore = await cookies();

            // BYPASS CSRF for Bearer tokens (Mobile/Capacitor)
            const authHeader = headersList.get("Authorization");
            if (authHeader?.startsWith("Bearer ")) {
                return handler(request, context);
            }

            const csrfHeader = headersList.get(CSRF_HEADER_NAME);
            const csrfCookie = cookieStore.get(CSRF_COOKIE_NAME)?.value;

            // Validate CSRF token
            if (!validateCsrfToken(csrfHeader, csrfCookie)) {
                console.warn(
                    `[CSRF] Validation failed for ${method} ${request.url}`,
                    {
                        hasHeader: !!csrfHeader,
                        hasCookie: !!csrfCookie,
                        headerLength: csrfHeader?.length,
                        cookieLength: csrfCookie?.length,
                    }
                );

                return NextResponse.json(
                    {
                        error: "Invalid or missing CSRF token",
                        code: "CSRF_VALIDATION_FAILED",
                    },
                    { status: 403 }
                );
            }

            // CSRF validation passed, proceed with handler
            return handler(request, context);
        } catch (error) {
            console.error("[CSRF] Unexpected error during validation:", error);
            return NextResponse.json(
                {
                    error: "CSRF validation error",
                    code: "CSRF_ERROR",
                },
                { status: 500 }
            );
        }
    };
}

/**
 * Middleware variant for Next.js middleware.ts
 * Use this in middleware.ts to protect routes at the edge
 */
export function csrfMiddleware(request) {
    const method = request.method.toUpperCase();
    const safeMethods = ["GET", "HEAD", "OPTIONS"];

    if (safeMethods.includes(method)) {
        return null; // Allow safe methods
    }

    const csrfHeader = request.headers.get(CSRF_HEADER_NAME);
    const csrfCookie = request.cookies.get(CSRF_COOKIE_NAME)?.value;

    if (!validateCsrfToken(csrfHeader, csrfCookie)) {
        return NextResponse.json(
            {
                error: "Invalid or missing CSRF token",
                code: "CSRF_VALIDATION_FAILED",
            },
            { status: 403 }
        );
    }

    return null; // CSRF valid, continue
}
