// src/app/api/guides/route.js

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

// ─── GET: List all user guides ───
export async function GET(request) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);
  const search = searchParams.get("search")?.trim();
  const difficulty = searchParams.get("difficulty");
  const bookmarked = searchParams.get("bookmarked") === "true";

  const skip = (page - 1) * limit;

  try {
    const { db } = await connectToDatabase();
    const collection = db.collection("guides");

    const query = { userId: new ObjectId(userId) };

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: "i" } },
        { topic: { $regex: search, $options: "i" } },
      ];
    }
    if (
      difficulty &&
      ["beginner", "intermediate", "advanced"].includes(difficulty)
    ) {
      query.difficulty = difficulty;
    }
    if (bookmarked) {
      query.bookmarked = true;
    }

    const [guides, total] = await Promise.all([
      collection
        .find(query)
        .sort({ lastAccessed: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),
      collection.countDocuments(query),
    ]);

    const formatted = guides.map((g) => ({
      id: g._id.toString(),
      title: g.title,
      topic: g.originalTopic || g.topic,
      difficulty: g.difficulty,
      totalLessons: g.totalLessons,
      progress: g.progress || 0,
      bookmarked: g.bookmarked || false,
      pinned: g.pinned || false,
      isPremium: g.isPremium || false,
      visualizations: g.visualizations,
      createdAt: g.createdAt,
      lastAccessed: g.lastAccessed,
    }));

    return NextResponse.json({
      success: true,
      guides: formatted,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1,
      },
      filters: { search, difficulty, bookmarked },
    });
  } catch (error) {
    console.error("GET /api/guides error:", error);
    return NextResponse.json(
      { error: "Failed to load guides" },
      { status: 500 }
    );
  }
}

// ─── POST: Create new guide (manual or AI-generated) ───
export async function POST(request) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { title, topic, difficulty, modules, visualizations } = body;

    if (!title || !topic || !difficulty) {
      return NextResponse.json(
        { error: "title, topic, and difficulty are required" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    const guideId = new ObjectId();

    const newGuide = {
      _id: guideId,
      userId: new ObjectId(userId),
      title: title.trim(),
      topic: topic.toLowerCase().trim(),
      originalTopic: topic,
      difficulty,
      level: difficulty,
      totalLessons:
        modules?.reduce((acc, m) => acc + (m.lessons?.length || 0), 0) || 0,
      modules: modules || [],
      visualizations: visualizations || [],
      isPremium: false,
      progress: 0,
      bookmarked: false,
      pinned: false,
      createdAt: new Date(),
      lastAccessed: new Date(),
    };

    await db.collection("guides").insertOne(newGuide);

    return NextResponse.json(
      {
        success: true,
        message: "Guide created successfully",
        guide: {
          id: guideId.toString(),
          title: newGuide.title,
          topic: newGuide.originalTopic,
          difficulty: newGuide.difficulty,
          totalLessons: newGuide.totalLessons,
          createdAt: newGuide.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/guides error:", error);
    return NextResponse.json(
      { error: "Failed to create guide" },
      { status: 500 }
    );
  }
}
