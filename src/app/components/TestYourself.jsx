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
import { getApiUrl } from "../lib/apiConfig";

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
        const response = await fetch(getApiUrl("/api/quizzes"), {
          credentials: "include",
        });
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
      const response = await fetch(getApiUrl(`/api/quizzes/${quizId}`), {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Quiz deleted successfully");
        // Refresh the quizzes list
        const response = await fetch(getApiUrl("/api/quizzes"));
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
        <h1 className="text-4xl font-bold tracking-tight flex items-center">
          <BrainCircuit className="w-8 h-8 mr-3 text-blue-500" />
          Test Your Knowledge
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
          Challenge yourself with quizzes on various topics.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card
          className={`bg-blue-50 dark:bg-gray-800 border border-blue-200 dark:border-gray-700 shadow-none py-3 gap-3 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-blue-600 dark:text-gray-400">
              Total Tests
            </CardTitle>
            <HelpCircle className="w-6 h-6 text-blue-500 dark:text-gray-500" />
          </CardHeader>
          <CardContent className="flex flex-row items-center justify-between">
            <div className="text-2xl font-bold text-blue-600">
              {loading ? "..." : quizzes.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Assignments & Quizzes
            </p>
          </CardContent>
        </Card>
        <Card
          className={`bg-yellow-50 dark:bg-gray-800 border border-yellow-200 dark:border-gray-700 shadow-none py-3 gap-3 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-yellow-600 dark:text-gray-400">
              Pending
            </CardTitle>
            <Clock className="w-6 h-6 text-yellow-500 dark:text-gray-500" />
          </CardHeader>
          <CardContent className="flex flex-row items-center justify-between">
            <div className="text-2xl font-bold text-yellow-600">
              {loading ? "..." : quizzes.length}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Need completion
            </p>
          </CardContent>
        </Card>
        <Card
          className={`bg-green-50 dark:bg-gray-800 border border-green-200 dark:border-gray-700 shadow-none py-3 gap-3 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-gray-400">
              Completed Tests
            </CardTitle>
            <CheckCircle className="w-6 h-6 text-green-500 dark:text-gray-500" />
          </CardHeader>
          <CardContent className="flex flex-row items-center justify-between">
            <div className="text-2xl font-bold text-green-600">
              {loading ? "..." : performanceStats?.completedTests || 0}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Out of {performanceStats?.totalTests || 0} tests
            </p>
          </CardContent>
        </Card>
        <Card
          className={`bg-purple-50 dark:bg-gray-800 border border-purple-200 dark:border-gray-700 shadow-none py-3 gap-3 transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0"}`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-1">
            <CardTitle className="text-sm font-medium text-purple-600 dark:text-gray-400">
              Average Score
            </CardTitle>
            <Award className="w-6 h-6 text-purple-500 dark:text-gray-500" />
          </CardHeader>
          <CardContent className="flex flex-row items-center justify-between">
            <div className="text-2xl font-bold text-purple-600">
              {loading ? "..." : `${performanceStats?.averageScore || 0}%`}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Across all completed tests
            </p>
          </CardContent>
        </Card>
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
                            className={`${quiz.difficulty === "easy"
                              ? "bg-blue-500 hover:bg-blue-600 text-white"
                              : quiz.difficulty === "medium"
                                ? "bg-orange-500 hover:bg-orange-600 text-white"
                                : quiz.difficulty === "hard"
                                  ? "bg-purple-500 hover:bg-purple-600 text-white"
                                  : "bg-gray-500 hover:bg-gray-600 text-white"
                              }`}
                          >
                            {(() => {
                              const completedKey = `quiz_completed_${quiz._id}`;
                              const isCompleted =
                                typeof window !== "undefined" &&
                                localStorage.getItem(completedKey);
                              return isCompleted ? "Review Test" : "Take Test";
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
