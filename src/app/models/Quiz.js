import mongoose from "mongoose";

const QuestionSchema = new mongoose.Schema({
  text: { type: String, required: true },
  type: {
    type: String,
    required: true,
    enum: ["multiple-choice", "true-false", "multiple-select"],
  },
  points: { type: Number, required: true },
  options: [{ type: String }],
  correctAnswer: { type: mongoose.Schema.Types.Mixed, required: true },
});

const PerformanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  score: { type: Number, required: true },
  totalMarks: { type: Number, required: true },
  percentage: { type: Number, required: true },
  completedAt: { type: Date, default: Date.now },
  answers: { type: mongoose.Schema.Types.Mixed },
});

const QuizSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    course: { type: String, required: true },
    questions: [QuestionSchema],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true },
    performances: [PerformanceSchema],
  },
  { timestamps: true }
);

export default mongoose.models.Test || mongoose.model("Test", QuizSchema);
