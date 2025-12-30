import OpenAI from "openai";
import { NextResponse } from "next/server";
import { getUserIdFromRequest } from "@/lib/userUtils";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request) {
    try {
        await connectToDatabase();
        const userId = await getUserIdFromRequest(request);

        if (!userId) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const user = await User.findById(userId);
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // === Safeguard: Plan Limits & Premium Check ===
        const planName = user.subscription?.plan || "free";
        const isPremium = planName === "pro" || planName === "enterprise" || user.isPremium;

        if (!isPremium) {
            return NextResponse.json({
                error: "DALL-E image generation is a premium feature. Please upgrade to Pro.",
                upgrade: true
            }, { status: 403 });
        }

        // === Rate Limiting (Basic) ===
        // Limit to 5 images per day even for pro to prevent major abuse
        const today = new Date().toISOString().split('T')[0];
        const dailyLimit = 5;

        // Find if user already generated images today
        const userWithUsage = await User.findById(userId).select('usage');
        const usage = userWithUsage.usage || {};
        const todayUsage = usage.imageGen?.[today] || 0;

        if (todayUsage >= dailyLimit) {
            return NextResponse.json({
                error: `Daily limit of ${dailyLimit} images reached. Try again tomorrow!`
            }, { status: 429 });
        }

        const body = await request.json();
        const { prompt } = body;

        if (!prompt?.trim()) {
            return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
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
            throw new Error("Failed to generate image from OpenAI");
        }

        // Update usage
        await User.updateOne(
            { _id: userId },
            { $inc: { [`usage.imageGen.${today}`]: 1 } }
        );

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
