// src/lib/auth.js

import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "30d";

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}

// Password hashing with salt rounds
const SALT_ROUNDS = 12;

// Generate secure random token
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString("hex");
}

// Hash password with bcrypt
export async function hashPassword(password) {
  return bcrypt.hash(password, SALT_ROUNDS);
}

// Verify password against hash
export async function verifyPassword(plainText, hash) {
  return bcrypt.compare(plainText, hash);
}

// Generate access token
export function signAccessToken(user, options = {}) {
  const payload = {
    id: user._id?.toString() || user.id,
    email: user.email,
    role: user.role || "student",
    type: "access",
  };

  // Include jti if provided
  if (user.jti) {
    payload.jti = user.jti;
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: options.expiresIn || JWT_EXPIRES_IN,
    issuer: "actinova-ai-tutor",
    audience: "actinova-ai-tutor-users",
  });
}

// Generate refresh token
export function signRefreshToken(user) {
  const payload = {
    id: user._id?.toString() || user.id,
    email: user.email,
    type: "refresh",
  };

  // Include jti if provided
  if (user.jti) {
    payload.jti = user.jti;
  }

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
    issuer: "actinova-ai-tutor",
    audience: "actinova-ai-tutor-users",
  });
}

// Generate both access and refresh tokens
export function generateTokenPair(user, options = {}) {
  const jti = generateSecureToken(16); // Generate unique token ID

  // Add jti to user payload for tokens
  const userWithJti = { ...user, jti };

  return {
    accessToken: signAccessToken(userWithJti, options),
    refreshToken: signRefreshToken(userWithJti),
    jti,
  };
}

// Verify token with proper error handling
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET, {
      issuer: "actinova-ai-tutor",
      audience: "actinova-ai-tutor-users",
    });
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid token");
    } else {
      throw new Error("Token verification failed");
    }
  }
}

// Verify refresh token specifically
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET, {
      issuer: "actinova-ai-tutor",
      audience: "actinova-ai-tutor-users",
    });

    if (decoded.type !== "refresh") {
      throw new Error("Invalid token type");
    }

    return decoded;
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw new Error("Refresh token has expired");
    } else if (error.name === "JsonWebTokenError") {
      throw new Error("Invalid refresh token");
    } else {
      throw error;
    }
  }
}

// Generate password reset token
export function generatePasswordResetToken() {
  return generateSecureToken(32);
}

// Generate email verification token
export function generateEmailVerificationToken() {
  return generateSecureToken(32);
}

// Generate 6-digit email verification code
export function generateEmailVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Generate 6-digit password reset code
export function generatePasswordResetCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Validate password strength
export function validatePassword(password) {
  const minLength = 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  const errors = [];

  if (password.length < minLength) {
    errors.push(`Password must be at least ${minLength} characters long`);
  }
  if (!hasUpperCase) {
    errors.push("Password must contain at least one uppercase letter");
  }
  if (!hasLowerCase) {
    errors.push("Password must contain at least one lowercase letter");
  }
  if (!hasNumbers) {
    errors.push("Password must contain at least one number");
  }
  if (!hasSpecialChar) {
    errors.push("Password must contain at least one special character");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// Validate email format
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Sanitize user data for client
export function sanitizeUser(user) {
  const { password, refreshTokens, ...sanitized } = user;
  return sanitized;
}

// Legacy function for backward compatibility
export function signToken(user, options = { expiresIn: JWT_EXPIRES_IN }) {
  return signAccessToken(user, options);
}
