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
} from "lucide-react";
import Link from "next/link";
import ConfirmModal from "./ConfirmModal";
import { toast } from "sonner";
import { downloadCourseAsPDF } from "@/lib/pdfUtils";
import { useAuth } from "./AuthProvider";

export default function Library({ setActiveContent }) {
  const [viewMode, setViewMode] = useState("grid");
  const [filterBy, setFilterBy] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [stats, setStats] = useState({});
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [pinnedCourses, setPinnedCourses] = useState(new Set());

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

      const res = await fetch(`/api/library?${params}`, {
        credentials: "include", // This sends httpOnly cookies automatically
        headers: {
          "Content-Type": "application/json",
        },
      });

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

  // Re-fetch when page, search, filter, or user changes
  useEffect(() => {
    if (!authLoading && user) {
      fetchLibraryData();
    } else if (!authLoading && !user) {
      setLoading(false);
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
      const res = await fetch("/api/library", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?._id || user?.id || "",
        },
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
      const res = await fetch("/api/library", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?._id || user?.id || "",
        },
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
      const res = await fetch(`/api/library?id=${course.id}`, {
        credentials: "include",
      });

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
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          My Library
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Your personal learning space
        </p>
      </motion.div>

      {/* Stats */}
      {stats && Object.keys(stats).length > 0 && (
        <motion.div
          className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl p-6 my-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 text-center">
            Your Learning Progress
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 flex items-center gap-3"
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="bg-blue-100 dark:bg-blue-900 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 flex items-center justify-around">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.courses || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Total Courses
                </div>
              </div>
            </motion.div>
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 flex items-center gap-3"
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="bg-green-100 dark:bg-green-900 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 flex items-center justify-around">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.completedCourses || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Completed
                </div>
              </div>
            </motion.div>
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 flex items-center gap-3"
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="bg-yellow-100 dark:bg-yellow-900 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                <Pin className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
              </div>
              <div className="flex-1 flex items-center justify-around">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.pinnedCourses || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Pinned
                </div>
              </div>
            </motion.div>
            <motion.div
              className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-600 flex items-center gap-3"
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="bg-orange-100 dark:bg-orange-900 rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div className="flex-1 flex items-center justify-around">
                <div className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  {courses.length > 0
                    ? Math.round(
                      courses.reduce(
                        (sum, course) => sum + (course.progress || 0),
                        0
                      ) / courses.length
                    )
                    : 0}
                  %
                </div>
                <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 font-medium">
                  Avg Progress
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Controls */}
      <motion.div
        className="flex flex-col md:flex-row gap-4 mb-8 justify-between items-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="relative w-full md:w-auto md:max-w-xl">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your library..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          />
        </div>

        <div className="flex gap-3 w-full md:w-auto justify-end">
          <select
            value={filterBy}
            onChange={(e) => setFilterBy(e.target.value)}
            className="px-4 py-2 border rounded-lg bg-white dark:bg-gray-800"
          >
            <option value="all">All Items</option>
            <option value="in-progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="pinned">Pinned</option>
          </select>

          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${viewMode === "grid" ? "bg-white dark:bg-gray-600" : ""}`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${viewMode === "list" ? "bg-white dark:bg-gray-600" : ""}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </motion.div>

      {/* Courses Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="bg-white dark:bg-gray-800 border rounded-lg p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded mb-4 w-3/4"></div>
              <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded mb-6"></div>
              <div className="flex gap-3">
                <div className="h-8 w-20 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
                <div className="h-8 w-24 bg-gray-300 dark:bg-gray-700 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <motion.div
          className="text-center py-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">
            {searchQuery ? "No courses found" : "Your library is empty"}
          </h3>
          <p className="text-gray-600 mb-6">
            {searchQuery
              ? `No results for "${searchQuery}"`
              : "Start learning by generating your first course!"}
          </p>
          <button
            onClick={() => setActiveContent("explore")}
            className="text-dark hover:underline cursor-pointer"
          >
            Explore Courses
          </button>
        </motion.div>
      ) : (
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode + filterBy}
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
            }}
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }
          >
            {courses.map((course) => (
              <motion.div
                key={course.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ y: -4 }}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:border-blue-500/50 transition-all duration-300"
              >
                <div className="h-2 bg-gray-200 dark:bg-gray-700">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-green-500 transition-all duration-1000"
                    style={{ width: `${course.progress}%` }}
                  />
                </div>

                <div className="p-6">
                  <div className="flex flex-col sm:flex-row justify-between items-start mb-3 gap-4 sm:gap-0">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                        {course.description}
                      </p>
                    </div>

                    <div className="flex gap-1 sm:ml-4">
                      {course.format !== "questions" && course.format !== "flashcards" && (
                        <button
                          onClick={() => handleDownload(course)}
                          className={`p-2 rounded-lg transition-colors ${isPremium ? "hover:bg-slate-100 dark:hover:bg-slate-800" : "opacity-50 cursor-not-allowed"}`}
                          title={isPremium ? "Download PDF" : "Pro Feature: Download PDF"}
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handlePin(course.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                        title={course.isPinned ? "Unpin" : "Pin (max 3)"}
                      >
                        <Pin
                          className={`w-4 h-4 ${course.isPinned ? "fill-yellow-500 text-yellow-500" : "text-gray-400"}`}
                        />
                      </button>
                      <button
                        onClick={() => handleDelete(course.id)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 sm:gap-3 text-sm text-gray-600 dark:text-gray-400 mb-4">
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-4 h-4" />
                      {course.completedLessons}/{course.totalLessons}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {course.estimatedTime}
                    </span>
                    <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full text-[10px] sm:text-xs">
                      {course.difficulty || "Beginner"}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
                    <div className="text-sm flex-1">
                      <div className="flex justify-between mb-1">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <div className="w-full sm:w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all duration-1000"
                          style={{ width: `${course.progress}%` }}
                        />
                      </div>
                    </div>

                    <Link
                      href={
                        course.isGenerated
                          ? `/learn/${encodeURIComponent(course.topic)}?format=${course.format}&difficulty=${course.difficulty}`
                          : `/learn/${course.id}`
                      }
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium whitespace-nowrap"
                    >
                      <Play className="w-4 h-4" />
                      {course.progress === 100 ? "Review" : "Continue"}
                    </Link>
                  </div>

                  <p className="text-xs text-gray-500 mt-3">
                    Last accessed:{" "}
                    {new Date(course.lastAccessed).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-10">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="p-2 border rounded disabled:opacity-50"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          {[...Array(pagination.totalPages)].map((_, i) => (
            <button
              key={i + 1}
              onClick={() => handlePageChange(i + 1)}
              className={`px-3 py-1 rounded ${currentPage === i + 1 ? "bg-blue-600 text-white" : "border"}`}
            >
              {i + 1}
            </button>
          ))}
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === pagination.totalPages}
            className="p-2 border rounded disabled:opacity-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Delete Modal */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setCourseToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Course"
        message={`Are you sure you want to delete "${courseToDelete?.title}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmColor="red"
      />
    </div>
  );
}
