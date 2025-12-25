import mongoose from "mongoose";

const ContactSchema = new mongoose.Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        subject: { type: String, required: true },
        message: { type: String, required: true },
        category: {
            type: String,
            enum: ["general", "support", "enterprise", "partnership", "press"],
            default: "general",
        },
        status: {
            type: String,
            enum: ["new", "in-progress", "resolved", "closed"],
            default: "new",
        },
        adminNotes: { type: String, default: "" },
    },
    { timestamps: true }
);

// Index for admin queries
ContactSchema.index({ status: 1, createdAt: -1 });
ContactSchema.index({ category: 1 });

export default mongoose.models.Contact || mongoose.model("Contact", ContactSchema);
