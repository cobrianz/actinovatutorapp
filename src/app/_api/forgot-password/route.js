// src/app/api/forgot-password/route.js

import { NextResponse } from "next/server";
import { findUserByEmail, setPasswordResetCode } from "@/lib/db";
import { sendPasswordResetCodeEmail } from "@/lib/email";
import { withErrorHandling, withRateLimit, withCORS } from "@/lib/middleware";
import { z } from "zod";

// Input validation
const schema = z.object({
  email: z.string().email().toLowerCase().trim(),
});

async function handler(req) {
  try {
    const body = await req.json();
    const { email } = schema.parse(body);

    // Always respond the same way — prevents email enumeration
    const genericSuccess = {
      success: true,
      message:
        "If your email is registered, you'll receive a 6-digit reset code shortly.",
    };

    const user = await findUserByEmail(email);

    // Development mode flag
    const isDev = process.env.NODE_ENV !== "production";

    if (!user) {
      // Explicitly notify user no account exists (as requested)
      return NextResponse.json(
        { error: "No account found for this email. Please sign up first." },
        { status: 404 }
      );
    }

    if (user.status !== "active") {
      return NextResponse.json(
        {
          error: "Your account is not active. Please verify your email first.",
        },
        { status: 403 }
      );
    }

    // Generate and store 6-digit code (plain + hashed)
    const { code: resetCode, expiresAt } = await setPasswordResetCode(email);

    // Send email
    try {
      const result = await sendPasswordResetCodeEmail({
        to: user.email,
        name: user.firstName || "Learner",
        code: resetCode,
      });
      if (!result.success) {
        console.error(
          `[Forgot Password] Resend error for ${email}:`,
          result.error
        );
      }
    } catch (emailError) {
      console.error(`[Forgot Password] Email failed for ${email}:`, emailError);
    }

    // Always generic success response; do not leak code in responses
    return NextResponse.json(genericSuccess, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Please enter a valid email address" },
        { status: 400 }
      );
    }
    throw error; // Let withErrorHandling catch it
  }
}

// Rate limiting: 3 attempts per email OR IP in 15 minutes
const rateLimiter = withRateLimit({
  max: 3,
  windowMs: 15 * 60 * 1000,
  message: "Too many reset attempts. Try again later.",
  keyGenerator: async (req) => {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    try {
      const body = await req.clone().json();
      const email = body.email?.toLowerCase().trim();
      return email ? `fp:${email}` : `fp-ip:${ip}`;
    } catch {
      return `fp-ip:${ip}`;
    }
  },
})(handler);

const finalHandler = withCORS()(rateLimiter);
export const POST = withErrorHandling(finalHandler);
