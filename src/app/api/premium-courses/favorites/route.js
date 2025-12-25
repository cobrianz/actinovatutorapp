// src/app/api/favorites/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

async function getUserId(request) {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  try {
    const token = auth.slice(7);
    const { verifyToken } = await import("@/lib/auth");
    const decoded = verifyToken(token);
    return decoded?.id ? new ObjectId(decoded.id) : null;
  } catch {
    return null;
  }
}

// GET: Get all favorited item IDs
export async function GET(request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ favorites: [] });

  try {
    const { db } = await connectToDatabase();
    const favorites = await db
      .collection("user_favorites")
      .find({ userId })
      .toArray();

    return NextResponse.json({
      favorites: favorites.map((f) => f.itemId),
      count: favorites.length,
    });
  } catch (error) {
    console.error("GET /api/favorites error:", error);
    return NextResponse.json({ favorites: [], count: 0 });
  }
}

// POST: Toggle favorite (course/guide/cards only)
export async function POST(request) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let itemId;
  try {
    const body = await request.json();
    itemId = body.itemId?.trim();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  // Only allow: course_xxx, guide_xxx, cards_xxx
  const validPattern = /^(course|guide|cards)_[a-zA-Z0-9]+$/;
  if (!validPattern.test(itemId)) {
    return NextResponse.json(
      { error: "Invalid itemId. Must be course_xxx, guide_xxx, or cards_xxx" },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("user_favorites");
    const filter = { userId, itemId };

    const exists = await col.findOne(filter);

    if (exists) {
      await col.deleteOne(filter);
      return NextResponse.json({
        success: true,
        favorited: false,
        message: "Removed from favorites",
      });
    } else {
      await col.insertOne({
        userId,
        itemId,
        createdAt: new Date(),
      });
      return NextResponse.json({
        success: true,
        favorited: true,
        message: "Added to favorites",
      });
    }
  } catch (error) {
    console.error("POST /api/favorites error:", error);
    return NextResponse.json(
      { error: "Failed to update favorites" },
      { status: 500 }
    );
  }
}
