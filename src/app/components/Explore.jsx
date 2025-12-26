"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  Users,
  Clock,
  Star,
  TrendingUp,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Sparkles,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { getApiUrl, authenticatedFetch } from "../lib/apiConfig";
import { useAuth } from "./AuthProvider";

const staticCategories = [
  {
    name: "Technology",
    count: 67,
    topics: [
      "Programming & Development",
      "AI & Machine Learning",
      "Game Development",
      "Web Development",
      "Mobile Apps",
      "Cloud Computing",
      "Cybersecurity",
      "Blockchain",
    ],
    description: "Master cutting-edge technology skills",
    icon: "code",
    color: "blue",
  },
  {
    name: "Design",
    count: 32,
    topics: [
      "UI/UX Design",
      "Graphic Design",
      "Design Systems",
      "Figma",
      "Adobe Creative",
      "3D Modeling",
      "Animation",
      "Branding",
    ],
    description: "Create beautiful and functional designs",
    icon: "palette",
    color: "purple",
  },
  {
    name: "Business",
    count: 41,
    topics: [
      "Entrepreneurship",
      "Marketing",
      "Finance",
      "Management",
      "Strategy",
      "Sales",
      "Project Management",
      "Leadership",
      "E-commerce",
    ],
    description: "Build and grow successful businesses",
    icon: "briefcase",
    color: "orange",
  },
  {
    name: "Data Science",
    count: 28,
    topics: [
      "Data Analysis",
      "Machine Learning",
      "Statistics",
      "Python",
      "R",
      "SQL",
      "Visualization",
      "Big Data",
      "AI Ethics",
    ],
    description: "Analyze data and build intelligent systems",
    icon: "chart",
    color: "green",
  },
  {
    name: "AI & ML",
    count: 24,
    topics: [
      "Neural Networks",
      "Deep Learning",
      "Computer Vision",
      "NLP",
      "Reinforcement Learning",
      "AutoML",
      "AI Ethics",
      "Model Deployment",
    ],
    description: "Explore artificial intelligence and machine learning",
    icon: "brain",
    color: "indigo",
  },
  {
    name: "Creative",
    count: 29,
    topics: [
      "Photography",
      "Videography",
      "Music Production",
      "Digital Art",
      "Animation",
      "Content Creation",
      "Video Editing",
      "Sound Design",
    ],
    description: "Express creativity through digital media",
    icon: "camera",
    color: "pink",
  },
  {
    name: "Humanities",
    count: 22,
    topics: [
      "Writing",
      "Literature",
      "History",
      "Philosophy",
      "Psychology",
      "Sociology",
      "Cultural Studies",
      "Ethics",
      "Critical Thinking",
    ],
    description: "Explore human culture and society",
    icon: "book",
    color: "red",
  },
  {
    name: "Languages",
    count: 15,
    topics: [
      "Spanish",
      "French",
      "German",
      "Japanese",
      "Chinese",
      "Portuguese",
      "Italian",
      "Korean",
      "Arabic",
      "Russian",
    ],
    description: "Learn new languages and cultures",
    icon: "globe",
    color: "cyan",
  },
  {
    name: "Science",
    count: 19,
    topics: [
      "Physics",
      "Chemistry",
      "Biology",
      "Astronomy",
      "Geology",
      "Environmental Science",
      "Neuroscience",
      "Engineering",
      "Research Methods",
    ],
    description: "Explore the wonders of science",
    icon: "microscope",
    color: "teal",
  },
  {
    name: "Mathematics",
    count: 16,
    topics: [
      "Calculus",
      "Statistics",
      "Algebra",
      "Geometry",
      "Discrete Math",
      "Linear Algebra",
      "Probability",
      "Number Theory",
    ],
    description: "Master mathematical concepts and applications",
    icon: "calculator",
    color: "yellow",
  },
  {
    name: "Health",
    count: 18,
    topics: [
      "Nutrition",
      "Fitness",
      "Mental Health",
      "Wellness",
      "Anatomy",
      "Physiology",
      "Healthcare",
      "Preventive Medicine",
    ],
    description: "Promote health and wellness",
    icon: "heart",
    color: "rose",
  },
  {
    name: "Lifestyle",
    count: 14,
    topics: [
      "Cooking",
      "Baking",
      "Home Organization",
      "Gardening",
      "DIY Crafts",
      "Sustainable Living",
      "Personal Finance",
      "Time Management",
    ],
    description: "Enhance daily life and personal growth",
    icon: "home",
    color: "emerald",
  },
  {
    name: "Music & Audio",
    count: 21,
    topics: [
      "Music Production",
      "Audio Engineering",
      "Sound Design",
      "Music Theory",
      "Digital Audio Workstations",
      "Mixing & Mastering",
      "Recording Techniques",
      "Music Composition",
      "Podcast Production",
      "Voice Acting",
    ],
    description: "Create and produce music and audio content",
    icon: "music",
    color: "violet",
  },
  {
    name: "Cybersecurity",
    count: 18,
    topics: [
      "Network Security",
      "Ethical Hacking",
      "Cryptography",
      "Cyber Threats",
      "Security Protocols",
      "Penetration Testing",
      "Digital Forensics",
      "Security Auditing",
    ],
    description: "Protect systems and data from cyber threats",
    icon: "shield",
    color: "red",
  },
  {
    name: "Leadership",
    count: 15,
    topics: [
      "Leadership Skills",
      "Team Management",
      "Communication",
      "Negotiation",
      "Conflict Resolution",
      "Motivation",
      "Decision Making",
      "Strategic Planning",
    ],
    description: "Develop leadership and management skills",
    icon: "users",
    color: "blue",
  },
  {
    name: "Sales & Marketing",
    count: 20,
    topics: [
      "Digital Marketing",
      "SEO",
      "Social Media Marketing",
      "Content Marketing",
      "Email Marketing",
      "Sales Techniques",
      "Customer Relationship",
      "Market Research",
    ],
    description: "Master sales and marketing strategies",
    icon: "trending-up",
    color: "green",
  },
  {
    name: "Visual Arts",
    count: 16,
    topics: [
      "Drawing",
      "Painting",
      "Digital Art",
      "Graphic Design",
      "Photography",
      "Sculpture",
      "Art History",
      "Color Theory",
    ],
    description: "Explore visual creativity and artistic expression",
    icon: "palette",
    color: "purple",
  },
  {
    name: "Writing",
    count: 14,
    topics: [
      "Creative Writing",
      "Screenwriting",
      "Copywriting",
      "Technical Writing",
      "Journalism",
      "Poetry",
      "Fiction Writing",
      "Non-fiction Writing",
    ],
    description: "Master the art of written communication",
    icon: "pen",
    color: "indigo",
  },
  {
    name: "Fitness",
    count: 12,
    topics: [
      "Exercise Science",
      "Personal Training",
      "Yoga",
      "Pilates",
      "Strength Training",
      "Cardio Fitness",
      "Nutrition",
      "Sports Performance",
    ],
    description: "Achieve peak physical fitness and health",
    icon: "activity",
    color: "orange",
  },
  {
    name: "Mental Health",
    count: 10,
    topics: [
      "Mindfulness",
      "Stress Management",
      "Emotional Intelligence",
      "Therapy Techniques",
      "Mental Wellness",
      "Coping Strategies",
      "Self-Care",
      "Psychology Basics",
    ],
    description: "Promote mental well-being and emotional health",
    icon: "brain",
    color: "teal",
  },
  {
    name: "Engineering",
    count: 19,
    topics: [
      "Mechanical Engineering",
      "Electrical Engineering",
      "Civil Engineering",
      "Software Engineering",
      "Chemical Engineering",
      "Biomedical Engineering",
      "Aerospace Engineering",
      "Environmental Engineering",
    ],
    description: "Learn engineering principles and applications",
    icon: "cog",
    color: "gray",
  },
  {
    name: "Finance",
    count: 17,
    topics: [
      "Personal Finance",
      "Investment Analysis",
      "Financial Modeling",
      "Cryptocurrency",
      "Banking",
      "Financial Planning",
      "Risk Management",
      "Accounting Principles",
    ],
    description: "Master financial concepts and money management",
    icon: "dollar-sign",
    color: "yellow",
  },
  {
    name: "Law",
    count: 13,
    topics: [
      "Constitutional Law",
      "Contract Law",
      "Criminal Law",
      "Business Law",
      "International Law",
      "Legal Research",
      "Legal Writing",
      "Ethics in Law",
    ],
    description: "Understand legal systems and principles",
    icon: "scale",
    color: "slate",
  },
  {
    name: "Blockchain",
    count: 11,
    topics: [
      "Cryptocurrency",
      "Smart Contracts",
      "Decentralized Applications",
      "Blockchain Technology",
      "Web3",
      "NFTs",
      "DeFi",
      "Blockchain Security",
    ],
    description: "Explore blockchain and decentralized technologies",
    icon: "link",
    color: "emerald",
  },
  {
    name: "Test Preparation",
    count: 15,
    topics: [
      "SAT",
      "ACT",
      "GRE",
      "GMAT",
      "LSAT",
      "MCAT",
      "TOEFL",
      "IELTS",
      "DELE",
      "HSK",
    ],
    description: "Prepare for standardized tests and certifications",
    icon: "clipboard-check",
    color: "cyan",
  },
  {
    name: "Language Arts",
    count: 12,
    topics: [
      "Reading Comprehension",
      "Writing",
      "Grammar",
      "Literature",
      "Creative Writing",
      "Poetry",
      "Essay Writing",
      "Journalism",
    ],
    description: "Master reading, writing, and literary analysis",
    icon: "book-open",
    color: "purple",
  },
  {
    name: "Social Studies",
    count: 14,
    topics: [
      "History",
      "Geography",
      "Economics",
      "Government",
      "Sociology",
      "Psychology",
      "World History",
      "Civics",
    ],
    description: "Explore human societies and civilizations",
    icon: "globe",
    color: "blue",
  },
  {
    name: "Web Development",
    count: 18,
    topics: [
      "Frontend Development",
      "Backend Development",
      "Full Stack Development",
      "HTML/CSS",
      "JavaScript",
      "React",
      "Node.js",
      "Database Design",
    ],
    description: "Build modern web applications",
    icon: "code",
    color: "green",
  },
  {
    name: "Project Management",
    count: 16,
    topics: [
      "Agile Methodology",
      "Scrum",
      "Risk Management",
      "Time Management",
      "Project Planning",
      "Team Leadership",
      "Budgeting",
      "Quality Assurance",
    ],
    description: "Master project planning and execution",
    icon: "clipboard-list",
    color: "orange",
  },
  {
    name: "Sign Language",
    count: 8,
    topics: [
      "American Sign Language",
      "British Sign Language",
      "Fingerspelling",
      "Sign Language Grammar",
      "Cultural Aspects",
      "Basic Communication",
      "Advanced Signs",
    ],
    description: "Learn sign languages for communication",
    icon: "hand",
    color: "indigo",
  },
  {
    name: "Health Sciences",
    count: 13,
    topics: [
      "Anatomy",
      "Physiology",
      "Nutrition",
      "First Aid",
      "Medical Terminology",
      "Pathology",
      "Pharmacology",
      "Medical Ethics",
    ],
    description: "Study human health and medical sciences",
    icon: "stethoscope",
    color: "red",
  },
  {
    name: "IT Skills",
    count: 15,
    topics: [
      "Cloud Computing",
      "Network Administration",
      "Database Management",
      "System Administration",
      "IT Security",
      "DevOps",
      "Virtualization",
      "IT Support",
    ],
    description: "Develop essential IT and technical skills",
    icon: "server",
    color: "gray",
  },
  {
    name: "Technical Trades",
    count: 12,
    topics: [
      "Automotive Repair",
      "HVAC Systems",
      "Plumbing",
      "Electrical Work",
      "Welding",
      "Carpentry",
      "Construction",
      "Maintenance",
    ],
    description: "Learn hands-on technical trade skills",
    icon: "wrench",
    color: "slate",
  },
  {
    name: "Advanced Math",
    count: 10,
    topics: [
      "Linear Algebra",
      "Differential Equations",
      "Discrete Mathematics",
      "Abstract Algebra",
      "Real Analysis",
      "Complex Analysis",
      "Topology",
    ],
    description: "Explore advanced mathematical concepts",
    icon: "calculator",
    color: "yellow",
  },
  {
    name: "Advanced Science",
    count: 11,
    topics: [
      "Quantum Physics",
      "Organic Chemistry",
      "Genetics",
      "Neuroscience",
      "Biochemistry",
      "Astrophysics",
      "Microbiology",
    ],
    description: "Dive into advanced scientific fields",
    icon: "microscope",
    color: "teal",
  },
  {
    name: "Personal Finance",
    count: 14,
    topics: [
      "Budgeting",
      "Investing",
      "Retirement Planning",
      "Tax Preparation",
      "Debt Management",
      "Financial Planning",
      "Insurance",
      "Estate Planning",
    ],
    description: "Manage personal finances effectively",
    icon: "dollar-sign",
    color: "emerald",
  },
  {
    name: "Career Development",
    count: 13,
    topics: [
      "Resume Writing",
      "Interview Skills",
      "Career Planning",
      "Networking",
      "Job Search",
      "Professional Development",
      "Mentorship",
      "Workplace Skills",
    ],
    description: "Advance your career and professional growth",
    icon: "briefcase",
    color: "cyan",
  },
  {
    name: "Soft Skills",
    count: 12,
    topics: [
      "Time Management",
      "Public Speaking",
      "Critical Thinking",
      "Problem Solving",
      "Communication",
      "Emotional Intelligence",
      "Adaptability",
      "Teamwork",
    ],
    description: "Develop essential interpersonal skills",
    icon: "users",
    color: "pink",
  },
  {
    name: "Study Skills",
    count: 10,
    topics: [
      "Learning Strategies",
      "Note-taking",
      "Exam Preparation",
      "Memory Techniques",
      "Research Skills",
      "Academic Writing",
      "Test Strategies",
    ],
    description: "Master effective learning and study techniques",
    icon: "graduation-cap",
    color: "violet",
  },
  {
    name: "Robotics",
    count: 9,
    topics: [
      "Robot Programming",
      "Automation",
      "Mechatronics",
      "Control Systems",
      "Sensors",
      "Actuators",
      "AI in Robotics",
    ],
    description: "Learn robotics and automation technologies",
    icon: "cpu",
    color: "orange",
  },
  {
    name: "Sustainability",
    count: 11,
    topics: [
      "Renewable Energy",
      "Sustainable Architecture",
      "Climate Science",
      "Environmental Policy",
      "Green Technology",
      "Conservation",
      "Sustainable Business",
    ],
    description: "Explore sustainable practices and technologies",
    icon: "leaf",
    color: "green",
  },
  {
    name: "Gaming",
    count: 10,
    topics: [
      "Game Strategy",
      "Game Design",
      "Esports Training",
      "Game Development",
      "Gaming Psychology",
      "Virtual Reality",
      "Game Theory",
    ],
    description: "Master gaming skills and game development",
    icon: "gamepad-2",
    color: "purple",
  },
  {
    name: "Cooking",
    count: 12,
    topics: [
      "Culinary Arts",
      "Baking",
      "International Cuisine",
      "Nutrition Cooking",
      "Food Safety",
      "Recipe Development",
      "Kitchen Management",
    ],
    description: "Learn cooking and culinary techniques",
    icon: "chef-hat",
    color: "red",
  },
  {
    name: "Crafts",
    count: 10,
    topics: [
      "Woodworking",
      "Knitting",
      "Sewing",
      "Jewelry Making",
      "Paper Crafts",
      "Pottery",
      "Leatherwork",
      "Metalwork",
    ],
    description: "Explore creative crafting and handmade arts",
    icon: "scissors",
    color: "pink",
  },
  {
    name: "Outdoor Skills",
    count: 11,
    topics: [
      "Survival Skills",
      "Camping",
      "Hiking",
      "Fishing",
      "Navigation",
      "Wilderness First Aid",
      "Outdoor Cooking",
      "Environmental Awareness",
    ],
    description: "Develop outdoor survival and recreational skills",
    icon: "mountain",
    color: "brown",
  },
  {
    name: "Standardized Tests",
    count: 8,
    topics: ["SAT", "ACT", "GRE", "GMAT", "LSAT", "MCAT", "SAT Subject Tests"],
    description: "Prepare for college entrance exams",
    icon: "clipboard-check",
    color: "blue",
  },
  {
    name: "Professional Certifications",
    count: 12,
    topics: [
      "AWS Certification",
      "Google Cloud",
      "CompTIA",
      "Microsoft Certifications",
      "Cisco Certifications",
      "Project Management Certs",
      "IT Certifications",
    ],
    description: "Earn professional certifications for career advancement",
    icon: "award",
    color: "gold",
  },
  {
    name: "Language Tests",
    count: 6,
    topics: ["TOEFL", "IELTS", "DELE", "HSK", "JLPT", "TestDaF"],
    description: "Prepare for language proficiency exams",
    icon: "message-square",
    color: "indigo",
  },
];

