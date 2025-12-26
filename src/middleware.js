import { NextResponse } from "next/server";

/**
 * Next.js Middleware for Actinova AI Tutor.
 * Runs on the Edge Runtime.
 */
export function middleware(request) {
    try {
        const { pathname } = request.nextUrl;

        // 0. Explicitly skip API routes and static files to be absolutely safe
        // This is a redundant safety check for the matcher
        if (pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname.includes("favicon.ico")) {
            return NextResponse.next();
        }

        const hostname = request.headers.get("host") || "";
        const token = request.cookies.get("token")?.value;

        // 1. Handle Admin Subdomain
        if (hostname.startsWith("admin.") || hostname === "admin.localhost:3000") {
            // Avoid infinite rewrite loops if already on /admin
            if (!pathname.startsWith("/admin")) {
                const url = request.nextUrl.clone();
                url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
                return NextResponse.rewrite(url);
            }
        }

        // 2. Define Protected and Auth Paths
        // Standardizing paths to match actual src/app structure
        const protectedPaths = ["/dashboard", "/profile", "/settings", "/course/", "/learning", "/quiz"];
        const isProtected = protectedPaths.some(path => pathname.startsWith(path));

        const isAuthPage = pathname.startsWith("/auth") ||
            pathname === "/login" ||
            pathname === "/signup";

        // 3. Redirection Logic
        if (isProtected && !token) {
            // Redirect to correct /auth/login route
            const url = request.nextUrl.clone();
            url.pathname = "/auth/login";
            // Optional: append original path as query param for post-login redirect
            // url.searchParams.set("callbackUrl", pathname);
            return NextResponse.redirect(url);
        }

        if (isAuthPage && token) {
            // Already logged in, go to dashboard
            const url = request.nextUrl.clone();
            url.pathname = "/dashboard";
            return NextResponse.redirect(url);
        }

        return NextResponse.next();
    } catch (error) {
        // Fail-safe: continue to next if middleware errors out
        console.error("Middleware processing error:", error);
        return NextResponse.next();
    }
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - api (API routes)
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public files (logo.png, etc)
         */
        "/((?!api|_next/static|_next/image|favicon.ico|logo.png|.*\\.jpg|.*\\.png).*)",
    ],
};
