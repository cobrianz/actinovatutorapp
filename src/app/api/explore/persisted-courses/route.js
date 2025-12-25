// src/app/api/explore/persisted/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";

export async function GET(request) {
  try {
    const user = await authenticate(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { db } = await connectToDatabase();
    const col = db.collection("exploredCourses");

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recent = await col
      .find({
        userId: user.id,
        generatedAt: { $gte: twentyFourHoursAgo },
      })
      .sort({ generatedAt: -1 })
      .limit(12)
      .toArray();

    if (recent.length === 0) {
      return NextResponse.json({
        courses: [],
        message: "No recent explorations",
      });
    }

    return NextResponse.json({
      success: true,
      courses: recent.map((c) => ({
        id: c._id.toString(),
        title: c.title,
        description: c.description,
        category: c.category,
        difficulty: c.difficulty,
        estimatedDuration: c.estimatedDuration,
        tags: c.tags,
        whyTrending: c.whyTrending,
        hook: c.hook || null,
        questions: c.questions || [],
        exploredAt: c.generatedAt,
        timeAgo: timeSince(c.generatedAt),
      })),
      meta: {
        total: recent.length,
        lastExplored: recent[0].generatedAt,
        message: `You explored ${recent.length} topic${recent.length > 1 ? "s" : ""} today`,
      },
    });
  } catch (error) {
    console.error("GET persisted courses:", error);
    return NextResponse.json(
      { error: "Failed to load your explorations" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const user = await authenticate(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courses } = await request.json();

    if (!Array.isArray(courses) || courses.length === 0) {
      return NextResponse.json(
        { error: "courses array is required" },
        { status: 400 }
      );
    }

    const validCourses = courses
      .filter((c) => c.title && c.description && c.category)
      .slice(0, 12); // max 12

    if (validCourses.length === 0) {
      return NextResponse.json(
        { error: "No valid courses provided" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();
    const col = db.collection("exploredCourses");

    // Replace all recent explorations for this user (clean slate)
    await col.deleteMany({ userId: user.id });

    const docs = validCourses.map((course) => ({
      ...course,
      userId: user.id,
      generatedAt: new Date(),
      clicks: 0,
      savedToPath: false,
    }));

    await col.insertMany(docs);

    // Track click/impression for future personalization
    await db.collection("userAnalytics").updateOne(
      { userId: user.id },
      {
        $inc: { "explorations.count": validCourses.length },
        $set: { "explorations.lastAt": new Date() },
        $addToSet: {
          "explorations.categories": {
            $each: validCourses.map((c) => c.category),
          },
        },
      },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: "Explorations saved — ready when you are",
      count: docs.length,
      features: ["timeAgo", "clickTracking", "saveToPathReady"],
    });
  } catch (error) {
    console.error("POST persisted courses:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

// Click tracking endpoint — call when user clicks a topic
export async function PATCH(request) {
  try {
    const user = await authenticate(request);
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { courseId } = await request.json();
    if (!courseId)
      return NextResponse.json({ error: "courseId required" }, { status: 400 });

    const { db } = await connectToDatabase();
    const result = await db.collection("exploredCourses").updateOne(
      { _id: new ObjectId(courseId), userId: user.id },
      {
        $inc: { clicks: 1 },
        $set: { lastClickedAt: new Date() },
      }
    );

    return NextResponse.json({
      success: true,
      clicked: result.modifiedCount > 0,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to track click" },
      { status: 500 }
    );
  }
}

// Helper: Human-readable time ago
function timeSince(date) {
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  let interval = seconds / 31536000;
  if (interval > 1) return Math.floor(interval) + "y ago";
  interval = seconds / 2592000;
  if (interval > 1) return Math.floor(interval) + "mo ago";
  interval = seconds / 86400;
  if (interval > 1) return Math.floor(interval) + "d ago";
  interval = seconds / 3600;
  if (interval > 1) return Math.floor(interval) + "h ago";
  interval = seconds / 60;
  if (interval > 1) return Math.floor(interval) + "m ago";
  return "just now";
}

// Shared auth
async function authenticate(request) {
  let token = request.headers.get("authorization")?.split("Bearer ")[1];

  if (!token) {
    // Try to get token from cookies
    token = (await cookies()).get("token")?.value;
  }

  if (!token) return null;

  try {
    const decoded = verifyToken(token);
    return decoded?.id ? { id: decoded.id } : null;
  } catch {
    return null;
  }
}
