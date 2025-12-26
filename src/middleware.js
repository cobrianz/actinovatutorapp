import { NextResponse } from 'next/server';

export function middleware(request) {
    const origin = request.headers.get('origin');

    // Define allowed origins
    // Note: We use a function or regex if we want unlimited subdomains, 
    // but for this app, we have specific origins.
    const allowedOrigins = [
        'http://localhost:3000',
        'https://localhost', // Android Capacitor
        'capacitor://localhost', // iOS Capacitor
        'https://actinovatutorapp.vercel.app', // Production
    ];

    // Check if origin is allowed
    // If no origin (server-to-server or same-origin navigation), usually we allow it.
    const isAllowedOrigin = origin && allowedOrigins.includes(origin);

    // Prepare response headers
    // If allowed, reflect the origin. If not allowed, we don't set the header (blocking it).
    // If no origin, we don't set Access-Control-Allow-Origin usually, but we can set it to '*' if credentials false.
    // With credentials true, we MUST return specific origin.

    const headers = new Headers();

    if (isAllowedOrigin) {
        headers.set('Access-Control-Allow-Origin', origin);
    } else if (!origin) {
        // Optional: Allow non-CORS requests (like server side fetches) pass through without headers
        // Or set to *? No, credentials require explicit origin.
    }

    headers.set('Access-Control-Allow-Credentials', 'true');
    headers.set('Access-Control-Allow-Methods', 'GET,DELETE,PATCH,POST,PUT,OPTIONS');
    headers.set(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
    );

    // Handle Preflight OPTIONS requests directly
    if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
            status: 200,
            headers: headers,
        });
    }

    // Continue with the request, appending headers to the response
    const response = NextResponse.next();

    // Append CORS headers to the response
    headers.forEach((value, key) => {
        response.headers.set(key, value);
    });

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
