import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import VisitorCounter from "@/models/VisitorCounter";

export async function GET() {
  try {
    await connectToDatabase();

    // Get the current visitor count
    const count = await VisitorCounter.getCurrentCount();

    return NextResponse.json({
      success: true,
      count,
      message: "Visitor count retrieved successfully",
    });
  } catch (error) {
    console.error("Error retrieving visitor count:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Failed to retrieve visitor count",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
