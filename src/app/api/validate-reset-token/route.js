// src/app/api/validate-reset-token/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token")?.trim();

    // Validate token presence
    if (!token || token.length < 10) {
      return NextResponse.json(
        { error: "Invalid or missing reset token" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");

    // Find user with valid, non-expired token
    const user = await usersCol.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: "This reset link is invalid or has expired" },
        { status: 400 }
      );
    }

    // Token is valid → return minimal safe data
    return NextResponse.json(
      {
        success: true,
        message: "Reset token is valid",
        email: user.email,
        // Optional: include name for pre-filled UI
        // name: user.name?.split(" ")[0],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[validate-reset-token] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
