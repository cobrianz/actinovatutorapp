// src/app/api/refresh/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { generateCsrfToken, setCsrfCookie } from "@/lib/csrf";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  // 1. No refresh token = goodbye
  if (!refreshToken) {
    cookieStore.delete("refreshToken");
    cookieStore.delete("token");
    return NextResponse.json({ error: "No refresh token" }, { status: 401 });
  }

  let decoded;
  try {
    const { verifyRefreshToken } = await import("@/lib/auth");
    decoded = verifyRefreshToken(refreshToken);
    if (!decoded?.id || !decoded?.jti) throw new Error("Invalid token");
  } catch (err) {
    cookieStore.delete("refreshToken");
    cookieStore.delete("token");
    return NextResponse.json(
      { error: "Invalid refresh token" },
      { status: 401 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");
    const tokensCol = db.collection("refreshTokens"); // ← Your token blacklist/allowlist

    // 2. Verify token is still valid in DB (rotation + revocation support)
    const validToken = await tokensCol.findOne({
      token: refreshToken,
      userId: new ObjectId(decoded.id),
      jti: decoded.jti,
      revoked: { $ne: true },
      expiresAt: { $gt: new Date() },
    });

    if (!validToken) {
      // Token was rotated or revoked → kill all sessions
      await tokensCol.updateMany(
        { userId: new ObjectId(decoded.id) },
        { $set: { revoked: true, revokedAt: new Date() } }
      );
      cookieStore.delete("refreshToken");
      cookieStore.delete("token");
      return NextResponse.json(
        { error: "Session expired. Please log in again." },
        { status: 401 }
      );
    }

    // 3. Get fresh user data
    const user = await usersCol.findOne(
      { _id: new ObjectId(decoded.id) },
      {
        projection: {
          password: 0,
          emailVerificationToken: 0,
          passwordResetCode: 0,
        },
      }
    );

    if (!user || user.status !== "active") {
      await tokensCol.updateMany(
        { userId: new ObjectId(decoded.id) },
        { $set: { revoked: true } }
      );
      cookieStore.delete("refreshToken");
      cookieStore.delete("token");
      return NextResponse.json({ error: "Account suspended" }, { status: 403 });
    }

    // 4. Token rotation: invalidate old, generate new pair
    const { generateTokenPair } = await import("@/lib/auth");
    const {
      accessToken,
      refreshToken: newRefreshToken,
      jti: newJti,
    } = generateTokenPair(user);

    // Revoke old token
    await tokensCol.updateOne(
      { _id: validToken._id },
      {
        $set: {
          revoked: true,
          revokedAt: new Date(),
          replacedBy: newJti,
        },
      }
    );

    // Store new refresh token
    await tokensCol.insertOne({
      token: newRefreshToken,
      jti: newJti,
      userId: user._id,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      revoked: false,
    });

    // 5. Set new secure cookies
    const isProd = process.env.NODE_ENV === "production";
    const cookieOptions = {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? "strict" : "lax",
      path: "/",
    };

    cookieStore.set("token", accessToken, {
      ...cookieOptions,
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    cookieStore.set("refreshToken", newRefreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60, // 30 days (in seconds, not milliseconds)
    });

    // Rotate CSRF token on refresh for added security
    const csrfToken = generateCsrfToken();
    setCsrfCookie(cookieStore, csrfToken, isProd);

    // 6. Usage calculation
    const isPremium =
      user.isPremium ||
      (user.subscription?.plan === "pro" &&
        user.subscription?.status === "active");

    const usage = {
      used: user.monthlyUsage || 0,
      limit: isPremium ? 15 : 2,
      remaining: Math.max(0, (isPremium ? 15 : 2) - (user.monthlyUsage || 0)),
      percentage: Math.min(
        100,
        Math.round(((user.monthlyUsage || 0) / (isPremium ? 15 : 2)) * 100)
      ),
      isPremium,
    };

    // 7. Final response
    return NextResponse.json({
      success: true,
      message: "Session refreshed",
      user: {
        id: user._id.toString(),
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        isPremium,
        usage,
      },
    });
  } catch (error) {
    console.error("[refresh] Error:", error);
    cookieStore.delete("refreshToken");
    cookieStore.delete("token");
    return NextResponse.json({ error: "Session expired" }, { status: 401 });
  }
}
