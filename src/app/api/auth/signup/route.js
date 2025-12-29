// src/app/api/signup/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { hashPassword } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { withCORS } from "@/lib/middleware";
import crypto from 'crypto';

const RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };
const attempts = new Map(); // In-memory (use Redis in prod)

async function signupHandler(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();

  // Rate limiting
  const record = attempts.get(ip) || { count: 0, resetAt: now };
  if (now - record.resetAt > RATE_LIMIT.windowMs) {
    record.count = 1;
    record.resetAt = now;
  } else if (record.count >= RATE_LIMIT.max) {
    return NextResponse.json(
      { error: "Too many signup attempts. Try again later." },
      { status: 429 }
    );
  }
  attempts.set(ip, record);

  let body;
  try {
    body = await request.json();
  } catch {
    record.count++;
    attempts.set(ip, record);
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let { firstName, lastName, email, password, confirmPassword, acceptTerms } =
    body;

  // Sanitize inputs
  firstName = firstName?.trim();
  lastName = lastName?.trim();
  email = email?.toLowerCase().trim();
  password = password?.trim();
  confirmPassword = confirmPassword?.trim();

  // Basic validation
  if (!firstName || firstName.length < 2 || firstName.length > 50) {
    record.count++;
    attempts.set(ip, record);
    return NextResponse.json(
      { error: "First name must be 2–50 characters" },
      { status: 400 }
    );
  }
  if (!lastName || lastName.length < 2 || lastName.length > 50) {
    record.count++;
    attempts.set(ip, record);
    return NextResponse.json(
      { error: "Last name must be 2–50 characters" },
      { status: 400 }
    );
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    record.count++;
    attempts.set(ip, record);
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  // Strong password validation
  if (!password || password.length < 8) {
    record.count++;
    attempts.set(ip, record);
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // Check password strength
  const passwordErrors = [];
  if (!/[a-z]/.test(password)) passwordErrors.push("lowercase letter");
  if (!/[A-Z]/.test(password)) passwordErrors.push("uppercase letter");
  if (!/\d/.test(password)) passwordErrors.push("number");
  // Accept any non-alphanumeric character as special
  if (!/[^a-zA-Z0-9]/.test(password)) passwordErrors.push("special character");

  if (passwordErrors.length > 0) {
    record.count++;
    attempts.set(ip, record);
    return NextResponse.json(
      {
        error: "Password too weak",
        details: `Must contain: ${passwordErrors.join(", ")}`,
      },
      { status: 400 }
    );
  }
  if (password !== confirmPassword) {
    record.count++;
    attempts.set(ip, record);
    return NextResponse.json(
      { error: "Passwords don't match" },
      { status: 400 }
    );
  }
  if (acceptTerms !== true) {
    record.count++;
    attempts.set(ip, record);
    return NextResponse.json(
      { error: "You must accept the terms" },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");

    // Check existing user
    const existing = await usersCol.findOne({ email });
    if (existing) {
      record.count++;
      attempts.set(ip, record);
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Generate verification token and code
    const verificationToken = crypto.randomUUID();
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString(); // 6-digit code
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h

    // Create user
    const user = {
      _id: new ObjectId(),
      name: `${firstName} ${lastName}`,
      email,
      password: await hashPassword(password),
      role: "student",
      status: "pending", // requires email verification
      emailVerificationToken: verificationToken,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
      monthlyUsage: 0,
      usageResetDate: new Date(
        new Date().getFullYear(),
        new Date().getMonth() + 1,
        1
      ),
      streak: 0,
      totalLearningTime: 0,
      achievements: [],
      createdAt: new Date(),
      lastActive: new Date(),
    };

    await usersCol.insertOne(user);

    // Send verification email (fire-and-forget)
    try {
      const { sendVerificationEmail } = await import("@/lib/email");
      await sendVerificationEmail({
        to: user.email,
        name: user.name.split(" ")[0],
        token: verificationToken,
        code: verificationCode,
      });
    } catch (emailError) {
      // Don't fail signup if email fails - log error in production
      if (process.env.NODE_ENV === "production") {
        // Verification email failed
      }
    }

    // Success response
    return NextResponse.json(
      {
        success: true,
        message: \"Account created successfully! Please check your email to verify your account.\",
        requiresVerification: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isPremium: false,
          usage: {
            used: 0,
            limit: 5,
            remaining: 5,
            percentage: 0,
            isPremium: false,
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Registration failed. Please try again later.",
        message: process.env.NODE_ENV === "development" ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export const POST = withCORS()(signupHandler);

// Handle OPTIONS for preflight
export const OPTIONS = withCORS()(async () => {
  return new NextResponse(null, { status: 200 });
});