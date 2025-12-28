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

  // === Determine User Tier ===
  let userTier = "free";
  if (userId) {
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      { projection: { isPremium: 1, "subscription.plan": 1, "subscription.status": 1 } }
    );

    if (user?.subscription?.plan === "enterprise" && user?.subscription?.status === "active") {
      userTier = "enterprise";
    } else if (
      user?.isPremium ||
      (user?.subscription?.plan === "pro" && user?.subscription?.status === "active")
    ) {
      userTier = "pro";
    }
  }

  const isPremium = userTier !== "free";
  const wordCount = isPremium ? "3000–4000" : "2000–3000";

  // === Check Cache First (Return immediately if cached) ===
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

    if (cachedContent && cachedContent.length > 500 && !cachedContent.includes("coming soon")) {
      return NextResponse.json({
        content: cachedContent,
        cached: true,
        stream: false
      });
    }
  }

  // === Tier-Specific Visual Instructions ===
  let visualInstructions = "";

  if (userTier === "enterprise") {
    visualInstructions = `- **Visual Content (ENTERPRISE/PRO TIER)**:
    - You represent a premium learning experience. Use high-quality visual suggestions for any complex concept, especially structural biological or physical systems (e.g., Cell Structure, Human Heart, Atomic Models).
    - For flowcharts or processes: Use Mermaid.js code blocks (\`\`\`mermaid\n...\n\`\`\`). Use \`graph TD\` or \`graph LR\`.
    - **CRITICAL**: Do NOT output any "Justification" text. Just provide the visual tag or code block directly where it fits naturally.
    - **NEVER use ASCII art.**
    - **NO DALL-E/Image Generation** tags.`;
  } else if (userTier === "pro") {
    visualInstructions = `- **Visual Content (PRO TIER)**:
     - You represent a premium learning experience. Use high-quality visual suggestions for any complex concept, especially structural biological or physical systems (e.g., Cell Structure, Human Heart, Atomic Models).
    - For flowcharts or processes: Use Mermaid.js code blocks (\`\`\`mermaid\n...\n\`\`\`). Use \`graph TD\` or \`graph LR\`.
    - **CRITICAL**: Do NOT output any "Justification" text. Just provide the visual tag or code block directly where it fits naturally.
    - **NEVER use ASCII art.**
    - **NO DALL-E/Image Generation** tags.`;
  } else {
    visualInstructions = `- **Visual Content (FREE TIER)**:
    - Use clear, detailed text explanations for all concepts.
    - For comparisons, use numbered or bulleted lists with thorough explanations.
    - **NO tables, NO diagrams, NO Mermaid** (Premium features).
    - Focus on comprehensive written descriptions.`;
  }

  // === Generate New Content ===
  const promptBase = `Write an exhaustive, Harvard-level academic lesson in beautifully formatted Markdown.
The lesson should be scholarly, professional, and intellectually rigorous, akin to a graduate seminar at Harvard University. Aim for a minimum of 2000-3000 words, with deep critical analysis, historical context, and interdisciplinary connections.

**CRITICAL FORMATTING AND QUALITY REQUIREMENTS**:
- Adopt a formal, academic tone: Precise, objective, and evidence-based, as if authored by a tenured professor.
- Provide beautifully structured content: Use hierarchical headers (## for main sections, ### for subsections, #### for sub-subsections) for logical flow.
- Ensure well-explained concepts: Dive deeply into each idea with layered explanations, building from fundamentals to advanced insights. Use analogies, real-world applications, and critical evaluations (e.g., strengths, limitations, debates in the field).
- Break down complex topics: Employ step-by-step breakdowns, with transitional phrases for seamless readability.
- Incorporate scholarly elements: Include inline citations (e.g., (Smith, 2020)) where relevant, historical overviews, and forward-looking implications.
- Enhance readability: Use **bold** for key terms, *italics* for emphasis, numbered/bulleted lists for enumerations, > blockquotes for key quotes or definitions, and code blocks for examples.
- **NEVER use tables** - express all comparisons, data, or lists in richly detailed paragraph form or bulleted/numbered lists with full explanations.

Topic: ${courseTopic}
Module: ${moduleTitle || "Core Concepts"}
Lesson: ${lessonTitle}
Difficulty: ${difficulty}
Target length: ${wordCount} words
Access tier: ${userTier.toUpperCase()}

Structure the lesson as follows:
- ## Introduction: An engaging, scholarly overview with thesis-like statement and relevance to the field.
- ## Learning Objectives: 4-6 specific, measurable objectives in a bulleted list.
- ## Core Concepts: Exhaustive and comprehensive subsections. Provide extremely detailed explanations, covering every nuance, multiple complex examples, layered analogies, and deep critical analysis. Each concept should be explored thoroughly.
- ## Historical and Theoretical Context: Discuss evolution of the topic, key scholars, and debates.
- ## Practice Exercises: Exactly 5 challenging practice questions with detailed solutions. Use the following structure:
  - **Question in bold**
    - *Detailed answer in italics*
  (Each question must be a top-level bullet point, and the answer must be a nested bullet point under it).
- ## Key Takeaways: A synthesized summary in bulleted form, emphasizing core insights.
- ## Further Reading and Resources: Curated list of 5-8 academic sources (books, papers, journals) with brief annotations.

IMPORTANT: Be exhaustive—elaborate on every sub-topic with nuance and depth. Avoid brevity; aim for comprehensive, graduate-level discourse. Use proper Markdown throughout for a polished, professional appearance.`;

  // === Use Faster Model for Better Speed ===
  const model = isPremium ? "gpt-4o" : "gpt-4o-mini";

  const completion = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: "You are an elite Harvard professor crafting rigorous, beautifully articulated academic lessons in Markdown. Prioritize depth, clarity, and scholarly excellence—never skim or simplify unduly.",
      },
      { role: "user", content: promptBase },
    ],
    temperature: 0.65,
    max_tokens: isPremium ? 4096 : 3500,
  });

  const content = completion.choices[0]?.message?.content || "";

  // Save to DB
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
    ).catch(err => console.error("DB save failed:", err));
  }

  return NextResponse.json({ content });
}

// Handler for Image Generation removed as per user request
