// src/app/api/progress/course/route.js

import { NextResponse } from "next/server";
import { withAuth, withErrorHandling } from "@/lib/middleware";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

async function handlePost(request) {
  await connectToDatabase();

  const user = request.user;
  let effectiveUser = user;

  // If middleware didn't attach a user (cookie/token mismatch), allow header fallback
  if (!effectiveUser) {
    try {
      const headerUserId = request.headers.get("x-user-id");
      if (headerUserId) {
        // Try native DB lookup to operate on user's courses atomically
        const { db } = await connectToDatabase();
        const userDoc = await db
          .collection("users")
          .findOne({ _id: new ObjectId(headerUserId) });
        if (userDoc) {
          effectiveUser = userDoc;
        }
      }
    } catch (e) {
      // ignore and fall through to unauthorized
    }
  }

  if (!effectiveUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { courseId, progress, completed, lessonId } = body;

    // === Input Validation ===
    if (!courseId || typeof courseId !== "string" || courseId.length < 12) {
      return NextResponse.json(
        { error: "Invalid or missing courseId" },
        { status: 400 }
      );
    }

    if (typeof progress !== "number" || progress < 0 || progress > 100) {
      return NextResponse.json(
        { error: "Progress must be a number between 0 and 100" },
        { status: 400 }
      );
    }

    if (typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Completed must be a boolean" },
        { status: 400 }
      );
    }

    // === Atomic Update: Create if not exists, update if exists ===
    // If we have a Mongoose user model instance, prefer Mongoose updates
    if (effectiveUser._id && effectiveUser.__v !== undefined) {
      // effectiveUser looks like a Mongoose doc
      const result = await User.updateOne(
        { _id: effectiveUser._id, "courses.courseId": courseId },
        {
          $set: {
            "courses.$.progress": Math.round(progress),
            "courses.$.completed": completed,
            "courses.$.lastUpdated": new Date(),
          },
        }
      );

      // If no document was matched → insert new entry
      if (result.matchedCount === 0) {
        await User.updateOne(
          { _id: effectiveUser._id },
          {
            $push: {
              courses: {
                courseId,
                progress: Math.round(progress),
                completed,
                startedAt: new Date(),
                lastUpdated: new Date(),
              },
            },
          }
        );
      }
    } else {
      // Native DB update when we only have a plain user document
      const { db } = await connectToDatabase();
      const userObjId = new ObjectId(effectiveUser._id || effectiveUser.id);

      const result = await db.collection("users").updateOne(
        { _id: userObjId, "courses.courseId": courseId },
        {
          $set: {
            "courses.$.progress": Math.round(progress),
            "courses.$.completed": completed,
            "courses.$.lastUpdated": new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        await db.collection("users").updateOne(
          { _id: userObjId },
          {
            $push: {
              courses: {
                courseId,
                progress: Math.round(progress),
                completed,
                startedAt: new Date(),
                lastUpdated: new Date(),
              },
            },
          }
        );
      }
    }

    // If client provided a lessonId, also persist per-lesson completion into the library document
    if (lessonId && typeof lessonId === "string") {
      try {
        const { db } = await connectToDatabase();
        const courseObjId = new ObjectId(courseId);
        const userObjId = new ObjectId(effectiveUser._id || effectiveUser.id);
        const [modNum, lessonNum] = String(lessonId).split("-");
        const moduleId = parseInt(modNum, 10);

        // Accept either isLessonCompleted or fall back to course completed status
        const isLessonDone =
          typeof body.isLessonCompleted === "boolean"
            ? body.isLessonCompleted
            : completed;

        if (!Number.isNaN(moduleId)) {
          const updateResult = await db.collection("library").updateOne(
            { _id: courseObjId, userId: userObjId },
            {
              $set: {
                "modules.$[m].lessons.$[l].completed": isLessonDone,
                lastAccessed: new Date(),
              },
            },
            {
              arrayFilters: [{ "m.id": moduleId }, { "l.id": lessonId }],
            }
          );
        }
      } catch (e) {
        // Silent fail
      }
    }

    return NextResponse.json({
      success: true,
      message: "Progress saved",
      data: {
        courseId,
        progress: Math.round(progress),
        completed,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("Update course progress error:", {
      userId: user._id,
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Failed to save progress" },
      { status: 500 }
    );
  }
}

// Apply middleware
const handler = withAuth(handlePost);
export const POST = withErrorHandling(handler);
