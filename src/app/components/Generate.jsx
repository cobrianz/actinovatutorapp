"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  FileText,
  Scroll,
  ChevronDown,
  Lightbulb,
  AlertTriangle,
  ScrollText,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { getApiUrl, authenticatedFetch } from "../lib/apiConfig";
import { useAuth } from "./AuthProvider";
import ActinovaLoader from "./ActinovaLoader";
import QuizInterface from "./QuizInterface";

export default function Generate({ setActiveContent }) {
  const [topic, setTopic] = useState("");

  const [format, setFormat] = useState("course");
  const [difficulty, setDifficulty] = useState("beginner");
  const [questionsCount, setQuestionsCount] = useState(10);
  const [showLoader, setShowLoader] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const { user, loading, refreshToken } = useAuth();

  // Ensure overlay loader is cleared when component unmounts
  React.useEffect(() => {
    return () => {
      if (showLoader) {
        console.log("Generate cleanup: clearing showLoader on unmount");
        try {
          setShowLoader(false);
        } catch (e) {
          console.warn("Failed to clear showLoader during cleanup", e);
        }
      }
    };
  }, []);

  // Hide overlay when route changes (user navigated away)
  const pathname = usePathname();
  React.useEffect(() => {
    setShowLoader(false);
  }, [pathname]);

  // Listen for global 'loading-done' event from LearnContent and other components
  React.useEffect(() => {
    const onDone = () => {
      if (showLoader) {
        console.log("Generate: received actinova:loading-done, clearing showLoader");
        setShowLoader(false);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("actinova:loading-done", onDone);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("actinova:loading-done", onDone);
      }
    };
  }, [showLoader]);

  // Strict check for Premium access (Pro or Enterprise)
  // Ensure we check status is active.
  const isPremium =
    !!(
      (user?.subscription?.plan === "pro" || user?.subscription?.plan === "enterprise") &&
      user?.subscription?.status === "active"
    ) || !!user?.isPremium;

  const atLimit = !!(
    user?.usage?.isAtLimit ||
    (!isPremium && user?.usage?.remaining === 0)
  );

  const friendlyName =
    !loading && user ? user.firstName || user.name.split(" ")[0] || "" : "";

  const handleGenerate = async (retryCount = 0) => {
    if (!topic.trim()) return;
    if (isSubmitting) return; // prevent double submissions
    setIsSubmitting(true);
    const subject = topic.trim();

    // Local cache key for previously generated courses
    const cacheKey = `generated_${subject}_${format}_${difficulty}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        // Route immediately to existing course
        router.push(
          `/learn/content?topic=${encodeURIComponent(subject)}&format=${format}&difficulty=${difficulty}`
        );
        return;
      }
    } catch { }

    // Handle flashcard generation directly
    if (format === "flashcards") {
      console.log("Generate: showing loader for flashcard generation");
      setShowLoader(true);
      setIsSubmitting(true);

      try {
        const response = await authenticatedFetch("/api/generate-flashcards", {
          method: "POST",
          body: JSON.stringify({
            topic: subject,
            difficulty,
          }),
        });

        if (!response.ok) {
          let errorData = {};
          try {
            errorData = await response.json();
          } catch (e) {
            // If parsing fails (e.g. HTML 404/500 from Vercel), just throw generic or text
            throw new Error(`Server Error (${response.status}): Request failed`);
          }
          if (response.status === 429) {
            toast.error("Monthly limit reached. Upgrade to Pro for more!");
            return;
          }
          throw new Error(errorData.error || "Failed to generate flashcards");
        }

        const data = await response.json();

        // Notify usage update
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("usageUpdated"));
        }

        toast.success("Flashcards generated successfully!");

        // Redirect to flashcards tab
        setActiveContent("flashcards");

      } catch (error) {
        console.error("Flashcard generation failed:", error);
        toast.error(error.message || "Failed to generate flashcards");
      } finally {
        setShowLoader(false);
        setIsSubmitting(false);
      }
      return;
    }

    // Handle quiz/test generation directly
    if (format === "quiz") {
      // For quiz, also show loader for consistency
      console.log("Generate: showing loader for quiz generation");
      setShowLoader(true);

      try {
        // Generate quiz directly via API
        const response = await authenticatedFetch("/api/generate-course", {
          method: "POST",
          body: JSON.stringify({
            topic: subject,
            difficulty,
            format: "quiz",
            questions: questionsCount,
          }),
        });

        if (!response.ok) {
          let errorData = {};
          try {
            errorData = await response.json();
          } catch (e) {
            throw new Error(`Server Error (${response.status}): Request failed`);
          }
          if (response.status === 429) {
            toast.error("Monthly limit reached. Upgrade to Pro for more!");
            return;
          }
          throw new Error(errorData.error || "Failed to generate quiz");
        }

        const data = await response.json();

        // Success - show the quiz directly
        setGeneratedQuiz({
          _id: data.quizId,
          ...data.content,
        });
        toast.success("Quiz generated successfully!");

        // Update usage counter
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("usageUpdated"));
        }

        // Reset form
        setTopic("");
      } catch (error) {
        console.error("Quiz generation failed:", error);
        toast.error(error.message || "Failed to generate quiz");
      } finally {
        console.log("Generate: hiding loader (quiz flow)");
        setShowLoader(false);
        setIsSubmitting(false);
      }
      return;
    }

    // Navigate to learn page where generation will happen
    // Loader will stay visible during navigation and be cleared by LearnContent
    router.push(
      `/learn/content?topic=${encodeURIComponent(subject)}&format=${format}&difficulty=${difficulty}`
    );
  };

  // Keep hook order stable: always call effect, conditionally act inside it
  React.useEffect(() => {
    if (generatedQuiz) {
      setActiveContent("quizzes");
    }
  }, [generatedQuiz, setActiveContent]);

  // If a quiz has been generated, show it directly
  if (generatedQuiz) {
    return (
      <QuizInterface
        quizData={generatedQuiz}
        topic={generatedQuiz.course}
        onBack={() => setGeneratedQuiz(null)}
        existingQuizId={generatedQuiz._id}
      />
    );
  }

  return (
    <div className="space-y-6">
      {showLoader && (
        <div data-actinova-loader-overlay="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <ActinovaLoader text={format} />
        </div>
      )}
      <div className="text-center">
        <h1 className="text-4xl sm:text-5xl font-black bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
          {friendlyName
            ? `Welcome, ${friendlyName}`
            : "Actinova AI Tutor"}
        </h1>
      </div>

      <div className="p-6 sm:p-8 shadow-sm">
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            What can I help you learn today?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter a topic below to generate a personalized content
          </p>
          {!isPremium && atLimit && (
            <div className="mt-4 mx-auto max-w-md p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 text-sm">
              You hit free limits. Upgrade to get more generations.
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <div className="relative group p-[2px] rounded-xl sm:rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 shadow-sm focus-within:shadow-indigo-500/20 transition-all duration-300">
              <textarea
                value={topic}
                onChange={(e) => {
                  const value = e.target.value;
                  setTopic(value);
                  // Auto-resize textarea
                  e.target.style.height = "auto";
                  e.target.style.height =
                    Math.min(e.target.scrollHeight, 200) + "px";
                }}
                placeholder="Ex: Advanced Quantum Physics concepts or Basic French for travelers"
                className="w-full px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg border-none rounded-lg sm:rounded-[14px] bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-0 transition-all duration-200 resize-none min-h-[100px] sm:min-h-[120px] max-h-[200px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && e.ctrlKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                autoFocus
                rows={4}
                maxLength={500}
                dir="ltr"
                style={{ direction: "ltr", unicodeBidi: "plaintext" }}
              />
            </div>
            <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 px-1">
              <span className="flex items-center">
                <Lightbulb className="w-4 h-4 mr-1" />
                Tip: You can describe your course.
              </span>
              <span
                className={topic.length > 450 ? "text-orange-500" : ""}
              >
                {topic.length}/500
              </span>
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 mb-4 px-1">
              Choose the format
            </label>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <button
                onClick={() => setFormat("course")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center group h-full ${format === "course"
                  ? "border-blue-600 bg-blue-600 shadow-lg shadow-blue-500/30 text-white"
                  : "border-gray-100 dark:border-gray-700 hover:border-blue-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  }`}
              >
                <div className="mb-2">
                  <FileText className="w-8 h-8" strokeWidth={format === "course" ? 2.5 : 2} />
                </div>
                <span className="font-bold text-xs sm:text-sm">Course</span>
              </button>
              <button
                onClick={() => setFormat("flashcards")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center group h-full ${format === "flashcards"
                  ? "border-purple-600 bg-purple-600 shadow-lg shadow-purple-500/30 text-white"
                  : "border-gray-100 dark:border-gray-700 hover:border-purple-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  }`}
              >
                <div className="mb-2">
                  <Scroll className="w-8 h-8" strokeWidth={format === "flashcards" ? 2.5 : 2} />
                </div>
                <span className="font-bold text-xs sm:text-sm">Flashcards</span>
              </button>
              <button
                onClick={() => setFormat("quiz")}
                className={`p-4 rounded-xl border-2 transition-all flex flex-col items-center justify-center group h-full ${format === "quiz"
                  ? "border-emerald-600 bg-emerald-600 shadow-lg shadow-emerald-500/30 text-white"
                  : "border-gray-100 dark:border-gray-700 hover:border-emerald-200 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  }`}
              >
                <div className="mb-2">
                  <HelpCircle className="w-8 h-8" strokeWidth={format === "quiz" ? 2.5 : 2} />
                </div>
                <span className="font-bold text-xs sm:text-sm">Test Yourself</span>
              </button>
            </div>
          </div>

          {format === "quiz" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left">
                Number of questions (up to 50)
              </label>
              <input
                type="number"
                value={questionsCount}
                onChange={(e) =>
                  setQuestionsCount(
                    Math.min(50, parseInt(e.target.value, 10) || 10)
                  )
                }
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                max="50"
              />
            </div>
          )}

          <div>
            <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 mb-4 px-1">
              Choose difficulty level
              {!isPremium && (
                <span className="ml-2 text-[10px] text-orange-600 dark:text-orange-400 normal-case tracking-normal">
                  (Free users: Beginner only)
                </span>
              )}
            </label>
            <div className="relative">
              <select
                value={difficulty}
                onChange={(e) => {
                  const selectedDifficulty = e.target.value;

                  if (!isPremium && selectedDifficulty !== "beginner") {
                    toast.error(
                      "Intermediate and Advanced levels require Pro subscription. Please upgrade to continue."
                    );
                    setActiveContent("upgrade");
                    return;
                  }

                  setDifficulty(selectedDifficulty);
                }}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 appearance-none pr-10"
                disabled={!isPremium && atLimit} // Optionally block interaction if at limit, but better to allow selecting beginner if it's the only option. 
              >
                <option value="beginner">
                  Beginner{" "}
                  {!isPremium
                    ? "(Free)"
                    : ""}
                </option>
                <option
                  value="intermediate"
                  disabled={!isPremium}
                >
                  Intermediate{" "}
                  {isPremium
                    ? "(Pro)"
                    : "(Pro Only)"}
                </option>
                <option
                  value="advanced"
                  disabled={!isPremium}
                >
                  Advanced{" "}
                  {isPremium
                    ? "(Pro)"
                    : "(Pro Only)"}
                </option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            {!isPremium &&
              difficulty !== "beginner" && (
                <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl">
                  <p className="text-sm text-orange-800 dark:text-orange-200 flex items-start">
                    <AlertTriangle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    Intermediate and Advanced levels require a Pro subscription.
                    <button
                      onClick={() => setActiveContent("upgrade")}
                      className="ml-1 font-semibold underline hover:text-orange-900 dark:hover:text-orange-100"
                    >
                      Upgrade to Pro
                    </button>
                  </p>
                </div>
              )}
          </div>

          <button
            onClick={handleGenerate}
            disabled={!topic.trim() || (!!user && !isPremium && atLimit)}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl font-black text-sm hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20"
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span>
              {!isPremium && atLimit
                ? "Update to Pro for more"
                : "Generate Now"}
            </span>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-[10px] font-black text-gray-500 dark:text-gray-400 mb-4 px-1">
          Popular Learning Tracks
        </h3>
        <PopularTopics setTopic={setTopic} />
      </div>
    </div>
  );
}

// Separate component for popular topics with API fetch
function PopularTopics({ setTopic }) {
  const [topics, setTopics] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    async function fetchTopics() {
      try {
        const res = await authenticatedFetch("/api/popular-topics");
        const data = await res.json();
        setTopics(data.topics || []);
      } catch (error) {
        // Fallback to defaults on error
        setTopics([
          "Artificial Intelligence",
          "Frontend Development",
          "Backend Development",
          "Data Science",
          "Machine Learning",
          "Web Development",
          "Mobile Development",
          "DevOps",
        ]);
      } finally {
        setLoading(false);
      }
    }
    fetchTopics();
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
        {[...Array(8)].map((_, i) => (
          <div
            key={i}
            className="p-3 sm:p-4 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg animate-pulse"
          >
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
      {topics.map((topicOption) => (
        <button
          key={topicOption}
          onClick={() => {
            setTopic(topicOption);
          }}
          className="p-4 text-left bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 rounded-xl hover:shadow-lg hover:shadow-indigo-500/5 transition-all group active:scale-95"
        >
          <span className="text-xs sm:text-sm font-bold text-gray-700 dark:text-gray-200 line-clamp-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            {topicOption}
          </span>
        </button>
      ))}
    </div>
  );
}
