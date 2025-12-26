"use client";

import React, { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Sparkles,
  BookOpen,
  FileText,
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
  const [localTopic, setLocalTopic] = useState("");
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
          const errorData = await response.json();
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
          const errorData = await response.json();
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
        setLocalTopic("");
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
    <div>
      {showLoader && (
        <div data-actinova-loader-overlay="true" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs">
          <ActinovaLoader text={format} />
        </div>
      )}
      <div className="mb-10 text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-3">
          {friendlyName
            ? `Welcome back, ${friendlyName}`
            : "Welcome to Actinova AI Tutor"}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          Ready to test your knowledge? Create comprehensive tests to challenge
          yourself and track your progress.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 p-8 mb-10">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            What can I help you learn today?
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Enter a topic below to generate a personalized course or flashcards
          </p>
          {!isPremium && atLimit && (
            <div className="mt-4 mx-auto max-w-md p-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-200 text-sm">
              You hit free limits. Upgrade to get more generations.
            </div>
          )}
        </div>

        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left px-1">
              What can I help you learn?
            </label>
            <textarea
              value={localTopic}
              onChange={(e) => {
                const value = e.target.value;
                setLocalTopic(value);
                setTopic(value);
                // Auto-resize textarea
                e.target.style.height = "auto";
                e.target.style.height =
                  Math.min(e.target.scrollHeight, 200) + "px";
              }}
              placeholder="Describe what you want to learn in detail... (e.g., I want to learn Python programming from scratch, including data structures, web development with Django, and machine learning basics)"
              className="w-full px-3 sm:px-4 py-3 sm:py-4 text-base sm:text-lg border border-blue-300 dark:border-gray-600 rounded-lg sm:rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent transition-all duration-200 resize-none min-h-[100px] sm:min-h-[120px] max-h-[200px]"
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
            <div className="mt-2 flex justify-between items-center text-xs text-gray-500 dark:text-gray-400 px-1">
              <span className="flex items-center">
                <Lightbulb className="w-4 h-4 mr-1" />
                Tip: Press Ctrl + Enter to generate your course
              </span>
              <span
                className={localTopic.length > 450 ? "text-orange-500" : ""}
              >
                {localTopic.length}/500
              </span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sm:mb-3 text-left px-1">
              Choose the format
            </label>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              <button
                onClick={() => setFormat("course")}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${format === "course"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 text-gray-700 dark:text-gray-300" />
                <span className="font-medium text-xs sm:text-sm">Course</span>
              </button>
              <button
                onClick={() => setFormat("flashcards")}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${format === "flashcards"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                <FileText className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 text-gray-700 dark:text-gray-300" />
                <span className="font-medium text-xs sm:text-sm">
                  Flashcards
                </span>
              </button>
              <button
                onClick={() => setFormat("quiz")}
                className={`p-3 sm:p-4 rounded-lg border-2 transition-colors flex flex-col items-center justify-center ${format === "quiz"
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                  }`}
              >
                <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 mb-1 sm:mb-2 text-gray-700 dark:text-gray-300" />
                <span className="font-medium text-xs sm:text-sm">
                  Test Yourself
                </span>
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
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-left px-1">
              Choose difficulty level
              {!isPremium && (
                <span className="ml-2 text-xs text-orange-600 dark:text-orange-400">
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
                <div className="mt-2 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
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
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2.5 sm:py-3 px-4 rounded-lg font-medium text-sm sm:text-base hover:from-blue-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            <Sparkles className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>
              {!isPremium && atLimit
                ? "You hit free limits — upgrade to get more generations"
                : "Generate"}
            </span>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4 px-1">
          Popular Learning Tracks
        </h3>
        <PopularTopics setTopic={setTopic} setLocalTopic={setLocalTopic} />
      </div>
    </div>
  );
}

// Separate component for popular topics with API fetch
function PopularTopics({ setTopic, setLocalTopic }) {
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
            setLocalTopic(topicOption);
          }}
          className="p-3 sm:p-4 text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md transition-all"
        >
          <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
            {topicOption}
          </span>
        </button>
      ))}
    </div>
  );
}
