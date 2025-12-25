import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/Post";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;

    // Get user from token
    const token = (await cookies()).get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const decoded = verifyToken(token);
    if (!decoded?.id) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    // Find post
    const post = await Post.findOne({ slug, status: "published" });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if user already liked
    const userId = decoded.id;
    const likedIndex = post.likedBy?.indexOf(userId) ?? -1;

    if (likedIndex > -1) {
      // Unlike: remove from likedBy and decrement likes
      post.likedBy.splice(likedIndex, 1);
      post.likes = Math.max(0, (post.likes || 0) - 1);
    } else {
      // Like: add to likedBy and increment likes
      if (!post.likedBy) post.likedBy = [];
      post.likedBy.push(userId);
      post.likes = (post.likes || 0) + 1;
    }

    await post.save();

    return NextResponse.json({
      success: true,
      liked: likedIndex === -1,
      likes: post.likes,
    });
  } catch (error) {
    console.error("[POST /api/blog/[slug]/like] Error:", error);
    return NextResponse.json(
      { error: "Failed to toggle like" },
      { status: 500 }
    );
  }
}
