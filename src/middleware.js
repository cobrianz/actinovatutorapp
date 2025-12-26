import { NextResponse } from "next/server";

/**
 * Next.js Middleware for Actinova AI Tutor.
 * Runs on the Edge Runtime.
 */
export function middleware(request) {
    const { pathname } = request.nextUrl;

    // 0. Explicitly skip static files and favicon
    if (pathname.startsWith("/_next") || pathname.includes("favicon.ico") || pathname.includes("logo.png")) {
        return NextResponse.next();
    }

    const hostname = request.headers.get("host") || "";
    const origin = request.headers.get("origin");
    const token = request.cookies.get("token")?.value;

    // 1. Handle Admin Subdomain
    if (hostname.startsWith("admin.") || hostname === "admin.localhost:3000") {
        if (!pathname.startsWith("/admin")) {
            const url = request.nextUrl.clone();
            url.pathname = `/admin${pathname === "/" ? "" : pathname}`;
            return NextResponse.rewrite(url);
        }
    }

    // 2. Define Protected and Auth Paths
    const protectedPaths = ["/dashboard", "/profile", "/settings", "/course/", "/learning", "/quiz"];
    const isProtected = protectedPaths.some(path => pathname.startsWith(path));
    const isAuthPage = pathname.startsWith("/auth") || pathname === "/login" || pathname === "/signup";

    // 3. API & CORS Handling
    if (pathname.startsWith("/api")) {
        const response = NextResponse.next();

        // Add CORS headers for allowed origins
        const allowedOrigins = [
            "https://localhost",
            "capacitor://localhost",
            "http://localhost",
            "https://actinovatutorapp.vercel.app"
        ];

        if (origin && allowedOrigins.includes(origin)) {
            response.headers.set("Access-Control-Allow-Origin", origin);
            response.headers.set("Access-Control-Allow-Credentials", "true");
            response.headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,PATCH");
            response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version");
        }

        // Handle preflight
        if (request.method === "OPTIONS") {
            return new NextResponse(null, {
                status: 200,
                headers: response.headers
            });
        }

        return response;
    }

    // 4. Redirection Logic for non-API routes
    if (isProtected && !token) {
        const url = request.nextUrl.clone();
        url.pathname = "/auth/login";
        return NextResponse.redirect(url);
    }

    if (isAuthPage && token) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.jpg|.*\\.png).*)",
    ],
};
