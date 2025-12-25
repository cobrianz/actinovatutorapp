import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/Post";
import User from "@/models/User";
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

    // Find user and check if already bookmarked
    const user = await User.findById(decoded.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const postId = post._id.toString();
    const bookmarkIndex = user.bookmarks?.indexOf(postId) ?? -1;

    if (bookmarkIndex > -1) {
      // Remove bookmark
      user.bookmarks.splice(bookmarkIndex, 1);
    } else {
      // Add bookmark
      if (!user.bookmarks) user.bookmarks = [];
      user.bookmarks.push(postId);
    }

    await user.save();

    return NextResponse.json({
      success: true,
      bookmarked: bookmarkIndex === -1,
    });
  } catch (error) {
    console.error("[POST /api/blog/[slug]/bookmark] Error:", error);
    return NextResponse.json(
      { error: "Failed to toggle bookmark" },
      { status: 500 }
    );
  }
}
