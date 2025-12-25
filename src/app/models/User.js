import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      minlength: [2, "First name must be at least 2 characters"],
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      minlength: [2, "Last name must be at least 2 characters"],
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
    },
    role: {
      type: String,
      enum: ["student", "instructor", "admin"],
      default: "student",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended", "pending"],
      default: "pending",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetCode: String,
    passwordResetExpires: Date,
    refreshTokens: [
      {
        token: String,
        createdAt: {
          type: Date,
          default: Date.now,
          expires: 2592000, // 30 days
        },
      },
    ],
    lastLogin: Date,
    loginAttempts: {
      type: Number,
      default: 0,
    },
    lockUntil: Date,
    lastPasswordChange: Date,
    profile: {
      avatar: String,
      bio: {
        type: String,
        maxlength: [500, "Bio cannot exceed 500 characters"],
      },
      preferences: {
        theme: {
          type: String,
          enum: ["light", "dark", "auto"],
          default: "auto",
        },
        notifications: {
          email: {
            type: Boolean,
            default: true,
          },
          push: {
            type: Boolean,
            default: true,
          },
        },
      },
    },
    // User interests and preferences for personalized course generation
    interests: [
      {
        type: String,
      },
    ],
    interestCategories: [
      {
        type: String,
      },
    ],
    skillLevel: {
      type: String,
      enum: ["beginner", "intermediate", "advanced"],
    },
    goals: [
      {
        type: String,
      },
    ],
    timeCommitment: {
      type: String,
    },
    ageGroup: {
      type: String,
    },
    educationLevel: {
      type: String,
    },
    learningStyle: {
      type: String,
    },
    onboardingCompleted: {
      type: Boolean,
      default: false,
    },
    // Track which premium courses user has generated (to keep them from deletion)
    generatedPremiumCourses: [
      {
        courseId: String,
        courseTitle: String,
        generatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    courses: [
      {
        courseId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Course",
        },
        progress: {
          type: Number,
          default: 0,
          min: 0,
          max: 100,
        },
        completed: {
          type: Boolean,
          default: false,
        },
        enrolledAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    subscription: {
      plan: {
        type: String,
        enum: ["free", "pro", "team", "premium", "editors-choice"],
        default: "free",
      },
      status: {
        type: String,
        enum: ["active", "inactive", "canceled", "pending"],
        default: "inactive",
      },
      paystackReference: String,
      paystackTransactionId: String,
      paystackCustomerCode: String,
      paystackAuthorizationCode: String,
      paystackCardType: String,
      paystackLast4: String,
      startedAt: Date,
      expiresAt: Date,
      canceledAt: Date,
      autoRenew: {
        type: Boolean,
        default: true,
      },
    },
    billingHistory: [
      {
        type: {
          type: String,
          enum: ["subscription", "one-time", "refund"],
          default: "subscription",
        },
        description: String,
        amount: Number,
        currency: {
          type: String,
          default: "NGN",
        },
        date: {
          type: Date,
          default: Date.now,
        },
        reference: String,
        transactionId: String,
        paystackCustomerCode: String,
        channel: String,
        paymentMethod: String,
        fees: Number,
        paidAt: Date,
        ipAddress: String,
        status: {
          type: String,
          enum: ["success", "failed", "pending"],
          default: "pending",
        },
        authorization: {
          authorizationCode: String,
          cardType: String,
          last4: String,
          expMonth: String,
          expYear: String,
          bin: String,
          bank: String,
          countryCode: String,
          brand: String,
          reusable: Boolean,
          signature: String,
        },
        customer: {
          id: String,
          customerCode: String,
          firstName: String,
          lastName: String,
          email: String,
          phone: String,
        },
        plan: String,
        requestedAmount: Number,
      },
    ],
    // Explicit settings object to match API expectations
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: false },
        marketing: { type: Boolean, default: true },
        courseUpdates: { type: Boolean, default: true },
      },
      privacy: {
        profileVisible: { type: Boolean, default: true },
        progressVisible: { type: Boolean, default: false },
        achievementsVisible: { type: Boolean, default: true },
      },
      preferences: {
        theme: { type: String, default: "light" },
        language: { type: String, default: "en" },
        difficulty: { type: String, default: "beginner" },
        learningStyle: { type: String, default: "visual" },
        dailyGoal: { type: Number, default: 30 },
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: function (doc, ret) {
        delete ret.password;
        delete ret.refreshTokens;
        delete ret.emailVerificationToken;
        delete ret.passwordResetCode;
        delete ret.passwordResetExpires;
        delete ret.emailVerificationExpires;
        return ret;
      },
    },
  }
);

// Indexes for better performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ status: 1 });
userSchema.index({ role: 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for account lock status
userSchema.virtual("isLocked").get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    const bcrypt = await import("bcryptjs");
    const saltRounds = 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    const bcrypt = await import("bcryptjs");
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Instance method to increment login attempts
userSchema.methods.incLoginAttempts = function () {
  // If we have a previous lock that has expired, restart at 1
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { loginAttempts: 1 },
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };

  // Lock account after 5 failed attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 }; // 2 hours
  }

  return this.updateOne(updates);
};

// Instance method to reset login attempts
userSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $unset: { loginAttempts: 1, lockUntil: 1 },
  });
};

// Static method to find user by email
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Static method to find active users
userSchema.statics.findActive = function () {
  return this.find({ status: "active" });
};

export default mongoose.models.User || mongoose.model("User", userSchema);
