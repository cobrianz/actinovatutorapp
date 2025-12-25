import { NextResponse } from "next/server";

export function middleware(request) {
  const url = request.nextUrl.clone();
  const hostname = request.headers.get("host") || "";
  const token = request.cookies.get("token")?.value;

  // Check if accessing admin subdomain
  if (hostname.startsWith("admin.") || hostname === "admin.localhost:3000") {
    // Rewrite to admin route
    url.pathname = `/admin${url.pathname === "/" ? "" : url.pathname}`;
    return NextResponse.rewrite(url);
  }

  // Protected routes
  const protectedPaths = ["/dashboard", "/profile", "/settings", "/course/", "/learning", "/quiz"];
  const isProtected = protectedPaths.some(path => url.pathname.startsWith(path));
  const isAuthPage = url.pathname.startsWith("/auth") || url.pathname === "/login" || url.pathname === "/signup";

  if (isProtected && !token) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (isAuthPage && token) {
    // Optional: Redirect to dashboard if already logged in
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};

