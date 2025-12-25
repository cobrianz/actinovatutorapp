import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Session from "@/models/Session";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { sessionId, endTime, duration, page } = body;

    if (!sessionId || !endTime || duration === undefined) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const endData = {
      endTime: new Date(endTime),
      duration,
    };

    const session = await Session.endSession(sessionId, endData);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Session not found or already ended" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Session ended successfully",
      sessionId: session.sessionId,
      duration: session.duration,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to end session",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

