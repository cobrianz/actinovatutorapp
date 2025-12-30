// src/app/api/visitors/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import VisitorCounter from "@/models/VisitorCounter";

import { withRateLimit } from "@/lib/middleware";

async function handleGet() {
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

// 1 request per 5 minutes per IP for visitors counter
export const GET = withRateLimit({ max: 1, windowMs: 5 * 60 * 1000 })(handleGet);
export const POST = GET;
