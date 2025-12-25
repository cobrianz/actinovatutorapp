// src/app/api/explore/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// === Seed Trending Topics (Only if collection is empty) ===
async function seedTrendingIfEmpty(db) {
  const trendingCol = db.collection("explore_trending");
  const count = await trendingCol.countDocuments();

  if (count === 0) {
    await trendingCol.insertMany([
      {
        title: "Artificial Intelligence Fundamentals",
        students: 2340,
        rating: 4.8,
        duration: "6 weeks",
        level: "Beginner",
        category: "AI/ML",
        instructor: "Dr. Sarah Johnson",
        thumbnail: "/placeholder.svg?height=200&width=300",
        description:
          "Learn the basics of AI and machine learning with hands-on projects",
        tags: ["Python", "TensorFlow", "Neural Networks", "Data Science"],
        price: 99,
        isPremium: false,
        createdAt: new Date(),
      },
      {
        title: "Full Stack Web Development",
        students: 1890,
        rating: 4.9,
        duration: "12 weeks",
        level: "Intermediate",
        category: "Programming",
        instructor: "Mike Chen",
        thumbnail: "/placeholder.svg?height=200&width=300",
        description:
          "Master both frontend and backend with modern technologies",
        tags: ["React", "Node.js", "MongoDB", "Express"],
        price: 149,
        isPremium: true,
        createdAt: new Date(),
      },
      {
        title: "Data Analysis with Python",
        students: 1560,
        rating: 4.7,
        duration: "8 weeks",
        level: "Beginner",
        category: "Data Science",
        instructor: "Emily Rodriguez",
        thumbnail: "/placeholder.svg?height=200&width=300",
        description: "Analyze data and create visualizations using Python",
        tags: ["Python", "Pandas", "Matplotlib", "Seaborn"],
        price: 79,
        isPremium: false,
        createdAt: new Date(),
      },
      {
        title: "Mobile App Development with React Native",
        students: 1230,
        rating: 4.6,
        duration: "10 weeks",
        level: "Intermediate",
        category: "Mobile Development",
        instructor: "Alex Kim",
        thumbnail: "/placeholder.svg?height=200&width=300",
        description: "Build cross-platform mobile apps using React Native",
        tags: ["React Native", "JavaScript", "iOS", "Android"],
        price: 129,
        isPremium: true,
        createdAt: new Date(),
      },
      {
        title: "Cloud Architecture with AWS",
        students: 980,
        rating: 4.8,
        duration: "9 weeks",
        level: "Intermediate",
        category: "Cloud & DevOps",
        instructor: "David Wilson",
        thumbnail: "/placeholder.svg?height=200&width=300",
        description: "Design scalable applications on AWS",
        tags: ["AWS", "EC2", "S3", "Lambda", "Docker"],
        price: 179,
        isPremium: true,
        createdAt: new Date(),
      },
      {
        title: "UI/UX Design Masterclass",
        students: 1450,
        rating: 4.9,
        duration: "7 weeks",
        level: "Beginner",
        category: "Design",
        instructor: "Lisa Park",
        thumbnail: "/placeholder.svg?height=200&width=300",
        description: "Create beautiful and user-friendly interfaces",
        tags: ["Figma", "User Research", "Prototyping", "Design Systems"],
        price: 119,
        isPremium: true,
        createdAt: new Date(),
      },
    ]);

    console.log("Seeded explore_trending with 6 courses");
  }
}

// === GET /api/explore → Returns only trending topics ===
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    await seedTrendingIfEmpty(db);

    const trendingTopics = await db
      .collection("explore_trending")
      .find({})
      .sort({ students: -1 })
      .limit(6)
      .toArray();

    // Clean output — no MongoDB internals
    const cleanTopics = trendingTopics.map((t) => ({
      title: t.title,
      students: t.students,
      rating: t.rating,
      duration: t.duration,
      level: t.level,
      category: t.category,
      instructor: t.instructor,
      thumbnail: t.thumbnail,
      description: t.description,
      tags: t.tags,
      price: t.price,
      isPremium: t.isPremium,
    }));

    return NextResponse.json({
      success: true,
      trendingTopics: cleanTopics,
    });
  } catch (error) {
    console.error("Explore API failed:", error);
    return NextResponse.json(
      { error: "Failed to load trending courses" },
      { status: 500 }
    );
  }
}
