import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/Post";
import Comment from "@/models/Comment";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "20", 10);

    // Find post
    const post = await Post.findOne({ slug, status: "published" });
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Get top-level comments (no parent) with pagination
    const skip = (page - 1) * limit;
    const comments = await Comment.find({
      postId: post._id,
      parentId: null,
      status: "active"
    })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const total = await Comment.countDocuments({
      postId: post._id,
      parentId: null,
      status: "active"
    });

    // Get replies for each comment
    const commentIds = comments.map(c => c._id);
    const replies = await Comment.find({
      parentId: { $in: commentIds },
      status: "active"
    })
      .populate("userId", "name email")
      .sort({ createdAt: 1 })
      .lean();

    // Group replies by parent
    const repliesByParent = {};
    replies.forEach(reply => {
      const parentId = reply.parentId.toString();
      if (!repliesByParent[parentId]) {
        repliesByParent[parentId] = [];
      }
      repliesByParent[parentId].push(formatComment(reply));
    });

    // Format comments with replies
    const formattedComments = comments.map((comment) => ({
      ...formatComment(comment),
      replies: repliesByParent[comment._id.toString()] || [],
    }));

    return NextResponse.json({
      comments: formattedComments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      }
    });
  } catch (error) {
    console.error("[GET /api/blog/[slug]/comments] Error:", error);
    return NextResponse.json(
      { error: "Failed to load comments" },
      { status: 500 }
    );
  }
}

export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { slug } = await params;

    // Get user from token - REQUIRED
    const token = (await cookies()).get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "You must be logged in to comment" },
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

    // Parse request body
    const body = await request.json();
    const { body: commentBody, parentId } = body;

    if (!commentBody || !commentBody.trim()) {
      return NextResponse.json(
        { error: "Comment cannot be empty" },
        { status: 400 }
      );
    }

    // If replying to a comment, verify parent exists
    if (parentId) {
      const parentComment = await Comment.findById(parentId);
      if (!parentComment || parentComment.postId.toString() !== post._id.toString()) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404 }
        );
      }
    }

    // Create comment
    const comment = new Comment({
      postId: post._id,
      userId: new ObjectId(decoded.id),
      body: commentBody.trim(),
      parentId: parentId ? new ObjectId(parentId) : null,
      likesCount: 0,
      repliesCount: 0,
      status: "active",
    });

    await comment.save();

    // Update parent comment's repliesCount if this is a reply
    if (parentId) {
      await Comment.findByIdAndUpdate(parentId, {
        $inc: { repliesCount: 1 }
      });
    }

    // Update post's commentsCount
    await Post.findByIdAndUpdate(post._id, {
      $inc: { commentsCount: 1 }
    });

    // Populate user data for response
    await comment.populate("userId", "name email");

    const formattedComment = formatComment(comment);

    return NextResponse.json({
      success: true,
      comment: formattedComment,
    });
  } catch (error) {
    console.error("[POST /api/blog/[slug]/comments] Error:", error);
    return NextResponse.json(
      { error: "Failed to add comment" },
      { status: 500 }
    );
  }
}

function formatComment(comment) {
  return {
    _id: comment._id.toString(),
    id: comment._id.toString(),
    body: comment.body,
    author: {
      name: comment.userId?.name || "Anonymous",
      email: comment.userId?.email,
    },
    likesCount: comment.likesCount || 0,
    repliesCount: comment.repliesCount || 0,
    createdAt: comment.createdAt,
    timeAgo: getTimeAgo(comment.createdAt),
  };
}

function getTimeAgo(date) {
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}
