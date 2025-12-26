// src/app/api/change-password/route.js

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { withErrorHandling, withCORS } from "@/lib/middleware";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sendPasswordChangeNotificationEmail } from "@/lib/email";
import User from "@/models/User";

// Advanced password schema with strong rules
const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-z]/, "Must contain at least one lowercase letter")
      .regex(/[A-Z]/, "Must contain at least one uppercase letter")
      .regex(/[0-9]/, "Must contain at least one number")
      .regex(
        /[@$!%*?&]/,
        "Must contain at least one special character (@$!%*?&)"
      )
      .refine((pwd) => !pwd.includes("password"), {
        message: "Password cannot contain the word 'password'",
      }),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

async function changePasswordHandler(req) {
  try {
    // Parse and validate request body
    const body = await req.json();
    const parsed = changePasswordSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.format();
      return NextResponse.json(
        {
          error: "Invalid input",
          details: Object.entries(errors)
            .filter(([key]) => key !== "_errors")
            .map(([field, err]) => ({
              field,
              message: err._errors?.[0] || "Invalid value",
            })),
        },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = parsed.data;

    // === Authenticate user ===
    const cookieStore = await cookies();
    const token = cookieStore.get("token")?.value;

    if (!token) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    let userId;
    try {
      const decoded = verifyToken(token);
      userId = decoded.id;
      if (!userId) throw new Error("Invalid token payload");
    } catch (err) {
      console.warn("Invalid or expired token in change-password");
      return NextResponse.json(
        { error: "Invalid session. Please log in again." },
        { status: 401 }
      );
    }

    // === Fetch user ===
    const user = await findUserById(userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // === Verify current password ===
    const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentValid) {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 400 }
      );
    }

    // === Enforce monthly change limit (once per 30 days) ===
    if (user.lastPasswordChange) {
      const now = Date.now();
      const last = new Date(user.lastPasswordChange).getTime();
      const daysSince = Math.floor((now - last) / (1000 * 60 * 60 * 24));
      const minDays = 30; // cooldown period
      if (daysSince < minDays) {
        const remainingDays = minDays - daysSince;
        return NextResponse.json(
          {
            error: "Password change limit reached",
            details: [
              {
                field: "newPassword",
                message: `You can only change your password once every ${minDays} days. ${remainingDays} day(s) remaining.`,
              },
            ],
          },
          { status: 429 }
        );
      }
    }

    // === Prevent reusing old password ===
    const isSameAsOld = await bcrypt.compare(newPassword, user.password);
    if (isSameAsOld) {
      return NextResponse.json(
        { error: "New password must be different from your current password" },
        { status: 400 }
      );
    }

    // === Update password ===
    try {
      // Hash the new password first
      const bcrypt = await import("bcryptjs");
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Use direct MongoDB update to avoid full document validation
      await User.updateOne(
        { _id: userId },
        { $set: { password: hashedPassword, lastPasswordChange: new Date() } }
      );

      console.log(
        `Password changed successfully for user: ${user.email || userId}`
      );

      // Send password change notification email
      try {
        await sendPasswordChangeNotificationEmail({
          to: user.email,
          name: user.name || user.firstName || "User",
        });
        console.log(
          `Password change notification email sent to: ${user.email}`
        );
      } catch (emailError) {
        console.error(
          "Failed to send password change notification email:",
          emailError
        );
        // Don't fail the password change if email fails
      }

      return NextResponse.json(
        {
          success: true,
          message: "Password changed successfully",
        },
        { status: 200 }
      );
    } catch (updateError) {
      console.error("Failed to update password in DB:", updateError);
      return NextResponse.json(
        { error: "Failed to save new password. Please try again." },
        { status: 500 }
      );
    }
  } catch (error) {
    // Only re-throw if it's not already handled
    if (error instanceof z.ZodError) {
      // This should not reach here due to safeParse, but just in case
      return NextResponse.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }
    throw error; // Let withErrorHandling catch it
  }
}

// Apply middleware
const handler = withCORS()(changePasswordHandler);
export const POST = withErrorHandling(handler);
