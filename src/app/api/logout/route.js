// src/app/api/logout/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  let userId = null;

  // Try to extract user ID from refresh token (even if expired)
  if (refreshToken) {
    try {
      const { verifyToken } = await import("@/lib/auth");
      const decoded = verifyToken(refreshToken, { ignoreExpiration: true });
      userId = decoded?.id || null;
    } catch (e) {
      // Token invalid or tampered — still proceed with logout
      console.warn("Invalid refresh token during logout");
    }
  }

  // === 1. Invalidate all refresh tokens for this user (nuclear option) ===
  if (userId) {
    try {
      const { db } = await connectToDatabase();
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        {
          $set: {
            refreshTokens: [], // or remove field entirely
            lastLogout: new Date(),
          },
        }
      );
    } catch (error) {
      console.error("Failed to clear refresh tokens on logout:", error);
      // Don't fail logout — security > availability here
    }
  }

  // === 2. Clear all auth cookies (client-side) ===
  const secure = process.env.NODE_ENV === "production";

  cookieStore.delete("token", {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: secure ? "strict" : "lax",
  });

  cookieStore.delete("refreshToken", {
    path: "/",
    httpOnly: true,
    secure,
    sameSite: secure ? "strict" : "lax",
  });

  // Optional: clear any UI/session cookies
  cookieStore.delete("session", { path: "/" });

  // Clear CSRF token
  cookieStore.delete("csrfToken", {
    path: "/",
    httpOnly: false,
    secure,
    sameSite: secure ? "strict" : "lax",
  });

  // Clear middleware helper cookies
  cookieStore.delete("emailVerified", {
    path: "/",
    httpOnly: false,
    secure,
    sameSite: secure ? "strict" : "lax",
  });
  cookieStore.delete("onboardingCompleted", {
    path: "/",
    httpOnly: false,
    secure,
    sameSite: secure ? "strict" : "lax",
  });

  // === 3. Return success ===
  return NextResponse.json({
    success: true,
    message: "Logged out successfully",
    timestamp: new Date().toISOString(),
  });
}
