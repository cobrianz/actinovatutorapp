// src/app/api/explore/category/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CACHE_TTL_HOURS = 24;
const COURSES_PER_CATEGORY = 10;

export async function GET(request) {
  // Verify authentication from cookie or header
  let token = request.headers.get("authorization")?.split("Bearer ")[1];
  let userId;

  if (token) {
    try {
      const decoded = verifyToken(token);
      userId = decoded.id;
    } catch {
      // Header token invalid, try cookies
      token = (await cookies()).get("token")?.value;
      if (token) {
        try {
          const decoded = verifyToken(token);
          userId = decoded.id;
        } catch {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  } else {
    token = (await cookies()).get("token")?.value;
    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.id;
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  // Premium check
  const userDoc = await User.findById(userId).lean();
  const isPremium =
    userDoc?.subscription?.plan === "pro" &&
    userDoc?.subscription?.status === "active";

  if (!isPremium) {
    return NextResponse.json(
      {
        error: "Premium required",
        message: "Unlock full category exploration with Premium",
        upgrade: true,
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.trim();

  if (!category) {
    return NextResponse.json(
      { error: "Missing category parameter" },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const col = db.collection("explore_category_courses");

    // 1. Try cache first (24 hours)
    const cacheCutoff = new Date(Date.now() - CACHE_TTL_HOURS * 60 * 60 * 1000);
    const cached = await col.findOne({
      category: category,
      createdAt: { $gte: cacheCutoff },
    });

    if (cached?.courses?.length >= COURSES_PER_CATEGORY) {
      return NextResponse.json({
        success: true,
        courses: cached.courses,
        category,
        cached: true,
        refreshedAt: cached.createdAt,
      });
    }

    // 2. Generate fresh courses
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.85,
      max_tokens: 3800,
      messages: [
        {
          role: "system",
          content: `You are a world-class online course curator for 2025.
Generate EXACTLY ${COURSES_PER_CATEGORY} premium-quality courses in the "${category}" category.

Each course must have this exact structure:
{
  "title": "Catchy, specific title",
  "description": "Engaging 2-sentence description that makes people want to enroll",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimatedDuration": "4-12 weeks",
  "tags": ["tag1", "tag2", "tag3", "tag4"],
  "instructor": "Realistic name",
  "rating": 4.2-5.0,
  "students": 300-5000,
  "price": 49-299,
  "isPremium": true|false,
  "thumbnail": "/placeholder.svg?height=240&width=360",
  "modules": [
    { "title": "Module 1: Foundations", "lessons": ["Intro", "Setup", "First Project"] },
    // 4–8 modules total
  ]
}

Return ONLY a clean JSON array. No markdown. No explanations. Make them feel real and irresistible.`,
        },
        {
          role: "user",
          content: `Generate ${COURSES_PER_CATEGORY} amazing "${category}" courses for 2025 learners. Make them diverse in difficulty and focus.`,
        },
      ],
    });

    let courses = [];

    try {
      const raw = completion.choices[0].message.content
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(raw);
      courses = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.warn("AI failed to return valid JSON, using fallback", e);
    }

    // 3. Ultimate fallback — never fail
    if (courses.length < COURSES_PER_CATEGORY) {
      const fallbacks = {
        Programming: [
          "Next.js 15 – The Complete Guide",
          "TypeScript Mastery 2025",
          "Build SaaS with AI & Stripe",
          "React Native Mobile Apps",
          "Rust for WebAssembly",
        ],
        Design: [
          "Figma + AI: Design 10× Faster",
          "UI/UX Masterclass 2025",
          "Motion Design with After Effects",
          "Brand Identity System",
          "3D Design with Blender",
        ],
        AI: [
          "AI Agent Engineering",
          "Prompt Engineering Pro",
          "Build AI Startups",
          "Computer Vision with PyTorch",
          "LLM Fine-Tuning",
        ],
        Business: [
          "Freelance to $10k/mo",
          "AI-Powered Marketing",
          "No-Code Startup Launch",
          "Personal Brand OS",
          "Viral Content Strategy",
        ],
        default: [
          `${category} Fundamentals`,
          `Advanced ${category} Techniques`,
          `${category} Masterclass 2025`,
          `Practical ${category} Projects`,
          `${category} for Career Switchers`,
        ],
      };

      const titles = fallbacks[category] || fallbacks.default;

      courses = titles.slice(0, COURSES_PER_CATEGORY).map((title, i) => ({
        title,
        description: `Master ${title.toLowerCase()} with hands-on projects, real-world case studies, and expert mentorship. Join thousands of learners transforming their careers in 2025.`,
        difficulty: i < 3 ? "beginner" : i < 7 ? "intermediate" : "advanced",
        estimatedDuration: `${6 + i} weeks`,
        tags: [category.toLowerCase(), "2025", "career", "hands-on"],
        instructor: [
          "Sarah Chen",
          "Mike Torres",
          "Emma Li",
          "Alex Kim",
          "David Park",
        ][i % 5],
        rating: +(4.3 + Math.random() * 0.7).toFixed(1),
        students: 800 + Math.floor(Math.random() * 4200),
        price: 79 + i * 20,
        isPremium: i % 2 === 0,
        thumbnail: "/placeholder.svg?height=240&width=360",
        modules: [
          {
            title: "Week 1: Foundations",
            lessons: ["Welcome", "Tools Setup", "First Steps"],
          },
          {
            title: "Week 2-3: Core Skills",
            lessons: ["Deep Dive", "Patterns", "Best Practices"],
          },
          {
            title: "Week 4-5: Real Projects",
            lessons: ["Build Project 1", "Build Project 2", "Debugging"],
          },
          {
            title: "Final Week: Launch",
            lessons: ["Polish & Deploy", "Get Hired", "Next Steps"],
          },
        ],
      }));
    }

    // 4. Cache for 24 hours
    await col.deleteMany({ category });
    await col.insertOne({
      category,
      courses: courses.slice(0, COURSES_PER_CATEGORY),
      createdAt: new Date(),
      generatedBy: "gpt-4o-mini",
    });

    return NextResponse.json({
      success: true,
      category,
      courses: courses.slice(0, COURSES_PER_CATEGORY),
      cached: false,
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Category courses API error:", error);
    return NextResponse.json(
      { error: "Failed to load courses. Please try again." },
      { status: 500 }
    );
  }
}
