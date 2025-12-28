// src/app/api/login/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyPassword, generateTokenPair, sanitizeUser } from "@/lib/auth";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";
import { withCORS } from "@/lib/middleware";

const RATE_LIMIT = { max: 8, windowMs: 15 * 60 * 1000 }; // 8 attempts per 15 min
const loginAttempts = new Map(); // In-memory rate limiting (or use Redis in prod)

async function loginHandler(request) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const now = Date.now();

  // Rate limiting per IP
  const attempts = loginAttempts.get(ip) || { count: 0, resetAt: now };
  if (now - attempts.resetAt > RATE_LIMIT.windowMs) {
    attempts.count = 0;
    attempts.resetAt = now;
  }
  if (attempts.count >= RATE_LIMIT.max) {
    return NextResponse.json(
      { error: "Too many login attempts. Try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    let { email, password, rememberMe = false } = body;

    // Sanitize inputs
    email = email?.toLowerCase().trim();
    password = password?.trim();

    if (!email || !password) {
      attempts.count++;
      loginAttempts.set(ip, attempts);
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      attempts.count++;
      loginAttempts.set(ip, attempts);
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 1 || password.length > 500) {
      attempts.count++;
      loginAttempts.set(ip, attempts);
      return NextResponse.json(
        { error: "Invalid password" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");

    // Find user
    const user = await usersCol.findOne({ email });
    if (!user) {
      attempts.count++;
      loginAttempts.set(ip, attempts);
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Account verification check
    if (user.status !== "active" || !user.emailVerified) {
      return NextResponse.json(
        {
          error: "Please verify your email first",
          requiresVerification: true,
          email: user.email,
        },
        { status: 403 }
      );
    }

    // Check if account is locked
    if (user.isLocked && user.lockedUntil && user.lockedUntil > new Date()) {
      return NextResponse.json(
        {
          error:
            "Account is temporarily locked due to too many failed login attempts. Try again later.",
        },
        { status: 423 }
      );
    }

    // Password check
    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      attempts.count++;
      loginAttempts.set(ip, attempts);

      // Lock account after 5 failed attempts
      if (attempts.count >= 5) {
        await usersCol.updateOne(
          { _id: user._id },
          {
            $set: {
              isLocked: true,
              lockedUntil: new Date(Date.now() + 30 * 60 * 1000),
            },
          }
        );
      }

      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Reset rate limit & lock on success
    loginAttempts.delete(ip);
    if (user.isLocked) {
      await usersCol.updateOne(
        { _id: user._id },
        { $set: { isLocked: false, lockedUntil: null } }
      );
    }

    // Generate tokens
    const { accessToken, refreshToken, jti } = generateTokenPair(
      { id: user._id.toString(), email: user.email },
      { expiresIn: rememberMe ? "30d" : "7d" }
    );

    // Store refresh token in database
    const refreshTokensCol = db.collection("refreshTokens");
    await refreshTokensCol.insertOne({
      token: refreshToken,
      jti: jti,
      userId: user._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      revoked: false,
    });

    // Update last login
    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          lastLogin: new Date(),
          lastActive: new Date(),
        },
        $inc: { loginCount: 1 },
      }
    );

    // Set secure cookies
    const cookieStore = await cookies();
    const isProd = process.env.NODE_ENV === "production";

    const cookieConfig = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
    };

    cookieStore.set("token", accessToken, {
      ...cookieConfig,
      maxAge: rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60,
    });

    cookieStore.set("refreshToken", refreshToken, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60, // Always 30 days
    });

    // Generate and set CSRF token (non-HttpOnly so JavaScript can read it)
    const csrfToken = generateCsrfToken();
    setCsrfCookie(cookieStore, csrfToken, isProd);

    // Convenience flags for middleware routing (non-HttpOnly for client-side checks)
    cookieStore.set("emailVerified", user.emailVerified ? "true" : "false", {
      httpOnly: false,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60,
    });
    cookieStore.set(
      "onboardingCompleted",
      user.onboardingCompleted ? "true" : "false",
      {
        httpOnly: false,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      }
    );

    // Calculate monthly usage
    const nowDate = new Date();
    const lastReset = user.usageResetDate
      ? new Date(user.usageResetDate)
      : null;
    const isNewMonth =
      !lastReset ||
      lastReset.getMonth() !== nowDate.getMonth() ||
      lastReset.getFullYear() !== nowDate.getFullYear();

    let monthlyUsage = user.monthlyUsage || 0;
    if (isNewMonth) {
      monthlyUsage = 0;
      await usersCol.updateOne(
        { _id: user._id },
        {
          $set: {
            monthlyUsage: 0,
            usageResetDate: new Date(
              nowDate.getFullYear(),
              nowDate.getMonth() + 1,
              1
            ),
          },
        }
      );
    }

    const isPremium =
      user.isPremium ||
      (user.subscription?.plan === "pro" &&
        user.subscription?.status === "active");

    const usageData = {
      used: monthlyUsage,
      limit: isPremium ? 15 : 2,
      remaining: Math.max(0, (isPremium ? 15 : 2) - monthlyUsage),
      percentage: Math.round((monthlyUsage / (isPremium ? 15 : 2)) * 100),
      isPremium,
    };

    // Final user data (safe)
    const safeUser = sanitizeUser({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      isPremium,
      streak: user.streak || 0,
      totalLearningTime: user.totalLearningTime || 0,
      achievements: user.achievements || [],
      emailVerified: user.emailVerified || false,
      status: user.status,
      onboardingCompleted: user.onboardingCompleted || false,
    });

    // User data is fetched from /api/me endpoint - no need for user cookie
    // This prevents PII exposure in cookies

    return NextResponse.json({
      success: true,
      message: "Welcome back!",
      token: accessToken, // Include token for mobile app
      user: {
        ...safeUser,
        usage: usageData,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Authentication failed. Please try again later." },
      { status: 500 }
    );
  }
}

export const POST = withCORS()(loginHandler);

// Handle OPTIONS for preflight
export const OPTIONS = withCORS()(async () => {
  return new NextResponse(null, { status: 200 });
});
