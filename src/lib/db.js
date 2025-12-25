import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";

// Connect to MongoDB using Mongoose
export async function connectToMongoDB() {
  try {
    await connectToDatabase();
    return true;
  } catch (error) {
    console.error("MongoDB connection error:", error);
    throw error;
  }
}

export async function createUser(userData) {
  try {
    await connectToMongoDB();
    const user = new User(userData);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
}

export async function findUserByEmail(email) {
  try {
    await connectToMongoDB();
    return await User.findOne({ email: email.toLowerCase() });
  } catch (error) {
    throw error;
  }
}

export async function verifyEmail(token) {
  try {
    await connectToMongoDB();
    const user = await User.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });

    if (!user) {
      throw new Error("Invalid or expired verification token");
    }

    user.emailVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    user.status = "active";

    await user.save();
    return user;
  } catch (error) {
    throw error;
  }
}

export async function regenerateEmailVerificationToken(userId) {
  try {
    await connectToMongoDB();
    const user = await User.findById(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    await user.save();
    return verificationToken;
  } catch (error) {
    throw error;
  }
}

// Add refresh token
export async function addRefreshToken(userId, token) {
  try {
    await connectToMongoDB();
    await User.findByIdAndUpdate(userId, {
      $push: {
        refreshTokens: { token },
      },
    });
  } catch (error) {
    console.error("Error adding refresh token:", error);
    throw error;
  }
}

// Update last login
export async function updateLastLogin(userId) {
  try {
    await connectToMongoDB();
    await User.findByIdAndUpdate(userId, {
      lastLogin: new Date(),
    });
  } catch (error) {
    console.error("Error updating last login:", error);
    throw error;
  }
}
