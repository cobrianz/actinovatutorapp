// src/app/api/user/profile/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { withCsrf } from "@/lib/withCsrf";

async function getUserId(request) {
  try {
    const { verifyToken } = await import("@/lib/auth");

    // Prefer Authorization header
    const auth = request.headers.get("authorization");
    if (auth?.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      const payload = verifyToken(token);
      return payload?.id ? new ObjectId(payload.id) : null;
    }

    // Fallback to HttpOnly cookie set by server
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get("token")?.value;
    if (tokenCookie) {
      const payload = verifyToken(tokenCookie);
      return payload?.id ? new ObjectId(payload.id) : null;
    }

    return null;
  } catch {
    return null;
  }
}

function calculateUsage(user) {
  const monthlyUsage = user.monthlyUsage || 0;
  const isPremium =
    user.isPremium ||
    (user.subscription?.plan === "pro" &&
      user.subscription?.status === "active");

  const limit = isPremium ? 15 : 2;

  return {
    used: monthlyUsage,
    limit,
    remaining: Math.max(0, limit - monthlyUsage),
    percentage: limit > 0 ? Math.round((monthlyUsage / limit) * 100) : 0,
    isNearLimit: monthlyUsage >= (isPremium ? 4 : 1),
    isAtLimit: monthlyUsage >= limit,
    isPremium,
  };
}

export async function GET(request) {
  try {
    const userId = await getUserId(request);
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
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const usage = calculateUsage(user);

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        name: user.name || `${user.firstName} ${user.lastName}`,
        avatar: user.avatar || null,
        location: user.location || null,
        bio: user.profile?.bio || "",
        role: user.role || "student",
        interests: user.interests || [],
        interestCategories: user.interestCategories || [],
        skillLevel: user.skillLevel || "beginner",
        goals: user.goals || [],
        timeCommitment: user.timeCommitment || 30,
        ageGroup: user.ageGroup,
        educationLevel: user.educationLevel,
        learningStyle: user.learningStyle,
        emailVerified: user.emailVerified || false,
        status: user.status,
        onboardingCompleted: !!user.onboardingCompleted,
        isPremium: usage.isPremium,
        createdAt: user.createdAt,
        usage,
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

async function putHandler(request) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let updates;
    try {
      updates = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { firstName, lastName, bio, location, avatar } = updates;

    if (!firstName?.trim() || !lastName?.trim()) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    const updateFields = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      updatedAt: new Date(),
    };

    if (bio !== undefined) updateFields["profile.bio"] = bio?.trim() || "";
    if (location !== undefined)
      updateFields.location = location?.trim() || null;
    if (avatar !== undefined) updateFields.avatar = avatar || null;

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
        // Extract firstName and lastName from the name field
        firstName: updatedUser.name ? updatedUser.name.split(" ")[0] : "",
        lastName: updatedUser.name
          ? updatedUser.name.split(" ").slice(1).join(" ")
          : "",
        name: updatedUser.name,
        avatar: updatedUser.avatar,
        location: updatedUser.location,
        bio: updatedUser.profile?.bio || "",
        usage: calculateUsage(updatedUser),
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

export const PUT = withCsrf(putHandler);

async function postHandler(request) {
  try {
    console.log("[POST /profile/update] Starting profile update");
    const userId = await getUserId(request);
    if (!userId) {
      console.log("[POST /profile/update] Unauthorized - no valid user ID");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("[POST /profile/update] User ID:", userId.toString());

    let updates;
    try {
      updates = await request.json();
      console.log(
        "[POST /profile/update] Received updates:");
    } catch (error) {
      console.error("[POST /profile/update] Invalid JSON:", error);
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const {
      interests,
      interestCategories,
      skillLevel,
      goals,
      timeCommitment,
      onboardingCompleted,
      generatedPremiumCourse,
      ageGroup,
      educationLevel,
      learningStyle,
    } = updates;

    const updateFields = {};
    const addToSet = {};

    if (interests !== undefined)
      updateFields.interests = Array.isArray(interests) ? interests : [];
    if (interestCategories !== undefined)
      updateFields.interestCategories = Array.isArray(interestCategories)
        ? interestCategories
        : [];
    if (skillLevel !== undefined) updateFields.skillLevel = skillLevel;
    if (goals !== undefined)
      updateFields.goals = Array.isArray(goals) ? goals : [];
    if (timeCommitment !== undefined)
      updateFields.timeCommitment = timeCommitment;
    if (onboardingCompleted !== undefined)
      updateFields.onboardingCompleted = !!onboardingCompleted;
    if (ageGroup !== undefined) updateFields.ageGroup = ageGroup;
    if (educationLevel !== undefined)
      updateFields.educationLevel = educationLevel;
    if (learningStyle !== undefined) updateFields.learningStyle = learningStyle;

    if (generatedPremiumCourse) {
      addToSet["generatedPremiumCourses"] = {
        courseId: generatedPremiumCourse.courseId,
        courseTitle: generatedPremiumCourse.courseTitle,
        generatedAt: generatedPremiumCourse.generatedAt
          ? new Date(generatedPremiumCourse.generatedAt)
          : new Date(),
      };
    }

    const operations = {};
    if (Object.keys(updateFields).length > 0) operations.$set = updateFields;
    if (Object.keys(addToSet).length > 0) operations.$addToSet = addToSet;

    if (Object.keys(operations).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    console.log(
      "[POST /profile/update] Database operations:",
      JSON.stringify(operations, null, 2)
    );

    const result = await db
      .collection("users")
      .updateOne({ _id: userId }, operations);

    console.log(
      "[POST /profile/update] Update result:",
      result.matchedCount,
      "matched,",
      result.modifiedCount,
      "modified"
    );

    if (result.matchedCount === 0) {
      console.log("[POST /profile/update] User not found");
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await db
      .collection("users")
      .findOne(
        { _id: userId },
        { projection: { password: 0, refreshTokens: 0 } }
      );

    console.log("[POST /profile/update] Profile updated successfully");

    // If onboardingCompleted changed, update a readable cookie for middleware
    try {
      const cookieStore = await cookies();
      const isProd = process.env.NODE_ENV === "production";
      const cookieConfig = {
        httpOnly: false,
        secure: isProd,
        sameSite: isProd ? "strict" : "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      };
      cookieStore.set(
        "onboardingCompleted",
        updatedUser.onboardingCompleted ? "true" : "false",
        cookieConfig
      );
    } catch (cookieErr) {
      console.warn(
        "[POST /profile/update] Failed to set onboarding cookie:",
        cookieErr
      );
    }

    // User data is fetched from /api/me - no need for user cookie

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id.toString(),
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        name: updatedUser.name,
        interests: updatedUser.interests || [],
        interestCategories: updatedUser.interestCategories || [],
        skillLevel: updatedUser.skillLevel,
        goals: updatedUser.goals || [],
        timeCommitment: updatedUser.timeCommitment,
        ageGroup: updatedUser.ageGroup,
        educationLevel: updatedUser.educationLevel,
        learningStyle: updatedUser.learningStyle,
        onboardingCompleted: !!updatedUser.onboardingCompleted,
        emailVerified: !!updatedUser.emailVerified,
        status: updatedUser.status,
        usage: calculateUsage(updatedUser),
      },
    });
  } catch (error) {
    console.error("[POST /profile/update] Error:", error);
    console.error("[POST /profile/update] Error stack:", error.stack);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

export const POST = withCsrf(postHandler);
