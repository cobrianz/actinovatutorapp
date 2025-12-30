"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { authenticatedFetch } from "../lib/apiConfig";
import { motion } from "framer-motion";
import {
    BookOpen,
    Zap,
    BrainCircuit,
    TrendingUp,
    Crown,
    Grid,
    Download,
    Trash2,
    Pin,
    Sparkles,
    Scroll,
    Star,
    Users,
    Clock,
    ChevronRight
} from "lucide-react";
import { downloadCourseAsPDF, downloadQuizAsPDF } from "../lib/pdfUtils";
import { toast } from "sonner";

export default function DashboardContent() {
    const { user } = useAuth();
    const router = useRouter();
    const [courses, setCourses] = useState([]);
    const [trendingCourses, setTrendingCourses] = useState([]);
    const [loadingCourses, setLoadingCourses] = useState(true);
    const [loadingTrending, setLoadingTrending] = useState(true);
    const [pinnedCount, setPinnedCount] = useState(0);

    // Quick Actions Configuration
    const quickActions = [
        {
            id: "new",
            name: "New Course",
            icon: BookOpen,
            color: "bg-blue-500",
            onClick: () => router.push("/generate"),
        },
        {
            id: "flashcards",
            name: "Flashcards",
            icon: Zap,
            color: "bg-amber-500",
            onClick: () => router.push("/courses?tab=flashcards"),
        },
        {
            id: "tests",
            name: "Test Yourself",
            icon: BrainCircuit,
            color: "bg-emerald-500",
            onClick: () => router.push("/courses?tab=quizzes"),
        },
        {
            id: "upgrade",
            name: "Upgrade",
            icon: Crown,
            color: "bg-purple-500",
            onClick: () => router.push("/pricing"),
        },
    ];

    const { fetchUser } = useAuth();
    const [hasNotified, setHasNotified] = useState(false);

    // Initial user fetch
    useEffect(() => {
        // ... handled by AuthProvider mostly, but we trigger refresh on payment success
        const paymentStatus = new URLSearchParams(window.location.search).get("payment");
        if (paymentStatus === "success" && !hasNotified) {
            const refresh = async () => {
                await fetchUser();
                import("sonner").then(({ toast }) => {
                    toast.success("Upgrade successful! All premium features are now unlocked.");
                });
                setHasNotified(true);
            };
            refresh();
        }
    }, [fetchUser, hasNotified]);

    // Fetch Library Courses (Real Data)
    useEffect(() => {
        async function fetchCourses() {
            if (!user) return;
            try {
                const res = await authenticatedFetch(`/api/library?limit=5&type=course`);
                if (res.ok) {
                    const data = await res.json();
                    // Map data to ensure consistency with Library.jsx expectation
                    const mappedCourses = (data.items || []).map((item) => ({
                        id: item.id,
                        title: item.title,
                        topic: item.topic || item.title,
                        difficulty: item.difficulty || 'beginner',
                        progress: item.progress || 0,
                        format: item.type === "questions" ? "questions" : item.type === "flashcards" ? "flashcards" : "course",
                        isPinned: item.pinned || false
                    }));
                    setCourses(mappedCourses);
                    setPinnedCount(data.stats?.pinned || 0);
                }
            } catch (error) {
                console.error("Failed to fetch library courses", error);
            } finally {
                setLoadingCourses(false);
            }
        }
        fetchCourses();
    }, [user]);

    const isPremium =
        !!(
            user?.subscription &&
            (user.subscription.plan === "pro" || user.subscription.plan === "enterprise") &&
            user.subscription.status === "active"
        ) || !!user?.isPremium;

    const [pinningId, setPinningId] = useState(null);
    const [generatingCourse, setGeneratingCourse] = useState(null);

    const handlePin = async (e, courseId, isCurrentPinned) => {
        e.stopPropagation();
        if (pinningId) return;

        setPinningId(courseId);
        const willBePinned = !isCurrentPinned;

        if (willBePinned && pinnedCount >= 3) {
            toast.error("You can only pin up to 3 courses. Unpin one first.");
            setPinningId(null);
            return;
        }

        try {
            const res = await authenticatedFetch("/api/library", {
                method: "POST",
                body: JSON.stringify({ action: "pin", itemId: courseId }),
            });

            if (!res.ok) throw new Error("Failed to update pin");

            setCourses(prev =>
                prev.map(c =>
                    c.id === courseId ? { ...c, isPinned: willBePinned } : c
                )
            );
            setPinnedCount(prev => willBePinned ? prev + 1 : prev - 1);
            toast.success(willBePinned ? "Course pinned" : "Course unpinned");
        } catch (err) {
            console.error("Pin error:", err);
            toast.error("Failed to update pin status");
        } finally {
            setPinningId(null);
        }
    };

    const handleDownload = async (e, course) => {
        e.stopPropagation();
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

            if (course.format === "quiz" || course.format === "questions") {
                await downloadQuizAsPDF(data.item);
            } else {
                await downloadCourseAsPDF(data.item, course.format);
            }
            toast.success("Download started!", { id: toastId });
        } catch (err) {
            console.error("Download error:", err);
            toast.error("Failed to generate PDF", { id: toastId });
        }
    };

    const handleGenerateCourse = async (course) => {
        if (generatingCourse) return;

        setGeneratingCourse(course.title);
        toast.loading(`Generating course: ${course.title}...`, { id: "generating" });

        try {
            let difficulty = (course.difficulty || "beginner").toLowerCase();
            if (!["beginner", "intermediate", "advanced"].includes(difficulty)) {
                difficulty = "beginner";
            }

            const isPro = !!(user?.subscription?.plan === "pro" || user?.isPremium);
            if (!isPro) {
                difficulty = "beginner";
            }

            const response = await authenticatedFetch("/api/generate-course", {
                method: "POST",
                body: JSON.stringify({
                    topic: course.title,
                    format: "course",
                    difficulty,
                }),
            });

            if (!response.ok) {
                const contentType = response.headers.get("content-type");
                let errorData = {};

                if (contentType && contentType.includes("application/json")) {
                    errorData = await response.json().catch(() => ({}));
                } else {
                    const errorText = await response.text();
                    console.error("Non-JSON error response:", errorText);
                    throw new Error("Server returned an error. Please try again.");
                }

                throw new Error(errorData.error || "Failed to generate course");
            }

            const responseData = await response.json();

            toast.success(`Course "${course.title}" generated successfully!`, {
                id: "generating",
            });

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

    // Fetch Trending Courses (Strict Logic)
    useEffect(() => {
        async function fetchTrending() {
            if (!user) return;
            try {
                const endpoint = "/api/premium-courses/trending";

                const res = await authenticatedFetch(endpoint, {
                    method: "GET"
                });

                if (res.ok) {
                    const data = await res.json();
                    setTrendingCourses(data.courses || []);
                }
            } catch (error) {
                console.error("Failed to fetch trending courses", error);
            } finally {
                setLoadingTrending(false);
            }
        }
        fetchTrending();
    }, [user]);

    // Signal Dashboard Ready
    useEffect(() => {
        if (!loadingCourses && !loadingTrending) {
            window.dispatchEvent(new CustomEvent("actinova:dashboard-ready"));
        }
    }, [loadingCourses, loadingTrending]);

    return (
        <div className="px-5 py-6 space-y-8 pb-32 pb-safe-bottom">

            {/* 1. Banner with Exact Count */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold mb-1">Welcome back, {user?.name?.split(" ")[0] || "Scholar"}!</h2>
                    <p className="text-blue-100 font-medium mb-6">
                        You have <span className="font-bold text-white text-lg">{courses.length}</span> active courses.
                    </p>
                    <button
                        onClick={() => router.push("/courses?tab=library")}
                        className="bg-white text-blue-600 px-6 py-2.5 rounded-full text-sm font-bold shadow-sm hover:bg-blue-50 transition active:scale-95"
                    >
                        Resume Learning
                    </button>
                </div>
                {/* Abstract shapes/bg */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl translate-y-8 -translate-x-8"></div>
            </div>

            {/* 2. Trending Now (Premium Spotlight Style) */}
            <section>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Trending Now
                    </h3>
                    <button
                        onClick={() => router.push("/explore")}
                        className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline flex items-center gap-1"
                    >
                        Explore <ChevronRight size={12} />
                    </button>
                </div>

                {loadingTrending ? (
                    <div className="flex gap-4 overflow-hidden">
                        {[1, 2].map(i => <div key={i} className="min-w-[280px] h-36 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
                    </div>
                ) : (
                    <div className="flex gap-4 overflow-x-auto pb-4 -mx-5 px-5 scrollbar-hide no-scrollbar scroll-smooth">
                        {trendingCourses.length > 0 ? trendingCourses.map((course, idx) => (
                            <motion.div
                                key={course.id || idx}
                                whileHover={{ y: -4 }}
                                className="flex-shrink-0 w-[280px] bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-xl shadow-indigo-500/10 relative overflow-hidden group cursor-pointer"
                                onClick={() => handleGenerateCourse(course)}
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl group-hover:scale-110 transition-transform" />
                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="flex justify-between items-start mb-4">
                                        <TrendingUp className="w-6 h-6 text-green-500 bold" />
                                        {course.badge && (
                                            <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-bold text-white">{course.badge}</span>
                                        )}
                                    </div>
                                    <h4 className="font-black text-lg leading-tight mb-2 line-clamp-2">{course.title}</h4>
                                    <p className="text-white/70 text-xs font-medium line-clamp-2 mb-4">{course.description}</p>
                                    <div className="mt-auto flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full bg-white/20 border-2 border-indigo-600 flex items-center justify-center text-[8px] font-bold">{i}</div>)}
                                        </div>
                                        <span className="text-xs font-bold text-white/80">Join 1k+ students</span>
                                    </div>
                                </div>
                            </motion.div>
                        )) : (
                            <div className="w-full text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Check back later for trending courses.</p>
                            </div>
                        )}
                    </div>
                )}
            </section>

            {/* 3. Quick Actions (2x2 Beautiful Cards) */}
            <section>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((tool) => (
                        <button
                            key={tool.id}
                            onClick={tool.onClick}
                            className="flex flex-col items-center justify-center p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm active:scale-[0.98] transition-all group"
                        >
                            <div
                                className={`w-12 h-12 rounded-2xl ${tool.color} flex items-center justify-center text-white shadow-lg shadow-gray-200 dark:shadow-none mb-3 group-hover:scale-110 transition-transform`}
                            >
                                <tool.icon size={22} strokeWidth={2.5} />
                            </div>
                            <span className="text-sm font-bold text-gray-700 dark:text-gray-200">{tool.name}</span>
                        </button>
                    ))}
                </div>
            </section>

            {/* 4. Continue Learning (Premium Course Card Style) */}
            <section>
                <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">
                        Continue Learning
                    </h3>
                    <button
                        onClick={() => router.push("/courses?tab=library")}
                        className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest hover:underline"
                    >
                        View all
                    </button>
                </div>

                {loadingCourses ? (
                    <div className="space-y-4">
                        {[1, 2].map(i => (
                            <div key={i} className="h-64 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse"></div>
                        ))}
                    </div>
                ) : courses.length === 0 ? (
                    <div className="rounded-xl p-8 text-center bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 border-dashed">
                        <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">No courses started yet.</p>
                        <button onClick={() => router.push('/generate')} className="mt-2 text-blue-600 text-sm font-bold">Start your first course</button>
                    </div>
                ) : (
                    <div className="space-y-6 pb-32">
                        {[...courses].sort((a, b) => (b.isPinned ? 1 : 0) - (a.isPinned ? 1 : 0)).slice(0, 5).map((course, idx) => (
                            <motion.div
                                key={course.id || idx}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.1 }}
                                whileHover={{ y: -4 }}
                                onClick={() => {
                                    router.push(
                                        `/learn/content?topic=${encodeURIComponent(course.topic)}&format=${course.format}&difficulty=${course.difficulty || "beginner"}&originalTopic=${encodeURIComponent(course.topic)}&id=${course.id || course._id}`
                                    );
                                }}
                                className="group relative bg-white dark:bg-gray-800/50 backdrop-blur-sm border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-gray-600/70 transition-all duration-300 shadow-sm cursor-pointer"
                            >
                                {/* Background Pattern */}
                                <div className="absolute inset-0 opacity-5 dark:opacity-10 pointer-events-none">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-400/20 to-purple-600/20 rounded-full translate-x-10 -translate-y-10"></div>
                                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full -translate-x-10 translate-y-10"></div>
                                </div>

                                <div className="relative p-6">
                                    {/* Header with badges and Actions */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="p-2 bg-gradient-to-br from-indigo-500/10 to-purple-600/10 border border-indigo-100/20 dark:border-indigo-500/10 rounded-lg">
                                                <Scroll className="w-4 h-4 text-indigo-500" />
                                            </div>
                                            <span className="text-gray-500 dark:text-gray-400 text-[10px] font-bold uppercase tracking-wider">
                                                {course.format || "Course"}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={(e) => handlePin(e, course.id, course.isPinned)}
                                                disabled={pinningId === course.id}
                                                className={`p-2 rounded-lg transition-all ${course.isPinned
                                                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                                                    : "bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:text-indigo-600"
                                                    }`}
                                            >
                                                <Pin size={16} className={course.isPinned ? "fill-current" : ""} />
                                            </button>
                                            <button
                                                onClick={(e) => handleDownload(e, course)}
                                                className="p-2 bg-gray-50 dark:bg-gray-700/50 text-gray-400 hover:text-indigo-600 rounded-lg transition-all"
                                            >
                                                <Download size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Title */}
                                    <div className="mb-4">
                                        <h4 className="text-lg font-black text-gray-900 dark:text-white leading-tight mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                            {course.title}
                                        </h4>
                                    </div>

                                    {/* Stats (Faked for aesthetic) */}
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center space-x-4 text-[10px] font-bold uppercase tracking-wide">
                                            <div className="flex items-center space-x-1 text-gray-500">
                                                <Users size={12} />
                                                <span>1k+</span>
                                            </div>
                                            <div className="flex items-center space-x-1 text-gray-500">
                                                <Clock size={12} />
                                                <span>6 weeks</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-1">
                                            <Star size={12} className="text-yellow-400 fill-yellow-400" />
                                            <span className="text-gray-900 dark:text-white font-bold text-xs">4.9</span>
                                        </div>
                                    </div>

                                    {/* Progress */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                                            <span className="text-indigo-600 dark:text-indigo-400">Progress</span>
                                            <span className="text-gray-500">{course.progress}%</span>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${course.progress}%` }}
                                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
