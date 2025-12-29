// src/app/lib/userUtils.js

import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";
import { getUserPlanName, getUserPlanLimits } from "./planLimits";

/**
 * Extracts userId from Request headers or cookies
 * @param {Request} request 
 * @returns {ObjectId|null}
 */
export async function getUserIdFromRequest(request) {
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ")
        ? authHeader.split("Bearer ")[1].trim()
        : null;

    if (!token) {
        token = (await cookies()).get("token")?.value;
    }

    if (!token) return null;

    try {
        const payload = verifyToken(token);
        return payload?.id ? new ObjectId(payload.id) : null;
    } catch (error) {
        return null;
    }
}

/**
 * Calculates detailed usage statistics for a user
 * @param {Db} db - MongoDB database instance
 * @param {ObjectId} userId 
 * @param {Object} user - User document
 * @returns {Object}
 */
export async function getDetailedUsage(db, userId, user) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Calculate dynamic reset date based on user creation day
    const createdAt = user.createdAt ? new Date(user.createdAt) : new Date();
    const resetDay = createdAt.getDate();
    let nextReset = new Date(now.getFullYear(), now.getMonth(), resetDay);

    if (nextReset <= now) {
        nextReset = new Date(now.getFullYear(), now.getMonth() + 1, resetDay);
    }

    const day = nextReset.getDate();
    const month = nextReset.toLocaleString('default', { month: 'short' });
    const suffix = (d) => {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1: return "st";
            case 2: return "nd";
            case 3: return "rd";
            default: return "th";
        }
    };
    const resetDateFormatted = `${month} ${day}${suffix(day)}`;

    const [courseUsed, cardSetUsed, quizUsed] = await Promise.all([
        db.collection("library").countDocuments({ userId, format: "course", createdAt: { $gte: startOfMonth } }),
        db.collection("cardSets").countDocuments({ userId, createdAt: { $gte: startOfMonth } }),
        db.collection("tests").countDocuments({ createdBy: userId, createdAt: { $gte: startOfMonth } })
    ]);

    const limits = getUserPlanLimits(user);
    const planName = getUserPlanName(user);
    const isPremium = planName !== 'free';

    const coursePercent = limits.courses === -1 ? 0 : Math.min(100, Math.round((courseUsed / limits.courses) * 100));
    const cardPercent = limits.flashcards === -1 ? 0 : Math.min(100, Math.round((cardSetUsed / limits.flashcards) * 100));
    const quizPercent = limits.quizzes === -1 ? 0 : Math.min(100, Math.round((quizUsed / limits.quizzes) * 100));

    const maxPercent = Math.max(coursePercent, cardPercent, quizPercent);

    return {
        used: courseUsed + cardSetUsed + quizUsed,
        limit: (limits.courses === -1 ? 999 : limits.courses) +
            (limits.flashcards === -1 ? 999 : limits.flashcards) +
            (limits.quizzes === -1 ? 999 : limits.quizzes),
        percentage: maxPercent,
        isPremium,
        planName,
        resetDate: resetDateFormatted,
        details: {
            courses: { used: courseUsed, limit: limits.courses, percent: coursePercent },
            flashcards: { used: cardSetUsed, limit: limits.flashcards, percent: cardPercent },
            quizzes: { used: quizUsed, limit: limits.quizzes, percent: quizPercent }
        },
        isAtLimit: maxPercent >= 100
    };
}

/**
 * Fetches the currently authenticated user and their usage
 * @param {Request} request 
 * @param {Db} db 
 * @param {Object} projection 
 * @returns {Object|null}
 */
export async function getAuthenticatedUser(request, db, projection = {}) {
    const userId = await getUserIdFromRequest(request);
    if (!userId) return null;

    const user = await db.collection("users").findOne(
        { _id: userId, status: { $ne: "inactive" } },
        { projection }
    );

    if (!user) return null;

    const usage = await getDetailedUsage(db, userId, user);
    return { user, usage, userId };
}
