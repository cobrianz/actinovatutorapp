import { connectToDatabase } from "@/lib/mongodb";
import Post from "@/models/Post";
import OpenAI from "openai";

function getCurrentMonthKey() {
    const d = new Date();
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    return `${y}-${m}`;
}

function getCurrentWeekKey() {
    const d = new Date();
    const y = d.getUTCFullYear();
    // Get ISO week number
    const onejan = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return `${y}-W${String(week).padStart(2, "0")}`;
}

function calculateReadTime(content) {
    const wordsPerMinute = 200;
    const wordCount = content.split(/\s+/).length;
    const minutes = Math.ceil(wordCount / wordsPerMinute);
    return `${minutes} min read`;
}

const BLOG_TOPICS = [
    "AI-Powered Study Techniques",
    "Effective Learning Strategies",
    "Memory Retention Methods",
    "Time Management for Students",
    "Active Learning Approaches",
    "Note-Taking Best Practices",
    "Exam Preparation Tips",
    "Focus and Concentration Techniques",
    "Online Learning Success",
    "Educational Technology Trends",
];

const CATEGORIES = [
    "Study Tips",
    "AI & Technology",
    "Learning Strategies",
    "Productivity",
    "Education Trends",
];

export async function generateWeeklyPost(weekNumber = 1) {
    await connectToDatabase();
    const weekKey = getCurrentWeekKey();

    // Check if we already have 2 posts for this week
    const existingCount = await Post.countDocuments({
        period: "weekly",
        periodKey: weekKey,
        status: "published",
    });

    if (existingCount >= 2) {
        console.log(`Already have ${existingCount} posts for week ${weekKey}`);
        return null;
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const topic = BLOG_TOPICS[Math.floor(Math.random() * BLOG_TOPICS.length)];
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];

    const prompt = `You are an expert education blogger writing for an AI tutoring platform. Create a comprehensive, engaging blog post about "${topic}".

The article should be 800-1200 words and include:
- A compelling introduction that hooks the reader
- 3-5 main sections with practical, actionable advice
- Real-world examples and case studies
- Scientific research or data to support claims
- Practical tips students can implement immediately
- A strong conclusion with key takeaways

Make it conversational, engaging, and valuable for students and educators.

Return JSON with:
- title: Catchy, SEO-friendly title (60-70 characters)
- excerpt: Compelling 2-sentence summary (150-160 characters)
- tags: Array of 3-5 relevant tags
- content_markdown: Full article in markdown format with proper headings, lists, and formatting`;

    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            response_format: { type: "json_object" },
            temperature: 0.8,
        });

        const raw = response.choices[0]?.message?.content || "{}";
        let data;
        try {
            data = JSON.parse(raw);
        } catch {
            data = {};
        }

        const title = data.title || `${topic} - Week ${weekKey}`;
        const baseSlug = title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, "");

        // Ensure unique slug
        let slug = `${baseSlug}-${weekKey}-${weekNumber}`;
        let slugExists = await Post.findOne({ slug }).lean();
        let counter = 1;

        while (slugExists) {
            slug = `${baseSlug}-${weekKey}-${weekNumber}-${counter}`;
            slugExists = await Post.findOne({ slug }).lean();
            counter++;
        }

        const content = data.content_markdown || `# ${title}\n\nContent coming soon...`;
        const readTime = calculateReadTime(content);

        const post = await new Post({
            title,
            slug,
            summary: data.excerpt || data.summary || "",
            excerpt: data.excerpt || data.summary || "",
            content,
            category,
            tags: Array.isArray(data.tags) ? data.tags : [topic, "Learning", "Education"],
            author: { name: "Actinova AI", role: "admin" },
            featured: false,
            trending: Math.random() > 0.7, // 30% chance of being trending
            period: "weekly",
            periodKey: weekKey,
            readTime,
            publishedAt: new Date(),
            status: "published",
        }).save();

        console.log(`Generated weekly post: ${title}`);
        return post;
    } catch (error) {
        console.error("Error generating weekly post:", error);
        throw error;
    }
}

export async function generateSeedPostsForPeriod() {
    await connectToDatabase();
    const monthKey = getCurrentMonthKey();

    // Idempotency: if any published posts exist, skip
    const existingTotal = await Post.countDocuments({ status: "published" });
    if (existingTotal > 0) return;

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Generate featured monthly post
    const promptFeatured = `You are an editor for an AI tutoring platform. Create a comprehensive monthly featured article for ${monthKey} about AI tutoring trends and practical guidance.

The article should be at least 1200 words long and cover:
- Current AI tutoring technology trends
- Practical implementation strategies
- Case studies and real-world examples
- Future predictions and emerging technologies
- Best practices for educators and students
- Challenges and solutions in AI education

Return JSON with: title, excerpt, tags (array), content_markdown (very detailed markdown article with multiple sections, examples, and practical advice).`;

    const featuredResp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: promptFeatured }],
        response_format: { type: "json_object" },
    });

    const featuredRaw = featuredResp.choices[0]?.message?.content || "{}";
    let featuredData;
    try {
        featuredData = JSON.parse(featuredRaw);
    } catch {
        featuredData = {};
    }

    const fTitle = featuredData.title || `AI Tutoring Trends for ${monthKey}`;
    const fSlug = fTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const fContent = featuredData.content_markdown || `# AI Tutoring (${monthKey})`;

    await new Post({
        title: fTitle,
        slug: fSlug,
        summary: featuredData.excerpt || featuredData.summary || "",
        excerpt: featuredData.excerpt || featuredData.summary || "",
        content: fContent,
        category: "AI & Technology",
        tags: Array.isArray(featuredData.tags)
            ? featuredData.tags
            : ["AI", "Tutoring", "Monthly"],
        author: { name: "Actinova AI", role: "admin" },
        featured: true,
        period: "monthly",
        periodKey: monthKey,
        readTime: calculateReadTime(fContent),
        publishedAt: new Date(),
        status: "published",
    }).save();

    // Generate 2 initial weekly posts
    await generateWeeklyPost(1);
    await generateWeeklyPost(2);
}

export async function ensurePeriodPost(period = "monthly") {
    await connectToDatabase();
    const key = period === "monthly" ? getCurrentMonthKey() : getCurrentWeekKey();
    if (!key) return;

    const exists = await Post.findOne({ period, periodKey: key }).lean();
    if (exists) return;

    if (period === "weekly") {
        await generateWeeklyPost(1);
        return;
    }

    // Monthly fallback
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const prompt = `Create a ${period} AI tutoring article for ${key}. Return JSON with title, excerpt, tags, content_markdown.`;

    const resp = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
    });

    const raw = resp.choices[0]?.message?.content || "{}";
    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        data = {};
    }

    const title = data.title || `AI Tutoring ${period} ${key}`;
    const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
    const content = data.content_markdown || `# AI Tutoring ${period} ${key}`;

    await new Post({
        title,
        slug,
        summary: data.excerpt || data.summary || "",
        excerpt: data.excerpt || data.summary || "",
        content,
        category: "AI & Technology",
        tags: Array.isArray(data.tags) ? data.tags : ["AI", "Tutoring"],
        author: { name: "Actinova AI", role: "admin" },
        featured: period === "monthly",
        period,
        periodKey: key,
        readTime: calculateReadTime(content),
        publishedAt: new Date(),
        status: "published",
    }).save();
}
