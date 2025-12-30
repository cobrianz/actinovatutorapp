import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

const PIN_LIMIT = 3;

import { getUserIdFromRequest } from "@/lib/userUtils";

export async function GET(request) {
  const { db } = await connectToDatabase();
  const userId = await getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const singleId = searchParams.get("id");

  if (singleId) {
    try {
      const { db } = await connectToDatabase();
      const userObjId = new ObjectId(userId);
      const cleanId = singleId.replace(/^(course|guide|cards)_/, "");

      const prefix = singleId.split("_")[0];
      const collection = {
        course: "library",
        guide: "guides",
        cards: "cardSets",
      }[prefix] || "library";

      const item = await db.collection(collection).findOne({
        _id: new ObjectId(cleanId),
        userId: userObjId
      });

      if (!item) {
        return NextResponse.json({ error: "Item not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true, item });
    } catch (err) {
      console.error("Library single fetch error:", err);
      return NextResponse.json({ error: "Failed to fetch item" }, { status: 500 });
    }
  }

  const page = Math.max(1, parseInt(searchParams.get("page")) || 1);
  const limit = Math.min(50, parseInt(searchParams.get("limit")) || 10);
  const type = searchParams.get("type");
  const search = searchParams.get("search")?.toLowerCase();

  try {
    const { db } = await connectToDatabase();
    const userObjId = new ObjectId(userId);

    const [courses, questions, cardSets, library, userProgress] =
      await Promise.all([
        db.collection("library").find({ userId: userObjId }).toArray(),
        db.collection("guides").find({ userId: userObjId }).toArray(),
        db.collection("cardSets").find({ userId: userObjId }).toArray(),
        db.collection("user_library").findOne({ userId: userObjId }) ||
        (await seedLibrary(db, userId)),
        db
          .collection("users")
          .findOne({ _id: userObjId }, { projection: { courses: 1 } }),
      ]);

    const progressMap = new Map();
    if (userProgress?.courses) {
      userProgress.courses.forEach((course) => {
        progressMap.set(course.courseId?.toString(), {
          progress: course.progress || 0,
          completed: course.completed || false,
        });
      });
    }

    const items = [];

    courses.forEach((c) => {
      const courseProgress = progressMap.get(c._id.toString()) || {
        progress: 0,
        completed: false,
      };
      items.push({
        id: `course_${c._id}`,
        type: "course",
        title: c.title,
        topic: c.originalTopic || c.topic,
        difficulty: c.difficulty || c.level,
        progress: courseProgress.progress,
        totalLessons: c.totalLessons || 0,
        modules: c.totalModules || 0,
        isPremium: c.isPremium || false,
        pinned: (library?.pinned || []).includes(`course_${c._id}`),
        createdAt: c.createdAt,
        lastAccessed: c.lastAccessed,
        thumbnail: null,
      });
    });

    cardSets.forEach((cs) => {
      items.push({
        id: `cards_${cs._id}`,
        type: "flashcards",
        title: cs.title,
        topic: cs.topic,
        difficulty: cs.level || cs.difficulty,
        totalCards:
          cs.totalCards || (Array.isArray(cs.cards) ? cs.cards.length : 0),
        createdAt: cs.createdAt,
        lastAccessed: cs.lastAccessed,
        pinned: (library?.pinned || []).includes(`cards_${cs._id}`),
        thumbnail: null,
      });
    });

    let filtered = items;
    if (search) {
      filtered = items.filter(
        (i) =>
          i.title.toLowerCase().includes(search) ||
          i.topic.toLowerCase().includes(search)
      );
    }

    if (type && type !== "all") {
      filtered = filtered.filter((i) => i.type === type);
    }

    filtered.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return (b.lastAccessed || b.createdAt) - (a.lastAccessed || a.createdAt);
    });

    const total = filtered.length;
    const paginated = filtered.slice((page - 1) * limit, page * limit);

    return NextResponse.json({
      success: true,
      items: paginated,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      stats: {
        total: items.length,
        courses: courses.length,
        flashcards: cardSets.length,
        pinned: items.filter((i) => i.pinned).length,
        pinnedCourses: items.filter((i) => i.type === "course" && i.pinned)
          .length,
        inProgress: items.filter((i) => i.progress > 0 && i.progress < 100)
          .length,
        completed: items.filter((i) => i.progress === 100).length,
        completedCourses: items.filter(
          (i) => i.type === "course" && i.progress === 100
        ).length,
      },
    });
  } catch (error) {
    console.error("Library GET error:", error);
    return NextResponse.json(
      { error: "Failed to load library" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  const { db } = await connectToDatabase();
  const userId = await getUserIdFromRequest(request);

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { action, itemId } = body;
  if (!action) {
    return NextResponse.json({ error: "action required" }, { status: 400 });
  }

  const actionsRequireItemId = new Set(["pin", "bookmark"]);
  if (actionsRequireItemId.has(action) && !itemId) {
    return NextResponse.json(
      { error: "itemId is required for this action" },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const userObjId = new ObjectId(userId);
    const library =
      (await db.collection("user_library").findOne({ userId: userObjId })) ||
      (await seedLibrary(db, userId));

    const pinnedCount = library.pinned?.length || 0;

    if (action === "pin") {
      const alreadyPinned = library.pinned?.includes(itemId) || false;

      if (alreadyPinned) {
        await db
          .collection("user_library")
          .updateOne({ userId: userObjId }, { $pull: { pinned: itemId } });
        return NextResponse.json({ success: true, pinned: false });
      } else {
        if (pinnedCount >= PIN_LIMIT) {
          return NextResponse.json(
            { error: `Maximum ${PIN_LIMIT} items can be pinned` },
            { status: 400 }
          );
        }
        await db
          .collection("user_library")
          .updateOne({ userId: userObjId }, { $push: { pinned: itemId } });
        return NextResponse.json({ success: true, pinned: true });
      }
    }

    if (action === "bookmark") {
      const alreadyBookmarked = library.bookmarks?.includes(itemId) || false;

      if (alreadyBookmarked) {
        await db
          .collection("user_library")
          .updateOne({ userId: userObjId }, { $pull: { bookmarks: itemId } });
        return NextResponse.json({ success: true, bookmarked: false });
      } else {
        await db
          .collection("user_library")
          .updateOne({ userId: userObjId }, { $push: { bookmarks: itemId } });
        return NextResponse.json({ success: true, bookmarked: true });
      }
    }

    if (action === "addPersonalized") {
      const { course } = body;
      if (!course || !course.id || !course.title) {
        return NextResponse.json(
          { error: "course object with id and title required" },
          { status: 400 }
        );
      }

      const existingCourse = await db.collection("library").findOne({
        userId: userObjId,
        "courseData.title": course.title,
        type: "course",
      });

      if (!existingCourse) {
        const personalizedCourse = {
          userId: userObjId,
          type: "course",
          format: course.format || "course",
          topic: course.title,
          originalTopic: course.title,
          difficulty: course.difficulty || "intermediate",
          level: course.difficulty || "intermediate",
          courseData: {
            ...course,
            _id: new ObjectId(),
            title: course.title,
            level: course.difficulty || "intermediate",
            difficulty: course.difficulty || "intermediate",
            topic: course.title,
            personalized: true,
            generatedAt: new Date(),
          },
          createdAt: new Date(),
          updatedAt: new Date(),
          isGenerated: true,
          personalized: true,
        };

        await db.collection("library").insertOne(personalizedCourse);

        const itemId = `course_${personalizedCourse._id}`;
        await db.collection("user_library").updateOne(
          { userId: userObjId },
          {
            $addToSet: {
              inProgressCourses: itemId,
            },
            $setOnInsert: {
              userId: userObjId,
              createdAt: new Date(),
            },
          },
          { upsert: true }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Personalized course added to library",
      });
    }

    if (action === "add") {
      const { course } = body;
      if (!course) {
        return NextResponse.json(
          { error: "course object required" },
          { status: 400 }
        );
      }

      try {
        // Determine the collection and format based on course data
        const format = course.format || course.courseData?.format || "course";
        const courseData = course.courseData || course;

        let collection, itemData;

        if (format === "flashcards" || format === "cards") {
          // Save to cardSets collection
          collection = "cardSets";
          itemData = {
            userId: userObjId,
            title: courseData.title || course.title,
            topic: courseData.topic || course.topic,
            difficulty: courseData.difficulty || courseData.level || course.difficulty || course.level || "beginner",
            level: courseData.level || courseData.difficulty || course.level || course.difficulty || "beginner",
            cards: courseData.cards || [],
            totalCards: courseData.totalCards || (Array.isArray(courseData.cards) ? courseData.cards.length : 0),
            createdAt: new Date(),
            lastAccessed: new Date(),
            isGenerated: course.isGenerated !== false,
          };
        } else if (format === "questions" || format === "guide") {
          // Save to guides collection
          collection = "guides";
          itemData = {
            userId: userObjId,
            title: courseData.title || course.title,
            topic: courseData.topic || course.topic,
            difficulty: courseData.difficulty || courseData.level || course.difficulty || course.level || "beginner",
            level: courseData.level || courseData.difficulty || course.level || course.difficulty || "beginner",
            questions: courseData.questions || [],
            totalQuestions: courseData.totalQuestions || (Array.isArray(courseData.questions) ? courseData.questions.length : 0),
            createdAt: new Date(),
            lastAccessed: new Date(),
            isGenerated: course.isGenerated !== false,
          };
        } else {
          // Save to library collection (default for courses)
          collection = "library";
          itemData = {
            userId: userObjId,
            title: courseData.title || course.title,
            topic: courseData.topic || course.topic,
            originalTopic: courseData.originalTopic || course.originalTopic || courseData.topic || course.topic,
            difficulty: courseData.difficulty || courseData.level || course.difficulty || course.level || "beginner",
            level: courseData.level || courseData.difficulty || course.level || course.difficulty || "beginner",
            format: format,
            courseData: courseData,
            modules: courseData.modules || [],
            totalModules: courseData.totalModules || (Array.isArray(courseData.modules) ? courseData.modules.length : 0),
            totalLessons: courseData.totalLessons || 0,
            createdAt: new Date(),
            lastAccessed: new Date(),
            isGenerated: course.isGenerated !== false,
          };
        }

        // Check if course already exists to avoid duplicates
        const existingCourse = await db.collection(collection).findOne({
          userId: userObjId,
          topic: itemData.topic,
          difficulty: itemData.difficulty,
        });

        if (existingCourse) {
          // Update lastAccessed instead of creating duplicate
          await db.collection(collection).updateOne(
            { _id: existingCourse._id },
            { $set: { lastAccessed: new Date() } }
          );

          return NextResponse.json({
            success: true,
            courseId: existingCourse._id.toString(),
            message: "Course already exists in library",
          });
        }

        // Insert new course
        const result = await db.collection(collection).insertOne(itemData);

        return NextResponse.json({
          success: true,
          courseId: result.insertedId.toString(),
          message: "Course added to library successfully",
        });
      } catch (err) {
        console.error("Error adding course to library:", err);
        return NextResponse.json(
          { error: "Failed to add course to library" },
          { status: 500 }
        );
      }
    }



    if (action === "saveConversation") {
      const { courseId, topic, difficulty, format, messages } = body;
      if (!topic || !messages || !Array.isArray(messages)) {
        return NextResponse.json(
          { error: "topic and messages array required" },
          { status: 400 }
        );
      }

      if (courseId) {
        await db.collection("library").updateOne(
          { _id: new ObjectId(courseId), userId: userObjId },
          {
            $set: {
              conversation: messages,
              lastConversationUpdate: new Date(),
            },
          }
        );
      } else {
        const conversationKey = `conversation_${topic}_${difficulty}_${format}`;
        await db.collection("user_library").updateOne(
          { userId: userObjId },
          {
            $set: {
              [conversationKey]: messages,
              lastConversationUpdate: new Date(),
            },
          },
          { upsert: true }
        );
      }

      return NextResponse.json({ success: true });
    }

    if (action === "getConversation") {
      const { courseId, topic, difficulty, format } = body;
      if (!topic) {
        return NextResponse.json({ error: "topic required" }, { status: 400 });
      }

      let messages = [];
      if (courseId) {
        const course = await db
          .collection("library")
          .findOne({ _id: new ObjectId(courseId), userId: userObjId });
        messages = course?.conversation || [];
      } else {
        const conversationKey = `conversation_${topic}_${difficulty}_${format}`;
        const userLib = await db
          .collection("user_library")
          .findOne({ userId: userObjId });
        messages = userLib?.[conversationKey] || [];
      }

      return NextResponse.json({ success: true, messages });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Library POST error:", error);
    return NextResponse.json({ error: "Operation failed" }, { status: 500 });
  }
}

async function seedLibrary(db, userId) {
  const userObjId = new ObjectId(userId);
  const library = {
    userId: userObjId,
    pinned: [],
    bookmarks: [],
    totalLearningTime: 0,
    streak: 0,
    achievements: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  await db.collection("user_library").insertOne(library);
  return library;
}