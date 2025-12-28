"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Star,
  BookOpen,
  Clock,
  Users,
  Award,
  TrendingUp,
  Crown,
  Zap,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import ActinovaLoader from "./ActinovaLoader";
import { useEnsureSession } from "./SessionGuard";
import { toast } from "sonner";
import { authenticatedFetch } from "../lib/apiConfig";

export default function PremiumCourses() {
  const router = useRouter();
  const { user, authLoading } = useEnsureSession();

  if (authLoading) return <ActinovaLoader />;
  if (!user) return null;
  const [courses, setCourses] = useState([]);
  const [trendingCourses, setTrendingCourses] = useState([]);
  const [featured, setFeatured] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [generatingCourse, setGeneratingCourse] = useState(null);
  const [personalizedCourses, setPersonalizedCourses] = useState([]);
  const [generatingPersonalized, setGeneratingPersonalized] = useState(false);
  const [preparingCourse, setPreparingCourse] = useState(null);
  const coursesPerPage = 6;

  // Calculate course expiry progress
  const getCourseExpiryInfo = (createdAt) => {
    if (!createdAt) return { daysLeft: 30, progress: 100 };

    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = now - created;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const daysLeft = Math.max(0, 30 - diffDays);
    const progress = Math.max(0, (daysLeft / 30) * 100);

    return { daysLeft, progress };
  };

  // Check if user is Pro
  const isPro =
    user &&
    ((user.subscription &&
      (user.subscription.plan === "pro" || user.subscription.plan === "enterprise") &&
      user.subscription.status === "active") ||
      user.isPremium);

  useEffect(() => {
    if (isPro) {
      fetchPersonalizedCourses();
    } else {
      fetchCourses();
    }
    fetchTrendingCourses();
  }, [isPro]);

  // Ensure there's always one featured course
  useEffect(() => {
    if (!featured && !loading) {
      // If no featured course is set and we're not loading, pick one
      if (personalizedCourses.length > 0) {
        const featuredCourse =
          personalizedCourses.find((course) => course.featured) ||
          personalizedCourses[0];
        setFeatured(featuredCourse);
      } else if (courses.length > 0) {
        const featuredCourse =
          courses.find((course) => course.featured) || courses[0];
        setFeatured(featuredCourse);
      } else if (trendingCourses.length > 0) {
        setFeatured(trendingCourses[0]);
      }
    }
  }, [featured, loading, personalizedCourses, courses, trendingCourses]);

  const fetchCourses = async () => {
    try {
      const response = await authenticatedFetch("/api/premium-courses");
      if (response.ok) {
        const data = await response.json();
        setCourses(data.courses);

        // Check if there's a featured course
        const featuredCourse = data.courses.find((course) => course.featured);
        if (featuredCourse) {
          setFeatured(featuredCourse);
        }
      }
    } catch (error) {
      console.error("Error fetching premium courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTrendingCourses = async () => {
    try {
      const response = await authenticatedFetch("/api/premium-courses/trending", {
        headers: {
          "x-user-id": user?._id || user?.id || "",
        },
      });
      if (response.ok) {
        const data = await response.json();
        setTrendingCourses(data.courses || []);

        // Only set featured if no featured course is already set
        if (data.courses && data.courses.length > 0 && !featured) {
          setFeatured(data.courses[0]);
        }
      } else if (response.status === 403) {
        // User is not pro, don't show trending courses
        setTrendingCourses([]);
        if (!featured) {
          setFeatured(null);
        }
      }
    } catch (error) {
      console.error("Error fetching trending courses:", error);
      // If there's an error, don't show trending courses
      setTrendingCourses([]);
      if (!featured) {
        setFeatured(null);
      }
    }
  };

  const fetchPersonalizedCourses = async () => {
    try {
      setGeneratingPersonalized(true);

      // Check localStorage first
      const cached = localStorage.getItem("personalizedPremiumCourses");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (
          parsed.generatedAt &&
          new Date() - new Date(parsed.generatedAt) < 24 * 60 * 60 * 1000
        ) {
          // 24 hours
          setPersonalizedCourses(parsed.courses);
          setLoading(false);
          setGeneratingPersonalized(false);
          return;
        }
      }

      // Fetch from API (auth via HttpOnly cookie)
      const response = await authenticatedFetch("/api/premium-courses/personalized", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        const data = await response.json();

        // Store in localStorage
        if (data.localStorage) {
          localStorage.setItem(
            "personalizedPremiumCourses",
            JSON.stringify(data.localStorage)
          );
        }

        setPersonalizedCourses(data.courses);

        // Check if there's a featured course among personalized courses
        const featuredCourse = data.courses.find((course) => course.featured);
        if (featuredCourse && !featured) {
          setFeatured(featuredCourse);
        }

        toast.success("Your personalized premium courses are ready!");
      } else {
        throw new Error("Failed to generate personalized courses");
      }
    } catch (error) {
      console.error("Error fetching personalized courses:", error);
      toast.error(
        "Failed to load personalized courses. Using default courses."
      );
      // Fallback to regular courses
      fetchCourses();
    } finally {
      setLoading(false);
      setGeneratingPersonalized(false);
    }
  };

  const handleGenerateCourse = async (course) => {
    // Check if this is a personalized course
    const isPersonalized =
      course.personalized ||
      personalizedCourses.some((pc) => pc.id === course.id);

    if (isPersonalized) {
      // For personalized courses, show preparing and navigate
      setPreparingCourse(course.id);
      setTimeout(() => {
        const safeTopic = course.title
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        router.push(
          `/learn/content?topic=${encodeURIComponent(safeTopic)}&format=course&difficulty=${course.difficulty || "intermediate"}&personalized=true&originalTopic=${encodeURIComponent(course.title)}`
        );
      }, 1500);
      return;
    }

    if (generatingCourse) return;

    setGeneratingCourse(course.id);
    toast.loading(`Generating course: ${course.title}...`, {
      id: "generating",
    });

    try {
      // Generate the course (auth via HttpOnly cookie)
      const response = await authenticatedFetch("/api/generate-course", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: course.title,
          format: "course",
          difficulty: course.difficulty || "beginner",
        }),
      });

      if (!response.ok) {
        let errorData = {};
        try {
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            errorData = { error: "Invalid server response" };
          }
        } catch (e) {
          errorData = { error: "Failed to read response" };
        }

        // Handle monthly limit reached error
        if (response.status === 429) {
          toast.dismiss("generating");
          // This shouldn't happen for premium users, but handle it gracefully
          toast.error(
            `Monthly limit reached (${errorData.used || 0}/${errorData.limit || 2}). Please try again next month.`,
            {
              id: "generating",
            }
          );
          return;
        }

        throw new Error(errorData.error || "Failed to generate course");
      }

      // Track that user generated this premium course (so it won't be deleted)
      try {
        await authenticatedFetch("/api/profile/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            generatedPremiumCourse: {
              courseId: course.id,
              courseTitle: course.title,
              generatedAt: new Date().toISOString(),
            },
          }),
        });
      } catch (trackError) {
        console.error("Error tracking generated course:", trackError);
        // Don't fail the whole operation if tracking fails
      }

      let responseData = {};
      try {
        const text = await response.text();
        try {
          responseData = JSON.parse(text);
        } catch (e) {
          console.error("Failed to parse success JSON:", text.substring(0, 100));
          throw new Error("Server returned invalid success response format.");
        }
      } catch (e) {
        throw new Error("Failed to read success response.");
      }

      toast.success(`Course "${course.title}" generated successfully!`, {
        id: "generating",
      });

      // Navigate to the learning page - course stays in the list
      if (responseData.courseId) {
        const safeTopic = course.title
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        router.push(
          `/learn/content?topic=${encodeURIComponent(safeTopic)}&format=course&difficulty=${course.difficulty || "beginner"}&originalTopic=${encodeURIComponent(course.title)}`
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

  const handleUpgradePlan = async (plan) => {
    try {
      const response = await authenticatedFetch("/api/billing/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        let errorData = {};
        try {
          const text = await response.text();
          try {
            errorData = JSON.parse(text);
          } catch (e) {
            errorData = { error: "Invalid server response" };
          }
        } catch (e) {
          errorData = { error: "Failed to read response" };
        }
        if (response.status === 401) {
          toast.error("Please log in to upgrade.");
          setTimeout(() => {
            window.location.href = "/auth/login";
          }, 800);
        }
        const serverMessage =
          errorData.message || errorData.details || errorData.error;
        throw new Error(serverMessage || "Failed to create checkout session");
      }

      const data = await response.json();

      if (data.sessionUrl) {
        if (typeof window !== 'undefined' && (window.Capacitor || window.location.protocol === 'capacitor:')) {
          await Browser.open({ url: data.sessionUrl });
        } else {
          window.location.href = data.sessionUrl;
        }
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error) {
      toast.error(
        error.message || "Failed to start upgrade process. Please try again."
      );
    }
  };

  const handleStartLearning = async (course) => {
    setPreparingCourse(course.id);
    // Simulate preparation time
    setTimeout(() => {
      const safeTopic = course.title
        .replace(/[^a-zA-Z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-");
      router.push(
        `/learn/content?topic=${encodeURIComponent(safeTopic)}&format=course&difficulty=${course.difficulty || "intermediate"}&originalTopic=${encodeURIComponent(course.title)}`
      );
    }, 1500); // 1.5 seconds delay
  };

  const handleDelete = async (courseId) => {
    // TODO: Implement delete functionality
    console.log("Delete course:", courseId);
  };

  // Filter and search logic
  const coursesToDisplay =
    isPro && personalizedCourses.length > 0 ? personalizedCourses : courses;
  const filteredCourses = coursesToDisplay.filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredCourses.length / coursesPerPage);
  const startIndex = (currentPage - 1) * coursesPerPage;
  const paginatedCourses = filteredCourses.slice(
    startIndex,
    startIndex + coursesPerPage
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case "Trending":
        return <TrendingUp className="w-3 h-3" />;
      case "Expert Level":
        return <Crown className="w-3 h-3" />;
      case "Industry Favorite":
        return <Award className="w-3 h-3" />;
      case "Creative Choice":
        return <Star className="w-3 h-3" />;
      case "High Demand":
        return <Zap className="w-3 h-3" />;
      case "Visual Excellence":
        return <Star className="w-3 h-3" />;
      default:
        return <Star className="w-3 h-3" />;
    }
  };

  const getBadgeColor = (badge) => {
    switch (badge) {
      case "Trending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "Expert Level":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "Industry Favorite":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "Creative Choice":
        return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
      case "High Demand":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      case "Visual Excellence":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <motion.div
        className="mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-start justify-start space-x-2 mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
              <Crown className="w-5 h-5 text-white" />
            </div>
          </div>          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Premium Courses
          </h1>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          High-quality courses with advanced features, expert instruction, and
          comprehensive learning materials.
        </p>
      </motion.div>

      {/* Search and Filter */}
      {isPro && (
        <motion.div
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search premium courses..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

        </motion.div>
      )}

      {/* Pro User Required Message */}
      {!isPro && (
        <motion.div
          className="bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl p-8 mb-12 text-white text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Crown className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
          <h2 className="text-2xl font-bold mb-4">
            Unlock Premium Trending Courses
          </h2>
          <p className="text-orange-100 mb-6 max-w-2xl mx-auto">
            Get access to the latest trending courses generated by AI,
            personalized to your interests. Upgrade to Pro to discover
            cutting-edge topics and stay ahead in your learning journey.
          </p>
          <button
            onClick={() => handleUpgradePlan("pro")}
            className="bg-white text-orange-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Upgrade to Pro
          </button>
        </motion.div>
      )}

      {/* Trending Courses Section */}
      {isPro && trendingCourses.length > 0 && (
        <motion.div
          className="mb-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-6 h-6 text-orange-500" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Latest Trending
              </h2>
            </div>
          </div>

          <div className="flex overflow-x-auto pb-6 -mx-6 px-6 space-x-6 scrollbar-hide snap-x">
            {trendingCourses.map((course, index) => (
              <motion.div
                key={course.id || index}
                whileHover={{ y: -5 }}
                className="flex-shrink-0 w-[280px] snap-start bg-white dark:bg-slate-800/50 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-slate-600/70 transition-all duration-300 shadow-sm"
              >
                <div className="relative">
                  <div className="w-full h-32 bg-gradient-to-br from-orange-400 to-red-500">
                    {/* No book icon here as requested */}
                  </div>
                  <div className="absolute top-3 right-3 bg-white/20 backdrop-blur-md text-white px-2 py-1 rounded-full text-[10px] font-bold flex items-center space-x-1">
                    <TrendingUp className="w-3 h-3" />
                    <span>Trending</span>
                  </div>
                </div>

                <div className="p-5">
                  <h3 className="text-md font-bold text-gray-900 dark:text-gray-100 mb-1 line-clamp-1">
                    {course.title}
                  </h3>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2 min-h-[32px]">
                    {course.description}
                  </p>

                  <div className="flex items-center space-x-4 text-[10px] text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center space-x-1">
                      <Clock className="w-3 h-3" />
                      <span>{course.estimatedDuration || "6 weeks"}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Zap className="w-3 h-3" />
                      <span>{course.category || "General"}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateCourse(course)}
                    disabled={
                      generatingCourse === course.id ||
                      preparingCourse === course.id
                    }
                    className="w-full bg-gradient-to-r from-orange-500 to-red-600 text-white py-2.5 px-4 rounded-xl hover:from-orange-600 hover:to-red-700 transition-colors text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2 shadow-sm"
                  >
                    {generatingCourse === course.id ? (
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <Sparkles className="w-3 h-3" />
                        <span>Generate</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Featured Course */}
      {isPro && featured && (
        <motion.div
          className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-3xl p-6 md:p-8 mb-12 text-white shadow-2xl"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-48 translate-x-48"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400 rounded-full translate-y-32 -translate-x-32"></div>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl">
                  <Crown className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent font-bold text-sm uppercase tracking-wider">
                    Featured Course
                  </span>
                  <p className="text-slate-300 text-sm">
                    {isPro ? "Premium Exclusive" : "Upgrade to Access"}
                  </p>
                </div>
              </div>
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-slate-300 text-sm">10k+ enrolled</span>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-8 items-center">
              {/* Left Column - Main Content */}
              <div>
                <h2 className="text-3xl font-bold mb-3 leading-tight">
                  {featured.title}
                </h2>
                <p className="text-slate-300 mb-4 text-base leading-relaxed">
                  {featured.description}
                </p>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 mb-4">
                  <p className="text-blue-300 text-xs leading-relaxed">
                    This course is personalized based on your goals and
                    interests. New courses will appear after 1 month.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center space-x-2 text-slate-300">
                    <Clock className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-sm">
                      {featured.duration}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-slate-300">
                    <div className="flex items-center space-x-1">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 text-blue-400 fill-blue-400"
                        />
                      ))}
                      <span className="ml-1 font-medium text-sm">
                        {featured.rating}
                      </span>
                    </div>
                  </div>
                </div>

                {!isPro && (
                  <div className="flex items-baseline space-x-2 mb-4">
                    <span className="text-2xl font-bold text-white">
                      {featured.price}
                    </span>
                    {featured.originalPrice && (
                      <span className="text-lg text-slate-400 line-through">
                        {featured.originalPrice}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right Column - Testimonial and CTA */}
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="w-fit rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Crown className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-slate-200 italic text-sm leading-relaxed">
                          {featured.premiumNote || featured.staffNote}
                        </p>
                        <p className="text-slate-400 text-xs mt-1">
                          - Premium Team
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end">
                  {isPro ? (
                    <button
                      onClick={() => handleStartLearning(featured)}
                      disabled={preparingCourse === featured.id}
                      className="px-6 py-3 bg-white text-slate-900 font-normal rounded-lg hover:bg-slate-100 transition-all duration-200 transform hover:-translate-y-0.5 text-base disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2"
                    >
                      {preparingCourse === featured.id ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-900"></div>
                          <span>Preparing your course...</span>
                        </>
                      ) : (
                        <span>Start Learning</span>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpgradePlan("premium-course")}
                      className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-lg hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 text-sm cursor-pointer"
                    >
                      Get Premium Access
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Premium Courses Grid */}
      {isPro && (
        loading || generatingPersonalized ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">
              {generatingPersonalized
                ? "Creating your personalized premium courses..."
                : "Loading premium courses..."}
            </p>
          </div>
        ) : (
          <>
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {paginatedCourses.map((course, index) => (
                <motion.div
                  key={course.id || index}
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.02 }}
                  className="group relative bg-blue-50/70 dark:bg-blue-900/20 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-slate-600/70 transition-all duration-300"
                >
                  {/* Background Pattern */}
                  <div className="absolute inset-0 opacity-3 dark:opacity-10">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/20 to-purple-600/20 dark:from-blue-500/40 dark:to-purple-600/40 rounded-full -translate-y-16 translate-x-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-pink-600/20 dark:from-purple-500/40 dark:to-pink-600/40 rounded-full translate-y-12 -translate-x-12"></div>
                  </div>

                  <div className="relative p-6">
                    {/* Header with badges */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="p-2 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-xl">
                          <Crown className="w-4 h-4 text-blue-500" />
                        </div>
                        <span className="bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent text-xs font-bold uppercase tracking-wider">
                          Premium
                        </span>
                      </div>
                      {course.badge && (
                        <div
                          className={`px-3 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getBadgeColor(course.badge)}`}
                        >
                          {getBadgeIcon(course.badge)}
                          <span>{course.badge}</span>
                        </div>
                      )}
                    </div>
                    {/* Title and Description */}
                    <div className="mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-300 transition-colors">
                        {course.title}
                      </h3>
                      <p className="text-gray-600 dark:text-slate-200 text-sm leading-relaxed mb-2">
                        {course.description}
                      </p>
                      <p className="text-gray-500 dark:text-slate-300 text-xs">
                        by {course.instructor}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1 text-gray-500 dark:text-slate-400">
                          <Users className="w-4 h-4" />
                          <span>
                            {
                              [
                                "5k",
                                "10k",
                                "15k",
                                "20k",
                                "25k",
                                "30k",
                                "35k",
                                "40k",
                              ][Math.floor(Math.random() * 8)]
                            }
                          </span>
                        </div>
                        <div className="flex items-center space-x-1 text-gray-500 dark:text-slate-400">
                          <Clock className="w-4 h-4" />
                          <span>{course.duration}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-blue-400 fill-blue-400" />
                        <span className="text-gray-700 dark:text-slate-100 font-medium text-sm">
                          {course.rating}
                        </span>
                      </div>
                    </div>

                    {/* Premium Note */}
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                      {/* Progress Bar */}
                      {(() => {
                        const { daysLeft, progress } = getCourseExpiryInfo(
                          course.createdAt
                        );
                        return (
                          <div className="w-full">
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
                              <span>Course Access</span>
                              <span>Expires in {daysLeft} days</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Pricing and CTA */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                          {course.price}
                        </span>
                        {course.originalPrice && (
                          <span className="text-lg text-gray-400 dark:text-slate-400 line-through">
                            {course.originalPrice}
                          </span>
                        )}
                      </div>

                      {isPro ? (
                        <button
                          onClick={() => handleStartLearning(course)}
                          disabled={preparingCourse === course.id}
                          className="w-full px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-normal rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 transform hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center space-x-2 text-xs"
                        >
                          {preparingCourse === course.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              <span>Preparing your course...</span>
                            </>
                          ) : (
                            <span>Start Learning</span>
                          )}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpgradePlan("premium-course")}
                          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold rounded-xl hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 cursor-pointer"
                        >
                          Get Premium
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>

            {/* Pagination */}
            {totalPages > 1 && (
              <motion.div
                className="flex items-center justify-center space-x-2 mt-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
              >
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer ${currentPage === page
                        ? "bg-blue-600 text-white"
                        : "border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                        }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(prev + 1, totalPages))
                  }
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}
          </>
        )
      )}


    </div>
  );
}
