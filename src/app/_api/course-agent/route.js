// src/app/api/ai/tutor/route.js

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === Shared Auth Helper ===
async function getUserId(request) {
  let token = request.headers.get("authorization")?.split("Bearer ")?.[1];

  if (!token) {
    token = (await cookies()).get("token")?.value;
  }

  if (!token) return null;

  try {
    const decoded = verifyToken(token);
    return decoded?.id ? decoded.id : null;
  } catch (err) {
    console.warn("Invalid token in AI route:", err.message);
    return null;
  }
}

// === Helper: Get Premium Status ===
async function getPremiumStatus(db, userId) {
  if (!userId) return false;
  try {
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          isPremium: 1,
          "subscription.plan": 1,
          "subscription.status": 1,
        },
      }
    );
    return (
      user?.isPremium ||
      (user?.subscription?.plan === "pro" &&
        user?.subscription?.status === "active")
    );
  } catch {
    return false;
  }
}

// === MAIN HANDLER ===
export async function POST(request) {
  const userId = await getUserId(request);
  const { db } = await connectToDatabase();

  try {
    const body = await request.json();
    const { action } = body;

    // === 1. Generate Lesson Content ===
    if (action === "generateLesson") {
      return await handleGenerateLesson(body, userId, db);
    }

    // === 2. AI Q&A (Default) ===
    return await handleAIQuestion(body, userId, db);
  } catch (error) {
    console.error("AI Tutor API Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// === Handle AI Q&A ===
async function handleAIQuestion(body, userId, db) {
  const {
    question,
    courseContent = "",
    lessonTitle = "the lesson",
    context = "",
    action = "answer", // "checkRelevance" or "answer"
  } = body;

  if (!question?.trim()) {
    return NextResponse.json(
      { error: "Question is required" },
      { status: 400 }
    );
  }

  // Extract course title from context (format: "Course: [title], Level: ...")
  const courseTitleMatch = context.match(/Course:\s*([^,]+)/);
  const courseTitle = courseTitleMatch
    ? courseTitleMatch[1].trim()
    : lessonTitle;

  if (action === "checkRelevance") {
    // Only check if question is related to course
    const relevancePrompt = `You are evaluating if a student's question is related to their course.

Course Title: ${courseTitle}
Course Context: ${context.substring(0, 500)}
Course Content Preview: ${courseContent.substring(0, 2000)}

Question: "${question}"

Respond with ONLY "YES" if the question is related to the course topic or any content in the course.
Respond with ONLY "NO" if the question is completely unrelated to the course.`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: relevancePrompt },
        { role: "user", content: question.trim() },
      ],
      temperature: 0.1, // Low temperature for consistent yes/no
      max_tokens: 10, // Very short response
    });

    const response = completion.choices[0]?.message?.content
      ?.trim()
      ?.toUpperCase();

    if (!response) {
      return NextResponse.json(
        { error: "Could not evaluate relevance" },
        { status: 500 }
      );
    }

    const isRelevant = response.includes("YES");

    return NextResponse.json({
      success: true,
      relevant: isRelevant,
    });
  }

  // Action: "answer" - provide the actual answer
  const systemPrompt = `You are an expert AI tutor helping students learn from their course material.

Provide a direct, concise answer to the student's question based on the course content. Use markdown formatting to **bold** key terms and concepts.

RULES:
- Answer ONLY the question asked
- Keep responses under 100 words
- Be direct and to the point
- **Bold** important terms, concepts, and key words using markdown
- Use the course content as reference but don't quote it verbatim
- If the question asks for a definition, give just the definition
- If the question asks for an explanation, give just the explanation needed

Course Title: ${courseTitle}
Course Content Reference: ${courseContent.substring(0, 12000)}`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: question.trim() },
    ],
    temperature: 0.7,
    max_tokens: 200, // Reduced for concise answers
  });

  const response = completion.choices[0]?.message?.content?.trim();

  if (!response) {
    return NextResponse.json(
      { error: "No response generated" },
      { status: 500 }
    );
  }

  // Save conversation (fire-and-forget)
  if (userId) {
    db.collection("ai_conversations")
      .insertOne({
        userId,
        question,
        response,
        lessonTitle,
        context: context.substring(0, 500),
        createdAt: new Date(),
      })
      .catch(() => { });
  }

  return NextResponse.json({
    success: true,
    response,
    timestamp: new Date().toISOString(),
  });
}

