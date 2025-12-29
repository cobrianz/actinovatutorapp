// src/app/api/library/generate-lesson/route.js

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === Auth Helper ===
async function getUserId(request) {
  let token = request.headers.get("authorization")?.split("Bearer ")?.[1];

  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value;
  }

  if (!token) return null;

  try {
    const decoded = verifyToken(token);
    return decoded?.id ? new ObjectId(decoded.id) : null;
  } catch (err) {
    console.warn("Invalid token in generate-lesson:", err.message);
    return null;
  }
}

// === Main POST Handler ===
export async function POST(request) {
  const userId = await getUserId(request);
  const { db } = await connectToDatabase();

  try {
    const body = await request.json();
    const {
      courseId,
      moduleId,
      lessonIndex,
      lessonTitle,
      moduleTitle = "Core Concepts",
      courseTopic,
      difficulty = "intermediate",
    } = body;

    // === Input Validation ===
    if (!lessonTitle?.trim() || !courseTopic?.trim()) {
      return NextResponse.json(
        { error: "lessonTitle and courseTopic are required" },
        { status: 400 }
      );
    }

    if (moduleId === undefined || lessonIndex === undefined) {
      return NextResponse.json(
        { error: "moduleId and lessonIndex are required" },
        { status: 400 }
      );
    }

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
        cachedContent.trim() &&
        !cachedContent.includes("coming soon") &&
        cachedContent.length > 300
      ) {

        return NextResponse.json({
          success: true,
          content: cachedContent,
          cached: true,
        });
      }
    }

    // === Determine Premium Status ===
    let isPremium = false;
    if (userId) {
      const user = await db
        .collection("users")
        .findOne(
          { _id: userId },
          {
            projection: {
              isPremium: 1,
              "subscription.plan": 1,
              "subscription.status": 1,
            },
          }
        );
      isPremium =
        user?.isPremium ||
        (user?.subscription?.plan === "pro" &&
          user?.subscription?.status === "active");
    }

    const wordCount = isPremium ? "2400–3200" : "1400–1900";
    const depth = isPremium
      ? "extremely detailed with advanced concepts, real-world projects, and deep explanations"
      : "clear and detailed with practical examples";

    // === Generate Prompt ===
    const prompt = `Write a complete, high-quality educational lesson in Markdown format.

**Course Topic**: ${courseTopic}
**Module**: ${moduleTitle}
**Lesson Title**: ${lessonTitle}
**Difficulty**: ${difficulty}
**Target Length**: ${wordCount} words
**Access Level**: ${isPremium ? "Premium (very in-depth)" : "Free (detailed but concise)"}

Create ${depth} content including:
- Engaging introduction with learning objectives
- Step-by-step explanations
- Real-world examples and analogies
- Code snippets (if relevant) with syntax highlighting
- Practice exercises or challenges
- Common pitfalls and how to avoid them
- Key takeaways summary

Use beautiful Markdown:
- ## Main sections
- ### Subsections
- **bold** for key terms
- *italics* for emphasis
- \`inline code\`
- \`\`\`language blocks
- > Blockquotes for tips
- Numbered/bulleted lists

Make it engaging, professional, and perfectly structured.`;

    // === Call OpenAI ===
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a world-class educator creating premium lesson content in perfect Markdown.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.75,
      max_tokens: isPremium ? 4200 : 2800,
    });

    const content = completion.choices[0]?.message?.content?.trim();

    if (!content) {
      return NextResponse.json(
        { error: "Failed to generate content from AI" },
        { status: 500 }
      );
    }

    // === Save to DB (if course exists) ===
    if (courseId && ObjectId.isValid(courseId)) {
      try {
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

      } catch (saveError) {
        console.error("Failed to save lesson:", saveError);
        // Don't fail the request — user still gets content
      }
    }

    return NextResponse.json({
      success: true,
      content,
      cached: false,
      isPremium,
      wordCount: content.split(/\s+/).length,
    });
  } catch (error) {
    console.error("generate-lesson error:", error);
    return NextResponse.json(
      { error: "Failed to generate lesson content" },
      { status: 500 }
    );
  }
}
