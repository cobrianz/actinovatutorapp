// src/app/api/user-courses/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export async function GET(request) {
  try {
    // Extract and verify JWT from Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    if (!token) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    let userId;
    try {
      const { verifyToken } = await import("@/lib/auth");
      const payload = verifyToken(token);
      if (!payload?.id) throw new Error("Invalid payload");
      userId = new ObjectId(payload.id);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();

    // 1. Get user's enrolled courses (from user document)
    const user = await db.collection("users").findOne(
      { _id: userId },
      {
        projection: {
          courses: 1,
        },
      }
    );

    if (!user || !user.courses || user.courses.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // Extract course IDs
    const courseIds = user.courses
      .filter((c) => c.courseId)
      .map((c) => new ObjectId(c.courseId));

    if (courseIds.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 2. Fetch course details in one query
    const courses = await db
      .collection("courses")
      .find({ _id: { $in: courseIds } })
      .toArray();

    // Create lookup map for fast access
    const courseMap = Object.fromEntries(
      courses.map((c) => [c._id.toString(), c])
    );

    // 3. Combine user progress + course data
    const enrichedCourses = user.courses
      .filter((uc) => uc.courseId && courseMap[uc.courseId.toString()])
      .map((uc) => {
        const course = courseMap[uc.courseId.toString()];
        return {
          _id: course._id.toString(),
          title: course.title,
          slug: course.slug,
          level: course.level || "Beginner",
          duration: course.duration,
          totalModules: course.modules?.length || 0,
          totalLessons: course.totalLessons || 0,
          thumbnail: course.thumbnail,
          progress: uc.progress || 0,
          completed: uc.completed || false,
          completedAt: uc.completedAt || null,
          enrolledAt: uc.enrolledAt || new Date(),
          lastAccessed: uc.lastAccessed || null,
        };
      })
      .sort((a, b) => new Date(b.enrolledAt) - new Date(a.enrolledAt)); // newest first

    return NextResponse.json(enrichedCourses, { status: 200 });
  } catch (error) {
    console.error("[/api/user-courses] Error:", error);
    return NextResponse.json(
      { error: "Failed to load your courses" },
      { status: 500 }
    );
  }
}