// === Handle Lesson Generation ===
async function handleGenerateLesson(body, userId, db) {
  const {
    courseId,
    moduleId,
    lessonIndex,
    lessonTitle,
    moduleTitle,
    courseTopic,
    difficulty = "intermediate",
  } = body;

  if (!lessonTitle || !courseTopic) {
    return NextResponse.json(
      { error: "lessonTitle and courseTopic are required" },
      { status: 400 }
    );
  }

  const isPremium = await getPremiumStatus(db, userId);
  const wordCount = isPremium ? "2500–3000" : "1500–2000";

  // === Check Cache First ===
  if (courseId && ObjectId.isValid(courseId)) {
    const course = await db.collection("library").findOne(
      { _id: new ObjectId(courseId) },
      {
        projection: {
          [`modules.${moduleId - 1}.lessons.${lessonIndex}.content`]: 1,
        },
      }
    );

    const cachedContent =
      course?.modules?.[moduleId - 1]?.lessons?.[lessonIndex]?.content;

    if (
      cachedContent &&
      cachedContent.length > 500 &&
      !cachedContent.includes("coming soon")
    ) {
      console.log("Cache hit for lesson:", lessonTitle);
      return NextResponse.json({ content: cachedContent, cached: true });
    }
  }

  // === Generate New Content ===
  const promptBase = `Write an extremely detailed, high-quality educational lesson in Markdown.
The lesson should be comprehensive, in-depth, and around 1000-1500 words minimum.

Topic: ${courseTopic}
Module: ${moduleTitle || "Core Concepts"}
Lesson: ${lessonTitle}
Difficulty: ${difficulty}
Target length: ${wordCount} words
Access tier: ${isPremium ? "Premium" : "Free"}

Include:
- Engaging and thorough introduction
- Clear, specific learning objectives
- In-depth step-by-step explanations with multiple examples
- Industry best practices and common pitfalls
- Detailed code examples (if relevant) with line-by-line explanations
- Real-world analogies and visuals (describe in detail)
- 3-5 Practice exercises with solutions
- Comprehensive Key takeaways
- A specific "Further Reading" section with suggested topics

Use proper Markdown: ##, ###, **bold**, *italics*, \`\`\`code\`\`\`, > quotes, lists.
IMPORTANT: Avoid being concise. Dive deep into every sub-topic.`;

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content:
          "You are an elite academic educator writing exhaustive, high-value lesson content in Markdown. You never skip details.",
      },
      { role: "user", content: promptBase },
    ],
    temperature: 0.75,
    max_tokens: isPremium ? 4000 : 3000,
  });

  let content = completion.choices[0]?.message?.content?.trim();

  if (!content) {
    return NextResponse.json(
      { error: "Failed to generate content" },
      { status: 500 }
    );
  }

  // Ensure minimum length (at least 1000 words). If below threshold, attempt expansion.
  const countWords = (txt) => (txt || "").split(/\s+/).filter(Boolean).length;
  let attempts = 0;
  while (countWords(content) < 1000 && attempts < 2) {
    attempts += 1;
    const expandPrompt = `${promptBase}\n\nThe lesson above is only ${countWords(content)} words. Please expand it significantly to reach at least 1000-1200 words. Add more examples, deeper explanations for each section, and more practice scenarios. Keep the same structure.`;
    const expandResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a content expansion specialist for high-end educational courses." },
        { role: "user", content: expandPrompt },
      ],
      temperature: 0.8,
      max_tokens: isPremium ? 4000 : 3500,
    });
    const expanded = expandResp.choices[0]?.message?.content?.trim();
    if (expanded && countWords(expanded) > countWords(content)) {
      content = expanded;
    } else {
      break;
    }
  }

  // === Save to DB (if valid courseId) ===
  if (courseId && ObjectId.isValid(courseId)) {
    const updatePath = `modules.${moduleId - 1}.lessons.${lessonIndex}.content`;
    await db.collection("library").updateOne(
      { _id: new ObjectId(courseId) },
      {
        $set: {
          [updatePath]: content,
          lastGenerated: new Date(),
        },
      }
    );
  }

  return NextResponse.json({
    success: true,
    content,
    cached: false,
    isPremium,
  });
}
