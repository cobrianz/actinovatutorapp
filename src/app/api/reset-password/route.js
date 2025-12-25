// src/app/api/reset-password/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { hashPassword, verifyPassword } from "@/lib/auth";
import { verifyResetCode } from "@/lib/db";
import { withCORS } from "@/lib/middleware";

const RATE_LIMIT = { max: 5, windowMs: 15 * 60 * 1000 };
const attempts = new Map(); // Replace with Upstash Redis in prod

async function resetPasswordHandler(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();

  // Rate limiting per IP
  const record = attempts.get(ip) || { count: 0, resetAt: now };
  if (now - record.resetAt > RATE_LIMIT.windowMs) {
    record.count = 1;
    record.resetAt = now;
  } else if (record.count >= RATE_LIMIT.max) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 }
    );
  }
  attempts.set(ip, { ...record, count: record.count + 1 });

  let email, code, password, token;

  try {
    const body = await request.json();
    token = body.token?.trim();
    email = body.email?.toLowerCase().trim();
    code = body.code?.toString().trim();
    password = body.password?.toString();

    // Validate password first
    if (!password || password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    // Strong password policy (same as signup)
    const passwordErrors = [];
    if (!/[a-z]/.test(password)) passwordErrors.push("lowercase letter");
    if (!/[A-Z]/.test(password)) passwordErrors.push("uppercase letter");
    if (!/\d/.test(password)) passwordErrors.push("number");
    if (!/[@$!%*?&]/.test(password))
      passwordErrors.push("special character (@$!%*?&)");

    if (passwordErrors.length > 0) {
      return NextResponse.json(
        {
          error: "Password too weak",
          details: `Must contain: ${passwordErrors.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Validate either token OR (email + code)
    if (!token && (!email || !code)) {
      return NextResponse.json(
        { error: "Either reset token or email with code is required" },
        { status: 400 }
      );
    }

    if (token && (email || code)) {
      return NextResponse.json(
        { error: "Cannot use both token and code-based reset" },
        { status: 400 }
      );
    }

    if (!token) {
      // Code-based flow validation
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          { error: "Valid email is required" },
          { status: 400 }
        );
      }
      if (!code || !/^\d{6}$/.test(code)) {
        return NextResponse.json(
          { error: "Verification code must be exactly 6 digits" },
          { status: 400 }
        );
      }
    }
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");

    let user;

    if (token) {
      // Token-based flow
      user = await usersCol.findOne({
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired reset token" },
          { status: 400 }
        );
      }
    } else {
      // Code-based flow - verify code against hashed value and expiry
      user = await verifyResetCode(email, code);

      if (!user) {
        return NextResponse.json(
          { error: "Invalid or expired reset code" },
          { status: 400 }
        );
      }
    }

    // Prevent using the same password
    const isSame = await verifyPassword(password, user.password);
    if (isSame) {
      return NextResponse.json(
        { error: "New password must be different from the current password" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    // Update user - clear reset fields
    const updateFields = {
      $set: {
        password: hashedPassword,
        lastPasswordChange: new Date(),
      },
      $unset: {},
    };

    // Clear code-based reset fields
    updateFields.$unset.passwordResetCode = "";
    updateFields.$unset.passwordResetPlain = "";
    updateFields.$unset.passwordResetExpires = "";
    updateFields.$unset.passwordResetVerifiedAt = "";

    // Clear token-based reset fields if they exist
    if (token) {
      updateFields.$unset.passwordResetToken = "";
      updateFields.$unset.passwordResetExpires = "";
    }

    await usersCol.updateOne({ _id: user._id }, updateFields);

    // Password reset successful

    return NextResponse.json(
      {
        success: true,
        message: "Password reset successfully! You can now sign in.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[reset-password] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

export const POST = withCORS()(resetPasswordHandler);

export const OPTIONS = withCORS()(async () => {
  return new NextResponse(null, { status: 200 });
});
