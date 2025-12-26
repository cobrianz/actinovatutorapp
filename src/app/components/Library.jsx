"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Clock,
  Star,
  Search,
  Grid,
  List,
  Play,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Trophy,
  Flame,
  Download,
  Sparkles,
  FileText,
  Pin,
  BarChart3,
  TrendingUp,
  ChevronDown,
  Crown,
  Zap,
  Scroll,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ConfirmModal from "./ConfirmModal";
import { toast } from "sonner";
import { getApiUrl, authenticatedFetch } from "../lib/apiConfig";
import { downloadCourseAsPDF } from "@/lib/pdfUtils";
import { useAuth } from "./AuthProvider";

const staticCategories = [
  {
    name: "All",
    icon: "Grid",
    color: "gray",
  },
  {
    name: "Technology",
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
    icon: "code",
    color: "blue",
  },
  {
    name: "Design",
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
    icon: "palette",
    color: "purple",
  },
  {
    name: "Business",
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
    icon: "briefcase",
    color: "orange",
  },
  {
    name: "Data Science",
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
    icon: "chart",
    color: "green",
  },
  {
    name: "AI & ML",
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
    icon: "brain",
    color: "indigo",
  },
  {
    name: "Creative",
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
    icon: "camera",
    color: "pink",
  },
  {
    name: "Humanities",
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
    icon: "book",
    color: "red",
  },
  {
    name: "Languages",
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
    icon: "globe",
    color: "cyan",
  },
  {
    name: "Science",
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
    icon: "microscope",
    color: "teal",
  },
  {
    name: "Mathematics",
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
    icon: "calculator",
    color: "yellow",
  },
  {
    name: "Health",
    topics: [
      "Nutrition",
      "Fitness",
      "Mental Health",
      "Medicine",
      "Nursing",
      "Public Health",
      "Yoga",
      "Meditation",
    ],
    icon: "heart",
    color: "rose",
  }
];

