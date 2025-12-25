import mongoose from "mongoose";

const InteractionSchema = new mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
        postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true, index: true },
        type: { type: String, enum: ["like", "comment-like"], required: true },
        targetId: { type: mongoose.Schema.Types.ObjectId, default: null }, // for comment-like
    },
    { timestamps: true }
);

InteractionSchema.index({ userId: 1, postId: 1, type: 1, targetId: 1 }, { unique: true });

export default mongoose.models.Interaction || mongoose.model("Interaction", InteractionSchema);
