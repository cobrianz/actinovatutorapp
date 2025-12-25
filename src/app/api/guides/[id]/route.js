// src/app/api/guides/[id]/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyToken } from "@/lib/auth";

async function getUserId(request) {
  const auth = request.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = verifyToken(token);
    return decoded.id;
  } catch {
    return null;
  }
}

// ─── UPDATE GUIDE (PUT) ───
export async function PUT(request, { params }) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid guide ID" }, { status: 400 });
  }

  try {
    const updates = await request.json();

    // Allowed fields to update
    const allowedUpdates = {
      bookmarked: updates.bookmarked,
      progress: updates.progress,
      pinned: updates.pinned,
      lastAccessed: new Date(),
    };

    // Remove undefined fields
    Object.keys(allowedUpdates).forEach(
      (key) => allowedUpdates[key] === undefined && delete allowedUpdates[key]
    );

    if (Object.keys(allowedUpdates).length === 0) {
      return NextResponse.json(
        { error: "No valid updates provided" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const result = await db.collection("guides").findOneAndUpdate(
      {
        _id: new ObjectId(id),
        userId: new ObjectId(userId),
      },
      { $set: allowedUpdates },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return NextResponse.json(
        { error: "Guide not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      guide: result.value,
      message: "Guide updated successfully",
    });
  } catch (error) {
    console.error("PUT /guides/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update guide" },
      { status: 500 }
    );
  }
}

// ─── DELETE GUIDE (DELETE) ───
export async function DELETE(request, { params }) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { id } = params;
  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid guide ID" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection("guides").deleteOne({
      _id: new ObjectId(id),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Guide not found or you don't have permission" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Guide deleted permanently",
    });
  } catch (error) {
    console.error("DELETE /guides/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete guide" },
      { status: 500 }
    );
  }
}

// ─── GET GUIDE (Bonus: Public + Private Access) ───
export async function GET(request, { params }) {
  const userId = await getUserId(request);
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid guide ID" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const guide = await db.collection("guides").findOne({
      _id: new ObjectId(id),
    });

    if (!guide) {
      return NextResponse.json({ error: "Guide not found" }, { status: 404 });
    }

    // Public access: only owners can access their guides
    const isOwner = userId && guide.userId?.toString() === userId;

    if (!isOwner) {
      return NextResponse.json(
        { error: "This guide is private" },
        { status: 403 }
      );
    }

    // Update last accessed
    if (isOwner) {
      db.collection("guides")
        .updateOne(
          { _id: new ObjectId(id) },
          { $set: { lastAccessed: new Date() } }
        )
        .catch(console.error);
    }

    return NextResponse.json({
      success: true,
      guide: {
        ...guide,
        _id: guide._id.toString(),
        userId: isOwner ? guide.userId.toString() : undefined,
      },
      isOwner,
      canEdit: isOwner,
    });
  } catch (error) {
    console.error("GET /guides/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch guide" },
      { status: 500 }
    );
  }
}
