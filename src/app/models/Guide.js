import mongoose from "mongoose";

const guideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    topic: { type: String, required: true, trim: true },
    level: { type: String, enum: ["beginner", "intermediate", "advanced"], default: "beginner" },
    totalLessons: { type: Number, default: 0 },
    modules: [
      {
        id: Number,
        title: String,
        lessons: [
          {
            title: String,
            content: String,
          },
        ],
        cards: [
          {
            id: Number,
            front: String,
            back: String,
          },
        ],
      },
    ],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Guide || mongoose.model("Guide", guideSchema);


