// src/app/lib/middleware.js

import { NextResponse } from "next/server";
import { verifyToken } from "./auth";
import { findUserById } from "./db";
import { connectToDatabase } from "./mongodb";
import { ObjectId } from "mongodb";
import { cookies as nextCookies, headers as nextHeaders } from "next/headers";

// Authentication middleware
export function withAuth(handler, options = {}) {
  return async (req, context) => {
    try {
      // Helper: safe, non-PII debug for auth failures on specific endpoints
      const safeAuthDebug = async (req, reason) => {
        try {
          const url = req.url || (req.headers && req.headers.get && req.headers.get("x-original-url")) || "unknown";
          // Only log for targeted endpoints to reduce noise
          if (!url.includes("/api/course-progress") && !url.includes("/api/library")) return;

          // Sanitize headers: only indicate presence of sensitive headers
          const headers = {};
          for (const [k, v] of req.headers.entries ? req.headers.entries() : []) {
            const key = k.toLowerCase();
            if (["authorization", "cookie", "set-cookie"].includes(key)) {
              headers[key] = v ? "[REDACTED_PRESENT]" : "[MISSING]";
            } else {
              headers[key] = typeof v === "string" ? (v.length > 100 ? v.slice(0, 100) + "..." : v) : typeof v;
            }
          }

          // Attempt to read body keys only (don't log values)
          let bodyInfo = null;
          try {
            const clone = await req.clone().json?.();
            if (clone && typeof clone === "object") {
              bodyInfo = Object.keys(clone).reduce((acc, k) => {
                acc[k] = typeof clone[k];
                return acc;
              }, {});
            }
          } catch (e) {
            // ignore body read errors
          }

          console.warn("Auth failure debug:", { url, reason, headers, bodyKeys: bodyInfo });
        } catch (e) {
          // ignore debug errors
        }
      };

      // Try several ways to extract the access token depending on runtime
      let token = null;

      // 1. If Request has a cookies API (Edge-like), use it
      token = req.cookies?.get?.("token")?.value || null;

      // 2. If not present, try Next.js server helpers
      if (!token) {
        try {
          token = nextCookies().get("token")?.value || null;
        } catch (e) {
          // ignore
        }
      }

      // 3. Fallback to Authorization header from either req or next/headers
      if (!token) {
        token = req.headers?.get("authorization")?.replace("Bearer ", "") ||
          nextHeaders()?.get("authorization")?.replace?.("Bearer ", "") || null;
      }

      if (!token) {
        await safeAuthDebug(req, "no-token");
        return NextResponse.json({ error: "Authentication required" }, { status: 401 });
      }

      // Verify token
      let decoded;
      try {
        decoded = verifyToken(token);
      } catch (err) {
        await safeAuthDebug(req, "invalid-token");
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }

      // Get user from database (Mongoose first)
      let user = await findUserById(decoded.id);
      if (!user) {
        // Try native DB lookup when Mongoose returns nothing
        try {
          const { db } = await connectToDatabase();
          const native = await db
            .collection("users")
            .findOne({ _id: new ObjectId(decoded.id) });
          if (native) user = native;
        } catch (e) {
          // ignore
        }
      }
      if (!user) {
        await safeAuthDebug(req, "user-not-found-after-lookup");
        return NextResponse.json({ error: "User not found" }, { status: 401 });
      }

      // Check if user is active
      if (user.status !== "active") {
        return NextResponse.json(
          { error: "Account is not active" },
          { status: 403 }
        );
      }

      // Check if account is locked
      if (user.isLocked) {
        return NextResponse.json(
          { error: "Account is temporarily locked" },
          { status: 423 }
        );
      }

      // Add user to request context
      req.user = user;

      // Check role-based access
      if (options.roles && !options.roles.includes(user.role)) {
        return NextResponse.json(
          { error: "Insufficient permissions" },
          { status: 403 }
        );
      }

      return handler(req, context);
    } catch (error) {
      console.error("Auth middleware error:", error);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
  };
}

// Rate limiting middleware
const rateLimitMap = new Map();

export function withRateLimit(options = {}) {
  const maxRequests = options.max || 100;
  const windowMs = options.windowMs || 15 * 60 * 1000; // 15 minutes

  return (handler) => {
    return async (req, context) => {
      const ip =
        req.headers?.get("x-forwarded-for") ||
        req.headers?.get("x-real-ip") ||
        "unknown";

      const now = Date.now();
      const windowStart = now - windowMs;

      // Clean up old entries
      for (const [key, data] of rateLimitMap.entries()) {
        if (data.timestamp < windowStart) {
          rateLimitMap.delete(key);
        }
      }

      // Check current rate
      const current = rateLimitMap.get(ip) || { count: 0, timestamp: now };

      if (current.timestamp < windowStart) {
        current.count = 0;
        current.timestamp = now;
      }

      if (current.count >= maxRequests) {
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After": Math.ceil(windowMs / 1000),
            },
          }
        );
      }

      current.count++;
      rateLimitMap.set(ip, current);

      return handler(req, context);
    };
  };
}

// CORS middleware
// DEPRECATED logic: Global CORS is now handled by src/middleware.js
// This wrapper is kept for backward compatibility with existing route imports but acts as a pass-through.
export function withCORS(options = {}) {
  return (handler) => {
    return async (req, context) => {
      // Pass directly to handler. 
      // OPTIONS requests are intercepted by src/middleware.js so this handler's code for OPTIONS won't run, which is fine.
      // GET/POST/etc requests will flow through, and src/middleware.js appends headers.
      return handler(req, context);
    };
  };
}

// Validation middleware
export function withValidation(schema) {
  return (handler) => {
    return async (req, context) => {
      try {
        const body = await req.json();
        const validatedData = schema.parse(body);
        req.validatedData = validatedData;
        return handler(req, context);
      } catch (error) {
        return NextResponse.json(
          {
            error: "Validation failed",
            details: error.errors || error.message,
          },
          { status: 400 }
        );
      }
    };
  };
}

// Error handling middleware
export function withErrorHandling(handler) {
  return async (req, context) => {
    try {
      return await handler(req, context);
    } catch (error) {
      console.error("API Error:", error);

      // Don't expose internal errors in production
      const isDevelopment = process.env.NODE_ENV === "development";

      return NextResponse.json(
        {
          error: "Internal server error",
          message: isDevelopment ? error.message : "Something went wrong",
          ...(isDevelopment && { stack: error.stack }),
        },
        { status: 500 }
      );
    }
  };
}

// Combine multiple middleware
export function combineMiddleware(...middlewares) {
  return middlewares.reduce((acc, middleware) => {
    return middleware(acc);
  });
}
