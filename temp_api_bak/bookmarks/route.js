import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

// === Shared Auth Middleware ===
async function authenticate(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = verifyToken(token);
    if (!decoded?.id) return null;
    return decoded.id; // return userId as string
  } catch (err) {
    console.warn("Invalid token:", err.message);
    return null;
  }
}

// === Constants ===
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;
const VALID_TYPES = ["courses", "guides", "articles", "videos"];

// === Helper: Validate type ===
function validateType(type) {
  return type && VALID_TYPES.includes(type) ? type : "courses";
}

export async function GET(request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);

    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const rawLimit = parseInt(searchParams.get("limit")) || DEFAULT_LIMIT;
    const limit = Math.min(rawLimit, MAX_LIMIT);
    const type = validateType(searchParams.get("type"));

    const bookmarksCol = db.collection("bookmarks");
    const skip = (page - 1) * limit;

    const [bookmarks, totalCount] = await Promise.all([
      bookmarksCol
        .find({ userId, type })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      bookmarksCol.countDocuments({ userId, type }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      success: true,
      bookmarks,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      type,
    });
  } catch (error) {
    console.error("GET /bookmarks error:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookmarks" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { itemId, type: rawType, itemData } = body;

    if (!itemId || !rawType) {
      return NextResponse.json(
        { error: "itemId and type are required" },
        { status: 400 }
      );
    }

    const type = validateType(rawType);

    // Validate ObjectId format if needed
    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json(
        { error: "Invalid itemId format" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const bookmarksCol = db.collection("bookmarks");

    // Prevent duplicates
    const exists = await bookmarksCol.findOne({
      userId,
      itemId,
      type,
    });

    if (exists) {
      return NextResponse.json(
        { error: "Already bookmarked", bookmark: exists },
        { status: 409 }
      );
    }

    const bookmark = {
      userId,
      itemId: new ObjectId(itemId),
      type,
      itemData: itemData || null,
      createdAt: new Date(),
    };

    const result = await bookmarksCol.insertOne(bookmark);

    return NextResponse.json(
      {
        success: true,
        message: "Bookmarked successfully",
        bookmark: {
          ...bookmark,
          _id: result.insertedId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /bookmarks error:", error);
    return NextResponse.json(
      { error: "Failed to create bookmark" },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const rawType = searchParams.get("type");

    if (!itemId || !rawType) {
      return NextResponse.json(
        { error: "itemId and type are required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(itemId)) {
      return NextResponse.json({ error: "Invalid itemId" }, { status: 400 });
    }

    const type = validateType(rawType);

    const { db } = await connectToDatabase();
    const bookmarksCol = db.collection("bookmarks");

    const result = await bookmarksCol.deleteOne({
      userId,
      itemId: new ObjectId(itemId),
      type,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Bookmark not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Bookmark removed",
    });
  } catch (error) {
    console.error("DELETE /bookmarks error:", error);
    return NextResponse.json(
      { error: "Failed to delete bookmark" },
      { status: 500 }
    );
  }
}
