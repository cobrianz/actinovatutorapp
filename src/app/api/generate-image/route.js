import OpenAI from "openai";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// === Shared Auth Helper ===
async function getUserId(request) {
    let token = request.headers.get("authorization")?.split("Bearer ")?.[1];

    if (!token) {
        token = (await cookies()).get("token")?.value;
    }

    if (!token) return null;

    try {
        const decoded = verifyToken(token);
        return decoded?.id ? decoded.id : null;
    } catch (err) {
        console.warn("Invalid token in DALL·E route:", err.message);
        return null;
    }
}

export async function POST(request) {
    const userId = await getUserId(request);

    if (!userId) {
        return NextResponse.json(
            { error: "Unauthorized" },
            { status: 401 }
        );
    }

    try {
        const body = await request.json();
        const { prompt } = body;

        if (!prompt?.trim()) {
            return NextResponse.json(
                { error: "Prompt is required" },
                { status: 400 }
            );
        }

        // Generate image using DALL·E 3
        const response = await openai.images.generate({
            model: "dall-e-3",
            prompt: `Educational diagram: ${prompt}. Style: Clear, professional textbook illustration with labels and bright colors on white background.`,
            n: 1,
            size: "1024x1024",
            quality: "standard",
        });

        const imageUrl = response.data[0]?.url;

        if (!imageUrl) {
            return NextResponse.json(
                { error: "Failed to generate image" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            success: true,
            imageUrl,
            prompt,
        });
    } catch (error) {
        console.error("DALL·E API Error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
