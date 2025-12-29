// src/app/api/me/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { withCORS } from "@/lib/middleware";
import { getAuthenticatedUser } from "@/lib/userUtils";

async function meHandler(request) {
  try {
    const { db } = await connectToDatabase();

    const authData = await getAuthenticatedUser(request, db, {
      password: 0,
      refreshTokens: 0,
      "profile.bio": 0,
      courses: 0,
      timeCommitment: 0,
    });

    if (!authData) {
      return NextResponse.json({ user: null });
    }

    const { user, usage } = authData;

    // Standardized safe user object
    const safeUser = {
      id: user._id.toString(),
      name: user.name || user.email.split("@")[0],
      email: user.email,
      avatar: user.avatar || null,
      streak: user.streak || 0,
      totalLearningTime: user.totalLearningTime || 0,
      achievements: user.achievements || [],
      emailVerified: user.emailVerified || false,
      status: user.status,
      onboardingCompleted: user.onboardingCompleted || false,
      isPremium: usage.isPremium,
      subscription: user.subscription,
      usage,
    };

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("/api/me error:", error);
    return NextResponse.json({ user: null });
  }
}

export const GET = withCORS()(meHandler);

// Handle OPTIONS for preflight
export const OPTIONS = withCORS()(async () => {
  return new NextResponse(null, { status: 200 });
});
