// src/app/api/courses/[id]/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

// === Shared Auth + Authorization Helper ===
async function authorize(request, course) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { error: "Unauthorized", status: 401 };
  }

  const token = authHeader.split("Bearer ")[1];
  if (!token) return { error: "Unauthorized", status: 401 };

  try {
    const decoded = verifyToken(token);
    if (!decoded?.id) return { error: "Invalid token", status: 401 };

    const userId = new ObjectId(decoded.id);
    const isOwner =
      course?.createdBy && new ObjectId(course.createdBy).equals(userId);
    const isAdmin = decoded.role === "admin";

    if (!isOwner && !isAdmin) {
      return { error: "Forbidden: You do not have permission", status: 403 };
    }

    return { userId, isAdmin, decoded };
  } catch (err) {
    console.warn("Token verification failed:", err.message);
    return { error: "Unauthorized", status: 401 };
  }
}

// === GET: Fetch Single Course by ID ===
export async function GET(request, { params }) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const course = await db.collection("courses").findOne({
      _id: new ObjectId(id),
      isPublished: true, // Only return published courses
    });

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    // Sanitize output
    const sanitized = {
      id: course._id.toString(),
      title: course.title,
      description: course.description,
      thumbnail: course.thumbnail,
      category: course.category,
      difficulty: course.difficulty,
      duration: course.duration,
      price: course.price,
      isPremium: course.isPremium || false,
      rating: course.rating || 0,
      students: course.students || 0,
      instructor: course.instructor,
      modules: course.modules || [],
      createdAt: course.createdAt,
      updatedAt: course.updatedAt,
    };

    return NextResponse.json({ success: true, course: sanitized });
  } catch (error) {
    console.error("GET /courses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch course" },
      { status: 500 }
    );
  }
}

// === PUT: Update Course (Owner or Admin) ===
export async function PUT(request, { params }) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const coursesCol = db.collection("courses");

    const existingCourse = await coursesCol.findOne({ _id: new ObjectId(id) });
    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const auth = await authorize(request, existingCourse);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const updates = await request.json();

    // Prevent changing critical fields
    delete updates._id;
    delete updates.createdBy;
    delete updates.createdAt;
    delete updates.students;
    delete updates.rating;
    delete updates.reviews;

    const result = await coursesCol.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          ...updates,
          updatedAt: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Course updated successfully",
    });
  } catch (error) {
    console.error("PUT /courses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update course" },
      { status: 500 }
    );
  }
}

// === DELETE: Delete Course (Owner or Admin) ===
export async function DELETE(request, { params }) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid course ID" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const coursesCol = db.collection("courses");

    const existingCourse = await coursesCol.findOne({ _id: new ObjectId(id) });
    if (!existingCourse) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    const auth = await authorize(request, existingCourse);
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const result = await coursesCol.deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: "Course deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /courses/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete course" },
      { status: 500 }
    );
  }
}
