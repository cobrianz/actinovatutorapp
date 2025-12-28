// src/app/api/chat/tutor/route.js

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { withAuth, withErrorHandling } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// === Shared: Premium Check ===
async function requirePremium(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("User not found");

  const isPremium =
    user.isPremium ||
    ((user.subscription?.plan === "pro" || user.subscription?.plan === "enterprise") &&
      user.subscription?.status === "active");

  if (!isPremium) {
    throw new Error("Premium subscription required for AI Tutor");
  }
  return true;
}

// === POST: AI Tutor Chat ===
async function handlePost(request) {
  await connectToDatabase();
  const user = request.user;

  try {
    const body = await request.json();
    const { message, conversationHistory = [], topic } = body;

    // === Input Validation ===
    if (!message?.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    if (!topic?.trim()) {
      return NextResponse.json(
        { error: "Topic is required for focused learning" },
        { status: 400 }
      );
    }

    if (!Array.isArray(conversationHistory)) {
      return NextResponse.json(
        { error: "Invalid conversation history" },
        { status: 400 }
      );
    }

    await requirePremium(user._id);

    // === Strict Topic Enforcement Prompt ===
    const systemPrompt = `You are an expert AI tutor specializing in **${topic}**.

Your role:
- Teach only **${topic}** — nothing else
- Be clear, patient, and encouraging
- Use step-by-step explanations
- Include examples and analogies
- Ask guiding questions
- Use markdown: **bold**, *italics*, \`code\`, and lists
- Keep every response under 180 words

CRITICAL RULES:
- NEVER discuss topics outside of "${topic}"
- If the student goes off-topic, respond: "I'm your tutor for **${topic}**. Let's get back to that — what would you like to learn next?"
- Be concise and focused
- End with a question when possible to continue learning

You are teaching: **${topic}** — stay strictly on topic.`;

    // === Message History (limit context window) ===
    const recentHistory = conversationHistory.slice(-8); // ~8 exchanges = 16 messages

    const messages = [
      { role: "system", content: systemPrompt },
      ...recentHistory,
      { role: "user", content: message.trim() },
    ];

    // === Call OpenAI (cost & speed optimized) ===
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fast, cheap, excellent quality
      messages,
      temperature: 0.7,
      max_tokens: 320, // ~200–220 words max
      presence_penalty: 0.3,
      frequency_penalty: 0.3,
    });

    const aiResponse = completion.choices[0]?.message?.content?.trim();

    if (!aiResponse) {
      throw new Error("Empty response from OpenAI");
    }

    // === Final Safety Trim (defensive) ===
    const words = aiResponse.split(/\s+/);
    const finalResponse =
      words.length > 200
        ? words.slice(0, 195).join(" ") +
        "...\n\nWhat would you like to explore next?"
        : aiResponse;

    return NextResponse.json({
      success: true,
      response: finalResponse,
      usage: {
        prompt_tokens: completion.usage?.prompt_tokens,
        completion_tokens: completion.usage?.completion_tokens,
        total_tokens: completion.usage?.total_tokens,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Handle known errors gracefully
    if (error.message.includes("Premium")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }

    if (error?.status === 401) {
      return NextResponse.json(
        { error: "OpenAI API key missing or invalid" },
        { status: 500 }
      );
    }

    console.error("AI Tutor Chat Error:", {
      userId: user._id,
      error: error.message,
      stack: error.stack,
    });

    return NextResponse.json(
      { error: "Failed to generate response. Please try again." },
      { status: 500 }
    );
  }
}

// === Apply Middleware ===
const handler = withAuth(handlePost);
export const POST = withErrorHandling(handler);
