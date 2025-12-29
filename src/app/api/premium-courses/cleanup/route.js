// src/app/api/cleanup/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

// Import your actual cleanup functions
import { cleanupOldTrendingCourses } from "../trending/route.js";
// Add more cleanups here in the future (old notes, expired tokens, etc.)

const AUTH_TOKEN = process.env.CLEANUP_API_TOKEN; // Set in .env: CLEANUP_API_TOKEN=your-super-secret-256-char-token

export async function POST(request) {
  // === 1. Security: Only allow authorized cron ===
  const authHeader = request.headers.get("authorization");

  if (!AUTH_TOKEN) {
    console.warn(
      "CLEANUP_API_TOKEN not set — allowing unauthenticated cleanup (dev only!)"
    );
  } else if (authHeader !== `Bearer ${AUTH_TOKEN}`) {
    return NextResponse.json(
      { error: "Unauthorized — invalid or missing token" },
      { status: 401 }
    );
  }

  try {
    const { db } = await connectToDatabase();

    const results = {
      timestamp: new Date().toISOString(),
      actions: [],
    };

    // === Run all cleanup tasks ===
    const trendingResult = await cleanupOldTrendingCourses();
    results.actions.push({
      task: "trending_courses_cleanup",
      ...trendingResult,
    });

    // Add more cleanups below as your app grows:
    /*
    results.actions.push({
      task: "expired_refresh_tokens",
      deleted: await cleanupExpiredTokens(db),
    });
    */



    return NextResponse.json({
      success: true,
      message: "Daily cleanup completed successfully",
      summary: results,
    });
  } catch (error) {
    console.error("Cleanup job failed:", error);
    return NextResponse.json(
      { error: "Cleanup failed", details: error.message },
      { status: 500 }
    );
  }
}

// Optional: Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    message: "Cleanup endpoint is alive",
    readyForCron: !!process.env.CLEANUP_API_TOKEN,
    timestamp: new Date().toISOString(),
  });
}
