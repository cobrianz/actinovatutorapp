// src/app/api/protected/route.js

import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "No token provided" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1].trim();

    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Verify JWT using your existing auth logic
    let payload;
    try {
      const { verifyToken } = await import("@/lib/auth");
      payload = verifyToken(token);

      if (!payload?.id) throw new Error("Invalid payload");
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    // Optional: Re-validate user still exists & is active
    // (Recommended for high-security routes)
    try {
      const { connectToDatabase } = await import("@/lib/mongodb");
      const { db } = await connectToDatabase();
      const user = await db.collection("users").findOne(
        {
          _id: new ObjectId(payload.id),
          status: "active",
        },
        {
          projection: {
            _id: 1,
            email: 1,
            name: 1,
            role: 1,
            isPremium: 1,
            avatar: 1,
          },
        }
      );

      if (!user) {
        return NextResponse.json(
          { error: "Account not found or deactivated" },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          message: "Protected route accessed successfully",
          user: {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role || "student",
            isPremium: !!user.isPremium,
            avatar: user.avatar,
          },
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    } catch (dbError) {
      console.error("[protected] DB error:", dbError);
      return NextResponse.json(
        { error: "Service unavailable" },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("[protected] Unexpected error:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}

// Also allow POST if needed (same protection)
export const POST = GET;
