// src/app/api/premium-courses/trending/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Cache is per-instance, but we rely mainly on DB "generatedAt" for persistence across serverless invocations
export const dynamic = "force-dynamic";

function getLastFriday() {
  const d = new Date();
  const day = d.getDay();
  const diff = (day <= 5 ? 7 : 0) + day - 5; // 5 is Friday
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

async function generateTrendingCourses(user = null) {
  const { db } = await connectToDatabase();
  const col = db.collection("premium_trending_courses");
  const userId = user?._id?.toString() || user?.id?.toString() || "anonymous";

  // 1. Weekly Logic: Check if we have courses generated AFTER the most recent Friday
  const lastFriday = getLastFriday();

  // Find valid recent courses for this user
  const recent = await col
    .find({
      userId,
      generatedAt: { $gte: lastFriday } // Must be generated on or after last Friday
    })
    .sort({ generatedAt: -1 }) // Newest first
    .limit(6)
    .toArray();

  if (recent.length >= 6) {
    return recent.map(formatCourse);
  }

  // 2. Cleanup: Remove old courses for this user (older than last Friday) to "clear" them
  await col.deleteMany({
    userId,
    generatedAt: { $lt: lastFriday }
  });

  // 3. Gather Context for Generation
  const interests = user?.interests?.length ? user.interests.join(", ") : "general technology and business";
  const goals = user?.goals?.length ? user.goals.join(", ") : "career advancement";
  const skill = user?.skillLevel || "intermediate";

  // Fetch recent interactions (Library)
  let recentTopics = "";
  if (user && user._id) {
    try {
      const libraryItems = await db.collection("library")
        .find({ userId: user._id })
        .sort({ lastAccessed: -1, createdAt: -1 })
        .limit(5)
        .toArray();
      if (libraryItems.length > 0) {
        recentTopics = libraryItems.map(i => i.topic || i.title).join(", ");
      }
    } catch (e) {
      console.error("Failed to fetch user interactions:", e);
    }
  }

  // 4. Generate with OpenAI
  const prompt = `Generate exactly 6 premium, trending, DIVERSE courses for a user.
  
  USER PROFILE:
  - Interests: ${interests}
  - Goals: ${goals}
  - Skill Level: ${skill}
  - Recent Interactions (User generated/studied): ${recentTopics}

  CONTEXT:
  It is currently ${new Date().getFullYear()}. Generate courses that are trending RIGHT NOW.
  These should be FRESH, premium topics.
  
  If the user has recent interactions, suggest "Next Step" courses or complementary topics. 
  e.g., if they studied "React", suggest "Next.js 15" or "React Performance".
  
  CRITICAL: Ensure variety. Do NOT just list 6 similar courses.
  Mix:
  1. Direct interest matches
  2. "Next Step" from interactions
  3. One "Wildcard" trending topic (e.g., AI Agents, Climate Tech, Biohacking).

  Return ONLY a valid JSON array of 6 course objects with these fields:
  - title (compelling, max 50 chars)
  - description (2 sentences, value prop)
  - category (specific)
  - difficulty ("beginner", "intermediate", "advanced")
  - estimatedDuration ("4 weeks", "8 weeks", etc)
  - tags (5-7 strings)
  - whyTrending (1 sentence, why now?)
  - learningOutcomes (5 bullet points)
  - targetAudience (1 sentence)

  NO FALLBACKS. If you cannot generate, return empty array.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Cost effective, high quality
      messages: [{ role: "user", content: prompt }],
      temperature: 0.9,
      max_tokens: 2000,
      response_format: { type: "json_object" },
    });

    let courses = JSON.parse(completion.choices[0].message.content);
    if (!Array.isArray(courses)) courses = courses.courses || [];

    if (!Array.isArray(courses) || courses.length === 0) {
      return []; // No fallback
    }

    // Add metadata
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

    return courses.map(formatCourse);
  } catch (error) {
    console.error("AI generation failed for trending:", error);
    return []; // No fallback as requested
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
    badge: "Trending", // Useful for UI
    price: 0,
  };
}

export async function GET(request) {
  let user = null;
  let token = request.headers.get("authorization")?.split("Bearer ")[1];
  const headerUserId = request.headers.get("x-user-id");

  if (token) {
    try {
      const { verifyToken } = await import("@/lib/auth");
      const decoded = verifyToken(token);
      if (decoded?.id) {
        const { db } = await connectToDatabase();
        user = await db.collection("users").findOne(
          { _id: new ObjectId(decoded.id) },
          {
            projection: {
              interests: 1,
              goals: 1,
              skillLevel: 1,
              isPremium: 1,
              subscription: 1
            },
          }
        );
      }
    } catch (e) {
      console.error("Auth header failed for trending:", e);
      // Fallback to cookie check below
    }
  }

  // If header auth failed or was missing, check cookies
  if (!user) {
    token = (await cookies()).get("token")?.value;
    if (token) {
      try {
        const { verifyToken } = await import("@/lib/auth");
        const decoded = verifyToken(token);
        if (decoded?.id) {
          const { db } = await connectToDatabase();
          user = await db.collection("users").findOne(
            { _id: new ObjectId(decoded.id) },
            {
              projection: {
                interests: 1,
                goals: 1,
                skillLevel: 1,
                isPremium: 1,
                subscription: 1
              },
            }
          );
        }
      } catch (e) {
        console.error("Cookie auth failed for trending:", e);
      }
    }
  }

  // Final fallback to x-user-id if provided (for discovery/testing or specific flows)
  if (!user && headerUserId) {
    try {
      const { db } = await connectToDatabase();
      user = await db.collection("users").findOne(
        { _id: new ObjectId(headerUserId) },
        {
          projection: {
            interests: 1,
            goals: 1,
            skillLevel: 1,
            isPremium: 1,
            subscription: 1
          },
        }
      );
    } catch (e) {
      console.error("Header userId lookup failed:", e);
    }
  }

  if (!user) {
    // Anonymous/Public trending could be handled here if desired, 
    // but for this specific "based on user interests" request, we probably return empty or generic.
    // User prompt implies this is for the user. "based on user interests on onboarding".
    // So we return error or empty if no user.
    return NextResponse.json({ courses: [] });
  }

  const courses = await generateTrendingCourses(user);
  return NextResponse.json({ courses });
}
