import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Session from "@/models/Session";
import { headers, cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(request) {
  try {
    await connectToDatabase();

    const body = await request.json();
    const { sessionId, startTime, page } = body;

    if (!sessionId || !startTime || !page) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Try to get user ID from token if authenticated
    let userId = null;
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get("token")?.value;
      if (token) {
        const decoded = verifyToken(token);
        if (decoded?.id) {
          userId = new ObjectId(decoded.id);
        }
      }
    } catch (error) {
      // User not authenticated or token invalid - continue as anonymous
    }

    // Get client information
    const headersList = await headers();
    const userAgent = headersList.get("user-agent") || "";
    const ipAddress = headersList.get("x-forwarded-for") ||
      headersList.get("x-real-ip") ||
      "unknown";
    const referrer = headersList.get("referer") || "";

    const sessionData = {
      sessionId,
      userId,
      startTime: new Date(startTime),
      page,
      userAgent,
      ipAddress,
      referrer,
    };

    const session = await Session.startSession(sessionData);

    return NextResponse.json({
      success: true,
      message: "Session started successfully",
      sessionId: session.sessionId,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Failed to start session",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
