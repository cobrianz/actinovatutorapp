// src/app/api/explore/trending/route.js

import { NextResponse } from "next/server";
import OpenAI from "openai";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const CURRENT_YEAR = new Date().getFullYear();

export async function GET(request) {
  const { db } = await connectToDatabase();
  const user = request.user || null;

  try {
    // === 1. Check Cache (7-day freshness, user-specific) ===
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const userId = user?._id?.toString() || "anonymous";

    const cached = await db.collection("explore_trending").findOne({
      userId,
      createdAt: { $gte: weekAgo },
    });

    if (cached?.topics?.length >= 6) {
      return NextResponse.json({
        success: true,
        topics: cached.topics.slice(0, 6),
        source: "cache",
        refreshedAt: cached.createdAt,
      });
    }

    // === 2. Personalization Context (from your profile) ===
    let personalization = "";
    if (user) {
      const profile = await User.findById(user._id)
        .select("interests interestCategories skillLevel goals firstName")
        .lean();

      if (profile) {
        const lines = [];
        if (profile.firstName) lines.push(`Student name: ${profile.firstName}`);
        if (profile.interests?.length)
          lines.push(`Interested in: ${profile.interests.join(", ")}`);
        if (profile.interestCategories?.length)
          lines.push(
            `Loves categories: ${profile.interestCategories.join(", ")}`
          );
        if (profile.skillLevel)
          lines.push(`Current level: ${profile.skillLevel}`);
        if (profile.goals?.length)
          lines.push(`Goals: ${profile.goals.join(", ")}`);

        if (lines.length > 0) {
          personalization = `\n\nPERSONALIZED FOR THIS LEARNER:\n${lines.join("\n")}\nGenerate topics that feel made just for them — exciting, relevant, and perfectly matched to their journey.`;
        }
      }
    }

    // === 3. Generate 6 PERFECT Trending Topics ===
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are the world's best learning experience curator in ${CURRENT_YEAR}.

Generate EXACTLY 6 irresistible, currently trending online course topics that learners are obsessed with right now.

IMPORTANT: Cover DIVERSE fields beyond just technology. Include:
- Technology (AI, Programming, Web Development, etc.)
- Business & Entrepreneurship (Marketing, Finance, Management, etc.)
- Health & Wellness (Fitness, Nutrition, Mental Health, Medicine, etc.)
- Creative Arts (Design, Music, Writing, Photography, Art, etc.)
- Humanities (History, Philosophy, Languages, Literature, etc.)
- Science (Physics, Chemistry, Biology, Astronomy, etc.)
- Lifestyle (Cooking, Gardening, Crafts, Personal Development, etc.)
- Professional Skills (Leadership, Communication, Project Management, etc.)
- Trades & Technical Skills (Carpentry, Plumbing, Electrical, etc.)
- Education & Teaching (Pedagogy, Curriculum Design, etc.)

Ensure variety - NOT all tech courses. Mix different fields based on what's trending globally.

Each topic must include:
- A magnetic title (short & punchy)
- A description that makes you want to enroll instantly
- One clear category
- Realistic difficulty + duration
- 4 perfect tags
- A "whyTrending" that feels urgent and real
- 3-4 real learner questions with helpful answers
- A "hook" field: one bold promise (e.g. "Go from zero to hired in 10 weeks")

Return ONLY a clean JSON array. No markdown. No extra text.

Make them feel fresh, actionable, and impossible to ignore.${personalization}`,
        },
        {
          role: "user",
          content: `Give me the 6 hottest, most in-demand online course topics for ${CURRENT_YEAR} — right now, today. Make them diverse, exciting, and perfectly relevant to real learners.`,
        },
      ],
      temperature: 0.9,
      max_tokens: 3000,
    });

    let topics = [];

    try {
      const raw = completion.choices[0].message.content
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();

      const parsed = JSON.parse(raw);
      topics = Array.isArray(parsed) ? parsed : [];
    } catch (e) {
      console.error("AI JSON parse failed:", e);
    }

    // === 4. Ultimate Fallback (Your Personal Hall of Fame) ===
    if (topics.length < 6) {
      topics = [
        {
          title: "AI Agent Engineering",
          description:
            "Build autonomous AI agents that run your business, research, and life — no code required",
          category: "AI",
          difficulty: "intermediate",
          estimatedDuration: "8 weeks",
          tags: ["AI Agents", "Automation", "n8n", "CrewAI"],
          whyTrending: "AI agents are replacing apps and junior roles in 2025",
          hook: "Launch your first money-making agent in week 3",
          questions: [
            {
              question: "Do I need to code?",
              answer: "No — visual builders + templates included",
            },
            {
              question: "Can agents make money?",
              answer: "Yes — students are earning $2k+/mo with lead-gen agents",
            },
            {
              question: "Is this the future?",
              answer: "Yes. Every company will have 100+ agents by 2027",
            },
          ],
        },
        {
          title: "Next.js 15 Mastery",
          description:
            "Build blazing-fast, SEO-perfect apps with React Server Components and Partial Prerendering",
          category: "Programming",
          difficulty: "intermediate",
          estimatedDuration: "10 weeks",
          tags: ["Next.js", "React", "TypeScript", "App Router"],
          whyTrending:
            "Next.js 15 is the new industry standard — used by Vercel, Netflix, Shopify",
          hook: "Deploy production apps that rank #1 on Google",
          questions: [
            {
              question: "Is Next.js still worth learning?",
              answer: "More than ever — 80% of new React jobs require it",
            },
            {
              question: "What’s new in v15?",
              answer: "Partial Prerendering = instant load + dynamic data",
            },
          ],
        },
        {
          title: "Prompt Engineering Pro",
          description:
            "Master the #1 skill of 2025: turn any AI into an expert in seconds",
          category: "AI",
          difficulty: "beginner",
          estimatedDuration: "5 weeks",
          tags: ["Prompting", "ChatGPT", "Claude", "Gemini"],
          whyTrending:
            "One good prompt = 100 hours saved. This is the new literacy",
          hook: "10x your output in any field — writing, coding, design, research",
          questions: [
            {
              question: "Is this really a career skill?",
              answer: "Yes — Prompt Engineer roles pay $300k+ at startups",
            },
          ],
        },
        {
          title: "Freelance to $10k/mo",
          description:
            "Go from zero clients to fully booked using AI, automation, and smart positioning",
          category: "Business",
          difficulty: "beginner",
          estimatedDuration: "8 weeks",
          tags: ["Freelancing", "Client Acquisition", "AI Tools"],
          whyTrending: "Remote freelance economy grew 40% in 2025",
          hook: "Land your first $5k client in 30 days",
          questions: [
            {
              question: "Can anyone do this?",
              answer: "Yes — even with basic skills + AI leverage",
            },
          ],
        },
        {
          title: "Figma + AI Design System",
          description:
            "Design 10x faster with AI-generated UI, auto-layout, and component libraries",
          category: "Design",
          difficulty: "beginner",
          estimatedDuration: "6 weeks",
          tags: ["Figma", "UI/UX", "AI Design", "Design Systems"],
          whyTrending: "AI is making designers superhuman — not replacing them",
          hook: "Go from idea to pixel-perfect prototype in 1 day",
          questions: [
            {
              question: "Will AI replace designers?",
              answer: "No — it makes great designers unstoppable",
            },
          ],
        },
        {
          title: "Longevity Science & Biohacking",
          description:
            "Use science-backed protocols to add 20+ healthy years to your life",
          category: "Health",
          difficulty: "intermediate",
          estimatedDuration: "9 weeks",
          tags: ["Biohacking", "Longevity", "Nutrition", "Sleep"],
          whyTrending:
            "Breakthroughs in NAD+, rapamycin, and wearables are going mainstream",
          hook: "Measure and improve your biological age in 90 days",
          questions: [
            {
              question: "Is this real science?",
              answer: "Yes — backed by Harvard, Stanford, and 1000+ studies",
            },
          ],
        },
      ];
    }

    // === 5. Cache Results (user-specific) ===
    await db.collection("explore_trending").deleteMany({ userId });
    await db.collection("explore_trending").insertOne({
      userId,
      topics: topics.slice(0, 6),
      createdAt: new Date(),
      generatedForUser: user?._id?.toString() || "anonymous",
      model: "gpt-4o-mini",
    });

    return NextResponse.json({
      success: true,
      topics: topics.slice(0, 6),
      source: "ai-generated",
      refreshedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Trending topics critical failure:", error);

    // Nuclear fallback — always works
    return NextResponse.json({
      success: true,
      topics: [
        {
          title: "AI Revolution 2025",
          description: "Everything changing right now",
          category: "AI",
          difficulty: "all levels",
          estimatedDuration: "ongoing",
          tags: ["Future", "Career"],
          whyTrending: "It's happening now",
          hook: "Don't get left behind",
          questions: [],
        },
        {
          title: "Build Your First SaaS",
          description: "From idea to recurring revenue",
          category: "Entrepreneurship",
          difficulty: "intermediate",
          estimatedDuration: "10 weeks",
          tags: ["SaaS", "Startup"],
          whyTrending: "AI makes it easier than ever",
          hook: "$0 to $10k/mo",
          questions: [],
        },
        {
          title: "Master Remote Work",
          description: "Thrive in the new world of work",
          category: "Career",
          difficulty: "beginner",
          estimatedDuration: "4 weeks",
          tags: ["Remote", "Productivity"],
          whyTrending: "The office is dead",
          hook: "Work from anywhere",
          questions: [],
        },
        {
          title: "Personal Brand OS",
          description: "Build a brand that opens doors",
          category: "Business",
          difficulty: "beginner",
          estimatedDuration: "6 weeks",
          tags: ["Branding", "Content"],
          whyTrending: "Attention is the new oil",
          hook: "Become undeniable",
          questions: [],
        },
        {
          title: "Creative AI Mastery",
          description: "Make art, music, and content with AI",
          category: "Creativity",
          difficulty: "beginner",
          estimatedDuration: "7 weeks",
          tags: ["AI Art", "Music", "Writing"],
          whyTrending: "Creativity is exploding",
          hook: "Make what you imagine",
          questions: [],
        },
        {
          title: "Financial Freedom OS",
          description: "Build wealth in the AI era",
          category: "Finance",
          difficulty: "intermediate",
          estimatedDuration: "12 weeks",
          tags: ["Investing", "Crypto", "Passive Income"],
          whyTrending: "New rules, new opportunities",
          hook: "Retire earlier",
          questions: [],
        },
      ],
    });
  }
}
