// src/app/api/explore/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import OpenAI from "openai";
import { connectToDatabase } from "@/lib/mongodb";
import { getUserIdFromRequest } from "@/lib/userUtils";
import { ObjectId } from "mongodb";
import User from "@/models/User";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_YEAR = new Date().getFullYear();
const CATEGORY_CACHE_TTL = 24; // Hours
const TRENDING_CACHE_TTL = 7 * 24; // Hours
const COURSES_PER_CATEGORY = 10;

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category")?.trim();
  const { db } = await connectToDatabase();

  // 1. Auth & Personalization Context
  const userId = await getUserIdFromRequest(request);
  let userProfile = null;

  if (userId) {
    userProfile = await db.collection("users").findOne({ _id: userId });
  }

  // --- CASE A: Category Discovery ---
  if (category) {
    try {
      // 1. Check cache for this category
      const cacheCutoff = new Date(Date.now() - CATEGORY_CACHE_TTL * 60 * 60 * 1000);
      const cached = await db.collection("explore_category_courses").findOne({
        category: category,
        createdAt: { $gte: cacheCutoff },
      });

      if (cached?.courses?.length >= COURSES_PER_CATEGORY) {
        return NextResponse.json({
          success: true,
          courses: cached.courses,
          category,
          cached: true
        });
      }

      // 2. Generate via AI
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0.85,
        messages: [
          {
            role: "system",
            content: `You are a world-class online course curator for ${CURRENT_YEAR}.
Generate EXACTLY ${COURSES_PER_CATEGORY} premium-quality courses in the "${category}" category.

Each course must have this exact structure:
{
  "title": "Catchy, specific title",
  "description": "Engaging description",
  "difficulty": "beginner" | "intermediate" | "advanced",
  "estimatedDuration": "4-12 weeks",
  "tags": ["tag1", "tag2", "tag3"],
  "instructor": "Name",
  "rating": 4.5,
  "students": 1000,
  "isPremium": true|false,
  "modules": [{ "title": "Module 1", "lessons": ["Lesson 1"] }]
}

Return ONLY a clean JSON array.`
          },
          {
            role: "user",
            content: `Generate ${COURSES_PER_CATEGORY} amazing "${category}" courses.`
          }
        ]
      });

      let courses = [];
      try {
        const raw = completion.choices[0].message.content.replace(/```json/gi, "").replace(/```/g, "").trim();
        courses = JSON.parse(raw);
      } catch (e) {
        console.error("[Explore API] AI JSON fail", e);
        // Fallback or empty
      }

      if (courses.length > 0) {
        await db.collection("explore_category_courses").updateOne(
          { category },
          {
            $set: {
              courses: courses.slice(0, COURSES_PER_CATEGORY),
              createdAt: new Date(),
              userId: userId ? new ObjectId(userId) : null
            }
          },
          { upsert: true }
        );
      }

      return NextResponse.json({
        success: true,
        category,
        courses: courses.slice(0, COURSES_PER_CATEGORY),
        cached: false
      });
    } catch (error) {
      console.error("[Explore API] Category fail:", error);
      return NextResponse.json({ error: "Failed to generate category courses" }, { status: 500 });
    }
  }

  // --- CASE B: Trending Topics (Default) ---
  try {
    const userIdKey = userId || "anonymous";
    const cacheCutoff = new Date(Date.now() - TRENDING_CACHE_TTL * 60 * 60 * 1000);

    const cached = await db.collection("explore_trending").findOne({
      userId: userIdKey,
      createdAt: { $gte: cacheCutoff }
    });

    if (cached?.topics?.length >= 6) {
      return NextResponse.json({
        success: true,
        topics: cached.topics.slice(0, 6),
        source: "cache"
      });
    }

    // Personalization logic
    let personalization = "";
    if (userProfile) {
      const interests = userProfile.interests || [];
      if (interests.length > 0) {
        personalization = `\n\nLearner Interests: ${interests.join(", ")}. Tailor some topics to these areas.`;
      }
    }

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Generate 6 trending online course topics for ${CURRENT_YEAR}. 
Fields: AI, Business, Health, Creative Arts, Humanities, Science, Lifestyle.
Format: { title, description, category, difficulty, estimatedDuration, tags, whyTrending, hook, questions: [{question, answer}] }
Return ONLY a clean JSON array.${personalization}`
        },
        {
          role: "user",
          content: "What's trending in learning today?"
        }
      ],
      temperature: 0.9
    });

    let topics = [];
    try {
      const raw = completion.choices[0].message.content.replace(/```json/gi, "").replace(/```/g, "").trim();
      topics = JSON.parse(raw);
    } catch (e) {
      console.error("[Explore API] Trending AI JSON fail", e);
    }

    if (topics.length > 0) {
      await db.collection("explore_trending").updateOne(
        { userId: userIdKey },
        {
          $set: {
            topics: topics.slice(0, 6),
            createdAt: new Date()
          }
        },
        { upsert: true }
      );
    }

    return NextResponse.json({
      success: true,
      topics: topics.slice(0, 6),
      source: "ai-generated"
    });
  } catch (error) {
    console.error("[Explore API] Trending fail:", error);
    return NextResponse.json({ error: "Failed to load trending topics" }, { status: 500 });
  }
}
