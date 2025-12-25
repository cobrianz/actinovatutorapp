import { NextResponse } from "next/server";
import { generateWeeklyPost } from "../../blog/utils/generator";

export async function GET(request) {
    try {
        // Verify authorization (optional but recommended)
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET || "your-secret-key";

        if (authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Generate 2 weekly posts (runs every Sunday at midnight)
        const post1 = await generateWeeklyPost(1);
        const post2 = await generateWeeklyPost(2);

        const generated = [post1, post2].filter(Boolean);

        return NextResponse.json({
            success: true,
            message: `Generated ${generated.length} blog post(s)`,
            posts: generated.map(p => ({
                title: p.title,
                slug: p.slug,
                category: p.category,
            })),
        });
    } catch (error) {
        console.error("[CRON] Weekly blog generation error:", error);
        return NextResponse.json(
            { error: "Failed to generate weekly blogs", details: error.message },
            { status: 500 }
        );
    }
}
