import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

// Reuse auth logic
async function getAuthenticatedUser(request) {
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
    if (!decoded?.id || !decoded?.email) return null;
    return {
      userId: new ObjectId(decoded.id),
      email: decoded.email,
      rawId: decoded.id,
    };
  } catch (err) {
    console.warn("Invalid token in cards/[id]:", err.message);
    return null;
  }
}

export async function GET(request, { params }) {
  const { id } = await params;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid card set ID" }, { status: 400 });
  }

  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const cardSetsCol = db.collection("cardSets");

    const cardSet = await cardSetsCol.findOne({
      _id: new ObjectId(id),
      userId: auth.userId,
    });

    if (!cardSet) {
      return NextResponse.json(
        { error: "Card set not found or access denied" },
        { status: 404 }
      );
    }

    // Update lastAccessed
    await cardSetsCol.updateOne(
      { _id: new ObjectId(id) },
      { $set: { lastAccessed: new Date() } }
    );

    return NextResponse.json({
      success: true,
      ...cardSet,
      _id: cardSet._id.toString(),
    });
  } catch (error) {
    console.error("GET /flashcards/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch card set" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();
    const cardsCol = db.collection("cards");
    const cardSetsCol = db.collection("cardSets");

    // Check if it's a card set first
    const cardSet = await cardSetsCol.findOne({
      _id: new ObjectId(id),
      userId: auth.userId,
    });

    if (cardSet) {
      // Delete card set
      await cardSetsCol.deleteOne({
        _id: new ObjectId(id),
        userId: auth.userId,
      });

      // Log deletion
      await logger.logFlashcardDeleted(
        auth.rawId,
        auth.email,
        id,
        cardSet.title || "Untitled Set",
        request
      );

      return NextResponse.json({
        success: true,
        message: "Card set deleted successfully",
      });
    }

    // Check if it's an individual card
    const card = await cardsCol.findOne({
      _id: new ObjectId(id),
      userId: auth.userId,
    });

    if (!card) {
      return NextResponse.json(
        { error: "Item not found or access denied" },
        { status: 404 }
      );
    }

    await cardsCol.deleteOne({
      _id: new ObjectId(id),
      userId: auth.userId,
    });

    // Log deletion
    await logger.logFlashcardDeleted(
      auth.rawId,
      auth.email,
      id,
      card.title || "Untitled",
      request
    );

    return NextResponse.json({
      success: true,
      message: "Card deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /flashcards/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete item" },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!id || !ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid card ID" }, { status: 400 });
  }

  const auth = await getAuthenticatedUser(request);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let updateData;
  try {
    updateData = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No update data provided" },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const cardsCol = db.collection("cards");

    const card = await cardsCol.findOne({
      _id: new ObjectId(id),
      userId: auth.userId,
    });

    if (!card) {
      return NextResponse.json(
        { error: "Card not found or access denied" },
        { status: 404 }
      );
    }

    const result = await cardsCol.updateOne(
      { _id: new ObjectId(id), userId: auth.userId },
      {
        $set: {
          ...updateData,
          lastAccessed: new Date(),
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Card not found or access denied" },
        { status: 404 }
      );
    }

    // Log pin/unpin actions
    if ("pinned" in updateData) {
      const action = updateData.pinned
        ? logger.logFlashcardBookmarked
        : logger.logFlashcardUnbookmarked;

      await action(
        auth.rawId,
        auth.email,
        id,
        card.title || "Untitled",
        request
      );
    }

    return NextResponse.json({
      success: true,
      message: "Card updated successfully",
    });
  } catch (error) {
    console.error("PATCH /cards/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update card" },
      { status: 500 }
    );
  }
}
