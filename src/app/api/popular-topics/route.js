import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function GET(request) {
    let userId = null;
    let user = null;

    // Get user from auth token
    try {
        const authHeader = request.headers.get("authorization");
        let token = authHeader?.startsWith("Bearer ")
            ? authHeader.slice(7)
            : (await cookies()).get("token")?.value;

        if (token) {
            const decoded = verifyToken(token);
            userId = decoded.id;
        }
    } catch (e) {
        // Continue as anonymous user
    }

    try {
        const { db } = await connectToDatabase();

        // Get user profile if authenticated
        if (userId) {
            user = await db.collection("users").findOne(
                { _id: new ObjectId(userId) },
                {
                    projection: {
                        interests: 1,
                        interestCategories: 1,
                        skillLevel: 1,
                        goals: 1,
                        ageGroup: 1,
                        educationLevel: 1,
                    },
                }
            );
        }

        // Check cache (24 hours)
        const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
        const cacheKey = userId ? `${userId}_${today}` : `anonymous_${today}`;

        const cached = await db.collection("popular_topics").findOne({
            cacheKey,
            createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        });

        if (cached?.topics?.length >= 8) {
            return NextResponse.json({
                topics: cached.topics,
                source: "cache",
                cachedAt: cached.createdAt,
            });
        }

        // Generate new topics with AI
        const topics = await generatePopularTopics(user);

        // Cache the results
        await db.collection("popular_topics").insertOne({
            cacheKey,
            userId: userId ? new ObjectId(userId) : null,
            topics,
            userProfile: user
                ? {
                    interests: user.interests || [],
                    interestCategories: user.interestCategories || [],
                    skillLevel: user.skillLevel,
                    goals: user.goals || [],
                }
                : null,
            createdAt: new Date(),
        });

        return NextResponse.json({
            topics,
            source: "generated",
            generatedAt: new Date().toISOString(),
        });
    } catch (error) {
        console.error("Error generating popular topics:", error);

        // Fallback to default topics
        return NextResponse.json({
            topics: getDefaultTopics(),
            source: "fallback",
        });
    }
}

async function generatePopularTopics(user) {
    const interests = user?.interests || [];
    const interestCategories = user?.interestCategories || [];
    const skillLevel = user?.skillLevel || "beginner";
    const goals = user?.goals || [];

    // Build personalization context
    let personalizationContext = "";
    if (user && (interests.length > 0 || goals.length > 0)) {
        personalizationContext = `
USER PROFILE:
- Interests: ${interests.join(", ") || "General learning"}
- Categories: ${interestCategories.join(", ") || "Various"}
- Skill Level: ${skillLevel}
- Goals: ${goals.join(", ") || "Personal development"}

Generate topics that match their interests while introducing adjacent growth areas.
`;
    }

    const prompt = `Generate EXACTLY 8 popular learning topics for ${new Date().getFullYear()}.

${personalizationContext}

REQUIREMENTS:
- Return 8 short, punchy topic names (2-4 words each)
- Mix of topics matching user interests (if provided) and trending topics
- Cover diverse fields: Technology, Business, Health, Creative Arts, Science, Lifestyle, Professional Skills
- Make them actionable and specific (e.g., "AI Agent Development" not "Introduction to AI")
- Topics should feel current and relevant to ${new Date().getFullYear()}

${user ? "PERSONALIZATION: 4-5 topics should align with user interests, 3-4 should be trending/adjacent topics for growth" : "GENERAL: Cover a broad mix of trending topics across all fields"}

Return ONLY a JSON array of 8 topic strings. No markdown, no explanations.

Example format: ["Topic 1", "Topic 2", "Topic 3", "Topic 4", "Topic 5", "Topic 6", "Topic 7", "Topic 8"]`;

    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "system",
                    content:
                        "You are an expert learning curator. Generate concise, trending, actionable learning topics.",
                },
                {
                    role: "user",
                    content: prompt,
                },
            ],
            temperature: 0.8,
            max_tokens: 500,
        });

        const content = completion.choices[0].message.content.trim();
        // Remove markdown code blocks if present
        const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "");
        const topics = JSON.parse(cleaned);

        if (Array.isArray(topics) && topics.length >= 8) {
            return topics.slice(0, 8);
        }

        throw new Error("Invalid topics format");
    } catch (error) {
        console.error("AI generation failed:", error);
        return getDefaultTopics(user);
    }
}

function getDefaultTopics(user = null) {
    // Personalized defaults based on user interests
    if (user?.interests?.length > 0) {
        const interestMap = {
            programming: [
                "Full-Stack Development",
                "Python Programming",
                "Web Development",
                "Mobile App Development",
            ],
            "data-science": [
                "Data Analysis",
                "Machine Learning",
                "Data Visualization",
                "SQL Mastery",
            ],
            design: [
                "UI/UX Design",
                "Graphic Design",
                "Figma Mastery",
                "Design Systems",
            ],
            business: [
                "Digital Marketing",
                "Entrepreneurship",
                "Product Management",
                "Business Strategy",
            ],
            ai: [
                "AI Agent Development",
                "Prompt Engineering",
                "Machine Learning",
                "AI Applications",
            ],
        };

        const userTopics = [];
        user.interests.forEach((interest) => {
            const topics = interestMap[interest.toLowerCase()] || [];
            userTopics.push(...topics);
        });

        if (userTopics.length >= 8) {
            return userTopics.slice(0, 8);
        }

        // Fill remaining with general topics
        const generalTopics = [
            "Artificial Intelligence",
            "Web Development",
            "Data Science",
            "Digital Marketing",
            "Personal Finance",
            "Creative Writing",
            "Photography",
            "Fitness & Wellness",
        ];

        return [...userTopics, ...generalTopics].slice(0, 8);
    }

    // Generic defaults for non-authenticated users
    return [
        "Artificial Intelligence",
        "Frontend Development",
        "Backend Development",
        "Data Science",
        "Machine Learning",
        "Web Development",
        "Mobile Development",
        "DevOps",
    ];
}
