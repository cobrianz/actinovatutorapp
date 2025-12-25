// src/lib/db.js - Database utilities


import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import bcrypt from "bcryptjs";

// Alias for backward compatibility
export const connectToMongoDB = connectToDatabase;
export const connectToDB = connectToDatabase;

// Ensure DB connection
async function ensureConnection() {
  try {
    await connectToDatabase();
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw new Error("Database connection failed: " + error.message);
  }
}

// ──────────────────────────────────────────────────────────────
// CREATE USER
// ──────────────────────────────────────────────────────────────
export async function createUser({
  firstName,
  lastName,
  email,
  password,
  role = "student",
}) {
  await ensureConnection();

  const normalizedEmail = email.toLowerCase().trim();

  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new Error("Email already registered");
  }

  const emailVerificationCode = Math.floor(
    100000 + Math.random() * 900000
  ).toString(); // 6-digit

  const user = new User({
    firstName,
    lastName,
    email: normalizedEmail,
    password, // hashed by pre-save hook
    role,
    status: "pending",
    emailVerificationCode,
    emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
  });

  await user.save();
  return user;
}

// ──────────────────────────────────────────────────────────────
// FIND USER
// ──────────────────────────────────────────────────────────────
export async function findUserByEmail(email) {
  await ensureConnection();
  return await User.findOne({ email: email.toLowerCase().trim() });
}

export async function findUserById(id) {
  await ensureConnection();
  return await User.findById(id);
}

// ──────────────────────────────────────────────────────────────
// PASSWORD RESET: SET CODE (6-digit, stored as plain + bcrypt hash)
// ──────────────────────────────────────────────────────────────
export async function setPasswordResetCode(email) {
  await ensureConnection();

  const normalizedEmail = email.toLowerCase().trim();
  const user = await findUserByEmail(normalizedEmail);

  if (!user) {
    // Still return fake code in dev so flow doesn't break during testing
    if (process.env.NODE_ENV !== "production") {
      const fakeCode = Math.floor(100000 + Math.random() * 900000).toString();
      // Development mode: return fake code for testing
      return {
        code: fakeCode,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      };
    }
    throw new Error("User not found");
  }

  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedCode = await bcrypt.hash(code, 12);
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordResetCode: hashedCode,
        passwordResetPlain: code, // stored temporarily (only for dev + email)
        passwordResetExpires: expiresAt,
      },
    }
  );

  // Reset code generated successfully
  return { code, expiresAt };
}

// ──────────────────────────────────────────────────────────────
// VERIFY RESET CODE (compares against hash)
// ──────────────────────────────────────────────────────────────
export async function verifyResetCode(email, code) {
  await ensureConnection();

  const user = await User.findOne({
    email: email.toLowerCase().trim(),
    passwordResetExpires: { $gt: new Date() },
  });

  if (!user) return null;

  const isValid = await bcrypt.compare(code, user.passwordResetCode || "");
  return isValid ? user : null;
}

// ──────────────────────────────────────────────────────────────
// RESET PASSWORD WITH CODE
// ──────────────────────────────────────────────────────────────
export async function resetPasswordWithCode(email, code, newPassword) {
  await ensureConnection();

  const user = await verifyResetCode(email, code);
  if (!user) {
    throw new Error("Invalid or expired reset code");
  }

  user.password = newPassword; // triggers pre-save hash
  user.passwordResetCode = undefined;
  user.passwordResetPlain = undefined;
  user.passwordResetExpires = undefined;
  user.status = "active";
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  await user.save();
  return user;
}

// ──────────────────────────────────────────────────────────────
// EMAIL VERIFICATION
// ──────────────────────────────────────────────────────────────
export async function verifyEmail(code) {
  await ensureConnection();

  const user = await User.findOne({
    emailVerificationCode: code,
    emailVerificationExpires: { $gt: new Date() },
  });

  if (!user) throw new Error("Invalid or expired verification code");

  user.emailVerified = true;
  user.status = "active";
  user.emailVerificationCode = undefined;
  user.emailVerificationExpires = undefined;

  await user.save();
  return user;
}

export async function regenerateEmailVerificationCode(userId) {
  await ensureConnection();

  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");
  if (user.emailVerified) throw new Error("Email already verified");

  const code = Math.floor(100000 + Math.random() * 900000).toString();

  user.emailVerificationCode = code;
  user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await user.save();
  return code;
}

// ──────────────────────────────────────────────────────────────
// REFRESH TOKENS
// ──────────────────────────────────────────────────────────────
export async function addRefreshToken(userId, token) {
  await ensureConnection();
  await User.findByIdAndUpdate(userId, {
    $push: { refreshTokens: { token, createdAt: new Date() } },
  });
}

export async function removeRefreshToken(userId, token) {
  await ensureConnection();
  await User.findByIdAndUpdate(userId, {
    $pull: { refreshTokens: { token } },
  });
}

export async function removeAllRefreshTokens(userId) {
  await ensureConnection();
  await User.findByIdAndUpdate(userId, { $set: { refreshTokens: [] } });
}

// ──────────────────────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────────────────────
export async function updateLastLogin(userId) {
  await ensureConnection();
  await User.findByIdAndUpdate(userId, { lastLogin: new Date() });
}

export async function getAllUsers({ page = 1, limit = 10, status } = {}) {
  await ensureConnection();

  const query = status ? { status } : {};
  const skip = (page - 1) * limit;

  const [users, total] = await Promise.all([
    User.find(query)
      .select("-password -refreshTokens -passwordResetCode -passwordResetPlain")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  return {
    users,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
}

// ──────────────────────────────────────────────────────────────
// UPDATE USER
// ──────────────────────────────────────────────────────────────
export async function updateUser(userId, updates) {
  await ensureConnection();

  const user = await User.findById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  // Apply updates
  Object.keys(updates).forEach((key) => {
    user[key] = updates[key];
  });

  await user.save();
  return user;
}
