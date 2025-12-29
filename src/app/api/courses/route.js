// src/app/api/courses/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

// === Shared Auth Helper ===
async function authenticate(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const token = authHeader.split("Bearer ")[1];
  if (!token) return null;

  try {
    const decoded = verifyToken(token);
    return decoded?.id ? new ObjectId(decoded.id) : null;
  } catch (err) {
    console.warn("Invalid token in /api/courses:", err.message);
    return null;
  }
}

// === GET: List & Search Courses ===
export async function GET(request) {
  try {
    const { db } = await connectToDatabase();
    const { searchParams } = new URL(request.url);

    // Pagination
    const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(searchParams.get("limit")) || 12)
    );
    const skip = (page - 1) * limit;

    // Filters
    const category = searchParams.get("category")?.trim() || null;
    const difficulty = searchParams.get("difficulty")?.trim() || null;
    const isPremium = searchParams.get("isPremium");
    const search = searchParams.get("search")?.trim() || "";

    // Build MongoDB filter
    const filter = { isPublished: true }; // Only show published courses

    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (isPremium !== null) filter.isPremium = isPremium === "true";

    if (search) {
      const regex = { $regex: search, $options: "i" };
      filter.$or = [
        { title: regex },
        { description: regex },
        { instructor: regex },
        { tags: regex },
      ];
    }

    const coursesCol = db.collection("courses");

    const [courses, totalCount] = await Promise.all([
      coursesCol
        .find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .toArray(),

      coursesCol.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // Sanitize output (never leak internal fields)
    const sanitizedCourses = courses.map((course) => ({
      id: course._id.toString(),
      title: course.title,
      description: course.description,
      instructor: course.instructor,
      thumbnail: course.thumbnail,
      category: course.category,
      difficulty: course.difficulty,
      duration: course.duration,
      lessonsCount: course.lessonsCount,
      rating: course.rating || 0,
      students: course.students || 0,
      isPremium: course.isPremium || false,
      price: course.price,
      tags: course.tags || [],
      createdAt: course.createdAt,
    }));

    return NextResponse.json({
      success: true,
      courses: sanitizedCourses,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    });
  } catch (error) {
    console.error("GET /api/courses error:", error);
    return NextResponse.json(
      { error: "Failed to fetch courses" },
      { status: 500 }
    );
  }
}

// === POST: Create New Course (Admin/Instructor Only) ===
export async function POST(request) {
  const userId = await authenticate(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const coursesCol = db.collection("courses");

    // Optional: Check if user is admin/instructor
    const user = await db
      .collection("users")
      .findOne({ _id: userId }, { projection: { role: 1 } });

    if (!user || !["admin", "instructor"].includes(user.role)) {
      return NextResponse.json(
        { error: "Forbidden: Only instructors can create courses" },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Basic validation
    const required = ["title", "description", "category", "difficulty"];
    for (const field of required) {
      if (!body[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const newCourse = {
      ...body,
      createdBy: userId,
      userId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      students: 0,
      rating: 0,
      reviews: [],
      isPublished: body.isPublished || false,
      lessonsCount: body.lessonsCount || 0,
      tags: body.tags || [],
      isPremium: body.isPremium || false,
    };

    const result = await coursesCol.insertOne(newCourse);

    return NextResponse.json(
      {
        success: true,
        message: "Course created successfully",
        course: {
          id: result.insertedId.toString(),
          ...newCourse,
          _id: result.insertedId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/courses error:", error);
    return NextResponse.json(
      { error: "Failed to create course" },
      { status: 500 }
    );
  }
}