export default function Explore({ setHideNavs }) {
  const router = useRouter();
  const { user, refreshToken } = useAuth();

  // Hide Navbar/Bottombar on mount
  useEffect(() => {
    if (setHideNavs) {
      setHideNavs(true);
      return () => setHideNavs(false);
    }
  }, [setHideNavs]);

  const [trendingTopics, setTrendingTopics] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generatingCourse, setGeneratingCourse] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");
  const [isPremium, setIsPremium] = useState("");
  const [pagination, setPagination] = useState({});
  const [generatedCourses, setGeneratedCourses] = useState([]);
  const [exploringCategory, setExploringCategory] = useState(null);
  const [bookmarkedItems, setBookmarkedItems] = useState(new Set());
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [minimizedSections, setMinimizedSections] = useState(new Set());
  const [visibleCategoriesCount, setVisibleCategoriesCount] = useState(9);
  const [selectedCategoryForModal, setSelectedCategoryForModal] =
    useState(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState(null);
  const coursesPerPage = 12;

  // Check if user is premium using consistent logic
  const userIsPremium =
    !!(
      user?.subscription?.plan === "pro" &&
      user?.subscription?.status === "active"
    ) || !!user?.isPremium;

  // Filtered categories based on search query
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return staticCategories;
    const query = searchQuery.toLowerCase();
    return staticCategories.filter(
      (category) =>
        category.name.toLowerCase().includes(query) ||
        category.description.toLowerCase().includes(query) ||
        category.topics.some((topic) => topic.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  // Reset visible categories count when search changes
  useEffect(() => {
    setVisibleCategoriesCount(9);
  }, [searchQuery]);

  // Filtered trending topics based on search query
  const filteredTrendingTopics = useMemo(() => {
    if (!searchQuery.trim()) return trendingTopics;
    const query = searchQuery.toLowerCase();
    return trendingTopics.filter(
      (topic) =>
        topic.title.toLowerCase().includes(query) ||
        topic.description.toLowerCase().includes(query) ||
        topic.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        topic.category.toLowerCase().includes(query)
    );
  }, [trendingTopics, searchQuery]);

  useEffect(() => {
    fetchExploreData();
    loadPersistedCourses();
  }, []);

  const loadPersistedCourses = async () => {
    try {
      // First check localStorage
      const localData = localStorage.getItem("exploredCourses");
      let courses = [];

      if (localData) {
        const parsed = JSON.parse(localData);
        const now = new Date();
        const validCourses = parsed.filter((course) => {
          const generatedAt = new Date(course.generatedAt);
          const hoursDiff = (now - generatedAt) / (1000 * 60 * 60);
          return hoursDiff < 24; // Keep courses generated within 24 hours
        });
        courses = validCourses;
      }

      // If no valid courses in localStorage, check database (server reads auth from HttpOnly cookie)
      if (courses.length === 0) {
        try {
          const response = await authenticatedFetch("/api/explore/persisted-courses");

          if (response.ok) {
            const dbData = await response.json();
            const now = new Date();
            const validDbCourses = (dbData.courses || []).filter((course) => {
              const generatedAt = new Date(course.generatedAt);
              const hoursDiff = (now - generatedAt) / (1000 * 60 * 60);
              return hoursDiff < 24;
            });

            if (validDbCourses.length > 0) {
              courses = validDbCourses;
              // Save to localStorage for faster future access
              localStorage.setItem(
                "exploredCourses",
                JSON.stringify(validDbCourses)
              );
            }
          }
        } catch (error) {
          console.error("Error loading courses from database:", error);
        }
      }

      if (courses.length > 0) {
        setGeneratedCourses(courses);
      }
    } catch (error) {
      console.error("Error loading persisted courses:", error);
    }
  };

  const saveCoursesToStorage = (courses) => {
    try {
      localStorage.setItem("exploredCourses", JSON.stringify(courses));
    } catch (error) {
      console.error("Error saving courses to storage:", error);
    }
  };

  const saveCoursesToDatabase = async (courses) => {
    try {
      await authenticatedFetch("/api/explore/persisted-courses", {
        method: "POST",
        body: JSON.stringify({ courses }),
      });
    } catch (error) {
      console.error("Error saving courses to database:", error);
    }
  };

  useEffect(() => {
    if (
      searchQuery ||
      selectedCategory ||
      selectedDifficulty ||
      isPremium !== ""
    ) {
      fetchCourses();
    }
  }, [
    currentPage,
    searchQuery,
    selectedCategory,
    selectedDifficulty,
    isPremium,
  ]);

  const fetchExploreData = async () => {
    try {
      setLoading(true);
      // Fetch AI-generated trending topics (auth via HttpOnly cookie)
      const trendingResponse = await authenticatedFetch("/api/explore/trending-topics");
      if (trendingResponse.ok) {
        const trendingData = await trendingResponse.json();
        setTrendingTopics((trendingData.topics || []).slice(0, 9));
      }
    } catch (error) {
      console.error("Error fetching explore data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: coursesPerPage.toString(),
        search: searchQuery,
        category: selectedCategory,
        difficulty: selectedDifficulty,
        isPremium: isPremium,
      });

      const response = await authenticatedFetch(`/api/courses?${params}`);
      if (response.ok) {
        const data = await response.json();
        setPagination(data.pagination || {});
      }
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const handleGenerateCourse = async (topic) => {
    if (generatingCourse) return;

    setGeneratingCourse(topic.title);
    toast.loading(`Generating course: ${topic.title}...`, { id: "generating" });

    try {
      // 1. Determine difficulty based on user status and topic difficulty
      let difficulty = (topic.difficulty || "beginner").toLowerCase();

      // 2. Validate difficulty matches API whitelist
      if (!["beginner", "intermediate", "advanced"].includes(difficulty)) {
        difficulty = "beginner";
      }

      // 3. Force beginner for free users (Premium is required for Intermediate/Advanced)
      if (!userIsPremium) {
        difficulty = "beginner";
      }

      // Generate the course (server reads cookie for auth)
      const response = await authenticatedFetch("/api/generate-course", {
        method: "POST",
        body: JSON.stringify({
          topic: topic.title,
          format: "course",
          difficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle monthly limit reached error
        if (response.status === 429) {
          toast.dismiss("generating");
          setShowLimitModal(true);
          setLimitModalData({
            used: errorData.used || 0,
            limit: errorData.limit || 5,
            isPremium: errorData.isPremium || false,
            topic: topic.title,
          });
          return;
        }

        throw new Error(errorData.error || "Failed to generate course");
      }

      const responseData = await response.json();

      toast.success(`Course "${topic.title}" generated successfully!`, {
        id: "generating",
      });

      // Navigate to the learning page with safer URL encoding
      if (responseData.courseId || responseData.success) {
        const safeTopic = topic.title
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        router.push(
          `/learn/${encodeURIComponent(safeTopic)}?format=course&difficulty=${topic.difficulty || "beginner"}&originalTopic=${encodeURIComponent(topic.title)}`
        );
      }
    } catch (error) {
      console.error("Error generating course:", error);
      toast.error(error.message || "Failed to generate course", {
        id: "generating",
      });
    } finally {
      setGeneratingCourse(null);
    }
  };

  const handleExploreCategory = async (category, retryAfterRefresh = true) => {
    // Check if user is premium
    if (!userIsPremium) {
      setSelectedCategoryForModal(category);
      setShowPremiumModal(true);
      return;
    }

    // Generate a unique ID for this category exploration
    const categoryId = `category-${category.name}-${Date.now()}`;

    setExploringCategory(category.name);

    try {
      const response = await fetch(
        `/api/explore/category-courses?category=${encodeURIComponent(category.name)}`,
        {
          credentials: "include",
        }
      );

      if (response.status === 401 && retryAfterRefresh) {
        // Try to refresh token and retry
        console.log("Token expired, attempting to refresh...");
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          return handleExploreCategory(category, false);
        } else {
          toast.error("Session expired. Please log in again.");
          setExploringCategory(null);
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        const newGeneratedSet = {
          category: category.name,
          courses: data.courses || [],
          generatedAt: new Date(),
          id: categoryId, // Use the unique ID
          cached: data.cached || false, // Flag to indicate if from cache
        };

        // Add new courses at the beginning (newest first)
        setGeneratedCourses((prev) => {
          const updated = [newGeneratedSet, ...prev];
          saveCoursesToStorage(updated);
          saveCoursesToDatabase(updated);
          return updated;
        });

        // Scroll to the newly added section after a brief delay to ensure DOM update
        setTimeout(() => {
          const newSection = document.getElementById(categoryId);
          if (newSection) {
            // Use smooth scrolling and ensure it's visible
            newSection.scrollIntoView({
              behavior: "smooth",
              block: "start",
              inline: "nearest",
            });
            // Additional offset for better visibility
            setTimeout(() => {
              window.scrollBy(0, -20);
            }, 300);
          }
        }, 200);

        toast.success(
          `${data.cached ? "Loaded" : "Generated"} ${data.courses?.length || 0} courses for ${category.name}`
        );
      } else if (response.status === 403) {
        const errorData = await response.json();
        toast.error(errorData.message || "Premium subscription required");
      } else {
        toast.error("Failed to generate category courses");
      }
    } catch (error) {
      console.error("Error generating category courses:", error);
      toast.error("Failed to generate category courses");
    } finally {
      setExploringCategory(null);
    }
  };

  const handleBookmark = async (itemId, type, itemData) => {
    try {
      const headers = { "Content-Type": "application/json" };
      const response = await authenticatedFetch("/api/library", {
        method: "POST",
        body: JSON.stringify({
          action: "bookmark",
          courseId: itemId,
          courseData: itemData,
        }),
      });

      if (response.ok) {
        setBookmarkedItems((prev) => {
          const newSet = new Set(prev);
          if (newSet.has(itemId)) {
            newSet.delete(itemId);
            toast.success("Removed from bookmarks");
          } else {
            newSet.add(itemId);
            toast.success("Added to bookmarks");
          }
          return newSet;
        });
      } else {
        toast.error("Failed to bookmark");
      }
    } catch (error) {
      console.error("Error bookmarking item:", error);
      toast.error("Failed to bookmark");
    }
  };

  const handleSeeMoreCategories = () => {
    setVisibleCategoriesCount((prev) =>
      Math.min(prev + 9, filteredCategories.length)
    );
  };

  const toggleSectionMinimized = (sectionId) => {
    setMinimizedSections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Explore Courses
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Discover Different Categories and latest trending topics across
          various fields
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-8">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses, topics, or instructors..."
              className="w-full pl-10 pr-4 py-3 border-2 border-blue-100 dark:border-blue-900/30 rounded-2xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-sm"
            />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Browse by Category
          </h2>
          <button
            onClick={() => toggleSectionMinimized("categories")}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={
              minimizedSections.has("categories")
                ? "Expand section"
                : "Minimize section"
            }
          >
            {minimizedSections.has("categories") ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>

        {!minimizedSections.has("categories") && (
          <>
            {loading ? (
              <div className="flex gap-4overflow-x-auto pb-4 -mx-4 my-4 px-4 scrollbar-hide no-scrollbar">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="flex-shrink-0 w-[240px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-3xl p-6 animate-pulse"
                  >
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                    <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="flex gap-2">
                      <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredCategories.length === 0 && searchQuery ? (
              <div className="text-center py-12">
                <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No categories found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search terms or browse all categories.
                </p>
              </div>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide no-scrollbar scroll-smooth">
                {filteredCategories.map((category, index) => {
                  const colors = [
                    "from-blue-500 to-indigo-600",
                    "from-purple-500 to-fuchsia-600",
                    "from-indigo-500 to-violet-600",
                    "from-blue-600 to-indigo-700",
                  ];
                  const cardColor = colors[index % colors.length];

                  return (
                    <div
                      key={index}
                      onClick={() => handleExploreCategory(category)}
                      className={`flex-shrink-0 w-[300px] bg-gradient-to-br ${cardColor} rounded-2xl p-6 shadow-lg shadow-indigo-500/10 relative cursor-pointer group overflow-hidden transition-all hover:scale-[1.02]`}
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full -translate-y-10 translate-x-10 blur-xl group-hover:scale-110 transition-transform" />

                      <div className="relative z-10">
                        <h3 className="text-lg font-bold text-white mb-2">
                          {category.name}
                        </h3>
                        <p className="text-white/80 text-sm line-clamp-2 mb-4">
                          {category.description}
                        </p>

                        <div className="flex flex-wrap gap-1 mb-4">
                          {category.topics.slice(0, 3).map((topic, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 bg-white/20 text-white text-[10px] rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>

                        <button className="w-full bg-white/20 hover:bg-white/30 text-white py-2 px-4 rounded-xl transition-colors text-xs font-bold  tracking-widest flex items-center justify-center space-x-2">
                          {exploringCategory === category.name ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                              <span>Building...</span>
                            </>
                          ) : (
                            <span>Explore</span>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Generated Courses - Moved above Trending */}
      <div id="generated-courses-section" className="mb-16">
        {exploringCategory && (
          <div className="mb-12">
            <div className="flex items-center space-x-2 mb-6">
              <BookOpen className="w-6 h-6 text-blue-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {exploringCategory} Courses
              </h2>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            </div>

            {/* Fading Cards Loader */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, index) => (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded flex-1 mr-4"></div>
                    <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                  </div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                  <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                  <div className="flex items-center space-x-4 text-sm mb-4">
                    <div className="flex items-center space-x-1">
                      <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      <div className="h-3 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <div className="h-4 w-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      <div className="h-3 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex space-x-2">
                      <div className="h-6 w-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <div className="h-6 w-14 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                    </div>
                    <div className="h-4 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  </div>
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {generatedCourses.map((generatedSet, setIndex) => (
          <div key={generatedSet.id} id={generatedSet.id} className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-6 h-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {generatedSet.category} Courses
                </h2>
                <span className="text-sm text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-full">
                  {generatedSet.cached ? "From Cache" : "Generated"}{" "}
                  {new Date(generatedSet.generatedAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => toggleSectionMinimized(generatedSet.id)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  title={
                    minimizedSections.has(generatedSet.id)
                      ? "Expand section"
                      : "Minimize section"
                  }
                >
                  {minimizedSections.has(generatedSet.id) ? (
                    <ChevronDown className="w-5 h-5" />
                  ) : (
                    <ChevronUp className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {!minimizedSections.has(generatedSet.id) && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {generatedSet.courses.map((course, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:shadow-lg transition-shadow relative group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex-1">
                        {course.title}
                      </h3>
                      <div className="flex items-center space-x-2">
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${course.difficulty === "beginner"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : course.difficulty === "intermediate"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}
                        >
                          {course.difficulty || "Beginner"}
                        </span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      {course.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{course.estimatedDuration || "6 weeks"}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-wrap gap-2">
                        {course.tags?.slice(0, 3).map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateCourse(course);
                        }}
                        disabled={generatingCourse === course.title}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                      >
                        {generatingCourse === course.title ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Course</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Trending Topics - Now appears after Generated Courses */}
      <div className="mb-16">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-orange-500" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              Trending This Week
            </h2>
          </div>
          <button
            onClick={() => toggleSectionMinimized("trending-topics")}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title={
              minimizedSections.has("trending-topics")
                ? "Expand section"
                : "Minimize section"
            }
          >
            {minimizedSections.has("trending-topics") ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
        </div>

        {!minimizedSections.has("trending-topics") && (
          <>
            {loading ? (
              <div className="flex flex-col gap-4">
                {[...Array(6)].map((_, index) => (
                  <div
                    key={index}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse"
                  >
                    <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                    <div className="flex space-x-4">
                      <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      <div className="h-4 w-12 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredTrendingTopics.length === 0 && searchQuery ? (
              <div className="text-center py-12">
                <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  No trending topics found
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Try adjusting your search terms or check back later for new
                  trends.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {filteredTrendingTopics.map((topic, index) => {
                  const colors = [
                    "from-blue-500/5 to-indigo-500/5 dark:from-blue-500/10 dark:to-indigo-500/10",
                    "from-purple-500/5 to-fuchsia-500/5 dark:from-purple-500/10 dark:to-fuchsia-500/10",
                    "from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/10",
                    "from-orange-500/5 to-amber-500/5 dark:from-orange-500/10 dark:to-amber-500/10"
                  ];
                  const cardBg = colors[index % colors.length];
                  const accentGradients = [
                    "from-blue-600 to-indigo-600",
                    "from-purple-600 to-fuchsia-600",
                    "from-emerald-600 to-teal-600",
                    "from-orange-600 to-amber-600"
                  ];
                  const accent = accentGradients[index % accentGradients.length];

                  return (
                    <div
                      key={index}
                      className={`bg-gradient-to-br ${cardBg} border border-gray-100 dark:border-gray-700/50 rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-200/20 dark:hover:shadow-none transition-all relative group cursor-pointer border-l-4 ${index % 4 === 0 ? "border-l-blue-500" : index % 4 === 1 ? "border-l-purple-500" : index % 4 === 2 ? "border-l-emerald-500" : "border-l-orange-500"}`}
                      onClick={() => handleGenerateCourse(topic)}
                    >
                      <div className="flex items-start flex-col gap-2 justify-between mb-3">
                        <h3 className="text-lg font-black text-gray-900 dark:text-white flex-1">
                          {topic.title}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <span
                            className={`px-3 py-1 text-[10px] font-black  tracking-wider ${topic.difficulty === "beginner"
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
                              : topic.difficulty === "intermediate"
                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                                : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300"
                              }`}
                          >
                            {topic.difficulty || "Beginner"}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 font-medium leading-relaxed">
                        {topic.description}
                      </p>

                      {topic.whyTrending && (
                        <div className="mb-4 p-3 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm rounded-xl border border-gray-50 dark:border-gray-700/50">
                          <p className="text-xs text-blue-700 dark:text-blue-300 font-bold flex flex-col items-start gap-1.5">
                            <span className="px-4 py-1 bg-blue-100 dark:bg-blue-900/40 rounded-lg">🔥 Why Trending</span>
                            {topic.whyTrending}
                          </p>
                        </div>
                      )}

                      <div className="flex items-center space-x-6 text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-6">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <span>{topic.estimatedDuration || "6 weeks"}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <BookOpen className="w-4 h-4 text-gray-400" />
                          <span>{topic.category || "General"}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGenerateCourse(topic);
                        }}
                        disabled={generatingCourse === topic.title}
                        className={`w-full bg-gradient-to-r ${accent} text-white py-3 px-4 rounded-xl hover:scale-[1.01] active:scale-95 transition-all text-xs font-black tracking-[0.2em] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-gray-200/20`}
                      >
                        {generatingCourse === topic.title ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" />
                            <span>Generate Course</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center space-x-2 mt-8">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={!pagination.hasPrev}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from(
            { length: Math.min(pagination.totalPages, 5) },
            (_, i) => {
              const page = i + 1;
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${currentPage === page
                    ? "bg-blue-600 text-white"
                    : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                >
                  {page}
                </button>
              );
            }
          )}

          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(prev + 1, pagination.totalPages)
              )
            }
            disabled={!pagination.hasNext}
            className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Premium Upgrade Modal */}
      {showPremiumModal && selectedCategoryForModal && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg max-w-md w-full p-6 shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⭐</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  {selectedCategoryForModal.name} Courses
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Unlock personalized course recommendations for the{" "}
                  <strong>{selectedCategoryForModal.name}</strong> category. Get
                  access to 10+ curated courses tailored to your learning goals.
                </p>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowPremiumModal(false);
                    setSelectedCategoryForModal(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowPremiumModal(false);
                    setSelectedCategoryForModal(null);
                    router.push("/pricing");
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
                >
                  Upgrade Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Limit Reached Modal */}
      {showLimitModal && limitModalData && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-lg max-w-md w-full p-6 shadow-2xl border border-white/20">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">⏰</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Monthly Limit Reached
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  You've used {limitModalData.used} out of{" "}
                  {limitModalData.limit} free course generations this month.
                </p>
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 mb-4">
                  <p className="text-orange-700 dark:text-orange-300 font-medium mb-2">
                    Upgrade to Pro for unlimited generations!
                  </p>
                  <ul className="text-sm text-orange-600 dark:text-orange-400 text-left space-y-1">
                    <li>• 15 course generations per month</li>
                    <li>• Premium course content</li>
                    <li>• Advanced AI features</li>
                    <li>• Priority support</li>
                  </ul>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setLimitModalData(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setLimitModalData(null);
                    router.push("/pricing");
                  }}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Floating Generate Button */}
      <button
        onClick={() => router.push("/dashboard?tab=generate")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/30 hover:scale-110 transition-transform z-50"
      >
        <Sparkles size={24} />
      </button>
    </div>
  );
}
