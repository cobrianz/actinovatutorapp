import mongoose from "mongoose";

const CommentSchema = new mongoose.Schema(
    {
        postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        body: { type: String, required: true },
        parentId: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null, index: true },
        likesCount: { type: Number, default: 0 },
        repliesCount: { type: Number, default: 0 },
        status: { type: String, enum: ["active", "removed"], default: "active" },
    },
    { timestamps: true }
);

// Compound indexes for common queries
CommentSchema.index({ postId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ parentId: 1, status: 1 });

export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
