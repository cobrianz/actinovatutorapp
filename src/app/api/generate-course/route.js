// src/app/api/courses/generate/route.js

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getUserPlanLimits, checkLimit, getUserPlanName } from "@/lib/planLimits";
import { withCORS } from "@/lib/middleware";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });




async function generateCourseHandler(request) {
  let userId = null;
  let isPremium = false;

  try {
    // ─── AUTH: Header or Cookie ───
    const auth = request.headers.get("authorization");
    let token = auth?.startsWith("Bearer ")
      ? auth.slice(7)
      : (await cookies()).get("token")?.value;

    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.id;
      } catch (e) {
        console.warn("Invalid token in course generation");
      }
    }

    // ─── INPUT ───
    let {
      topic,
      difficulty = "beginner",
      format = "course",
      questions,
    } = await request.json();

    if (!topic?.trim())
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });

    difficulty = (difficulty || "beginner").toLowerCase();
    if (!["beginner", "intermediate", "advanced"].includes(difficulty))
      return NextResponse.json(
        { error: "Invalid difficulty" },
        { status: 400 }
      );

    const { db } = await connectToDatabase();

    // ─── USER & MONTHLY LIMITS (auto-reset) ───
    let monthlyUsage = 0;
    let resetDate = new Date();
    let user = null;
    let limits = getUserPlanLimits(null); // Default to free limits

    if (userId) {
      user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });

      // Determine user's plan
      const isEnterprise = user?.subscription?.plan === "enterprise" && user?.subscription?.status === "active";
      isPremium =
        user?.isPremium ||
        ((user?.subscription?.plan === "pro" || user?.subscription?.plan === "enterprise") && user?.subscription?.status === "active");

      const planName = getUserPlanName(user);
      limits = getUserPlanLimits(user);

      const now = new Date();
      const resetOn = user?.usageResetDate
        ? new Date(user.usageResetDate)
        : null;
      const shouldReset = !resetOn || now >= resetOn;

      if (shouldReset) {
        monthlyUsage = 0;
        resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        await db
          .collection("users")
          .updateOne(
            { _id: new ObjectId(userId) },
            { $set: { monthlyUsage: 0, usageResetDate: resetDate } }
          );
      } else {
        monthlyUsage = user?.monthlyUsage || 0;
        resetDate = resetOn;
      }

      // Check global monthly generation limit
      const monthlyLimit = limits.monthlyGenerations;
      if (monthlyLimit !== -1 && monthlyUsage >= monthlyLimit) {
        return NextResponse.json(
          {
            error: `Monthly generation limit reached (${monthlyLimit}). ${isEnterprise ? "Contact support." : "Upgrade for more!"}`,
            used: monthlyUsage,
            limit: monthlyLimit,
            remaining: 0,
            plan: planName,
            isPremium,
            isEnterprise,
            resetsOn: resetDate.toLocaleDateString(),
            upgrade: !isPremium && !isEnterprise,
          },
          { status: 429 }
        );
      }

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Check specific course limit
      if (format === "course") {
        const courseCount = await db.collection("library").countDocuments({
          userId: new ObjectId(userId),
          format: "course",
          createdAt: { $gte: startOfMonth }
        });

        const limitCheck = checkLimit(user, "courses", courseCount);

        if (!limitCheck.allowed) {
          return NextResponse.json(
            {
              error: `Monthly course limit reached (${limitCheck.limit}). ${isEnterprise ? "Contact support." : "Upgrade for more!"}`,
              used: courseCount,
              limit: limitCheck.limit,
              remaining: limitCheck.remaining,
              plan: planName,
              isPremium,
              isEnterprise,
              resetsOn: resetDate.toLocaleDateString(),
              upgrade: !isPremium && !isEnterprise,
            },
            { status: 429 }
          );
        }
      }
    }

    if (format === "quiz") {
      return generateQuiz(topic, difficulty, questions, userId, db, monthlyUsage, resetDate, isPremium);
    }

    const normalizedTopic = topic.trim().toLowerCase();

    // Enhanced Check: Find existing course with fuzzy matching logic
    // 1. Fetch all user's course topics to check in code (more flexible than Mongo regex for complex cases)
    const userCourses = await db.collection("library")
      .find({
        userId: userId ? new ObjectId(userId) : null,
        format: "course",
      })
      .project({ topic: 1, title: 1, originalTopic: 1, difficulty: 1, isPremium: 1 })
      .toArray();

    // Helper to normalize strings for comparison
    const normalizeForMatch = (str) => {
      if (!str) return "";
      return str.toLowerCase()
        .replace(/[^\w\s]/g, "") // Remove punctuation
        .replace(/\b(course|complete|introduction|to|guide|tutorial|from|a|an|the|bootcamp|masterclass|zero|hero)\b/g, "") // Remove stop words
        .replace(/\s+/g, " ") // Collapse spaces
        .trim();
    };

    const targetNormalized = normalizeForMatch(topic);

    // Find a match
    let existingCourse = userCourses.find(c => {
      // 1. Check strict difficulty match first (unless upgrading)
      if (c.difficulty && c.difficulty !== difficulty) return false;

      // 2. Check normalized topic similarity
      const cTopic = normalizeForMatch(c.topic || c.title || "");
      const cOriginal = normalizeForMatch(c.originalTopic || "");

      // Direct inclusion check
      if (cTopic === targetNormalized || cOriginal === targetNormalized) return true;
      if (cTopic.includes(targetNormalized) || targetNormalized.includes(cTopic)) return true; // "web dev" vs "full stack web dev"

      // Token overlap check (for mixed order words like "web dev complete" vs "complete web dev")
      const targetTokens = new Set(targetNormalized.split(" ").filter(t => t.length > 2));
      const cTokens = new Set(cTopic.split(" ").filter(t => t.length > 2));

      if (targetTokens.size === 0 || cTokens.size === 0) return false;

      let matchCount = 0;
      targetTokens.forEach(t => { if (cTokens.has(t)) matchCount++; });

      const overlapRatio = matchCount / Math.min(targetTokens.size, cTokens.size);
      return overlapRatio >= 0.75; // 75% token overlap required
    });

    // If match found in lightweight list, fetch full document
    if (existingCourse) {
      existingCourse = await db.collection("library").findOne({ _id: existingCourse._id });
    }

    if (existingCourse) {
      // Scenario 1: Course exists, user is premium, but course is NOT premium. Upgrade it.
      if (isPremium && !existingCourse.isPremium) {
        // Regenerate as a premium course and update
        // Regenerate as a premium course and update
        // Since isPremium is true, 'limits' (fetched at top) contains premium limits
        const { modules, lessonsPerModule, totalLessons } = limits;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          temperature: 0.7,
          max_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `Generate a complete course outline for "${topic}" at ${difficulty} level.

IMPORTANT: This course can be in ANY field - Technology, Business, Health, Creative Arts, Humanities, Science, Lifestyle, Professional Skills, Trades, Education, etc. 
Create comprehensive, engaging content appropriate for the topic's field.

TITLE REQUIREMENTS:
- Create a DESCRIPTIVE, SPECIFIC title that reflects the exact topic provided
- Include relevant context from the topic (e.g., curriculum, grade level, specialization)
- Examples:
  * Input: "chemistry for kenyan curriculum form 2" → Title: "Kenya Curriculum Form 2 Chemistry"
  * Input: "javascript for beginners" → Title: "JavaScript Fundamentals for Beginners"
  * Input: "digital marketing" → Title: "Complete Digital Marketing Course"
- DO NOT use generic titles like "Introduction to..." unless specifically requested
- Make the title professional and clear

Return ONLY valid JSON with this exact structure:
{
  "title": "string (descriptive, specific title based on topic)",
  "level": "${difficulty}",
  "totalModules": ${modules},
  "totalLessons": ${totalLessons},
  "modules": [
    {
      "id": number,
      "title": "string",
      "lessons": [
        { "title": "string", "content": "" }
      ]
    }
  ]
}
Exactly ${modules} modules, exactly ${lessonsPerModule} lessons each. No content in lessons. Only titles.`,
            },
            {
              role: "user",
              content: `Create a ${difficulty} level course on "${topic}" with ${modules} modules and ${totalLessons} lessons total.`,
            },
          ],
        });

        let course;
        try {
          course = JSON.parse(completion.choices[0].message.content.trim());
        } catch (e) {
          console.warn("AI JSON failed, using fallback for upgrade");
          course = fallbackCourse(topic, difficulty, modules, lessonsPerModule);
        }

        if (
          !course.modules ||
          course.modules.length !== modules ||
          course.modules.some(
            (m) => !m.lessons || m.lessons.length !== lessonsPerModule
          )
        ) {
          course = fallbackCourse(topic, difficulty, modules, lessonsPerModule);
        }

        const updatedCourseDoc = {
          title: course.title,
          totalModules: course.totalModules,
          totalLessons: course.totalLessons,
          modules: course.modules.map((m, i) => ({
            ...m,
            id: i + 1,
            lessons: m.lessons.map((l, j) => ({
              ...l,
              id: `${i + 1}-${j + 1}`,
              content: "",
              completed: false,
              srs: {
                interval: 1,
                repetitions: 0,
                ease: 2.5,
                dueDate: new Date().toISOString(),
              },
            })),
          })),
          isPremium: true, // Mark as premium
          lastAccessed: new Date(),
        };

        await db
          .collection("library")
          .updateOne({ _id: existingCourse._id }, { $set: updatedCourseDoc });

        const finalCourse = { ...existingCourse, ...updatedCourseDoc };

        // Increment usage for upgrade
        if (userId) {
          try {
            await db.collection("users").updateOne(
              { _id: new ObjectId(userId) },
              { $inc: { monthlyUsage: 1 } }
            );
            monthlyUsage++; // Update local variable for response
          } catch (e) {
            console.error("Failed to increment monthly usage for upgrade", e);
          }
        }

        return NextResponse.json({
          success: true,
          courseId: finalCourse._id.toString(),
          content: {
            title: finalCourse.title,
            level: difficulty,
            totalModules: finalCourse.totalModules,
            totalLessons: finalCourse.totalLessons,
            modules: finalCourse.modules,
          },
          isExisting: true,
          wasUpgraded: true,
          message: "Course upgraded to premium version!",
        });
      }

      // Scenario 2: Course exists, no upgrade needed. Return existing course.
      return NextResponse.json({
        success: true,
        courseId: existingCourse._id.toString(),
        content: {
          title: existingCourse.title,
          level: difficulty,
          totalModules: existingCourse.totalModules,
          totalLessons: existingCourse.totalLessons,
          modules: existingCourse.modules,
        },
        isExisting: true,
        wasUpgraded: false,
        message: "Course already exists. Loaded from library.",
      });
    }

    // ─── GENERATE NEW COURSE ───
    // User and limits are already fetched at the top of the function
    const { modules, lessonsPerModule, totalLessons } = limits;
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Generate a complete course outline for "${topic}" at ${difficulty} level.

