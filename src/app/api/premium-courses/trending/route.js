// src/app/api/trending-courses/route.js

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache: 6 trending courses, refreshed every 24 hours
let cachedCourses = null;
let cacheTime = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

// Daily cleanup at 3 AM UTC
export const dynamic = "force-dynamic";


async function generateTrendingCourses(user = null) {
  const { db } = await connectToDatabase();
  const col = db.collection("premium_trending_courses");
  const userId = user?._id?.toString() || user?.id?.toString() || "anonymous";

  // Try cache first (user-specific)
  if (cachedCourses && cacheTime && Date.now() - cacheTime < CACHE_TTL) {
    // Check if cached courses belong to this user
    if (cachedCourses[0]?.userId === userId) {
      return cachedCourses;
    }
  }

  // Try fresh DB entries (last 24h, user-specific)
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await col
    .find({
      userId,
      generatedAt: { $gte: oneDayAgo }
    })
    .limit(6)
    .toArray();
  if (recent.length >= 6) {
    cachedCourses = recent.map(formatCourse);
    cacheTime = Date.now();
    return cachedCourses;
  }

  // Generate new ones with OpenAI
  const interests = user?.interests?.length ? user.interests.join(", ") : null;
  const goals = user?.goals?.length ? user.goals.join(", ") : null;
  const skill = user?.skillLevel || "intermediate";

  const prompt = `Generate exactly 6 premium, trending, DIVERSE courses for 2025 learners.
${interests ? `User is interested in: ${interests}` : ""}
${goals ? `User goals: ${goals}` : ""}
${skill ? `User skill level: ${skill}` : ""}

CRITICAL: Ensure MASSIVE variety across fields:
- Technology (AI, Programming, Web Dev, etc.) - MAX 2 courses
- Business & Entrepreneurship (Marketing, Finance, Management, etc.)
- Health & Wellness (Fitness, Nutrition, Mental Health, Medicine, etc.)
- Creative Arts (Design, Music, Writing, Photography, Art, etc.)
- Humanities (History, Philosophy, Languages, Literature, etc.)
- Science (Physics, Chemistry, Biology, Astronomy, etc.)
- Lifestyle (Cooking, Gardening, Crafts, Personal Development, etc.)
- Professional Skills (Leadership, Communication, Project Management, etc.)
- Trades & Technical Skills (Carpentry, Plumbing, Electrical, etc.)
- Education & Teaching (Pedagogy, Curriculum Design, etc.)

DO NOT generate all tech courses. Mix different fields based on user interests and global trends.

Return ONLY a valid JSON array of 6 course objects with these fields:
- title (specific, compelling, 50 chars max)
- description (2 sentences, why it's valuable)
- category (specific: "Next.js Mastery", "AI Agents", "Web3 Security", etc.)
- difficulty ("beginner", "intermediate", "advanced")
- estimatedDuration ("6 weeks", "10 weeks", etc.)
- tags (array of 5-7 strings)
- whyTrending (1 sentence explanation)
- learningOutcomes (array of 5 bullet skills)
- targetAudience (1 short sentence)

Ensure massive variety across ALL fields - NOT just tech. Include courses from:
- Technology (AI, Programming, etc.) - but limit to 1-2 max
- Business & Entrepreneurship
- Health & Wellness
- Creative Arts
- Humanities
- Science
- Lifestyle
- Professional Skills
- Trades & Technical Skills
- Education & Teaching

Prioritize 2025 trends across ALL fields, not just tech: AI agents, sustainable living, mental wellness, creative entrepreneurship, climate solutions, personal finance, remote work, etc.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    });

    let courses = JSON.parse(completion.choices[0].message.content);

    if (!Array.isArray(courses)) courses = courses.courses || [];

    courses = courses.slice(0, 6).map((c, i) => ({
      ...c,
      id: `trending-${Date.now()}-${i}`,
      userId,
      isPremium: true,
      isTrending: true,
      price: 0,
      generatedAt: new Date(),
    }));

    // Save to DB
    if (courses.length > 0) {
      await col.insertMany(courses);
    }

    cachedCourses = courses.map(formatCourse);
    cacheTime = Date.now();
    return cachedCourses;
  } catch (error) {
    console.error("AI generation failed:", error);
    return getFallbackCourses();
  }
}

function formatCourse(c) {
  return {
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    difficulty: c.difficulty,
    estimatedDuration: c.estimatedDuration,
    tags: c.tags,
    whyTrending: c.whyTrending,
    learningOutcomes: c.learningOutcomes,
    targetAudience: c.targetAudience,
    isPremium: true,
    isTrending: true,
    price: 0,
  };
}

function getFallbackCourses() {
  return [
    {
      id: "trending-fallback-1",
      title: "AI Agent Engineering with Autonomous Systems",
      description:
        "Build production-ready AI agents that can reason, act, and learn autonomously using the latest 2025 frameworks.",
      category: "AI Engineering",
      difficulty: "advanced",
      estimatedDuration: "10 weeks",
      tags: ["AI Agents", "LangGraph", "CrewAI", "Llama 3", "RAG"],
      whyTrending:
        "AI agents are replacing traditional apps — companies are hiring agent engineers at $300k+",
      learningOutcomes: [
        "Build multi-agent systems",
        "Implement long-term memory",
        "Deploy agents with tools & APIs",
        "Fine-tune for specific domains",
        "Monitor and debug agent behavior",
      ],
      targetAudience: "Developers wanting to lead the AI agent revolution",
      isPremium: true,
      isTrending: true,
      price: 0,
    },
    // ... 5 more beautiful fallbacks
  ];
}

// Daily cleanup (run via cron or Vercel Cron)
export async function cleanupOldTrendingCourses() {
  try {
    const { db } = await connectToDatabase();
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await db.collection("premium_trending_courses").deleteMany({
      generatedAt: { $lt: oneDayAgo },
    });
    console.log(`Cleaned ${result.deletedCount} old trending courses (all users)`);
  } catch (e) {
    console.error("Cleanup failed:", e);
  }
}

export async function GET(request) {
  const authHeader = request.headers.get("authorization");
  let user = null;

  if (authHeader?.startsWith("Bearer ")) {
    try {
      const token = authHeader.slice(7);
      const { verifyToken } = await import("@/lib/auth");
      const decoded = verifyToken(token);
      if (decoded?.id) {
        const { db } = await connectToDatabase();
        user = await db
          .collection("users")
          .findOne(
            { _id: new ObjectId(decoded.id) },
            {
              projection: {
                interests: 1,
                goals: 1,
                skillLevel: 1,
                isPremium: 1,
              },
            }
          );
      }
    } catch (e) {
      // Invalid token — continue as guest
    }
  }

  // Free users get cached version
  // Pro users get personalized + fresh
  const isPro = user?.isPremium || user?.subscription?.plan === "pro";

  if (!isPro) {
    return NextResponse.json(
      { error: "Trending courses are exclusive to Pro members", upgrade: true },
      { status: 403 }
    );
  }

  const courses = await generateTrendingCourses(user);

  return NextResponse.json({ courses });
}
