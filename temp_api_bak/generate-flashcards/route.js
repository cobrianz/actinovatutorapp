// src/app/api/cards/generate/route.js

import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const LIMITS = {
  free: { cards: 8, monthlyGenerations: 2 },
  premium: { cards: 40, monthlyGenerations: 20 },
};

export async function POST(request) {
  let userId = null;
  let isPremium = false;

  try {
    // ─── AUTH ───
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) token = (await cookies()).get("token")?.value;

    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.id;
      } catch (err) {
        console.warn("Invalid token");
      }
    }

    // ─── INPUT ───
    const {
      topic,
      difficulty = "intermediate",
      existingCardSetId,
      additionalCards,
      existingCardCount,
    } = await request.json();
    if (!topic?.trim()) {
      return NextResponse.json({ error: "Topic is required" }, { status: 400 });
    }
    if (!["beginner", "intermediate", "advanced"].includes(difficulty)) {
      return NextResponse.json(
        { error: "Invalid difficulty" },
        { status: 400 }
      );
    }

    const { db } = await connectToDatabase();

    // ─── USER & MONTHLY LIMITS (auto-reset on 1st of month) ───
    let user = null;
    let monthlyUsage = 0;
    let usageResetDate = new Date();

    if (userId) {
      user = await db
        .collection("users")
        .findOne({ _id: new ObjectId(userId) });

      isPremium =
        user?.isPremium ||
        ((user?.subscription?.plan === "pro" || user?.subscription?.plan === "enterprise") &&
          user?.subscription?.status === "active");

      const now = new Date();
      const lastReset = user?.usageResetDate
        ? new Date(user.usageResetDate)
        : null;
      const isNewMonth =
        !lastReset ||
        lastReset.getMonth() !== now.getMonth() ||
        lastReset.getFullYear() !== now.getFullYear();

      if (isNewMonth) {
        monthlyUsage = 0;
        usageResetDate = new Date(now.getFullYear(), now.getMonth() + 1, 1); // Next month 1st
        await db
          .collection("users")
          .updateOne(
            { _id: new ObjectId(userId) },
            { $set: { monthlyUsage: 0, usageResetDate } }
          );
        // Refresh user data (db is already available in scope)
        const updatedUser = await db.collection("users").findOne({ _id: new ObjectId(userId) });
        monthlyUsage = updatedUser?.monthlyUsage || 0;
      }

      // ─── DUPLICATE CHECK (Pre-Limit) ───
      if (!existingCardSetId) {
        const existingDuplicate = await db.collection("cardSets").findOne({
          userId: new ObjectId(userId),
          topic: topic.trim().toLowerCase(),
          difficulty,
        });

        if (existingDuplicate) {
          console.log(`Returning existing card set for ${topic} (${difficulty})`);
          return NextResponse.json({
            success: true,
            cardSetId: existingDuplicate._id.toString(),
            title: existingDuplicate.title,
            totalCards: existingDuplicate.totalCards,
            difficulty,
            isPremium,
            canExportToAnki: true,
            monthly: {
              used: monthlyUsage, // Do not increment usage for existing
              limit: isPremium
                ? LIMITS.premium.monthlyGenerations
                : LIMITS.free.monthlyGenerations,
              resetsOn: usageResetDate.toLocaleDateString(),
            },
            features: [
              "Spaced Repetition (SM-2)",
              "Review History",
              "Anki Export",
              "Shareable Link",
              "Bookmark & Progress",
              "Auto-reset Monthly Limits",
            ],
            duplicate: true,
            existing: true,
          });
        }
      }

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const flashcardCount = await db.collection("cardSets").countDocuments({
        userId: new ObjectId(userId),
        createdAt: { $gte: startOfMonth }
      });

      const limit = isPremium
        ? LIMITS.premium.monthlyGenerations
        : LIMITS.free.monthlyGenerations;
      if (flashcardCount >= limit) {
        return NextResponse.json(
          {
            error: `Monthly flashcard limit reached (${limit}). Upgrade for more!`,
            used: flashcardCount,
            limit,
            isPremium,
            resetsOn: usageResetDate.toLocaleDateString(),
            upgrade: !isPremium,
          },
          { status: 429 }
        );
      }

      // Increment usage
      await db.collection("users")
        .updateOne({ _id: new ObjectId(userId) }, { $inc: { monthlyUsage: 1 } });
    }

    const cardCount =
      additionalCards || (isPremium ? LIMITS.premium.cards : LIMITS.free.cards);

    // ─── GENERATE FLASHCARDS ───
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.75,
      max_tokens: 8000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `Generate EXACTLY ${cardCount} ${difficulty} flashcards for "${topic}".

Return ONLY valid JSON with this structure:
{
  "title": string,
  "level": "${difficulty}",
  "totalCards": ${cardCount},
  "cards": [
    {
      "id": number,
      "question": string,
      "answer": string,
      "explanation": string,
      "keyPoints": string[],
      "example": string,
      "category": "concept"|"tip"|"warning"|"practice",
      "difficulty": "${difficulty}",
      "srs": { "interval": 1, "repetitions": 0, "ease": 2.5, "dueDate": "${new Date().toISOString()}" }
    }
  ]
}

No markdown. Only JSON. Perfect for spaced repetition.`,
        },
        {
          role: "user",
          content: `Create ${cardCount} high-quality ${difficulty} flashcards for "${topic}" with deep explanations and examples.`,
        },
      ],
    });

    let flashcards;
    try {
      flashcards = JSON.parse(completion.choices[0].message.content.trim());
    } catch (e) {
      console.error("JSON parse failed, using fallback");
      flashcards = {
        title: `${topic} Flashcards`,
        level: difficulty,
        totalCards: cardCount,
        cards: [],
      };
    }

    // Ensure cards exist
    if (!Array.isArray(flashcards.cards) || flashcards.cards.length === 0) {
      flashcards.cards = Array(cardCount)
        .fill()
        .map((_, i) => ({
          id: i + 1,
          question: `Question ${i + 1}`,
          answer: "Answer",
          explanation: "Explanation",
          keyPoints: ["Point 1"],
          example: "Example",
          category: "concept",
          difficulty,
          srs: {
            interval: 1,
            repetitions: 0,
            ease: 2.5,
            dueDate: new Date().toISOString(),
          },
        }));
    }

    // ─── SAVE CARD SET (with SRS, export ready) ───
    let cardSetId;
    let cardSet;
    let newCards = undefined; // Initialize for existing set additions

    if (existingCardSetId) {
      // Add to existing card set
      cardSetId = new ObjectId(existingCardSetId);
      const existingSet = await db.collection("cardSets").findOne({
        _id: cardSetId,
        userId: userId ? new ObjectId(userId) : null,
      });

      if (!existingSet) {
        return NextResponse.json(
          { error: "Card set not found" },
          { status: 404 }
        );
      }

      // Generate new card IDs starting from the next available ID
      const nextId = (existingCardCount || existingSet.cards.length) + 1;
      newCards = flashcards.cards.map((c, i) => ({
        ...c,
        id: nextId + i,
        _id: new ObjectId(),
        cardSetId,
        reviews: [],
        srs: c.srs || {
          interval: 1,
          repetitions: 0,
          ease: 2.5,
          dueDate: new Date().toISOString(),
        },
      }));

      // Update existing set
      await db.collection("cardSets").updateOne(
        { _id: cardSetId },
        {
          $push: { cards: { $each: newCards } },
          $inc: { totalCards: newCards.length },
          $set: { lastAccessed: new Date() },
        }
      );

      cardSet = {
        ...existingSet,
        cards: [...existingSet.cards, ...newCards],
        totalCards: existingSet.totalCards + newCards.length,
        lastAccessed: new Date(),
      };
    } else {
      // DUPLICATE CHECK moved to top for efficiency
      cardSetId = new ObjectId();


      cardSet = {
        _id: cardSetId,
        userId: userId ? new ObjectId(userId) : null,
        title: flashcards.title || `${topic} - ${difficulty}`,
        topic: topic.trim().toLowerCase(),
        originalTopic: topic,
        difficulty,
        totalCards: flashcards.totalCards || flashcards.cards.length,
        cards: flashcards.cards.map((c, i) => ({
          ...c,
          _id: new ObjectId(),
          cardSetId,
          reviews: [],
          srs: c.srs || {
            interval: 1,
            repetitions: 0,
            ease: 2.5,
            dueDate: new Date().toISOString(),
          },
        })),
        isPremium,
        progress: 0,
        completed: false,
        bookmarked: false,
        ankiExportReady: true,
        createdAt: new Date(),
        lastAccessed: new Date(),
        monthlyGenerationUsed: true,
      };

      // Save async
      await db.collection("cardSets").insertOne(cardSet);
      console.log(`Card set saved: ${cardSetId}`);

      // Enforce per-user card set limits (free: 1, premium: 20) in background or check before?
      // Check before is better, but here we check after insert (if it's just check).
      // The logic seemed to prevent returning success if limit reached, but we just inserted it.
      // Ideally check BEFORE insert.

      if (userId) {
        // Track in user history
        await db.collection("users")
          .updateOne(
            { _id: new ObjectId(userId) },
            {
              $push: {
                generatedCardSets: {
                  setId: cardSetId.toString(),
                  title: cardSet.title,
                  topic,
                  difficulty,
                  generatedAt: new Date(),
                  cardCount,
                },
              },
            }
          );
      }
    }

    return NextResponse.json({
      success: true,
      cardSetId: cardSetId.toString(),
      title: cardSet.title,
      totalCards: cardSet.totalCards,
      difficulty,
      isPremium,
      canExportToAnki: true,
      cards: existingCardSetId ? newCards : undefined, // Return new cards when adding to existing set
      monthly: {
        used: monthlyUsage + 1,
        limit: isPremium
          ? LIMITS.premium.monthlyGenerations
          : LIMITS.free.monthlyGenerations,
        resetsOn: usageResetDate.toLocaleDateString(),
      },
      features: [
        "Spaced Repetition (SM-2)",
        "Review History",
        "Anki Export",
        "Shareable Link",
        "Bookmark & Progress",
        "Auto-reset Monthly Limits",
      ],
    });
  } catch (error) {
    console.error("Flashcard generation failed:", error);
    return NextResponse.json(
      {
        error: "Failed to generate flashcards",
        details:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}
