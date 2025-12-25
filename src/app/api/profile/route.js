// src/app/api/user/profile/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const FREE_LIMIT = 5;
const PREMIUM_LIMIT = 15;

async function getUserIdFromToken(request) {
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.split("Bearer ")[1].trim()
    : null;

  const { verifyToken } = await import("@/lib/auth");

  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload?.id) {
        return new ObjectId(payload.id);
      }
    } catch (error) {
      // Header token invalid, try cookie
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
          const [key, value] = cookie.split("=");
          acc[key] = value;
          return acc;
        }, {});
        token = cookies.token;
        if (token) {
          try {
            const payload = verifyToken(token);
            if (payload?.id) {
              return new ObjectId(payload.id);
            }
          } catch (cookieError) {
            // Cookie token also invalid
          }
        }
      }
    }
  } else {
    // No header, check cookie
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
        const [key, value] = cookie.split("=");
        acc[key] = value;
        return acc;
      }, {});
      token = cookies.token;
      if (token) {
        try {
          const payload = verifyToken(token);
          if (payload?.id) {
            return new ObjectId(payload.id);
          }
        } catch (error) {
          // Cookie token invalid
        }
      }
    }
  }

  return null;
}

async function getDetailedUsage(db, userId, user) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Calculate dynamic reset date based on user creation day
  const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
  const resetDay = createdAt.getDate();
  let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);

  // If the reset date for this month has already passed, set it for next month
  if (nextReset <= now) {
    nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
  }

  // Format reset date (e.g., "Jan 15th")
  const day = nextReset.getDate();
  const month = nextReset.toLocaleString('default', { month: 'short' });
  const suffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return "st";
      case 2: return "nd";
      case 3: return "rd";
      default: return "th";
    }
  };
  const resetDateFormatted = `${month} ${day}${suffix(day)}`;

  const [courseUsed, cardSetUsed, quizUsed] = await Promise.all([
    db.collection("library").countDocuments({ userId, format: "course", createdAt: { $gte: startOfMonth } }),
    db.collection("cardSets").countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
    db.collection("tests").countDocuments({ createdBy: userId, createdAt: { $gte: startOfMonth } })
  ]);

  const isPremium =
    user.isPremium === true ||
    (user.subscription?.plan === "pro" &&
      user.subscription?.status === "active");

  const isEnterprise =
    user.subscription?.plan === "enterprise" &&
    user.subscription?.status === "active";

  const limits = {
    courses: isEnterprise ? Infinity : (isPremium ? 15 : 2),
    flashcards: isEnterprise ? Infinity : (isPremium ? 20 : 2),
    quizzes: isEnterprise ? Infinity : (isPremium ? 20 : 1)
  };

  const coursePercent = Math.min(100, Math.round((courseUsed / limits.courses) * 100));
  const cardPercent = Math.min(100, Math.round((cardSetUsed / limits.flashcards) * 100));
  const quizPercent = Math.min(100, Math.round((quizUsed / limits.quizzes) * 100));

  const maxPercent = Math.max(coursePercent, cardPercent, quizPercent);

  return {
    used: courseUsed + cardSetUsed + quizUsed,
    limit: limits.courses + limits.flashcards + limits.quizzes,
    percentage: maxPercent,
    isPremium,
    resetDate: resetDateFormatted,
    details: {
      courses: { used: courseUsed, limit: limits.courses, percent: coursePercent },
      flashcards: { used: cardSetUsed, limit: limits.flashcards, percent: cardPercent },
      quizzes: { used: quizUsed, limit: limits.quizzes, percent: quizPercent }
    },
    isAtLimit: maxPercent >= 100
  };
}

