import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
    {
        title: { type: String, required: true },
        slug: { type: String, required: true, unique: true, index: true },
        summary: { type: String, default: "" },
        excerpt: { type: String, default: "" }, // Short preview text
        content: { type: String, required: true }, // Markdown
        category: { type: String, required: true, default: "General", index: true },
        tags: { type: [String], default: [], index: true },
        thumbnailUrl: { type: String, default: null },
        author: {
            id: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
            name: { type: String, default: "Admin" },
            role: { type: String, default: "admin" },
            avatar: { type: String, default: null },
        },
        featured: { type: Boolean, default: false, index: true },
        trending: { type: Boolean, default: false },
        period: {
            type: String,
            enum: ["monthly", "weekly", null],
            default: null,
            index: true,
        },
        periodKey: { type: String, index: true }, // e.g., 2025-12 (monthly) or 2025-W49 (weekly)
        likesCount: { type: Number, default: 0 },
        commentsCount: { type: Number, default: 0 },
        viewsCount: { type: Number, default: 0 },
        readTime: { type: String, default: "5 min read" }, // e.g., "5 min read"
        publishedAt: { type: Date, default: Date.now, index: true },
        status: { type: String, enum: ["published", "draft"], default: "published", index: true },
    },
    { timestamps: true }
);

// Compound indexes for common queries
PostSchema.index({ status: 1, publishedAt: -1 });
PostSchema.index({ category: 1, status: 1 });
PostSchema.index({ featured: 1, status: 1 });

export default mongoose.models.Post || mongoose.model("Post", PostSchema);
