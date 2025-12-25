import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

async function getUserId(request) {
  let token = request.headers.get("authorization")?.split("Bearer ")[1];
  if (!token) {
    const cookieStore = await cookies();
    token = cookieStore.get("token")?.value;
  }
  if (!token) return null;

  try {
    const decoded = verifyToken(token);
    return decoded.id;
  } catch {
    return null;
  }
}

// ─── GET: Fetch all notes (with filters) ───
export async function GET(request) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const itemId = searchParams.get("itemId"); // e.g. course_xxx, guide_xxx, cards_xxx
  const lessonId = searchParams.get("lessonId"); // optional sub-lesson

  try {
    const { db } = await connectToDatabase();
    const notesCol = db.collection("user_notes");

    const query = { userId: new ObjectId(userId) };

    if (itemId) {
      const match = itemId.match(/^(course|guide|cards)_(.+)$/);
      if (!match)
        return NextResponse.json(
          { error: "Invalid itemId format" },
          { status: 400 }
        );
      query.itemType = match[1];
      query.itemId = new ObjectId(match[2]);
    }

    if (lessonId) query.lessonId = lessonId;

    const notes = await notesCol.find(query).sort({ updatedAt: -1 }).toArray();

    const formatted = notes.map((n) => ({
      id: n._id.toString(),
      itemType: n.itemType,
      itemId: n.itemId?.toString(),
      lessonId: n.lessonId || null,
      title: n.title,
      content: n.content,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }));

    return NextResponse.json({ success: true, notes: formatted });
  } catch (error) {
    console.error("GET /api/notes error:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// ─── POST: Save or update note (smart upsert) ───
export async function POST(request) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { itemId, lessonId, content, title } = body;

  if (!itemId || !content?.trim()) {
    return NextResponse.json(
      { error: "itemId and content are required" },
      { status: 400 }
    );
  }

  const match = itemId.match(/^(course|guide|cards)_(.+)$/);
  if (!match) {
    return NextResponse.json(
      { error: "Invalid itemId format" },
      { status: 400 }
    );
  }

  const [type, rawId] = match.slice(1);
  if (!ObjectId.isValid(rawId)) {
    return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
  }

  try {
    const { db } = await connectToDatabase();
    const notesCol = db.collection("user_notes");

    const filter = {
      userId: new ObjectId(userId),
      itemType: type,
      itemId: new ObjectId(rawId),
      lessonId: lessonId || null,
    };

    const update = {
      $set: {
        title: title?.trim() || "Untitled Note",
        content: content.trim(),
        updatedAt: new Date(),
      },
      $setOnInsert: {
        userId: new ObjectId(userId),
        itemType: type,
        itemId: new ObjectId(rawId),
        lessonId: lessonId || null,
        createdAt: new Date(),
      },
    };

    const result = await notesCol.updateOne(filter, update, { upsert: true });

    const noteId =
      result.upsertedId?._id || (await notesCol.findOne(filter))._id;

    return NextResponse.json({
      success: true,
      message: result.upsertedId ? "Note created" : "Note updated",
      noteId: noteId.toString(),
    });
  } catch (error) {
    console.error("POST /api/notes error:", error);
    return NextResponse.json({ error: "Failed to save note" }, { status: 500 });
  }
}

// ─── DELETE: Remove a note ───
export async function DELETE(request) {
  const userId = await getUserId(request);
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const noteId = searchParams.get("noteId");

  if (!noteId || !ObjectId.isValid(noteId)) {
    return NextResponse.json(
      { error: "Valid noteId is required" },
      { status: 400 }
    );
  }

  try {
    const { db } = await connectToDatabase();
    const result = await db.collection("user_notes").deleteOne({
      _id: new ObjectId(noteId),
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: "Note not found or access denied" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Note deleted permanently",
    });
  } catch (error) {
    console.error("DELETE /api/notes error:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
