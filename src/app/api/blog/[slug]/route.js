import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/Post";

export async function GET(_req, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const post = await Post.findOne({ slug, status: "published" });
    if (!post) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Increment view count
    post.viewsCount = (post.viewsCount || 0) + 1;
    await post.save();

    return NextResponse.json({ success: true, post });
  } catch (error) {
    console.error("[GET /api/blog/[slug]] Error:", error);
    return NextResponse.json(
      { error: "Failed to load article" },
      { status: 500 }
    );
  }
}
