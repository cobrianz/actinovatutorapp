import { NextResponse } from "next/server";
import Test from "../../../../../models/Quiz";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

export async function POST(request, { params }) {
  try {
    // Await params as required by Next.js 15
    const resolvedParams = await params;
    const testId = resolvedParams.id;

    if (!testId) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 }
      );
    }

    // Authenticate user
    const auth = request.headers.get("authorization");
    let token = auth?.startsWith("Bearer ")
      ? auth.slice(7)
      : (await cookies()).get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId;
    try {
      const decoded = verifyToken(token);
      userId = decoded.id;
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { score, totalMarks, answers } = await request.json();

    if (typeof score !== "number" || typeof totalMarks !== "number") {
      return NextResponse.json(
        { error: "Invalid score data" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const test = await Test.findById(new ObjectId(testId));
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    const percentage =
      totalMarks > 0 ? Math.round((score / totalMarks) * 100) : 0;

    // Add performance record
    const performanceData = {
      userId: new ObjectId(userId),
      score,
      totalMarks,
      percentage,
      answers,
      completedAt: new Date(),
    };

    test.performances.push(performanceData);
    await test.save();

    return NextResponse.json({
      success: true,
      performance: performanceData,
      message: "Performance saved successfully",
    });
  } catch (error) {
    console.error("Error saving performance:", error);
    return NextResponse.json(
      { error: "Failed to save performance" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    // Await params as required by Next.js 15
    const resolvedParams = await params;
    const testId = resolvedParams.id;

    if (!testId) {
      return NextResponse.json({ error: "Test ID is required" }, { status: 400 });
    }

    // Authenticate user
    const auth = request.headers.get("authorization");
    let token = auth?.startsWith("Bearer ")
      ? auth.slice(7)
      : (await cookies()).get("token")?.value;

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let userId;
    try {
      const decoded = verifyToken(token);
      userId = decoded.id;
    } catch (e) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    await connectToDatabase();

    const test = await Test.findById(new ObjectId(testId));
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }

    // Get user's performances for this test
    const userPerformances = test.performances.filter(
      (p) => p.userId.toString() === userId
    );

    // Calculate overall statistics
    const allPerformances = test.performances;
    const overallStats = {
      totalAttempts: allPerformances.length,
      averageScore:
        allPerformances.length > 0
          ? Math.round(
            allPerformances.reduce((sum, p) => sum + p.percentage, 0) /
            allPerformances.length
          )
          : 0,
      highestScore:
        allPerformances.length > 0
          ? Math.max(...allPerformances.map((p) => p.percentage))
          : 0,
      userAttempts: userPerformances.length,
      userBestScore:
        userPerformances.length > 0
          ? Math.max(...userPerformances.map((p) => p.percentage))
          : 0,
      userAverageScore:
        userPerformances.length > 0
          ? Math.round(
            userPerformances.reduce((sum, p) => sum + p.percentage, 0) /
            userPerformances.length
          )
          : 0,
    };

    return NextResponse.json({
      success: true,
      userPerformances,
      overallStats,
    });
  } catch (error) {
    console.error("Error fetching performance:", error);
    return NextResponse.json(
      { error: "Failed to fetch performance data" },
      { status: 500 }
    );
  }
}
