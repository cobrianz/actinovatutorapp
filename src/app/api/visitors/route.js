// src/app/api/visitors/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import VisitorCounter from "@/models/VisitorCounter";

/**
 * GET: Increments and returns the visitor count
 */
export async function GET() {
    try {
        await connectToDatabase();
        const counter = await VisitorCounter.incrementCounter();

        return NextResponse.json({
            success: true,
            count: counter.count,
            message: "Visitor count updated",
        });
    } catch (error) {
        console.error("[GET /api/visitors] Error:", error);
        return NextResponse.json(
            { success: false, error: "Failed to update visitor count" },
            { status: 500 }
        );
    }
}

/**
 * POST: Same as GET (fallback for older implementations)
 */
export async function POST() {
    return GET();
}
