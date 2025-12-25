import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import Comment from "@/models/Comment";
import Interaction from "@/models/Interaction";
import User from "@/models/User";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(request, { params }) {
    try {
        await connectToDatabase();
        const { commentId } = await params;

        // Get user from token - REQUIRED
        const token = (await cookies()).get("token")?.value;
        if (!token) {
            return NextResponse.json(
                { error: "You must be logged in to like comments" },
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

        const userId = new ObjectId(decoded.id);

        // Check if user already liked this comment
        const existingLike = await Interaction.findOne({
            userId,
            postId: comment.postId,
            type: "comment-like",
            targetId: comment._id,
        });

        if (existingLike) {
            // Unlike - remove the interaction
            await Interaction.deleteOne({ _id: existingLike._id });
            await Comment.findByIdAndUpdate(commentId, {
                $inc: { likesCount: -1 }
            });

            return NextResponse.json({
                success: true,
                liked: false,
                likesCount: Math.max(0, (comment.likesCount || 0) - 1),
            });
        } else {
            // Like - create interaction
            await new Interaction({
                userId,
                postId: comment.postId,
                type: "comment-like",
                targetId: comment._id,
            }).save();

            await Comment.findByIdAndUpdate(commentId, {
                $inc: { likesCount: 1 }
            });

            return NextResponse.json({
                success: true,
                liked: true,
                likesCount: (comment.likesCount || 0) + 1,
            });
        }
    } catch (error) {
        console.error("[POST /api/blog/[slug]/comments/[commentId]/like] Error:", error);
        return NextResponse.json(
            { error: "Failed to like comment" },
            { status: 500 }
        );
    }
}
