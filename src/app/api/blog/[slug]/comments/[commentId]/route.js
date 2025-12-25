import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Post from "@/models/Post";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";

export async function DELETE(request, { params }) {
    try {
        await connectToDatabase();
        const { commentId } = await params;

        // Get user from token - REQUIRED
        const token = (await cookies()).get("token")?.value;
        if (!token) {
            return NextResponse.json(
                { error: "You must be logged in to delete comments" },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded?.id) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Find comment
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Check if user owns the comment
        if (comment.userId.toString() !== decoded.id) {
            return NextResponse.json(
                { error: "You can only delete your own comments" },
                { status: 403 }
            );
        }

        // Mark as removed instead of deleting
        comment.status = "removed";
        comment.body = "[Comment removed]";
        await comment.save();

        // Update parent comment's repliesCount if this was a reply
        if (comment.parentId) {
            await Comment.findByIdAndUpdate(comment.parentId, {
                $inc: { repliesCount: -1 }
            });
        }

        // Update post's commentsCount
        await Post.findByIdAndUpdate(comment.postId, {
            $inc: { commentsCount: -1 }
        });

        return NextResponse.json({
            success: true,
            message: "Comment deleted successfully",
        });
    } catch (error) {
        console.error("[DELETE /api/blog/[slug]/comments/[commentId]] Error:", error);
        return NextResponse.json(
            { error: "Failed to delete comment" },
            { status: 500 }
        );
    }
}

export async function PATCH(request, { params }) {
    try {
        await connectToDatabase();
        const { commentId } = await params;

        // Get user from token - REQUIRED
        const token = (await cookies()).get("token")?.value;
        if (!token) {
            return NextResponse.json(
                { error: "You must be logged in to edit comments" },
                { status: 401 }
            );
        }

        const decoded = verifyToken(token);
        if (!decoded?.id) {
            return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }

        // Find comment
        const comment = await Comment.findById(commentId);
        if (!comment) {
            return NextResponse.json({ error: "Comment not found" }, { status: 404 });
        }

        // Check if user owns the comment
        if (comment.userId.toString() !== decoded.id) {
            return NextResponse.json(
                { error: "You can only edit your own comments" },
                { status: 403 }
            );
        }

        // Parse request body
        const body = await request.json();
        const { body: newBody } = body;

        if (!newBody || !newBody.trim()) {
            return NextResponse.json(
                { error: "Comment cannot be empty" },
                { status: 400 }
            );
        }

        // Update comment
        comment.body = newBody.trim();
        await comment.save();

        return NextResponse.json({
            success: true,
            comment: {
                _id: comment._id.toString(),
                body: comment.body,
            },
        });
    } catch (error) {
        console.error("[PATCH /api/blog/[slug]/comments/[commentId]] Error:", error);
        return NextResponse.json(
            { error: "Failed to edit comment" },
            { status: 500 }
        );
    }
}
