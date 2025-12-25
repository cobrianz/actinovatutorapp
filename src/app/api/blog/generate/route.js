import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/Post";
import { verifyToken } from "@/lib/auth";
import OpenAI from "openai";

function getWeekKey(date = new Date()) {
  const d = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
  const year = d.getUTCFullYear();
  const onejan = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(
    ((d - onejan) / 86400000 + onejan.getUTCDay() + 1) / 7
  );
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function getMonthKey(date = new Date()) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

async function ensureAdmin(req) {
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  let decoded = null;
  if (bearer) {
    try {
      decoded = verifyToken(bearer);
    } catch { }
  }
  if (!decoded) {
    // try cookies
    const cookieHeader = req.headers.get("cookie") || "";
    const tokenMatch = cookieHeader.match(/token=([^;]+)/);
    if (tokenMatch) {
      try {
        decoded = verifyToken(tokenMatch[1]);
      } catch { }
    }
  }
  if (!decoded || decoded.role !== "admin") {
    throw new Error("unauthorized");
  }
  return decoded;
}

function buildPrompt(period) {
  const scope =
    period === "monthly" ? "monthly featured article" : "weekly article";
  return `You are an editor for an AI tutoring platform. Propose a ${scope} about AI tutoring trends and practical guidance for learners and educators.
Return JSON with keys: title, tags (array), summary (2-3 sentences), content_markdown (long markdown with headings, lists, and a short code block). Keep it original.`;
}

export async function POST(req) {
  try {
    await ensureAdmin(req);
    await connectToDatabase();

    const { period = "monthly" } = await req
      .json()
      .catch(() => ({ period: "monthly" }));
    const periodKey = period === "monthly" ? getMonthKey() : getWeekKey();

    // Idempotency: skip if existing for period
    const exists = await Post.findOne({ period, periodKey }).lean();
    if (exists) {
      return NextResponse.json({
        success: true,
        skipped: true,
        message: "Already generated for this period",
      });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = buildPrompt(period);
    const completion = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: prompt,
      text: { format: "json" },
    });
    const raw = completion.output_text || "{}";
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }

    const title =
      data.title ||
      (period === "monthly"
        ? `AI Tutoring Featured ${periodKey}`
        : `AI Tutoring Weekly ${periodKey}`);
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    const post = new Post({
      title,
      slug,
      summary: data.summary || "",
      content: data.content_markdown || "# AI Tutoring\n\nContent unavailable.",
      tags: Array.isArray(data.tags) ? data.tags : ["AI", "Tutoring"],
      author: { name: "Admin", role: "admin" },
      featured: period === "monthly",
      period,
      periodKey,
      publishedAt: new Date(),
      status: "published",
    });

    await post.save();

    return NextResponse.json({ success: true, post });
  } catch (error) {
    if (error.message === "unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    console.error("[POST /api/blog/generate] Error:", error);
    return NextResponse.json({ error: "Failed to generate" }, { status: 500 });
  }
}
