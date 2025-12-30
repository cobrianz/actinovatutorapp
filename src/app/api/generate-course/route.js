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
    const normalizedTopic = topic.trim().toLowerCase();

    // ─── USER & PLAN INFO (needed for duplicate check and limits) ───
    let user = null;
    let limits = getUserPlanLimits(null); // Default to free limits
    let monthlyUsage = 0;
    let resetDate = new Date();

    if (userId) {
      user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });

      // Determine user's plan
      isPremium =
        user?.isPremium ||
        ((user?.subscription?.plan === "pro" || user?.subscription?.plan === "enterprise") && user?.subscription?.status === "active");

      limits = getUserPlanLimits(user);

      const now = new Date();
      const resetOn = user?.usageResetDate
        ? new Date(user.usageResetDate)
        : null;
      const shouldReset = !resetOn || now >= resetOn;

      if (shouldReset) {
        monthlyUsage = 0;
        resetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        // Don't update DB yet, only if a new generation occurs
      } else {
        monthlyUsage = user?.monthlyUsage || 0;
        resetDate = resetOn;
      }
    }

    // ─── DUPLICATE & SEMANTIC CHECK (Pre-Limit) ───
    // 1. Fetch all user's course topics
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

    // Find a match using fuzzy logic
    let existingCourse = userCourses.find(c => {
      if (c.difficulty && c.difficulty !== difficulty) return false;
      const cTopic = normalizeForMatch(c.topic || c.title || "");
      const cOriginal = normalizeForMatch(c.originalTopic || "");
      if (cTopic === targetNormalized || cOriginal === targetNormalized) return true;
      if (cTopic.includes(targetNormalized) || targetNormalized.includes(cTopic)) return true;
      const targetTokens = new Set(targetNormalized.split(" ").filter(t => t.length > 2));
      const cTokens = new Set(cTopic.split(" ").filter(t => t.length > 2));
      if (targetTokens.size === 0 || cTokens.size === 0) return false;
      let matchCount = 0;
      targetTokens.forEach(t => { if (cTokens.has(t)) matchCount++; });
      const overlapRatio = matchCount / Math.min(targetTokens.size, cTokens.size);
      return overlapRatio >= 0.75;
    });

    // 2. If no fuzzy match, try AI-based semantic check (only if user has many courses)
    if (!existingCourse && userCourses.length > 0 && userId) {
      try {
        const titles = userCourses.map(c => c.title || c.topic).join(", ");
        const semanticCheck = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{
            role: "user",
            content: `Is the topic "${topic}" semantically the same as any of these existing course titles: [${titles}]? 
            Return the title of the matching course if it's logically the same (e.g., "JS fundamentals" matches "JavaScript for Beginners"). 
            Return "NONE" if it's truly a different topic.
            Return ONLY the title or "NONE".`
          }],
          max_tokens: 20,
          temperature: 0,
        });

        const match = semanticCheck.choices[0].message.content.trim();
        if (match !== "NONE") {
          existingCourse = userCourses.find(c => (c.title === match || c.topic === match));
        }
      } catch (e) {
        console.error("Semantic check failed:", e);
      }
    }

    if (existingCourse) {
      // Fetch full document
      const fullExisting = await db.collection("library").findOne({ _id: existingCourse._id });
      if (fullExisting) {
        // Scenario 1: Course exists, user is premium, but course is NOT premium. Upgrade it.
        if (isPremium && !fullExisting.isPremium) {
          // --- LIMIT CHECK BEFORE UPGRADE ---
          if (userId) {
            const monthlyLimit = limits.monthlyGenerations;
            if (monthlyLimit !== -1 && monthlyUsage >= monthlyLimit) {
              return NextResponse.json({
                error: `Monthly generation limit reached (${monthlyLimit}). Upgrade for more!`,
                used: monthlyUsage,
                limit: monthlyLimit,
                resetsOn: resetDate.toLocaleDateString(),
                upgrade: true,
              }, { status: 429 });
            }
          }

          // Regenerate as a premium course and update
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
            course = fallbackCourse(topic, difficulty, modules, lessonsPerModule);
          }

          const updatedCourseDoc = {
            title: course.title,
            totalModules: course.totalModules,
            totalLessons: course.totalLessons,
            modules: course.modules.map((m, i) => ({
              ...m,
              id: i + 1,
              lessons: (m.lessons || []).map((l, j) => ({
                ...l,
                id: `${i + 1}-${j + 1}`,
                content: "",
                completed: false,
                srs: { interval: 1, repetitions: 0, ease: 2.5, dueDate: new Date().toISOString() },
              })),
            })),
            isPremium: true,
            lastAccessed: new Date(),
          };

          // ATOMIC UPDATE: Increment usage while updating library
          await db.collection("library").updateOne({ _id: fullExisting._id }, { $set: updatedCourseDoc });
          if (userId) {
            await db.collection("users").updateOne(
              { _id: new ObjectId(userId) },
              { $inc: { monthlyUsage: 1 } }
            );
          }

          return NextResponse.json({
            success: true,
            courseId: fullExisting._id.toString(),
            content: updatedCourseDoc,
            isExisting: true,
            wasUpgraded: true,
            message: "Course upgraded to premium!",
          });
        }

        return NextResponse.json({
          success: true,
          courseId: fullExisting._id.toString(),
          content: fullExisting,
          isExisting: true,
          message: "Loaded from library.",
        });
      }
    }

    // ─── LIMIT CHECK FOR NEW GENERATION ───
    if (userId) {
      const monthlyLimit = limits.monthlyGenerations;
      if (monthlyLimit !== -1 && monthlyUsage >= monthlyLimit) {
        return NextResponse.json({
          error: `Monthly generation limit reached (${monthlyLimit}). Upgrade for more!`,
          used: monthlyUsage,
          limit: monthlyLimit,
          resetsOn: resetDate.toLocaleDateString(),
          upgrade: !isPremium,
        }, { status: 429 });
      }

      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      if (format === "course") {
        const count = await db.collection("library").countDocuments({ userId: new ObjectId(userId), format: "course", createdAt: { $gte: startOfMonth } });
        const check = checkLimit(user, "courses", count);
        if (!check.allowed) return NextResponse.json({ error: `Monthly course limit reached (${check.limit}).`, used: count, limit: check.limit, upgrade: !isPremium }, { status: 429 });
      } else if (format === "quiz") {
        // Handled in generateQuiz, but let's check here too for consistency
        const count = await db.collection("library").countDocuments({ userId: new ObjectId(userId), format: "quiz", createdAt: { $gte: startOfMonth } });
        const check = checkLimit(user, "quizzes", count);
        if (!check.allowed) return NextResponse.json({ error: `Monthly quiz limit reached (${check.limit}).`, used: count, limit: check.limit, upgrade: !isPremium }, { status: 429 });
      }
    }

    if (format === "quiz") {
      return generateQuiz(topic, difficulty, questions, user, db, monthlyUsage, resetDate, limits);
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

async function generateQuiz(topic, difficulty, questions, user, db, monthlyUsage, resetDate, limits) {
  const userId = user?._id;
  const isPremium = limits.courses > 3; // Simple way to check if it's pro/enterprise
  const questionsCount = questions || 10;

  try {
    if (!db) {
      const conn = await connectToDatabase();
      db = conn.db;
    }

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
      return NextResponse.json({
        success: true,
        quizId: existingTest._id.toString(),
        content: existingTest,
        exists: true,
        message: "Loaded from library.",
      });
    }

    // --- LIMIT CHECK BEFORE AI ---
    if (userId) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const quizCount = await db.collection("tests").countDocuments({
        createdBy: new ObjectId(userId),
        createdAt: { $gte: startOfMonth }
      });

      const check = checkLimit(user, "quizzes", quizCount);
      if (!check.allowed) {
        return NextResponse.json({
          error: `Monthly quiz limit reached (${check.limit}).`,
          limit: check.limit,
          used: quizCount,
          resetsOn: resetDate.toLocaleDateString(),
          upgrade: !isPremium,
        }, { status: 429 });
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
      return NextResponse.json({ error: "Failed to parse quiz" }, { status: 500 });
    }

    const testDoc = {
      ...quiz,
      createdBy: userId ? new ObjectId(userId) : null,
      userId: userId ? new ObjectId(userId) : null,
      difficulty,
      createdAt: new Date(),
    };

    const result = await db.collection("tests").insertOne(testDoc);

    if (userId) {
      await db.collection("users").updateOne(
        { _id: new ObjectId(userId) },
        { $inc: { monthlyUsage: 1 } }
      );
    }

    return NextResponse.json({
      success: true,
      quizId: result.insertedId.toString(),
      content: quiz,
      monthly: {
        used: (monthlyUsage || 0) + 1,
        limit: limits.monthlyGenerations,
        resetsOn: resetDate.toLocaleDateString(),
      },
    });
  } catch (error) {
    console.error("Quiz generation failed:", error);
    return NextResponse.json({ error: "Failed to generate quiz", details: error.message }, { status: 500 });
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
