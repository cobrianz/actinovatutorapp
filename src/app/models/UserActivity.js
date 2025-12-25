import mongoose from "mongoose";

const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    userEmail: {
      type: String,
      required: [true, "User email is required"],
      lowercase: true,
      trim: true,
    },
    activity: {
      type: String,
      required: [true, "Activity type is required"],
      enum: [
        "login",
        "logout",
        "signup",
        "email_verification",
        "password_reset_request",
        "password_reset",
        "profile_update",
        "course_enrolled",
        "course_completed",
        "course_bookmarked",
        "course_unbookmarked",
        "question_created",
        "question_deleted",
        "question_bookmarked",
        "question_unbookmarked",
        "subscription_created",
        "subscription_updated",
        "subscription_canceled",
        "payment_success",
        "payment_failed",
        "api_call",
        "page_view",
        "error",
        "other",
      ],
    },
    description: {
      type: String,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed, // Flexible object for additional data
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    sessionId: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
userActivitySchema.index({ userId: 1, timestamp: -1 });
userActivitySchema.index({ userEmail: 1, timestamp: -1 });
userActivitySchema.index({ activity: 1, timestamp: -1 });
userActivitySchema.index({ timestamp: -1 });

// Static method to log activity
userActivitySchema.statics.logActivity = async function (activityData) {
  try {
    const activity = new this(activityData);
    await activity.save();
    return activity;
  } catch (error) {
    console.error("Error logging user activity:", error);
    // Don't throw error to prevent disrupting main functionality
    return null;
  }
};

// Static method to get user activities
userActivitySchema.statics.getUserActivities = function (userId, options = {}) {
  const { limit = 50, skip = 0, activity, startDate, endDate } = options;

  const query = { userId };

  if (activity) {
    query.activity = activity;
  }

  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = startDate;
    if (endDate) query.timestamp.$lte = endDate;
  }

  return this.find(query).sort({ timestamp: -1 }).limit(limit).skip(skip);
};

// Static method to get activity statistics
userActivitySchema.statics.getActivityStats = function (
  userId,
  startDate,
  endDate
) {
  const matchStage = { userId };

  if (startDate || endDate) {
    matchStage.timestamp = {};
    if (startDate) matchStage.timestamp.$gte = startDate;
    if (endDate) matchStage.timestamp.$lte = endDate;
  }

  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: "$activity",
        count: { $sum: 1 },
        lastActivity: { $max: "$timestamp" },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

export default mongoose.models.UserActivity ||
  mongoose.model("UserActivity", userActivitySchema);
