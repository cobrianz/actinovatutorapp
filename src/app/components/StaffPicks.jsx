"use client";

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
} from "lucide-react";
import Link from "next/link";

export default function PremiumCourses() {
  const handleUpgradePlan = async (plan) => {
    try {
      const response = await fetch("/api/billing/create-session", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
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
        window.location.href = data.sessionUrl;
      } else {
        throw new Error("No payment URL received");
      }
    } catch (error) {
      toast.error(
        error.message || "Failed to start upgrade process. Please try again."
      );
    }
  };

  const featuredPick = {
    id: 1,
    title: "Complete Full-Stack Development Bootcamp",
    description:
      "Master both frontend and backend development with this comprehensive course covering React, Node.js, databases, and deployment.",
    instructor: "Sarah Chen",
    instructorTitle: "Senior Full-Stack Engineer at Google",
    duration: "12 weeks",
    students: 15420,
    rating: 4.9,
    difficulty: "Intermediate",
    category: "Full-Stack Development",
    thumbnail: "/placeholder.svg?height=400&width=600",
    highlights: [
      "Build 5 real-world projects",
      "Learn industry best practices",
      "Get job-ready skills",
      "Lifetime access to updates",
    ],
    staffNote:
      "This course perfectly balances theory and practice. Sarah's teaching style makes complex concepts accessible to everyone.",
  };

  const staffPicks = [
    {
      id: 2,
      title: "AI and Machine Learning Fundamentals",
      description:
        "Dive into the world of artificial intelligence and machine learning",
      instructor: "Dr. Michael Rodriguez",
      duration: "8 weeks",
      students: 8930,
      rating: 4.8,
      difficulty: "Beginner",
      category: "AI/ML",
      thumbnail: "/placeholder.svg?height=200&width=300",
      staffNote: "Perfect introduction to AI concepts with hands-on projects.",
      badge: "Trending",
    },
    {
      id: 3,
      title: "Advanced React Patterns",
      description: "Master advanced React concepts and design patterns",
      instructor: "Emma Thompson",
      duration: "6 weeks",
      students: 5670,
      rating: 4.9,
      difficulty: "Advanced",
      category: "Frontend",
      thumbnail: "/placeholder.svg?height=200&width=300",
      staffNote:
        "Essential for React developers looking to level up their skills.",
      badge: "Expert Level",
    },
    {
      id: 4,
      title: "Cloud Architecture with AWS",
      description: "Design and deploy scalable cloud solutions",
      instructor: "James Wilson",
      duration: "10 weeks",
      students: 7240,
      rating: 4.7,
      difficulty: "Intermediate",
      category: "Cloud Computing",
      thumbnail: "/placeholder.svg?height=200&width=300",
      staffNote:
        "Comprehensive coverage of AWS services with real-world scenarios.",
      badge: "Industry Favorite",
    },
    {
      id: 5,
      title: "UX Research and Design Thinking",
      description: "Learn user-centered design principles and research methods",
      instructor: "Lisa Park",
      duration: "7 weeks",
      students: 4580,
      rating: 4.8,
      difficulty: "Beginner",
      category: "UX/UI Design",
      thumbnail: "/placeholder.svg?height=200&width=300",
      staffNote: "Excellent foundation for anyone interested in UX design.",
      badge: "Creative Choice",
    },
    {
      id: 6,
      title: "Cybersecurity Essentials",
      description: "Protect systems and data with modern security practices",
      instructor: "Robert Kim",
      duration: "9 weeks",
      students: 6120,
      rating: 4.6,
      difficulty: "Intermediate",
      category: "Security",
      thumbnail: "/placeholder.svg?height=200&width=300",
      staffNote: "Critical knowledge for today's digital landscape.",
      badge: "High Demand",
    },
    {
      id: 7,
      title: "Data Visualization with D3.js",
      description: "Create stunning interactive data visualizations",
      instructor: "Anna Martinez",
      duration: "5 weeks",
      students: 3890,
      rating: 4.9,
      difficulty: "Intermediate",
      category: "Data Science",
      thumbnail: "/placeholder.svg?height=200&width=300",
      staffNote: "Beautiful course that makes data come alive.",
      badge: "Visual Excellence",
    },
  ];

  const categories = [
    { name: "All Picks", count: staffPicks.length + 1, active: true },
    { name: "Programming", count: 3 },
    { name: "Design", count: 2 },
    { name: "Data Science", count: 2 },
    { name: "Cloud", count: 1 },
  ];

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
        className="text-center mb-12"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-center space-x-2 mb-4">
          <Star className="w-8 h-8 text-blue-500" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Premium Courses
          </h1>
        </div>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          High-quality courses with advanced features, expert instruction, and
          comprehensive learning materials.
        </p>
      </motion.div>

      {/* Categories */}
      <motion.div
        className="flex flex-wrap justify-center gap-2 mb-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        {categories.map((category, index) => (
          <motion.button
            key={category.name}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2 rounded-full text-xs font-medium transition-colors ${
              category.active
                ? "bg-blue-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {category.name} ({category.count})
          </motion.button>
        ))}
      </motion.div>

      {/* Featured Pick */}
      <motion.div
        className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-8 mb-12 text-white"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="flex items-center space-x-2 mb-4">
          <Crown className="w-6 h-6 text-white" />
          <span className="text-white font-semibold">Featured Staff Pick</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-4">{featuredPick.title}</h2>
            <p className="text-blue-100 mb-6">{featuredPick.description}</p>

            <div className="flex items-center space-x-6 mb-6 text-sm">
              <div className="flex items-center space-x-1">
                <Users className="w-4 h-4" />
                <span>{featuredPick.students.toLocaleString()} students</span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{featuredPick.duration}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Star className="w-4 h-4 text-white" />
                <span>{featuredPick.rating}</span>
              </div>
            </div>

            <div className="bg-white/10 rounded-lg p-4 mb-6">
              <p className="text-sm italic">"{featuredPick.staffNote}"</p>
              <p className="text-xs text-blue-200 mt-2">- Education Team</p>
            </div>

            <button
              onClick={() => handleUpgradePlan("editors-choice")}
              className="mt-4 w-full py-3 px-4 rounded-lg font-medium transition-all bg-white text-blue-600 hover:bg-gray-100 shadow-lg"
            >
              Purchase Premium Course
            </button>
          </div>
        </div>
      </motion.div>

      {/* Staff Picks Grid */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
      >
        {staffPicks.map((course, index) => (
          <motion.div
            key={course.id}
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="bg-blue-50/70 dark:bg-blue-900/20 backdrop-blur-sm border border-gray-200 dark:border-slate-700/50 rounded-2xl overflow-hidden hover:border-gray-300 dark:hover:border-slate-600/70 transition-all duration-300"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {course.title}
                    </h3>
                    <div
                      className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getBadgeColor(course.badge)}`}
                    >
                      {getBadgeIcon(course.badge)}
                      <span>{course.badge}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {course.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    by {course.instructor}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
                <div className="flex items-center space-x-1">
                  <Users className="w-4 h-4" />
                  <span>{course.students.toLocaleString()}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Clock className="w-4 h-4" />
                  <span>{course.duration}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-blue-400" />
                  <span>{course.rating}</span>
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-700 dark:text-gray-300 italic">
                  "{course.staffNote}"
                </p>
              </div>

              <Link
                href={`/learn/${encodeURIComponent(course.title)}`}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-center block"
              >
                Start Learning
              </Link>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* CTA Section */}
      <motion.div
        className="text-center mt-16 bg-gray-50 dark:bg-gray-800 rounded-2xl p-8"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
      >
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Want to see your course featured?
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Create exceptional learning experiences and get noticed by our
          education team.
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
        >
          <span>Contact Our Team</span>
        </Link>
      </motion.div>
    </div>
  );
}
