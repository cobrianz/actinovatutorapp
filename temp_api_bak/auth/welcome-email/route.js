// src/app/api/send-welcome-email/route.js

import { NextResponse } from "next/server";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request) {
  let email, firstName;

  try {
    const body = await request.json();

    email = body.email?.toString().toLowerCase().trim();
    firstName = body.firstName?.toString().trim();

    // Simple, fast validation
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    if (!firstName || firstName.length < 1) {
      firstName = "there"; // fallback — never break the UX
    }
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid request format" },
      { status: 400 }
    );
  }

  // Fire-and-forget email — never block user signup
  sendWelcomeEmail({
    to: email,
    name: firstName.charAt(0).toUpperCase() + firstName.slice(1),
  }).catch((err) => {
    console.warn("[welcome-email] Failed to send (non-blocking):", {
      email,
      error: err.message,
    });
  });

  // Always respond instantly
  return NextResponse.json(
    {
      success: true,
      message: "Welcome email is being sent!",
    },
    { status: 200 }
  );
}
