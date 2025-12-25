import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/Post";
import {
  generateSeedPostsForPeriod,
  ensurePeriodPost,
} from "./utils/generator";

export async function GET(request) {
  try {
    await connectToDatabase();

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "10", 10);
    const skip = (page - 1) * limit;

    let [featured, posts, total] = await Promise.all([
      Post.find({ featured: true, status: "published" })
        .sort({ publishedAt: -1 })
        .limit(1)
        .lean(),
      Post.find({ status: "published" })
        .sort({ publishedAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Post.countDocuments({ status: "published" }),
    ]);

    // If there are no posts at all, generate a featured + one article for current month
    if (total === 0) {
      await generateSeedPostsForPeriod();
      // refetch after generation
      [featured, posts, total] = await Promise.all([
        Post.find({ featured: true, status: "published" })
          .sort({ publishedAt: -1 })
          .limit(1)
          .lean(),
        Post.find({ status: "published" })
          .sort({ publishedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        Post.countDocuments({ status: "published" }),
      ]);
    }

    // Ensure a monthly featured article exists for the current period
    await ensurePeriodPost("monthly");

    return NextResponse.json({
      success: true,
      featured: featured[0] || null,
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("[GET /api/blog] Error:", error);
    return NextResponse.json({ error: "Failed to load blog" }, { status: 500 });
  }
}
