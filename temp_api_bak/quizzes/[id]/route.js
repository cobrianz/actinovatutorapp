import { NextResponse } from "next/server";
import Test from "@/models/Quiz";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { verifyToken } from "@/lib/auth";

function getUserIdFromRequest(request) {
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.startsWith("Bearer ")
    ? authHeader.split("Bearer ")[1]
    : null;

  if (token) {
    try {
      const payload = verifyToken(token);
      if (payload?.id) return new ObjectId(payload.id);
    } catch { }
  }
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

export async function GET(request, { params }) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const test = await Test.findOne({
      _id: new ObjectId(params.id),
      createdBy: userId,
    });
    if (!test) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    return NextResponse.json(test);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch test" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectToDatabase();
    const userId = getUserIdFromRequest(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const deletedTest = await Test.findOneAndDelete({
      _id: new ObjectId(params.id),
      createdBy: userId,
    });
    if (!deletedTest) {
      return NextResponse.json({ error: "Test not found" }, { status: 404 });
    }
    return NextResponse.json({ message: "Test deleted successfully" });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete test" },
      { status: 500 }
    );
  }
}
