// src/app/api/premium-courses/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// In-memory cache (auto-refreshes every 5 minutes)
let cachedData = null;
let lastFetched = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Seed data — beautiful, production-grade courses
const PREMIUM_COURSES_SEED = [
  {
    title: "Complete Full-Stack Development Bootcamp 2025",
    slug: "fullstack-bootcamp-2025",
    description:
      "Master React, Node.js, TypeScript, Next.js, and deploy production apps",
    instructor: "Sarah Chen",
    avatar: "/instructors/sarah-chen.jpg",
    duration: "12 weeks",
    students: 18750,
    rating: 4.95,
    reviews: 3421,
    difficulty: "Intermediate",
    category: "Full-Stack",
    thumbnail: "/courses/fullstack-2025.jpg",
    highlights: [
      "Build 6 portfolio-ready apps (SaaS, AI tools, e-commerce)",
      "Master TypeScript, tRPC, Prisma, NextAuth",
      "Deploy to Vercel, AWS, Railway",
      "Lifetime updates + private Discord",
    ],
    outcomes: [
      "Land $120k+ remote dev jobs",
      "Build production-grade apps solo",
      "Contribute to open source confidently",
    ],
    price: 229,
    originalPrice: 599,
    featured: true,
    bestseller: true,
    tags: ["React", "Next.js", "TypeScript", "Node.js", "Prisma", "tRPC"],
    modules: 10,
    lessons: 68,
    projects: 6,
    certificate: true,
    createdAt: new Date("2025-01-15"),
    updatedAt: new Date(),
  },
  {
    title: "AI Engineering Mastery",
    slug: "ai-engineering-2025",
    description:
      "Build and deploy production AI apps with LLMs, RAG, and agents",
    instructor: "Dr. Maya Patel",
    avatar: "/instructors/maya-patel.jpg",
    duration: "10 weeks",
    students: 12400,
    rating: 4.98,
    reviews: 2189,
    difficulty: "Advanced",
    category: "AI & ML",
    thumbnail: "/courses/ai-engineering.jpg",
    highlights: [
      "Fine-tune Llama 3 & Mistral",
      "Build RAG pipelines with Pinecone",
      "Create autonomous AI agents",
      "Deploy to production with monitoring",
    ],
    price: 399,
    originalPrice: 799,
    featured: false,
    bestseller: true,
    tags: ["Python", "LangChain", "LlamaIndex", "FastAPI", "Docker"],
    modules: 9,
    lessons: 52,
    projects: 4,
    certificate: true,
    createdAt: new Date("2025-02-20"),
    updatedAt: new Date(),
  },
  {
    title: "The Ultimate System Design Interview",
    slug: "system-design-masterclass",
    description: "Ace FAANG interviews with real-world system design patterns",
    instructor: "Alex Kim",
    avatar: "/instructors/alex-kim.jpg",
    duration: "8 weeks",
    students: 9800,
    rating: 4.93,
    reviews: 1890,
    difficulty: "Advanced",
    category: "Career",
    thumbnail: "/courses/system-design.jpg",
    highlights: [
      "Solve 50+ real interview questions",
      "Design Netflix, Uber, WhatsApp, TikTok",
      "Rate limiting, caching, sharding, queues",
      "Whiteboard + code solutions",
    ],
    price: 179,
    originalPrice: 399,
    featured: false,
    bestseller: false,
    tags: ["System Design", "Scalability", "Distributed Systems", "Interview"],
    modules: 7,
    lessons: 42,
    projects: 12,
    certificate: true,
    createdAt: new Date("2025-01-10"),
    updatedAt: new Date(),
  },
];

// Auto-seed only once in production
async function ensureCourses(db) {
  const col = db.collection("premium_courses");
  const count = await col.countDocuments();

  if (count === 0) {

    await col.insertMany(
      PREMIUM_COURSES_SEED.map((course) => ({
        ...course,
        _id: new ObjectId(),
      }))
    );

  }
}

export async function GET() {
  try {
    const { db } = await connectToDatabase();

    // Ensure data exists
    await ensureCourses(db);

    // Use cache if fresh
    const now = Date.now();
    if (cachedData && lastFetched && now - lastFetched < CACHE_TTL) {
      return NextResponse.json(cachedData);
    }

    const col = db.collection("premium_courses");

    const [featured, others] = await Promise.all([
      col.findOne({ featured: true }),
      col
        .find({ featured: { $ne: true } })
        .sort({ students: -1, rating: -1 })
        .toArray(),
    ]);

    const result = {
      featured,
      courses: others,
      total: others.length + (featured ? 1 : 0),
      updatedAt: new Date().toISOString(),
    };

    // Cache result
    cachedData = result;
    lastFetched = now;

    return NextResponse.json(result);
  } catch (error) {
    console.error("Premium courses API error:", error);
    return NextResponse.json(
      { error: "Failed to load premium courses" },
      { status: 500 }
    );
  }
}
