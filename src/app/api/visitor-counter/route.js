import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import VisitorCounter from "@/models/VisitorCounter";

export async function GET() {
  try {
    await connectToDatabase();

    // Increment the counter
    const counter = await VisitorCounter.incrementCounter();

    return NextResponse.json({
      success: true,
      count: counter.count,
      message: "Visitor count incremented successfully",
    });
  } catch (error) {
    console.error("Error incrementing visitor counter:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to increment visitor counter",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST() {
  // For POST requests, just increment the counter (same as GET)
  return GET();
}