export async function GET(request) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db.collection("users").findOne(
      { _id: userId, status: { $ne: "inactive" } },
      {
        projection: {
          password: 0,
          refreshTokens: 0,
          emailVerificationToken: 0,
          passwordResetCode: 0,
          "profile.bio": 0, // hide long fields if not needed
          courses: 0,
          timeCommitment: 0,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const usage = await getDetailedUsage(db, userId, user);

    return NextResponse.json({
      success: true,
      // Also expose usage at the top level for clients expecting data.usage
      usage,
      user: {
        id: user._id.toString(),
        email: user.email,
        // Prefer explicit fields if present; else derive from `name`
        firstName: user.firstName || (user.name ? user.name.split(" ")[0] : ""),
        lastName:
          user.lastName ||
          (user.name ? user.name.split(" ").slice(1).join(" ") : ""),
        name:
          user.name ||
          [user.firstName, user.lastName].filter(Boolean).join(" "),
        location: user.location,
        bio: user.profile?.bio || "",
        role: user.role || "student",
        isPremium: usage.isPremium,
        subscription: user.subscription,
        createdAt: user.createdAt,
        emailVerified: !!user.emailVerified,
        onboardingCompleted: !!user.onboardingCompleted,
        ageGroup: user.ageGroup,
        educationLevel: user.educationLevel,
        goals: user.goals || [],
        interestCategories: user.interestCategories || [],
        interests: user.interests || [],
        learningStyle: user.learningStyle,
        skillLevel: user.skillLevel,
        timeCommitment: user.timeCommitment,
        streak: user.streak || 0,
        totalLearningTime: user.totalLearningTime || 0,
        lastActive: user.lastActive,
        loginCount: user.loginCount || 0,
        settings: user.settings || {},
        billingHistory: user.billingHistory || [],
      },
    });
  } catch (error) {
    console.error("[GET /profile] Error:", error);
    return NextResponse.json(
      { error: "Failed to load profile" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let updates;
    try {
      updates = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      firstName,
      lastName,
      bio,
      location,
      avatar,
      interests,
      interestCategories,
      ageGroup,
      educationLevel,
      skillLevel,
      goals,
      learningStyle,
      timeCommitment,
      onboardingCompleted,
    } = updates;

    // For onboarding completion, we don't require firstName/lastName
    const isOnboardingUpdate = onboardingCompleted !== undefined;

    if (!isOnboardingUpdate && (!firstName?.trim() || !lastName?.trim())) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const updateFields = {
      updatedAt: new Date(),
    };

    // Handle basic profile fields
    if (firstName !== undefined) {
      updateFields.firstName = firstName.trim();
      updateFields.name = `${firstName.trim()} ${lastName?.trim() || ""}`;
    }
    if (lastName !== undefined) {
      updateFields.lastName = lastName.trim();
      if (firstName !== undefined) {
        updateFields.name = `${firstName.trim()} ${lastName.trim()}`;
      }
    }
    if (bio !== undefined) updateFields["profile.bio"] = bio?.trim() || "";
    if (location !== undefined)
      updateFields.location = location?.trim() || null;
    if (avatar !== undefined) updateFields.avatar = avatar || null;

    // Handle onboarding fields
    if (interests !== undefined) updateFields.interests = interests;
    if (interestCategories !== undefined)
      updateFields.interestCategories = interestCategories;
    if (ageGroup !== undefined) updateFields.ageGroup = ageGroup;
    if (educationLevel !== undefined)
      updateFields.educationLevel = educationLevel;
    if (skillLevel !== undefined) updateFields.skillLevel = skillLevel;
    if (goals !== undefined) updateFields.goals = goals;
    if (learningStyle !== undefined) updateFields.learningStyle = learningStyle;
    if (timeCommitment !== undefined)
      updateFields.timeCommitment = timeCommitment;
    if (onboardingCompleted !== undefined)
      updateFields.onboardingCompleted = onboardingCompleted;

    const { db } = await connectToDatabase();

    const result = await db
      .collection("users")
      .updateOne({ _id: userId }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await db
      .collection("users")
      .findOne(
        { _id: userId },
        { projection: { password: 0, refreshTokens: 0 } }
      );

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        location: updatedUser.location,
        bio: updatedUser.profile?.bio || "",
        interests: updatedUser.interests,
        interestCategories: updatedUser.interestCategories,
        ageGroup: updatedUser.ageGroup,
        educationLevel: updatedUser.educationLevel,
        skillLevel: updatedUser.skillLevel,
        goals: updatedUser.goals,
        learningStyle: updatedUser.learningStyle,
        timeCommitment: updatedUser.timeCommitment,
        onboardingCompleted: updatedUser.onboardingCompleted || false,
        subscription: updatedUser.subscription,
        usage: await getDetailedUsage(db, userId, updatedUser),
      },
    });
  } catch (error) {
    console.error("[PUT /profile] Error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();

    // Soft delete
    const result = await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          status: "inactive",
          email: `deleted_${userId}_${Date.now()}@deleted.local`,
          deletedAt: new Date(),
        },
        $unset: {
          avatar: "",
          refreshTokens: "",
          subscription: "",
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Account deactivated successfully. We're sad to see you go.",
    });
  } catch (error) {
    console.error("[DELETE /profile] Error:", error);
    return NextResponse.json(
      { error: "Failed to deactivate account" },
      { status: 500 }
    );
  }
}
