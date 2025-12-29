// src/app/api/verify-reset-code/route.js

import { NextResponse } from "next/server";
import { z } from "zod";
import { withErrorHandling, withRateLimit, withCORS } from "@/lib/middleware";
import { verifyResetCode } from "@/lib/db";

// Validation schema
const verifyResetCodeSchema = z.object({
  email: z.string().email("Invalid email format"),
  code: z
    .string()
    .length(6, "Verification code must be exactly 6 digits")
    .regex(/^\d+$/, "Code must contain only digits"),
});

async function verifyResetCodeHandler(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Validate input
  const parseResult = verifyResetCodeSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        details: parseResult.error.format(),
      },
      { status: 400 }
    );
  }

  const { email, code } = parseResult.data;

  try {
    const user = await verifyResetCode(email.toLowerCase().trim(), code);

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Code is valid → return success
    return NextResponse.json(
      {
        success: true,
        message: "Code verified successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("verify-reset-code error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// Middleware chain — clean, readable, maintainable
const handler = withRateLimit({ max: 8, windowMs: 10 * 60 * 1000 })(
  verifyResetCodeHandler
);
const withCors = withCORS()(handler);
export const POST = withErrorHandling(withCors);
