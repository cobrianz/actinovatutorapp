// src/app/api/me/route.js

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET() {
  let token = null;
  const authHeader = (await headers()).get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.slice(7);
  } else {
    token = (await cookies()).get("token")?.value;
  }

  if (!token) {
    return NextResponse.json({ user: null });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return NextResponse.json({ user: null });
  }

  if (!decoded?.id) {
    return NextResponse.json({ user: null });
  }

  try {
    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(decoded.id) },
      {
        projection: {
          password: 0,
          refreshTokens: 0,
          "profile.bio": 0,
          courses: 0,
          timeCommitment: 0,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ user: null });
    }

    if (user.status !== "active") {
      return NextResponse.json({ user: null });
    }

    // Auto-reset monthly usage if new month
    const now = new Date();
    const lastReset = user.usageResetDate
      ? new Date(user.usageResetDate)
      : null;
    const isNewMonth =
      !lastReset ||
      lastReset.getMonth() !== now.getMonth() ||
      lastReset.getFullYear() !== now.getFullYear();

    let monthlyUsage = user.monthlyUsage || 0;
    if (isNewMonth) {
      monthlyUsage = 0;
      await db.collection("users").updateOne(
        { _id: user._id },
        {
          $set: {
            monthlyUsage: 0,
            usageResetDate: new Date(now.getFullYear(), now.getMonth() + 1, 1),
          },
        }
      );
    }

    const isPremium =
      user.isPremium ||
      (user.subscription?.plan === "pro" &&
        user.subscription?.status === "active");

    const usage = {
      used: monthlyUsage,
      limit: isPremium ? 15 : 5,
      remaining: Math.max(0, (isPremium ? 15 : 5) - monthlyUsage),
      percentage: Math.round((monthlyUsage / (isPremium ? 15 : 5)) * 100),
      isPremium,
      resetsOn: new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        1
      ).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    };

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
      isPremium,
      subscription: user.subscription,
      usage,
    };

    return NextResponse.json({ user: safeUser });
  } catch (error) {
    console.error("/api/me error:", error);
    return NextResponse.json({ user: null });
  }
}
