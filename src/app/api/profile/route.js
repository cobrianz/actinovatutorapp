// src/app/api/profile/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { getAuthenticatedUser, getDetailedUsage } from "@/lib/userUtils";

export async function GET(request) {
  try {
    const { db } = await connectToDatabase();

    const authData = await getAuthenticatedUser(request, db, {
      password: 0,
      refreshTokens: 0,
      emailVerificationToken: 0,
      passwordResetCode: 0,
      "profile.bio": 0,
      courses: 0,
      timeCommitment: 0,
    });

    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { user, usage, userId } = authData;

    return NextResponse.json({
      success: true,
      usage,
      user: {
        id: userId.toString(),
        email: user.email,
        firstName: user.firstName || (user.name ? user.name.split(" ")[0] : ""),
        lastName: user.lastName || (user.name ? user.name.split(" ").slice(1).join(" ") : ""),
        name: user.name || [user.firstName, user.lastName].filter(Boolean).join(" "),
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
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { db } = await connectToDatabase();
    const authData = await getAuthenticatedUser(request, db);

    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = authData;
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

    const isOnboardingUpdate = onboardingCompleted !== undefined;
    if (!isOnboardingUpdate && (!firstName?.trim() || !lastName?.trim())) {
      return NextResponse.json({ error: "First name and last name are required" }, { status: 400 });
    }

    const updateFields = { updatedAt: new Date() };

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
    if (location !== undefined) updateFields.location = location?.trim() || null;
    if (avatar !== undefined) updateFields.avatar = avatar || null;

    if (interests !== undefined) updateFields.interests = interests;
    if (interestCategories !== undefined) updateFields.interestCategories = interestCategories;
    if (ageGroup !== undefined) updateFields.ageGroup = ageGroup;
    if (educationLevel !== undefined) updateFields.educationLevel = educationLevel;
    if (skillLevel !== undefined) updateFields.skillLevel = skillLevel;
    if (goals !== undefined) updateFields.goals = goals;
    if (learningStyle !== undefined) updateFields.learningStyle = learningStyle;
    if (timeCommitment !== undefined) updateFields.timeCommitment = timeCommitment;
    if (onboardingCompleted !== undefined) updateFields.onboardingCompleted = onboardingCompleted;

    const result = await db.collection("users").updateOne({ _id: userId }, { $set: updateFields });

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const updatedUser = await db.collection("users").findOne({ _id: userId });

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
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { db } = await connectToDatabase();
    const authData = await getAuthenticatedUser(request, db);

    if (!authData) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = authData;

    const result = await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          status: "inactive",
          email: `deleted_${userId}_${Date.now()}@deleted.local`,
          deletedAt: new Date(),
        },
        $unset: { avatar: "", refreshTokens: "", subscription: "" },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Account deactivated successfully.",
    });
  } catch (error) {
    console.error("[DELETE /profile] Error:", error);
    return NextResponse.json({ error: "Failed to deactivate account" }, { status: 500 });
  }
}
