"use client";
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  FileText,
  Clock,
  HelpCircle,
  BrainCircuit,
  CheckCircle,
  Award,
  Trash2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import QuizInterface from "./QuizInterface";
import { getApiUrl, authenticatedFetch } from "../lib/apiConfig";

const TestYourself = ({ setHideNavs }) => {
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [performanceStats, setPerformanceStats] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQuiz, setSelectedQuiz] = useState(null);

  useEffect(() => {
    if (setHideNavs) {
      setHideNavs(!!selectedQuiz);
    }
  }, [selectedQuiz, setHideNavs]);
  const [loaded, setLoaded] = useState(false);
  const itemsPerPage = 6;
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchQuizzes = async () => {
      try {
        const response = await authenticatedFetch("/api/quizzes");
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data);

          // Calculate overall performance stats
          let totalTests = data.length;
          let totalAttempts = 0;
          let totalScore = 0;
          let completedTests = 0;

          data.forEach((quiz) => {
            if (quiz.performances && quiz.performances.length > 0) {
              completedTests++;
              totalAttempts += quiz.performances.length;
              // Get the best score for each user across all attempts
              const userBestScores = {};
              quiz.performances.forEach((p) => {
                const userId = p.userId.toString();
                if (
                  !userBestScores[userId] ||
                  p.percentage > userBestScores[userId]
                ) {
                  userBestScores[userId] = p.percentage;
                }
              });
              totalScore += Object.values(userBestScores).reduce(
                (sum, score) => sum + score,
                0
              );
            }
          });

          const averageScore =
            completedTests > 0 ? Math.round(totalScore / completedTests) : 0;

          setPerformanceStats({
            totalTests,
            completedTests,
            totalAttempts,
            averageScore,
          });
        } else {
          toast.error("Failed to fetch quizzes");
        }
      } catch (error) {
        toast.error("An error occurred while fetching quizzes");
      } finally {
        setLoading(false);
        setLoaded(true);
      }
    };
    fetchQuizzes();
  }, []);

  const handleDeleteQuiz = async (quizId) => {
    if (
      !confirm(
        "Are you sure you want to delete this quiz? This action cannot be undone."
      )
    ) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/quizzes/${quizId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Quiz deleted successfully");
        // Refresh the quizzes list
        const response = await authenticatedFetch("/api/quizzes");
        if (response.ok) {
          const data = await response.json();
          setQuizzes(data);
        }
      } else {
        toast.error("Failed to delete quiz");
      }
    } catch (error) {
      toast.error("An error occurred while deleting the quiz");
    }
  };

  const getFilteredQuizzes = () => {
    return quizzes.filter((quiz) => {
      // Filter by difficulty
      if (filterDifficulty !== "all" && quiz.difficulty !== filterDifficulty) {
        return false;
      }

      // Filter by completion status
      if (filterStatus !== "all") {
        const completedKey = `quiz_completed_${quiz._id}`;
        const isCompleted =
          typeof window !== "undefined" && localStorage.getItem(completedKey);

        if (filterStatus === "completed" && !isCompleted) {
          return false;
        }
        if (filterStatus === "pending" && isCompleted) {
          return false;
        }
      }

      return true;
    });
  };

  if (selectedQuiz) {
    return (
      <QuizInterface
        quizData={selectedQuiz}
        topic={selectedQuiz.course}
        onBack={() => setSelectedQuiz(null)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight flex items-center">
          Test Your Knowledge
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          Challenge yourself with quizzes on various topics.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {[
          { label: "Tests", value: quizzes.length, bg: "bg-blue-50/50 dark:bg-blue-900/10", border: "border-blue-100 dark:border-blue-800/50", text: "text-blue-600 dark:text-blue-400" },
          { label: "Pending", value: quizzes.length, bg: "bg-yellow-50/50 dark:bg-yellow-900/10", border: "border-yellow-100 dark:border-yellow-800/50", text: "text-yellow-600 dark:text-yellow-400" },
          { label: "Done", value: performanceStats?.completedTests || 0, bg: "bg-green-50/50 dark:bg-green-900/10", border: "border-green-100 dark:border-green-800/50", text: "text-green-600 dark:text-green-400" },
          { label: "Avg Score", value: `${performanceStats?.averageScore || 0}%`, bg: "bg-purple-50/50 dark:bg-purple-900/10", border: "border-purple-100 dark:border-purple-800/50", text: "text-purple-600 dark:text-purple-400" }
        ].map((stat, i) => (
          <div
            key={i}
            className={`relative ${stat.bg} ${stat.border} border rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all duration-500 ${loaded ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <div className={`text-2xl font-black ${stat.text} leading-none mb-1.5`}>
              {loading ? "..." : stat.value}
            </div>
            <div className="text-[10px] font-black text-gray-500 dark:text-gray-400">
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <div
        className={`bg-indigo-50 dark:bg-gray-800 p-6 rounded-lg border border-indigo-200 dark:border-gray-700 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <h2 className="text-2xl font-bold">Available Quizzes</h2>
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="mt-2 sm:mt-0"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="mb-6 p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={filterDifficulty}
                  onChange={(e) => setFilterDifficulty(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Difficulties</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  <option value="all">All Tests</option>
                  <option value="pending">Pending</option>
                  <option value="completed">Completed</option>
                </select>
              </div>
            </div>
            {(filterDifficulty !== "all" || filterStatus !== "all") && (
              <div className="mt-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterDifficulty("all");
                    setFilterStatus("all");
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </div>
        )}
        {loading ? (
          <div className="text-center text-gray-500 dark:text-gray-400">
            Loading quizzes...
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center text-gray-500 dark:text-gray-400 py-8">
            <p className="mb-2">No quizzes available yet.</p>
            <p>
              Go to the{" "}
              <Link
                href="/dashboard?tab=generate"
                className="text-blue-500 hover:underline"
              >
                Generate
              </Link>{" "}
              page to create one.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {(() => {
              const filteredQuizzes = getFilteredQuizzes();
              const totalPages = Math.ceil(
                filteredQuizzes.length / itemsPerPage
              );
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const currentQuizzes = filteredQuizzes.slice(
                startIndex,
                endIndex
              );
              return (
                <>
                  {currentQuizzes.map((quiz) => {
                    const difficultyColors = {
                      easy: "bg-blue-50 dark:bg-gray-800 border-blue-200 dark:border-gray-700",
                      medium:
                        "bg-orange-50 dark:bg-gray-800 border-orange-200 dark:border-gray-700",
                      hard: "bg-purple-50 dark:bg-gray-800 border-purple-200 dark:border-gray-700",
                    };
                    const colorClass =
                      difficultyColors[quiz.difficulty] ||
                      "bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700";
                    return (
                      <div
                        key={quiz._id}
                        className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg border hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${colorClass}`}
                      >
                        <div className="mb-4 sm:mb-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                            {quiz.title}
                          </h3>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {quiz.course}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            <span className="flex items-center">
                              <FileText className="w-3 h-3 mr-1" />
                              {quiz.questions.length} questions
                            </span>
                            {quiz.createdAt && (
                              <span className="flex items-center">
                                <Clock className="w-3 h-3 mr-1" />
                                {new Date(quiz.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">

                          <Button
                            variant="default"
                            onClick={() => setSelectedQuiz(quiz)}
                            className={`w-full px-6 py-4 rounded-sm font-bold text-sm transition-all duration-300 hover:scale-[1.03] active:scale-95 shadow-md hover:shadow-lg flex items-center gap-2 ${quiz.difficulty === "easy"
                                ? "bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-blue-500/20"
                                : quiz.difficulty === "medium"
                                  ? "bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-orange-500/20"
                                  : quiz.difficulty === "hard"
                                    ? "bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white shadow-purple-500/20"
                                    : "bg-gradient-to-r from-gray-500 to-gray-600 hover:from-gray-600 hover:to-gray-700 text-white shadow-gray-500/20"
                              }`}
                          >
                            {(() => {
                              const completedKey = `quiz_completed_${quiz._id}`;
                              const isCompleted =
                                typeof window !== "undefined" &&
                                localStorage.getItem(completedKey);
                              return (
                                <>
                                  {isCompleted ? "Review Analysis" : "Take Assessment"}
                                </>
                              );
                            })()}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6 space-x-2">
                      <button
                        onClick={() =>
                          setCurrentPage((prev) => Math.max(prev - 1, 1))
                        }
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Previous
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`px-3 py-1 text-sm rounded ${currentPage === page
                              ? "bg-indigo-500 text-white"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                              }`}
                          >
                            {page}
                          </button>
                        )
                      )}
                      <button
                        onClick={() =>
                          setCurrentPage((prev) =>
                            Math.min(prev + 1, totalPages)
                          )
                        }
                        disabled={currentPage === totalPages}
                        className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
};

export default TestYourself;
