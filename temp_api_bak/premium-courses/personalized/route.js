import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/mongodb";
import { verifyToken } from "@/lib/auth";
import { ObjectId } from "mongodb";

export async function POST(request) {


  let token = request.headers.get("authorization")?.split("Bearer ")[1];
  let userId;

  if (token) {
    try {
      const decoded = verifyToken(token);
      userId = decoded.id;
    } catch {
      // Header token invalid, try cookies
      token = (await cookies()).get("token")?.value;
      if (token) {
        try {
          const decoded = verifyToken(token);
          userId = decoded.id;
        } catch {
          return NextResponse.json({ error: "Invalid token" }, { status: 401 });
        }
      } else {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }
  } else {
    token = (await cookies()).get("token")?.value;
    if (token) {
      try {
        const decoded = verifyToken(token);
        userId = decoded.id;
      } catch {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
      }
    } else {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await connectToDatabase();

    // Get user data with onboarding information
    const user = await db.collection("users").findOne(
      { _id: new ObjectId(userId) },
      {
        projection: {
          interests: 1,
          ageGroup: 1,
          educationLevel: 1,
          skillLevel: 1,
          goals: 1,
          learningStyle: 1,
          generatedPersonalizedCourses: 1,
        },
      }
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if user already has personalized courses generated
    if (
      user.generatedPersonalizedCourses &&
      user.generatedPersonalizedCourses.length > 0
    ) {
      return NextResponse.json({
        courses: user.generatedPersonalizedCourses,
        message: "Personalized courses already generated",
      });
    }

    // Generate personalized courses based on onboarding data
    const personalizedCourses = await generatePersonalizedCourses(user);

    // Store in database
    await db.collection("users").updateOne(
      { _id: new ObjectId(userId) },
      {
        $set: {
          generatedPersonalizedCourses: personalizedCourses,
          personalizedCoursesGeneratedAt: new Date(),
        },
      }
    );

    // Store in localStorage format for client-side caching
    const localStorageData = {
      courses: personalizedCourses,
      generatedAt: new Date().toISOString(),
      userId: userId,
    };

    return NextResponse.json({
      courses: personalizedCourses,
      localStorage: localStorageData,
    });
  } catch (error) {
    console.error("Error generating personalized premium courses:", error);
    return NextResponse.json(
      { error: "Failed to generate personalized courses" },
      { status: 500 }
    );
  }
}

async function generatePersonalizedCourses(user) {
  const {
    interests = [],
    ageGroup,
    educationLevel,
    skillLevel,
    goals = [],
    learningStyle,
  } = user;

  // Create course generation prompt based on user data
  const coursePrompt = `Generate EXACTLY 12 personalized premium courses for a learner with the following profile:

INTERESTS: ${interests.join(", ")}
AGE GROUP: ${ageGroup || "Not specified"}
EDUCATION: ${educationLevel || "Not specified"}
SKILL LEVEL: ${skillLevel || "Not specified"}
GOALS: ${goals.join(", ")}
LEARNING STYLE: ${learningStyle || "Not specified"}

REQUIREMENTS:
- Generate exactly 12 courses
- Each course should be tailored to their interests and goals
- Difficulty should match their skill level (${skillLevel || "intermediate"})
- Content should be appropriate for their age group
- Courses should be comprehensive and premium-quality
- Include practical projects and real-world applications
- Each course should have 8-12 modules with detailed learning outcomes

Return the courses in this exact JSON format:
[
  {
    "id": "unique-course-id",
    "title": "Course Title",
    "description": "Detailed description",
    "category": "Primary category",
    "difficulty": "${skillLevel || "intermediate"}",
    "duration": "8-12 weeks",
    "modules": 10,
    "projects": 3,
    "tags": ["tag1", "tag2", "tag3"],
    "learningOutcomes": ["outcome1", "outcome2", "outcome3"],
    "prerequisites": ["prereq1", "prereq2"],
    "personalized": true,
    "generatedAt": "${new Date().toISOString()}"
  }
]`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are an expert course curriculum designer. Generate personalized, high-quality course recommendations based on learner profiles.",
          },
          {
            role: "user",
            content: coursePrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const courses = JSON.parse(data.choices[0].message.content);

    // Validate and clean the generated courses
    return courses.map((course, index) => ({
      ...course,
      id: course.id || `personalized-${Date.now()}-${index}`,
      featured: index === 0,
      personalized: true,
      generatedAt: new Date().toISOString(),
      // Ensure required fields
      difficulty: course.difficulty || skillLevel || "intermediate",
      duration: course.duration || "8-12 weeks",
      modules: course.modules || 10,
      projects: course.projects || 2,
      tags: course.tags || [],
      learningOutcomes: course.learningOutcomes || [],
      prerequisites: course.prerequisites || [],
    }));
  } catch (error) {
    console.error("Error generating courses with AI:", error);

    // Check if it's an OpenAI API key issue
    if (error.message?.includes("OpenAI API error")) {
      console.error("OpenAI API key issue or service unavailable");
    }

    // Fallback: Generate basic personalized courses based on interests
    return generateFallbackCourses(interests, skillLevel, goals);
  }
}

function generateFallbackCourses(interests, skillLevel, goals) {
  const courses = [];
  const baseCourses = {
    programming: [
      { title: "Full-Stack Web Development", category: "Programming" },
      { title: "Python Programming Mastery", category: "Programming" },
      { title: "JavaScript & React Development", category: "Programming" },
      { title: "Data Structures & Algorithms", category: "Programming" },
    ],
    design: [
      { title: "UI/UX Design Fundamentals", category: "Design" },
      { title: "Graphic Design with Adobe Suite", category: "Design" },
      { title: "Motion Graphics & Animation", category: "Design" },
    ],
    business: [
      { title: "Digital Marketing Strategy", category: "Business" },
      { title: "Entrepreneurship Fundamentals", category: "Business" },
      { title: "Financial Planning & Analysis", category: "Business" },
    ],
    "data-science": [
      { title: "Data Analysis with Python", category: "Data Science" },
      { title: "Machine Learning Fundamentals", category: "Data Science" },
      { title: "SQL & Database Management", category: "Data Science" },
    ],
  };

  let courseIndex = 0;
  interests.forEach((interest) => {
    const categoryCourses =
      baseCourses[interest] ||
      baseCourses[Object.keys(baseCourses)[courseIndex % 4]];
    categoryCourses.forEach((courseTemplate) => {
      if (courses.length < 12) {
        courses.push({
          id: `personalized-${Date.now()}-${courses.length}`,
          title: courseTemplate.title,
          description: `Comprehensive course on ${courseTemplate.title.toLowerCase()} tailored to your learning goals.`,
          category: courseTemplate.category,
          difficulty: skillLevel || "intermediate",
          duration: "8-12 weeks",
          modules: 10,
          projects: 3,
          tags: [interest, courseTemplate.category.toLowerCase()],
          learningOutcomes: [
            `Master ${courseTemplate.title}`,
            "Build portfolio projects",
            "Apply skills in real-world scenarios",
          ],
          prerequisites: ["Basic computer skills"],
          personalized: true,
          generatedAt: new Date().toISOString(),
        });
      }
    });
    courseIndex++;
  });

  // Fill remaining slots if needed
  while (courses.length < 12) {
    const fallbackCourse = {
      id: `personalized-${Date.now()}-${courses.length}`,
      title: `Advanced ${goals[courses.length % goals.length] || "Professional Development"} Course`,
      description:
        "Comprehensive course designed for your career advancement goals.",
      category: "Professional Development",
      difficulty: skillLevel || "intermediate",
      duration: "8-12 weeks",
      modules: 10,
      projects: 3,
      tags: ["professional", "career"],
      learningOutcomes: [
        "Enhance professional skills",
        "Build expertise",
        "Advance career",
      ],
      prerequisites: ["Basic knowledge in field"],
      personalized: true,
      generatedAt: new Date().toISOString(),
    };
    courses.push(fallbackCourse);
  }

  return courses.map((course, index) => ({
    ...course,
    featured: index === 0,
  }));
}