export default function Library({ setActiveContent, setHideNavs }) {
  const router = useRouter();

  // Hide Navbar/Bottombar on mount
  useEffect(() => {
    if (setHideNavs) {
      setHideNavs(true);
      return () => setHideNavs(false);
    }
  }, [setHideNavs]);

  const [viewMode, setViewMode] = useState("grid");
  const [filterBy, setFilterBy] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [premiumCourses, setPremiumCourses] = useState([]);
  const [exploreCourses, setExploreCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingPremium, setLoadingPremium] = useState(true);
  const [loadingExplore, setLoadingExplore] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [pinnedCourses, setPinnedCourses] = useState(new Set());
  const [generatingCourse, setGeneratingCourse] = useState(null);

  const { user, loading: authLoading, refreshToken } = useAuth();

  const coursesPerPage = 12;

  // Fetch library data using httpOnly cookies only
  const fetchLibraryData = async (retryAfterRefresh = true) => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: coursesPerPage.toString(),
        type: "course",
        search: searchQuery,
      });

      const res = await authenticatedFetch(`/api/library?${params}`);

      if (!res.ok) {
        if (res.status === 401 && retryAfterRefresh) {
          // Try to refresh token and retry
          console.log("Token expired, attempting to refresh...");
          const refreshSuccess = await refreshToken();
          if (refreshSuccess) {
            // Retry the request after successful refresh
            return fetchLibraryData(false);
          } else {
            toast.error("Session expired. Please log in again.");
          }
        } else if (res.status === 401) {
          toast.error("Session expired. Please log in again.");
        } else {
          toast.error("Failed to load library");
        }
        setLoading(false);
        return;
      }

      const data = await res.json();

      const mappedCourses = (data.items || []).map((item) => ({
        id: item.id,
        _id: item.id.split("_")[1] || item.id,
        title: item.title,
        topic: item.topic,
        difficulty: item.difficulty,
        progress: item.progress || 0,
        totalLessons: item.totalLessons || item.totalCards || 0,
        completedLessons: Math.round(
          (item.progress / 100) * (item.totalLessons || item.totalCards || 0)
        ),
        isPinned: item.pinned || false,
        pinned: item.pinned || false,
        createdAt: item.createdAt,
        lastAccessed: item.lastAccessed || "Just now",
        description: item.description || `Learn ${item.topic || item.title}`,
        instructor: item.instructor || "AI Tutor",
        rating: item.rating || 4.8,
        estimatedTime: item.estimatedTime || "2-4 hours",
        format: item.type === "questions" ? "questions" : item.type === "flashcards" ? "flashcards" : "course",
        courseData: {
          topic: item.topic,
          format: item.type === "questions" ? "questions" : item.type === "flashcards" ? "flashcards" : "course",
          difficulty: item.difficulty,
        },
        isGenerated: true,
      }));

      setCourses(mappedCourses);
      setPagination(data.pagination || {});
      setStats(data.stats || {});
    } catch (err) {
      console.error("Error fetching library:", err);
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch premium/trending courses
  const fetchPremiumData = async () => {
    try {
      setLoadingPremium(true);
      const isPro = !!(user?.subscription?.plan === "pro" || user?.isPremium);
      const endpoint = isPro ? "/api/premium-courses/personalized" : "/api/premium-courses/trending";

      const res = await authenticatedFetch(endpoint, {
        method: isPro ? "POST" : "GET"
      });

      if (res.ok) {
        const data = await res.json();
        setPremiumCourses(data.courses || []);
      }
    } catch (err) {
      console.error("Error fetching premium data:", err);
    } finally {
      setLoadingPremium(false);
    }
  };

  // Fetch explore courses (Standard courses)
  const fetchExploreData = async () => {
    try {
      setLoadingExplore(true);
      const res = await authenticatedFetch("/api/premium-courses/trending");

      if (res.ok) {
        const data = await res.json();
        setExploreCourses(data.courses || []);
      }
    } catch (err) {
      console.error("Error fetching explore data:", err);
    } finally {
      setLoadingExplore(false);
    }
  };

  // Re-fetch when page, search, filter, or user changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchLibraryData();
      fetchPremiumData();
      fetchExploreData();
    } else if (!authLoading && !user) {
      setLoading(false);
      setLoadingPremium(false);
      setLoadingExplore(false);
    }
  }, [currentPage, searchQuery, filterBy, user, authLoading]);

  // Reset page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterBy]);

  // Update pinned courses set
  useEffect(() => {
    if (courses.length > 0) {
      setPinnedCourses(
        new Set(courses.filter((c) => c.isPinned).map((c) => c.id))
      );
    }
  }, [courses]);

  const handlePin = async (courseId, retryAfterRefresh = true) => {
    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    const willBePinned = !course.isPinned;
    const currentPinnedCount = stats.pinned || 0;

    if (willBePinned && currentPinnedCount >= 3) {
      toast.error("You can only pin up to 3 courses. Unpin one first.");
      return;
    }

    // Optimistic update
    setCourses((prev) =>
      prev.map((c) =>
        c.id === courseId
          ? { ...c, isPinned: willBePinned, pinned: willBePinned }
          : c
      )
    );
    setStats((prev) => ({
      ...prev,
      pinned: willBePinned ? currentPinnedCount + 1 : currentPinnedCount - 1,
    }));

    try {
      const res = await authenticatedFetch("/api/library", {
        method: "POST",
        body: JSON.stringify({ action: "pin", itemId: courseId }),
      });

      if (res.status === 401 && retryAfterRefresh) {
        // Try to refresh token and retry
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          return handlePin(courseId, false);
        }
      }

      if (!res.ok) {
        throw new Error("Failed to update pin");
      }

      toast.success(willBePinned ? "Course pinned" : "Course unpinned");
    } catch (err) {
      // Revert on error
      setCourses((prev) =>
        prev.map((c) =>
          c.id === courseId
            ? { ...c, isPinned: !willBePinned, pinned: !willBePinned }
            : c
        )
      );
      setStats((prev) => ({ ...prev, pinned: currentPinnedCount }));
      toast.error("Failed to update pin status");
    }
  };

  const handleDelete = (courseId) => {
    if (!isPremium) {
      toast.error("Deleting courses is a Pro feature. Please upgrade to manage your library.");
      return;
    }

    const course = courses.find((c) => c.id === courseId);
    if (!course) return;

    setCourseToDelete({
      id: courseId,
      title: course.title,
    });
    setDeleteModalOpen(true);
  };

  const confirmDelete = async (retryAfterRefresh = true) => {
    if (!courseToDelete) return;

    // Optimistic removal
    setCourses((prev) => prev.filter((c) => c.id !== courseToDelete.id));

    try {
      const res = await authenticatedFetch("/api/library", {
        method: "POST",
        body: JSON.stringify({ action: "delete", itemId: courseToDelete.id }),
      });

      if (res.status === 401 && retryAfterRefresh) {
        // Try to refresh token and retry
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          return confirmDelete(false);
        }
      }

      if (res.ok) {
        toast.success("Course deleted from library");
      } else {
        throw new Error("Delete failed");
      }
    } catch (err) {
      toast.error("Failed to delete course");
      fetchLibraryData(); // Re-fetch to restore
    } finally {
      setDeleteModalOpen(false);
      setCourseToDelete(null);
    }
  };

  const handleGenerateCourse = async (course) => {
    if (generatingCourse) return;

    setGeneratingCourse(course.title);
    toast.loading(`Generating course: ${course.title}...`, { id: "generating" });

    try {
      // 1. Determine difficulty based on user status and topic difficulty
      let difficulty = (course.difficulty || "beginner").toLowerCase();

      // 2. Validate difficulty matches API whitelist
      if (!["beginner", "intermediate", "advanced"].includes(difficulty)) {
        difficulty = "beginner";
      }

      // 3. Force beginner for free users (Premium is required for Intermediate/Advanced)
      const isPro = !!(user?.subscription?.plan === "pro" || user?.isPremium);
      if (!isPro) {
        difficulty = "beginner";
      }

      // Generate the course (server reads cookie for auth)
      const response = await authenticatedFetch("/api/generate-course", {
        method: "POST",
        body: JSON.stringify({
          topic: course.title,
          format: "course",
          difficulty,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to generate course");
      }

      const responseData = await response.json();

      toast.success(`Course "${course.title}" generated successfully!`, {
        id: "generating",
      });

      // Navigate to the learning page with safer URL encoding
      if (responseData.courseId || responseData.success) {
        const safeTopic = course.title
          .replace(/[^a-zA-Z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
        router.push(
          `/learn/content?topic=${encodeURIComponent(safeTopic)}&format=course&difficulty=${difficulty}&originalTopic=${encodeURIComponent(course.title)}`
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

  const isPremium =
    !!(
      user?.subscription &&
      (user.subscription.plan === "pro" || user.subscription.plan === "enterprise") &&
      user.subscription.status === "active"
    ) || !!user?.isPremium;

  const handleDownload = async (course) => {
    if (!isPremium) {
      toast.error("PDF downloads are a Pro feature. Please upgrade to download courses.");
      return;
    }

    const toastId = toast.loading(`Preparing PDF for ${course.title}...`);
    try {
      const res = await authenticatedFetch(`/api/library?id=${course.id}`);

      if (!res.ok) throw new Error("Failed to fetch full course data");

      const data = await res.json();
      if (!data.item) throw new Error("Course data not found");

      // Use the full item (which contains modules/lessons) for PDF generation
      await downloadCourseAsPDF(data.item, course.format);
      toast.success("Download started!", { id: toastId });
    } catch (err) {
      console.error("Library download error:", err);
      toast.error("Failed to generate PDF. Please try again.", { id: toastId });
    }
  };

  const handlePageChange = (page) => setCurrentPage(page);

  const handleCategoryClick = (category) => {
    setSelectedCategory(category);
    if (category === "All") {
      setSearchQuery("");
    } else {
      setSearchQuery(category);
    }
  };

  const IconComponent = ({ name, ...props }) => {
    const icons = {
      Grid,
      code: BookOpen,
      palette: Star,
      briefcase: BarChart3,
      brain: Sparkles,
      microscope: FileText,
      chart: TrendingUp,
      globe: Sparkles,
      calculator: FileText,
      heart: Flame,
      camera: Sparkles,
      book: Scroll,
    };
    const Icon = icons[name] || Grid;
    return <Icon {...props} />;
  };

  if (authLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20">
        <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold mb-2">Please log in</h3>
        <p className="text-gray-600 mb-6">
          You need to be signed in to view your library.
        </p>
        <Link
          href="/auth/login"
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Log In
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-12 no-scrollbar">
      {/* Metrics Section */}
      <div className="grid grid-cols-2 gap-4 pb-4">
        {[
          { label: "Courses", value: stats.courses || 0, icon: BookOpen, color: "blue", gradient: "from-blue-500/30 to-indigo-500/30", text: "text-blue-600 dark:text-blue-400" },
          { label: "Done", value: stats.completedCourses || 0, icon: Trophy, color: "green", gradient: "from-emerald-500/30 to-teal-500/30", text: "text-emerald-600 dark:text-emerald-400" },
          { label: "Pinned", value: stats.pinnedCourses || 0, icon: Pin, color: "yellow", gradient: "from-orange-500/30 to-amber-500/30", text: "text-orange-600 dark:text-orange-400" },
          { label: "Progress", value: `${courses.length > 0 ? Math.round(courses.reduce((sum, c) => sum + (c.progress || 0), 0) / courses.length) : 0}%`, icon: TrendingUp, color: "purple", gradient: "from-purple-500/30 to-fuchsia-500/30", text: "text-purple-600 dark:text-purple-400" }
        ].map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={i}
            className="relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-xl p-2.5 rounded-sm border border-gray-100 dark:border-gray-700/50 overflow-hidden"
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-80`} />
            <div className="relative z-10 flex items-center gap-2">
              <div className={`p-1 ${stat.text}`}>
                <stat.icon size={12} className="stroke-[2.5]" />
              </div>
              <div className="flex flex-row items-center gap-1.5 min-w-0">
                <div className="text-xs font-black text-gray-900 dark:text-white leading-none truncate">{stat.value}</div>
                <div className="text-[10px] font-bold text-gray-600 dark:text-gray-300 truncate">{stat.label}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Discovery Hub Header & Categories */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h1 className="text-2xl font-black uppercase tracking-tight text-gray-900 dark:text-white">
            Discovery Hub
          </h1>

          <div className="relative group min-w-[300px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search disciplines..."
              className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-800 border-2 border-purple-100 dark:border-purple-900/30 rounded-2xl focus:ring-2 focus:ring-purple-500/20 outline-none transition-all placeholder:text-gray-400 placeholder:font-medium font-medium text-sm"
            />
          </div>
        </div>

        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
            Categories
          </h3>
          <Link
            href="/explore"
            className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
          >
            Explore <ChevronRight size={12} />
          </Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide no-scrollbar scroll-smooth">
          {staticCategories.map((cat) => (
            <button
              key={cat.name}
              onClick={() => handleCategoryClick(cat.name)}
              className={`flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 ${selectedCategory === cat.name
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                }`}
            >
              <IconComponent name={cat.icon} size={16} />
              <span>{cat.name}</span>
            </button>
          ))}
          <Link
            href="/explore"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 rounded-2xl font-bold text-sm transition-all active:scale-95 bg-white dark:bg-gray-800 text-indigo-600 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <Grid size={16} />
            <span>View More</span>
          </Link>

        </div>
      </div>

      {/* Premium Spotlight */}
      {
        premiumCourses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Premium Spotlight</h3>
              <button onClick={() => setActiveContent("staff-picks")} className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide no-scrollbar scroll-smooth">
              {premiumCourses.map((course, idx) => (
                <motion.div
                  key={course.id || idx}
                  whileHover={{ y: -4 }}
                  className="flex-shrink-0 w-[280px] bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-5 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden group cursor-pointer"
                  onClick={() => handleGenerateCourse(course)}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-110 transition-transform" />
                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-4">
                      <div className="p-2 bg-white/20 rounded-xl">
                        <Crown size={18} className="text-yellow-300" />
                      </div>
                      {course.badge && (
                        <span className="px-2 py-1 bg-white/20 rounded-full text-[9px] font-black uppercase tracking-widest">{course.badge}</span>
                      )}
                    </div>
                    <h4 className="font-black text-lg leading-tight mb-2 line-clamp-2">{course.title}</h4>
                    <p className="text-white/70 text-xs font-medium line-clamp-2 mb-4">{course.description}</p>
                    <div className="mt-auto flex items-center gap-3">
                      <div className="flex -space-x-2">
                        {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-white/20 border-2 border-indigo-600 flex items-center justify-center text-[8px] font-bold">{i}</div>)}
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest opacity-80">Join 1k+ students</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      }

      {/* Featured Discovery (Explore Courses) */}
      {
        exploreCourses.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Featured Discovery</h3>
              <button onClick={() => setActiveContent("explore")} className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline">View All</button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide no-scrollbar scroll-smooth">
              {exploreCourses.map((course, idx) => (
                <motion.div
                  key={idx}
                  whileHover={{ y: -4 }}
                  className="flex-shrink-0 w-[260px] bg-white dark:bg-gray-800 rounded-3xl p-5 border border-gray-100 dark:border-gray-700/50 shadow-sm relative overflow-hidden group cursor-pointer"
                  onClick={() => handleGenerateCourse(course)}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-gray-400 group-hover:text-indigo-500 transition-colors">
                      <Sparkles size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{course.title}</h4>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{course.level || "Modern"}</p>
                    </div>
                  </div>
                  <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-4 h-8">{course.description}</p>
                  <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700 pt-3">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Discovery</span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        )
      }

      {/* Your Collection */}
      <div className="space-y-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Your Collection</h3>
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-xl p-1 opacity-0 pointer-events-none hidden">
            <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded-lg transition-all ${viewMode === "grid" ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-400"}`}><Grid size={14} /></button>
            <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-lg transition-all ${viewMode === "list" ? "bg-white dark:bg-gray-700 shadow-sm" : "text-gray-400"}`}><List size={14} /></button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 border rounded-3xl p-6 animate-pulse h-40"></div>
            ))}
          </div>
        ) : courses.length === 0 ? (
          <motion.div
            className="text-center py-20 bg-gray-50 dark:bg-gray-800/20 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
              {searchQuery ? "No matches found" : "Your space is empty"}
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              {searchQuery
                ? `Couldn't find anything for "${searchQuery}"`
                : "Start your journey by exploring new topics!"}
            </p>
            <button
              onClick={() => setActiveContent("explore")}
              className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold text-sm shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
            >
              Explore Discovery
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={filterBy}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
            className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 pb-20"
          >
            {[...courses].sort((a, b) => (pinnedCourses.has(b.id) ? 1 : 0) - (pinnedCourses.has(a.id) ? 1 : 0)).map((course, idx) => {
              const colors = [
                "from-blue-500 to-indigo-600",
                "from-purple-500 to-fuchsia-600",
                "from-emerald-500 to-teal-600",
                "from-orange-500 to-amber-600",
                "from-rose-500 to-pink-600",
                "from-sky-500 to-blue-600"
              ];
              const cardColor = colors[idx % colors.length];

              return (
                <motion.div
                  key={course.id}
                  layoutId={course.id}
                  onClick={() => {
                    const safeTopic = course.topic
                      .replace(/[^a-zA-Z0-9\s-]/g, "")
                      .trim()
                      .replace(/\s+/g, "-");
                    router.push(
                      `/learn/${encodeURIComponent(safeTopic)}?format=${course.format}&difficulty=${course.difficulty || "beginner"}&originalTopic=${encodeURIComponent(course.topic)}`
                    );
                  }}
                  className={`w-full bg-gradient-to-br ${cardColor} rounded-2xl p-6 relative overflow-hidden group cursor-pointer transition-all hover:scale-[1.01] shadow-xl shadow-gray-200/20 dark:shadow-none`}
                >
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />

                  <div className="relative z-10 flex flex-col h-full">
                    <div className="flex justify-between items-start mb-6">
                      <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl border border-white/20">
                        {course.format === "questions" ? <Grid size={20} className="text-white" /> :
                          course.format === "flashcards" ? <Zap size={20} className="text-white" /> :
                            <BookOpen size={20} className="text-white" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(course);
                          }}
                          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-white/20 transition-all"
                          title="Download PDF"
                        >
                          <Download size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setCourseToDelete(course);
                            setDeleteModalOpen(true);
                          }}
                          className="p-2.5 rounded-full bg-white/10 text-white hover:bg-red-500 transition-all"
                          title="Delete Course"
                        >
                          <Trash2 size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePin(course.id);
                          }}
                          className={`p-2.5 rounded-full transition-all ${course.isPinned ? "bg-white text-indigo-600" : "bg-white/10 text-white hover:bg-white/20"
                            }`}
                          title={course.isPinned ? "Unpin" : "Pin"}
                        >
                          <Pin size={14} className={course.isPinned ? "fill-current" : ""} />
                        </button>
                      </div>
                    </div>

                    <h4 className="font-black text-xl leading-snug mb-4 line-clamp-2 text-white">
                      {course.title}
                    </h4>

                    <div className="space-y-5">
                      <div className="flex items-center justify-between text-xs font-bold text-white/90">
                        <span>{course.progress}% Completed</span>
                        <span>{course.difficulty}</span>
                      </div>

                      <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-white rounded-full transition-all duration-700"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>

                      <button className="w-full mt-2 py-4 bg-white text-gray-900 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:translate-y-[-2px] transition-all active:scale-95 shadow-none">
                        Continue Learning
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )
        }

        {
          pagination.totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-10">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-30 transition-opacity"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              {[...Array(pagination.totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => handlePageChange(i + 1)}
                  className={`w-9 h-9 rounded-xl font-bold text-sm transition-all ${currentPage === i + 1 ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "border border-gray-200 dark:border-gray-700 text-gray-500"}`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === pagination.totalPages}
                className="p-2 border border-gray-200 dark:border-gray-700 rounded-xl disabled:opacity-30 transition-opacity"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )
        }
      </div >

      {/* Floating Generate New Button */}
      <button
        onClick={() => router.push("/dashboard?tab=generate")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center text-white shadow-xl shadow-blue-500/30 hover:scale-110 transition-transform z-50 md:hidden"
      >
        <Sparkles size={24} />
      </button>

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCourseToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Remove Course"
        message={`Are you sure you want to remove "${courseToDelete?.title}"? This will permanently delete your progress.`}
        confirmText="Remove"
        cancelText="Keep"
        confirmColor="red"
      />
    </div >
  );
}
