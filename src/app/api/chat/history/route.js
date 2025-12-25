// src/app/api/chat/route.js

import { NextResponse } from "next/server";
import { withAuth, withErrorHandling } from "@/lib/middleware";
import { connectToDatabase } from "@/lib/mongodb";
import Chat from "@/models/Chat";
import User from "@/models/User";

// === Shared: Check if user is Premium ===
async function requirePremium(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw new Error("User not found");

  const isPremium =
    user.isPremium ||
    (user.subscription?.plan === "pro" &&
      user.subscription?.status === "active");

  if (!isPremium) {
    throw new Error("Premium subscription required");
  }

  return user;
}

// === GET: List topics or get messages for a topic ===
async function getHandler(request) {
  await connectToDatabase();
  const user = request.user;

  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic")?.trim();
    const action = searchParams.get("action");

    await requirePremium(user._id);

    // 1. List all active topics (for sidebar)
    if (action === "topics") {
      const chats = await Chat.find({
        userId: user._id,
        isActive: true,
      })
        .select("topic lastMessageAt messages")
        .sort({ lastMessageAt: -1 })
        .limit(100)
        .lean();

      const topics = chats.map((chat) => ({
        id: chat._id.toString(),
        topic: chat.topic,
        lastMessageAt: chat.lastMessageAt,
        messageCount: chat.messages?.length || 0,
      }));

      return NextResponse.json({ success: true, topics }, { status: 200 });
    }

    // 2. Get messages for a specific topic
    if (!topic) {
      return NextResponse.json(
        { error: "Missing 'topic' parameter" },
        { status: 400 }
      );
    }

    const chat = await Chat.findOne({
      userId: user._id,
      topic,
      isActive: true,
    })
      .select("messages topic")
      .lean();

    return NextResponse.json({
      success: true,
      topic,
      conversationId: chat?._id?.toString() || null,
      messages: chat?.messages || [],
    });
  } catch (error) {
    if (error.message.includes("Premium")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

// === POST: Save chat messages (full overwrite) ===
async function postHandler(request) {
  await connectToDatabase();
  const user = request.user;

  try {
    const { topic, messages } = await request.json();

    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }
    if (!Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages must be an array" },
        { status: 400 }
      );
    }

    await requirePremium(user._id);

    const result = await Chat.findOneAndUpdate(
      { userId: user._id, topic, isActive: true },
      {
        $set: {
          messages,
          lastMessageAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({
      success: true,
      conversationId: result._id.toString(),
      messageCount: messages.length,
    });
  } catch (error) {
    if (error.message.includes("Premium")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

// === DELETE: Clear or permanently delete chat ===
async function deleteHandler(request) {
  await connectToDatabase();
  const user = request.user;

  try {
    const { searchParams } = new URL(request.url);
    const topic = searchParams.get("topic")?.trim();
    const action = searchParams.get("action"); // "delete" = permanent

    if (!topic) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }

    await requirePremium(user._id);

    if (action === "delete") {
      const result = await Chat.deleteMany({
        userId: user._id,
        topic,
      });

      return NextResponse.json({
        success: true,
        message: "Conversation permanently deleted",
        deletedCount: result.deletedCount,
      });
    }

    // Default: soft-delete (clear messages + deactivate)
    const result = await Chat.updateOne(
      { userId: user._id, topic, isActive: true },
      {
        $set: {
          isActive: false,
          messages: [],
          clearedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "Chat history cleared",
      modified: result.modifiedCount > 0,
    });
  } catch (error) {
    if (error.message.includes("Premium")) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }
}

// === Apply Middleware ===
export const GET = withAuth(withErrorHandling(getHandler));
export const POST = withAuth(withErrorHandling(postHandler));
export const DELETE = withAuth(withErrorHandling(deleteHandler));

export const dynamic = "force-dynamic";
