// src/app/api/resend-verification/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { sendVerificationEmail } from "@/lib/email";

const RATE_LIMIT = { max: 3, windowMs: 15 * 60 * 1000 };
const attempts = new Map(); // Replace with Upstash/Redis in production

export async function POST(request) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  // Rate limiting: 3 attempts per 15 min per IP
  const now = Date.now();
  const record = attempts.get(ip) || { count: 0, resetAt: now };
  if (now - record.resetAt > RATE_LIMIT.windowMs) {
    record.count = 1;
    record.resetAt = now;
  } else if (record.count >= RATE_LIMIT.max) {
    return NextResponse.json(
      { error: "Too many requests. Please try again in 15 minutes." },
      { status: 429 }
    );
  }
  attempts.set(ip, { ...record, count: record.count + 1 });

  let email;

  try {
    const body = await request.json();
    email = body.email?.toLowerCase().trim();

    // Allow email from body OR from authenticated user
    if (!email) {
      const authHeader = request.headers.get("authorization");
      let token = null;

      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.slice(7);
      }


      if (token) {
        const { verifyToken } = await import("@/lib/auth");
        const payload = verifyToken(token);
        if (payload?.id) {
          const { db } = await connectToDatabase();
          const user = await db
            .collection("users")
            .findOne(
              { _id: new ObjectId(payload.id) },
              { projection: { email: 1, emailVerified: 1 } }
            );
          if (user) {
            email = user.email;
          }
        }
      }
    }


    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }
  } catch (parseError) {
    console.error("[resend-verification] JSON parse error:", parseError);
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCol = db.collection("users");

    const user = await usersCol.findOne(
      { email },
      {
        projection: {
          emailVerified: 1,
          emailVerificationToken: 1,
          emailVerificationExpires: 1,
          name: 1,
        },
      }
    );

    if (!user) {
      // Security: don't reveal if email exists
      return NextResponse.json({
        message: "If an account exists, a verification email has been sent.",
      });
    }

    if (user.emailVerified) {
      return NextResponse.json({
        message: "Email is already verified.",
      });
    }

    // Generate new token and code + 24h expiry
    const newToken = crypto.randomUUID();
    const newCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit code
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await usersCol.updateOne(
      { _id: user._id },
      {
        $set: {
          emailVerificationToken: newToken,
          emailVerificationCode: newCode,
          emailVerificationExpires: expiresAt,
        },
      }
    );

    // Send email (fire-and-forget — don't fail if email fails)
    try {
      await sendVerificationEmail({
        to: email,
        name: user.name?.split(" ")[0] || "there",
        token: newToken,
        code: newCode,
      });
    } catch (emailError) {
      // Log error but still return success — email might be delayed
      console.error("[resend-verification] Email sending failed:", emailError);
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent! Check your inbox (and spam folder).",
    });
  } catch (error) {
    console.error("[resend-verification] Error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