IMPORTANT: This course can be in ANY field - Technology, Business, Health, Creative Arts, Humanities, Science, Lifestyle, Professional Skills, Trades, Education, etc. 
Create comprehensive, engaging content appropriate for the topic's field.

TITLE REQUIREMENTS:
- Create a DESCRIPTIVE, SPECIFIC title that reflects the exact topic provided
- Include relevant context from the topic (e.g., curriculum, grade level, specialization)
- Examples:
  * Input: "chemistry for kenyan curriculum form 2" → Title: "Kenya Curriculum Form 2 Chemistry"
  * Input: "javascript for beginners" → Title: "JavaScript Fundamentals for Beginners"
  * Input: "digital marketing" → Title: "Complete Digital Marketing Course"
- DO NOT use generic titles like "Introduction to..." unless specifically requested
- Make the title professional and clear

Return ONLY valid JSON with this exact structure:
{
  "title": "string (descriptive, specific title based on topic)",
  "level": "${difficulty}",
  "totalModules": ${modules},
  "totalLessons": ${totalLessons},
  "modules": [
    {
      "id": number,
      "title": "string",
      "lessons": [
        { "title": "string", "content": "" }
      ]
    }
  ]
}
Exactly ${modules} modules, exactly ${lessonsPerModule} lessons each. No content in lessons. Only titles.`,
        },
        {
          role: "user",
          content: `Create a ${difficulty} level course on "${topic}" with ${modules} modules and ${totalLessons} lessons total.`,
        },
      ],
    });

    let course;
    try {
      const aiContent = completion.choices[0].message.content.trim();
      course = JSON.parse(aiContent);
    } catch (e) {
      console.warn("AI JSON failed, using fallback:", e.message);
      course = fallbackCourse(topic, difficulty, modules, lessonsPerModule);
    }

    // Enforce correct structure
    if (
      !course.modules ||
      course.modules.length !== modules ||
      course.modules.some(
        (m) => !m.lessons || m.lessons.length !== lessonsPerModule
      )
    ) {
      course = fallbackCourse(topic, difficulty, modules, lessonsPerModule);
    }

    // ─── SAVE COURSE (fire-and-forget) ───
    const courseId = new ObjectId();

    const courseDoc = {
      _id: courseId,
      userId: userId ? new ObjectId(userId) : null,
      title: course.title,
      topic: normalizedTopic,
      originalTopic: topic,
      difficulty,
      format: "course",
      level: difficulty,
      totalModules: course.totalModules,
      totalLessons: course.totalLessons,
      modules: course.modules.map((m, i) => ({
        ...m,
        id: i + 1,
        lessons: m.lessons.map((l, j) => ({
          ...l,
          id: `${i + 1}-${j + 1}`,
          content: "",
          completed: false,
          srs: {
            interval: 1,
            repetitions: 0,
            ease: 2.5,
            dueDate: new Date().toISOString(),
          },
        })),
      })),
      isPremium,
      progress: 0,
      completed: false,
      pinned: false,
      createdAt: new Date(),
      lastAccessed: new Date(),
    };

    try {
      await db.collection("library").insertOne(courseDoc);
      if (userId) {
        try {
          await db
            .collection("users")
            .updateOne(
              { _id: new ObjectId(userId) },
              { $inc: { monthlyUsage: 1 } }
            );
        } catch (e) {
          console.error("Failed to increment monthly usage", e);
        }
      }
    } catch (e) {
      // Handle duplicate key error gracefully (race conditions)
      if (e?.code === 11000) {
        console.warn(
          "Duplicate course insert detected, returning existing course"
        );
        const existing = await db.collection("library").findOne({
          userId: userId ? new ObjectId(userId) : null,
          topic: normalizedTopic,
          format: "course",
          difficulty,
        });
        if (existing) {
          return NextResponse.json({
            success: true,
            courseId: existing._id.toString(),
            content: {
              title: existing.title,
              topic: topic,
              level: difficulty,
              totalModules: existing.totalModules,
              totalLessons: existing.totalLessons,
              modules: existing.modules,
            },
            difficulty,
            isPremium,
            monthly: {
              used: monthlyUsage + 1, // may have been incremented by the other insert
              limit: limits.monthlyGenerations,
              resetsOn: resetDate.toLocaleDateString(),
            },
            features: [
              "Auto-resetting Monthly Limits",
              "Duplicate Protection (Free)",
              "Spaced Repetition Ready",
              "Shareable Links",
              "Bookmark & Pin",
              "Progress Tracking",
            ],
          });
        }
      }
      console.error("Failed to save course", e);
    }

    return NextResponse.json({
      success: true,
      courseId: courseId.toString(),
      // Provide full course content for clients expecting data.content.modules
      content: {
        title: course.title,
        topic: topic,
        level: difficulty,
        totalModules: course.totalModules,
        totalLessons: course.totalLessons,
        modules: courseDoc.modules,
      },
      difficulty,
      isPremium,
      monthly: {
        used: monthlyUsage + 1,
        limit: limits.monthlyGenerations,
        resetsOn: resetDate.toLocaleDateString(),
      },
      features: [
        "Auto-resetting Monthly Limits",
        "Duplicate Protection (Free)",
        "Spaced Repetition Ready",
        "Shareable Links",
        "Bookmark & Pin",
        "Progress Tracking",
      ],
    });
  } catch (error) {
    console.error("Course generation failed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate course",
        details: error.message,
      },
      { status: 500 }
    );
  }
} // forcing Vercel rebuild

export const POST = withCORS()(generateCourseHandler);

// Handle OPTIONS for preflight
export const OPTIONS = withCORS()(async () => {
  return new NextResponse(null, { status: 200 });
});

async function generateQuiz(topic, difficulty, questions, userId, db, monthlyUsage, resetDate, isPremium) {
  const questionsCount = questions || 10;
  try {
    // If db wasn't passed, connect now (fallback)
    if (!db) {
      const conn = await connectToDatabase();
      db = conn.db;
    }

    // Check for existing test with same topic and difficulty
    const normalizedTopic = topic.trim().toLowerCase();
    const existingTest = await db.collection("tests").findOne({
      $or: [
        { createdBy: userId ? new ObjectId(userId) : null },
        { userId: userId ? new ObjectId(userId) : null }
      ],
      course: { $regex: new RegExp(`^${normalizedTopic}$`, "i") },
      difficulty: difficulty,
    });

    if (existingTest) {
      // Return existing test instead of generating new one
      return NextResponse.json({
        success: true,
        quizId: existingTest._id.toString(),
        content: {
          title: existingTest.title,
          course: existingTest.course,
          questions: existingTest.questions,
        },
        exists: true,
        message: "Test already exists for this topic and difficulty level.",
      });
    }

    // Check user limits for quiz generation BEFORE calling OpenAI (saves tokens!)
    let quizCount = 0;
    if (userId) {
      const user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      // Count existing tests for this user created this month
      quizCount = await db.collection("tests").countDocuments({
        createdBy: new ObjectId(userId),
        createdAt: { $gte: startOfMonth }
      });

      const limit = isPremium ? 20 : 1;
      if (quizCount >= limit) {
        return NextResponse.json(
          {
            error: `Monthly test limit reached (${limit}). ${!isPremium ? "Upgrade to premium for up to 20 tests/mo." : ""}`,
            limit,
            used: quizCount,
            current: quizCount,
            isPremium: isPremium,
            resetsOn: resetDate ? resetDate.toLocaleDateString() : new Date().toLocaleDateString(),
          },
          { status: 429 }
        );
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 4000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Generate a professional examination-style quiz with ${questionsCount} multiple-choice questions about "${topic}" at ${difficulty} level.

DIFFICULTY GUIDELINES:
- Beginner: Basic concepts, definitions, fundamental principles, straightforward application
- Intermediate: Analysis, comparison, problem-solving, integration of concepts, practical application
- Advanced: Complex analysis, evaluation, synthesis, critical thinking, advanced problem-solving, real-world scenarios

QUESTION REQUIREMENTS:
- ALL questions must be MULTIPLE CHOICE with exactly 4 options (A, B, C, D)
- Questions must sound like real examination questions from professional certifications or university exams
- Avoid basic "what is" or definition questions
- Focus on analysis, application, evaluation, and problem-solving
- Each question must be clear, unambiguous, and professionally worded
- Questions should test deep understanding, not just memorization

ANSWER REQUIREMENTS:
- Exactly one correct answer per question
- All options must be plausible and professionally written
- Incorrect options should be common misconceptions or partial understandings
- Options should be similar in length and complexity

Return ONLY valid JSON with this exact structure:
{
  "title": "Professional Quiz Title",
  "course": "${topic}",
  "questions": [
    {
      "text": "Clear, professional examination-style question that tests understanding",
      "type": "multiple-choice",
      "points": ${difficulty === "beginner" ? 1 : difficulty === "intermediate" ? 2 : 3},
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": "Exact text of the correct option"
    }
  ]
}`,
        },
        {
          role: "user",
          content: `Create a ${difficulty} level professional examination quiz on "${topic}" with ${questionsCount} multiple-choice questions that test deep understanding and analytical skills.`,
        },
      ],
    });

    let quiz;
    try {
      quiz = JSON.parse(completion.choices[0].message.content.trim());
    } catch (e) {
      return NextResponse.json(
        { error: "Failed to parse quiz from AI response" },
        { status: 500 }
      );
    }


    // Limit check already performed before AI call (lines 540-567)


    const testDoc = {
      ...quiz,
      createdBy: userId ? new ObjectId(userId) : null, // Mongoose Schema compatible
      userId: userId ? new ObjectId(userId) : null,    // Backward compatibility
      difficulty,
      createdAt: new Date(),
    };

    const result = await db.collection("tests").insertOne(testDoc);

    // Increment API Usage for User
    if (userId) {
      try {
        await db
          .collection("users")
          .updateOne(
            { _id: new ObjectId(userId) },
            { $inc: { monthlyUsage: 1 } }
          );
      } catch (e) {
        console.error("Failed to increment monthly usage for quiz", e);
      }
    }

    return NextResponse.json({
      success: true,
      quizId: result.insertedId.toString(),
      content: quiz,
      monthly: {
        used: (monthlyUsage || 0) + 1,
        limit: isPremium ? 20 : 1, // Fallback hardcoded as limits not passed to quiz generator correctly
        resetsOn: resetDate ? resetDate.toLocaleDateString() : new Date().toLocaleDateString(),
      },
    });
  } catch (error) {
    console.error("Quiz generation failed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate quiz",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

// Fallback if AI fails
function fallbackCourse(topic, difficulty, modules, lessonsPerModule) {
  return {
    title: `${topic} - ${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)} Course`,
    level: difficulty,
    totalModules: modules,
    totalLessons: modules * lessonsPerModule,
    modules: Array.from({ length: modules }, (_, i) => ({
      id: i + 1,
      title: `Module ${i + 1}: ${i === 0 ? "Getting Started" : i === 1 ? "Core Concepts" : `Advanced Topics`}`,
      lessons: Array.from({ length: lessonsPerModule }, (_, j) => ({
        title: `Lesson ${i * lessonsPerModule + j + 1}: Key Concept ${j + 1}`,
        content: "",
      })),
    })),
  };
}
