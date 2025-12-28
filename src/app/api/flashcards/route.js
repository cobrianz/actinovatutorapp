import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

// Shared auth extractor
async function getUserId(request) {
  let token = null;

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    token = authHeader.substring(7);
  } else {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value;
  }

  if (!token) return null;

  try {
    const decoded = verifyToken(token);
    return decoded?.id ? new ObjectId(decoded.id) : null;
  } catch (err) {
    console.warn("Invalid token in flashcards route:", err.message);
    return null;
  }
}

export async function GET(request) {
  const userId = await getUserId(request);
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const cardsCol = db.collection("cardSets");

    const cards = await cardsCol
      .find({ userId })
      .sort({ createdAt: -1 })
      .toArray();

    // Also fetch guides (which are now flashcards)
    const guidesCol = db.collection("guides");
    const guides = await guidesCol
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    // Combine and format both cardSets and guides as flashcards
    const allFlashcards = [
      ...cards.map(({ userId, ...card }) => ({
        ...card,
        _id: card._id.toString(),
        type: "cardSet",
      })),
      ...guides.map((guide) => ({
        _id: guide._id.toString(),
        title: guide.title,
        topic: guide.originalTopic || guide.topic,
        originalTopic: guide.originalTopic || guide.topic,
        difficulty: guide.difficulty,
        totalCards: guide.totalLessons || 0, // guides don't have cards, but lessons
        cards: [], // guides don't have individual cards
        isPremium: guide.isPremium || false,
        createdAt: guide.createdAt,
        lastAccessed: guide.lastAccessed,
        type: "guide",
      })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return NextResponse.json({ success: true, cards: allFlashcards });
  } catch (error) {
    console.error("GET /flashcards error:", error);
    return NextResponse.json(
      { error: "Failed to fetch flashcards" },
      { status: 500 }
    );
  }
}
