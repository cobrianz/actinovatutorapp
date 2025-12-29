// src/app/api/verify-email/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { generateTokenPair } from "@/lib/auth";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";
import { withCORS } from "@/lib/middleware";

const RATE_LIMIT = { max: 10, windowMs: 15 * 60 * 1000 };
const attempts = new Map();

async function verifyEmailHandler(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();

  // Rate limiting
  const record = attempts.get(ip) || { count: 0, resetAt: now };

  if (now - record.resetAt > RATE_LIMIT.windowMs) {
    record.count = 0;
    record.resetAt = now;
  }

  if (record.count >= RATE_LIMIT.max) {
    return NextResponse.json(
      { error: "Too many attempts. Try again later." },
      { status: 429 }
    );
  }

  const registerFailure = () => {
    record.count += 1;
    attempts.set(ip, record);
  };

  let token, code;

  try {
    const body = await request.json();
    token = body.token?.trim();
    code = body.code?.trim();
  } catch {
    registerFailure();
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!token && !code) {
    registerFailure();
    return NextResponse.json(
      { error: "Verification token or code is required" },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");

    // Find user with matching token or code
    let user;
    if (token) {
      user = await usersCol.findOne({
        emailVerificationToken: token,
        emailVerificationExpires: { $gt: new Date() },
      });
    } else if (code) {
      user = await usersCol.findOne({
        emailVerificationCode: code,
        emailVerificationExpires: { $gt: new Date() },
      });
    }

    if (!user) {
      registerFailure();
      return NextResponse.json(
        { error: "Invalid or expired verification token/code" },
        { status: 400 }
      );
    }

    // Verify email
    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          status: "active",
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationCode: null,
          emailVerificationExpires: null,
          lastLogin: new Date(),
          lastActive: new Date(),
        },
        $inc: { loginCount: 1 },
      }
    );

    // Successful verification, reset failures for this IP
    record.count = 0;
    record.resetAt = now;
    attempts.set(ip, record);

    // Generate JWT tokens
    const { accessToken, refreshToken } = generateTokenPair({
      id: user._id.toString(),
      email: user.email,
    });

    // Set secure cookies
    const isProd = process.env.NODE_ENV === "production";
    const cookieConfig = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
    };

    const cookieStore = await cookies();

    cookieStore.set("token", accessToken, {
      ...cookieConfig,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    cookieStore.set("refreshToken", refreshToken, {
      ...cookieConfig,
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // Generate and set CSRF token (non-HttpOnly so JavaScript can read it)
    const csrfToken = generateCsrfToken();
    setCsrfCookie(cookieStore, csrfToken, isProd);

    // Convenience flags for middleware routing
    cookieStore.set("emailVerified", "true", {
      ...cookieConfig,
      httpOnly: false,
      maxAge: 30 * 24 * 60 * 60,
    });
    cookieStore.set(
      "onboardingCompleted",
      user.onboardingCompleted ? "true" : "false",
      {
        ...cookieConfig,
        httpOnly: false,
        maxAge: 30 * 24 * 60 * 60,
      }
    );

    const isPremium =
      user.isPremium ||
      (user.subscription?.plan === "pro" &&
        user.subscription?.status === "active");

    const limit = isPremium ? 15 : 2;
    const used = user.monthlyUsage || 0;

    const usage = {
      used,
      limit,
      remaining: Math.max(0, limit - used),
      percentage: limit > 0 ? Math.round((used / limit) * 100) : 0,
      isPremium,
    };

    // Update HttpOnly user cookie so client state syncs via server
    try {
      const userCookie = {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar || null,
        emailVerified: true,
        status: "active",
        onboardingCompleted: !!user.onboardingCompleted,
        isPremium,
      };

      cookieStore.set("user", JSON.stringify(userCookie), {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });
    } catch (err) {
      console.warn("Failed to set user cookie after verification:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Email verified! Your learning journey has begun.",
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        isPremium,
        streak: user.streak || 0,
        totalLearningTime: user.totalLearningTime || 0,
        emailVerified: true,
        status: "active",
        onboardingCompleted: user.onboardingCompleted || false,
        usage,
      },
    });
  } catch (error) {
    console.error("Email verification failed:", error);
    return NextResponse.json(
      {
        error: "Verification failed. Please try again or request a new verification code.",
      },
      { status: 500 }
    );
  }
}

export const POST = withCORS()(verifyEmailHandler);

export const OPTIONS = withCORS()(async () => {
  return new NextResponse(null, { status: 200 });
});
