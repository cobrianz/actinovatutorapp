import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import Comment from "@/models/Comment";
import Interaction from "@/models/Interaction";
import mongoose from "mongoose";

async function getUserIdFromCookies() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    const payload = verifyToken(token);
    return payload?.id || null;
  } catch {
    return null;
  }
}

export async function POST(_req, { params }) {
  try {
    await connectToDatabase();
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const commentId = params.commentId;
    if (!mongoose.Types.ObjectId.isValid(commentId)) {
      return NextResponse.json(
        { error: "Invalid comment id" },
        { status: 400 }
      );
    }

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return NextResponse.json({ error: "Comment not found" }, { status: 404 });
    }

    await Interaction.findOneAndUpdate(
      {
        userId,
        postId: comment.postId,
        type: "comment-like",
        targetId: commentId,
      },
      {
        $setOnInsert: {
          userId,
          postId: comment.postId,
          type: "comment-like",
          targetId: commentId,
        },
      },
      { upsert: true, new: true }
    );

    const likesCount = await Interaction.countDocuments({
      postId: comment.postId,
      type: "comment-like",
      targetId: commentId,
    });
    await Comment.updateOne({ _id: commentId }, { $set: { likesCount } });
    return NextResponse.json({ success: true, likesCount });
  } catch (error) {
    console.error("[POST /blog/comments/:commentId/like] Error:", error);
    return NextResponse.json(
      { error: "Failed to like comment" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req, { params }) {
  try {
    await connectToDatabase();
    const userId = await getUserIdFromCookies();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const commentId = params.commentId;
    await Interaction.deleteOne({
      userId,
      type: "comment-like",
      targetId: commentId,
    });
    const likesCount = await Interaction.countDocuments({
      type: "comment-like",
      targetId: commentId,
    });
    await Comment.updateOne({ _id: commentId }, { $set: { likesCount } });
    return NextResponse.json({ success: true, likesCount });
  } catch (error) {
    console.error("[DELETE /blog/comments/:commentId/like] Error:", error);
    return NextResponse.json(
      { error: "Failed to unlike comment" },
      { status: 500 }
    );
  }
}
