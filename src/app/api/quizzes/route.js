import { NextResponse } from "next/server";
import Test from "@/models/Quiz";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyToken } from "@/lib/auth";
import User from "@/models/User";

function getUserIdFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.split("Bearer ")[1]
    : null;

  // Try header token
  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload?.id) return new ObjectId(payload.id);
    } catch { }
  }

  // Fallback to cookie token
  const cookieHeader = request.headers.get("cookie");
  if (cookieHeader) {
    const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
      const [key, value] = cookie.split("=");
      acc[key] = value;
      return acc;
    }, {});
    token = cookies.token;
    if (token) {
      try {
        const payload = verifyToken(token);
        if (payload?.id) return new ObjectId(payload.id);
      } catch { }
    }
  }
  return null;
}

export async function GET(request) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tests = await Test.find({ createdBy: userId });
    return NextResponse.json(tests);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch tests" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    await connectToDatabase();
    // Ensure createdBy is set to authenticated user
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Enforce per-user test limits (monthly strict: free: 1, premium: 30)
    const user = await User.findById(userId);
    const isPremium =
      user?.isPremium === true ||
      (user?.subscription?.plan === "pro" &&
        user?.subscription?.status === "active");
    // Count tests created in current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthTests = await Test.countDocuments({
      createdBy: userId,
      createdAt: { $gte: monthStart },
    });
    const testLimit = isPremium ? 20 : 1;
    if (currentMonthTests >= testLimit) {
      return NextResponse.json(
        {
          error: "Monthly test limit reached",
          limit: testLimit,
          used: currentMonthTests,
          isPremium,
        },
        { status: 429 }
      );
    }
    const newTest = new Test({ ...body, createdBy: userId });
    await newTest.save();
    return NextResponse.json(newTest, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create test" },
      { status: 500 }
    );
  }
}
