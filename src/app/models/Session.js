import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema(
  {
    sessionId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // null for anonymous users
    },
    startTime: {
      type: Date,
      required: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in milliseconds
      default: 0,
    },
    page: {
      type: String,
      required: true,
    },
    userAgent: {
      type: String,
    },
    ipAddress: {
      type: String,
    },
    referrer: {
      type: String,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    events: [
      {
        type: {
          type: String,
          enum: ["page_view", "click", "scroll", "form_interaction"],
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        data: mongoose.Schema.Types.Mixed,
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
sessionSchema.index({ userId: 1, startTime: -1 });
sessionSchema.index({ startTime: -1 });
sessionSchema.index({ isActive: 1 });

// Static methods
sessionSchema.statics.startSession = async function (sessionData) {
  try {
    const session = new this(sessionData);
    await session.save();
    return session;
  } catch (error) {
    console.error("Error starting session:", error);
    throw error;
  }
};

sessionSchema.statics.endSession = async function (sessionId, endData) {
  try {
    const { endTime, duration } = endData;
    const session = await this.findOneAndUpdate(
      { sessionId, isActive: true },
      {
        endTime,
        duration,
        isActive: false,
      },
      { new: true }
    );
    return session;
  } catch (error) {
    console.error("Error ending session:", error);
    throw error;
  }
};

sessionSchema.statics.getSessionStats = async function (startDate, endDate) {
  try {
    const matchStage = { isActive: false };
    if (startDate || endDate) {
      matchStage.startTime = {};
      if (startDate) matchStage.startTime.$gte = startDate;
      if (endDate) matchStage.startTime.$lte = endDate;
    }

    const stats = await this.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSessions: { $sum: 1 },
          totalDuration: { $sum: "$duration" },
          avgDuration: { $avg: "$duration" },
          minDuration: { $min: "$duration" },
          maxDuration: { $max: "$duration" },
        },
      },
    ]);

    return stats[0] || {
      totalSessions: 0,
      totalDuration: 0,
      avgDuration: 0,
      minDuration: 0,
      maxDuration: 0,
    };
  } catch (error) {
    console.error("Error getting session stats:", error);
    throw error;
  }
};

export default mongoose.models.Session || mongoose.model("Session", sessionSchema);
