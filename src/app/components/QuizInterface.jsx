"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowLeft, Eye, Download } from "lucide-react";
import Link from "next/link";
import { useAuth } from "./AuthProvider";
import { downloadQuizAsPDF } from "@/lib/pdfUtils";
import { authenticatedFetch } from "../lib/apiConfig";

const QuizInterface = ({ quizData, topic, onBack, existingQuizId }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedQuestions, setLoadedQuestions] = useState([]);
  const [totalQuestions, setTotalQuestions] = useState(10);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [questionsVisible, setQuestionsVisible] = useState(false);

  const questionsPerPage = 10;

  // Check if quiz was already completed
  useEffect(() => {
    const quizId = existingQuizId || quizData._id;
    if (quizId) {
      const completedKey = `quiz_completed_${quizId}`;
      const savedScore = localStorage.getItem(completedKey);
      if (savedScore) {
        setScore(parseInt(savedScore));
        setSubmitted(true);
        setIsReviewMode(true);
      }
    }
    setLoaded(true);
  }, [quizData._id, existingQuizId]);

  // Initialize questions and timer
  useEffect(() => {
    if (quizData.questions && quizData.questions.length > 0) {
      // Load first 10 questions
      const initialQuestions = quizData.questions.slice(0, questionsPerPage);
      setLoadedQuestions(initialQuestions);
      setTotalQuestions(quizData.questions.length);

      // Set timer: 2 minutes per question
      const totalTime = quizData.questions.length * 2 * 60; // 2 minutes per question in seconds
      setTimeRemaining(totalTime);
      setTimerActive(true);
    }
  }, [quizData.questions]);

  // Timer countdown
  useEffect(() => {
    let interval;
    if (timerActive && timeRemaining > 0 && !submitted) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Auto-submit when time runs out
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerActive, timeRemaining, submitted]);

  // Fade in questions when loaded
  useEffect(() => {
    if (loadedQuestions.length > 0) {
      setQuestionsVisible(false);
      const timer = setTimeout(() => setQuestionsVisible(true), 50);
      return () => clearTimeout(timer);
    }
  }, [loadedQuestions]);

  const handleAnswerChange = (cardId, answer) => {
    setAnswers((prev) => ({ ...prev, [cardId]: answer }));
  };

  // Load questions for a specific page (lazy loading simulation)
  const loadQuestionsForPage = async (page) => {
    const startIndex = (page - 1) * questionsPerPage;
    const endIndex = Math.min(startIndex + questionsPerPage, totalQuestions);

    // If we already have these questions loaded, just return
    if (loadedQuestions.length >= endIndex) {
      return;
    }

    // For now, simulate lazy loading from pre-generated questions
    // In production, this would make an API call to generate more questions
    if (quizData.questions && quizData.questions.length >= endIndex) {
      setIsLoadingQuestions(true);
      // Simulate API delay for lazy loading effect
      await new Promise((resolve) => setTimeout(resolve, 800));

      const newQuestions = quizData.questions.slice(
        loadedQuestions.length,
        endIndex
      );
      setLoadedQuestions((prev) => [...prev, ...newQuestions]);
      setIsLoadingQuestions(false);
    }
  };

  // Handle page change
  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    loadQuestionsForPage(newPage);
  };

  // Get current page questions
  const getCurrentPageQuestions = () => {
    const startIndex = (currentPage - 1) * questionsPerPage;
    const endIndex = startIndex + questionsPerPage;
    return loadedQuestions.slice(startIndex, endIndex);
  };

  // Format time remaining
  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${minutes}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSubmit = async () => {
    let totalScore = 0;
    loadedQuestions.forEach((card) => {
      const userAnswer = answers[card._id];
      if (JSON.stringify(userAnswer) === JSON.stringify(card.correctAnswer)) {
        totalScore += card.points;
      }
    });
    setScore(totalScore);
    setSubmitted(true);
    setIsReviewMode(true);
    setTimerActive(false);

    // Save completion status
    const quizId = existingQuizId || quizData._id;
    if (quizId) {
      const completedKey = `quiz_completed_${quizId}`;
      localStorage.setItem(completedKey, totalScore.toString());
    }

    // Save performance data to database (non-blocking)
    if (
      quizId &&
      typeof quizId === "string" &&
      quizId.length > 0 &&
      /^[a-f\d]{24}$/i.test(quizId)
    ) {
      console.log("Saving performance for quiz ID:", quizId);
      // Don't await this - make it non-blocking so quiz completion isn't delayed
      authenticatedFetch(`/api/quizzes/${quizId}/performance`, {
        method: "POST",
        body: JSON.stringify({
          score: totalScore,
          totalMarks: loadedQuestions.reduce(
            (acc, card) => acc + card.points,
            0
          ),
          answers,
        }),
      })
        .then(async (response) => {
          if (response.ok) {
            console.log("Performance data saved successfully");
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error(
              "Failed to save performance data:",
              response.status,
              response.statusText,
              errorData
            );
          }
        })
        .catch((error) => {
          console.error("Error saving performance:", error);
        });
    } else {
      console.warn(
        "Quiz ID not available or invalid, skipping performance save"
      );
    }

    toast.success(`Test completed! Your score is ${totalScore}.`);
  };

  const handleRetake = () => {
    setAnswers({});
    setSubmitted(false);
    setIsReviewMode(false);
    setScore(0);
    setCurrentPage(1);
    setLoadedQuestions(quizData.questions.slice(0, questionsPerPage));
    setTotalQuestions(quizData.questions.length);
    const totalTime = quizData.questions.length * 2 * 60; // 2 minutes per question in seconds
    setTimeRemaining(totalTime);
    setTimerActive(true);
    if (quizData._id) {
      const completedKey = `quiz_completed_${quizData._id}`;
      localStorage.removeItem(completedKey);
    }
  };

  if (!quizData || !quizData.questions) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading test...</p>
      </div>
    );
  }

  const totalMarks = quizData.questions.reduce((acc, q) => acc + q.points, 0);

  return (
    <div
      className={`p-4 sm:p-8 lg:p-12 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen transition-opacity duration-700 pb-32 pb-safe-bottom pt-safe-top ${loaded ? "opacity-100" : "opacity-0"}`}
    >
      <div className="max-w-3xl mx-auto">
        {onBack ? (
          <button
            onClick={onBack}
            className="flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>
        ) : (
          <Link
            href="/dashboard?tab=quizzes"
            className="flex items-center text-sm text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        )}

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
            {quizData.title}
          </h1>

          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-gray-400 tracking-wider mb-1">Questions</span>
              <div className="text-xl font-bold text-gray-900 dark:text-white">
                {loadedQuestions.length}<span className="text-gray-400 text-sm font-normal">/{totalQuestions}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-gray-400 tracking-wider mb-1">Points</span>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">
                {loadedQuestions.reduce((acc, q) => acc + q.points, 0)}
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-gray-400 tracking-wider mb-1">Answered</span>
              <div className="text-xl font-bold text-green-600 dark:text-green-400">
                {Object.keys(answers).length}<span className="text-gray-400 text-sm font-normal">/{loadedQuestions.length}</span>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
              <span className="text-xs font-semibold text-gray-400 tracking-wider mb-1">Time Left</span>
              <div
                className={`text-xl font-bold font-mono ${timeRemaining < 300 ? "text-red-500 animate-pulse" : "text-gray-900 dark:text-white"}`}
              >
                {formatTime(timeRemaining)}
              </div>
            </div>
          </div>

          <div className="w-full my-10">
            <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400 mb-3">
              <span className="font-bold">Progress (Page {currentPage}/{Math.ceil(totalQuestions / questionsPerPage)})</span>
              <span className="font-bold">
                {Math.round(
                  (Object.keys(answers).length / loadedQuestions.length) * 100
                )}
                %
              </span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${(Object.keys(answers).length / loadedQuestions.length) * 100}%`,
                }}
              ></div>
            </div>
          </div>
        </div>
        <Card className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-sm">
          <CardContent className="space-y-12">
            <div className="space-y-10">
              {getCurrentPageQuestions().map((q, index) => {
                const globalIndex =
                  (currentPage - 1) * questionsPerPage + index;
                return (
                  <div
                    key={`question-${globalIndex}`}
                    className={`sm:p-4 bg-white dark:bg-gray-800/50 transition-opacity duration-500 ${questionsVisible ? "opacity-100" : "opacity-0"}`}
                  >
                    <div className="flex items-start space-x-4 mb-6">
                      <div className="flex-shrink-0 w-fit flex items-center justify-center text-white font-bold">
                        {globalIndex + 1}.
                      </div>
                      <div className="flex-1">
                        <h3 className="text-md font-normal text-slate-800 dark:text-slate-100 leading-relaxed mb-2 select-none">
                          {q.text}
                        </h3>
                        <div className="flex items-center space-x-2 text-sm text-slate-500 dark:text-slate-400">
                          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-700 rounded-full font-medium">
                            {q.points} point{q.points !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    </div>
                    {q.type === "multiple-choice" ? (
                      <RadioGroup
                        onValueChange={(value) =>
                          handleAnswerChange(q._id, value)
                        }
                        disabled={submitted}
                        className="space-y-3"
                      >
                        {q.options.map((option, optIndex) => (
                          <div
                            key={option}
                            className="text-sm flex items-center space-x-2 p-2 rounded-sm border-1 border-slate-200 dark:border-slate-600 hover:border-blue-300 dark:hover:border-blue-500 transition-all duration-200 group cursor-pointer"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`${q._id}-${option}`}
                              className="w-5 h-5 text-blue-600"
                            />
                            <Label
                              htmlFor={`${q._id}-${option}`}
                              className="flex-1 cursor-pointer text-slate-700 dark:text-slate-300 text-[14px] leading-relaxed group-hover:text-slate-900 dark:group-hover:text-slate-100 select-none px-2"
                            >
                              <span className="font-bold mr-2 text-slate-500 dark:text-slate-400">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : q.type === "true-false" ? (
                      <RadioGroup
                        onValueChange={(value) =>
                          handleAnswerChange(q._id, value)
                        }
                        disabled={submitted}
                        className="space-y-3"
                      >
                        {q.options.map((option, optIndex) => (
                          <div
                            key={option}
                            className="flex items-center space-x-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-green-300 dark:hover:border-green-500 transition-all duration-200 group cursor-pointer"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`${q._id}-${option}`}
                              className="w-5 h-5 text-green-600"
                            />
                            <Label
                              htmlFor={`${q._id}-${option}`}
                              className="flex-1 cursor-pointer text-slate-700 dark:text-slate-300 text-[14px] leading-relaxed group-hover:text-slate-900 dark:group-hover:text-slate-100 select-none px-2"
                            >
                              <span className="font-bold mr-2 text-slate-500 dark:text-slate-400">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {option}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : (
                      <div className="space-y-3">
                        {q.options.map((option, optIndex) => (
                          <div
                            key={option}
                            className="flex items-center space-x-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600 hover:border-purple-300 dark:hover:border-purple-500 transition-all duration-200 group cursor-pointer"
                          >
                            <Checkbox
                              id={`${q._id}-${option}`}
                              onCheckedChange={(checked) => {
                                const currentAnswers = answers[q._id] || [];
                                const newAnswers = checked
                                  ? [...currentAnswers, option]
                                  : currentAnswers.filter((a) => a !== option);
                                handleAnswerChange(q._id, newAnswers);
                              }}
                              disabled={submitted}
                              className="w-5 h-5 text-purple-600"
                            />
                            <Label
                              htmlFor={`${q._id}-${option}`}
                              className="flex-1 cursor-pointer text-slate-700 dark:text-slate-300 text-[14px] leading-relaxed group-hover:text-slate-900 dark:group-hover:text-slate-100 select-none px-2"
                            >
                              <span className="font-bold mr-2 text-slate-500 dark:text-slate-400">
                                {String.fromCharCode(65 + optIndex)}.
                              </span>
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    {submitted && isReviewMode && (
                      <div className="mt-4 px-2">
                        {JSON.stringify(answers[q._id]) ===
                          JSON.stringify(q.correctAnswer) ? (
                          <div className="flex items-center text-green-600 dark:text-green-400 space-x-2">
                            <CheckCircle className="w-5 h-5" />
                            <span className="font-bold">Correct!</span>
                          </div>
                        ) : (
                          <div className="flex items-start text-red-600 dark:text-red-400 space-x-2">
                            <XCircle className="w-5 h-5 mt-0.5" />
                            <div>
                              <span className="font-bold">Incorrect.</span>
                              <div className="text-gray-500 dark:text-gray-400 mt-1 text-xs">
                                Correct answer:{" "}
                                <span className="text-slate-700 dark:text-slate-300 font-medium">
                                  {Array.isArray(q.correctAnswer)
                                    ? q.correctAnswer.join(", ")
                                    : q.correctAnswer}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {submitted ? (
              <div className="mt-8 text-center">
                <h2 className="text-2xl font-bold">Test Complete!</h2>
                <p className="text-xl mt-2">
                  Your score:{" "}
                  <span className="font-bold text-blue-500">{score}</span> /{" "}
                  {totalMarks}
                </p>
                <div className="flex flex-col sm:flex-row flex-wrap gap-4 justify-center mt-10">
                  <Button
                    onClick={handleRetake}
                    variant="outline"
                    className="flex-1 min-w-[140px] px-4 py-2 rounded-sm border-2 border-slate-200 font-bold hover:bg-slate-50 transition-all active:scale-95"
                  >
                    Retake Test
                  </Button>
                  <Button
                    onClick={() => downloadQuizAsPDF(quizData)}
                    variant="secondary"
                    className="flex-1 min-w-[140px] px-4 py-2 rounded-sm bg-indigo-600 hover:bg-indigo-700 text-white border-none transition-all shadow-md hover:shadow-lg active:scale-95 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Exam
                  </Button>
                  <Button
                    onClick={() => setIsReviewMode(!isReviewMode)}
                    variant="default"
                    className="flex-1 min-w-[140px] px-4 py-2 rounded-sm bg-slate-900 dark:bg-slate-800 text-white hover:bg-slate-800 dark:hover:bg-slate-700 transition-all active:scale-95 flex items-center justify-center gap-2"
                  >
                    {isReviewMode ? <XCircle className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    {isReviewMode ? "Hide Review" : "Review Answers"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Pagination Controls */}
                <div className="flex justify-center items-center space-x-4">
                  <Button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1 || isLoadingQuestions}
                    variant="outline"
                    size="sm"
                  >
                    Previous
                  </Button>

                  <div className="flex space-x-2">
                    {Array.from(
                      { length: Math.ceil(totalQuestions / questionsPerPage) },
                      (_, i) => i + 1
                    ).map((page) => (
                      <Button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        disabled={isLoadingQuestions}
                        className="w-10 h-10"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>

                  <Button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={
                      currentPage ===
                      Math.ceil(totalQuestions / questionsPerPage) ||
                      isLoadingQuestions
                    }
                    variant="outline"
                    size="sm"
                  >
                    Next
                  </Button>
                </div>

                {isLoadingQuestions && (
                  <div className="space-y-10">
                    {[...Array(3)].map((_, index) => (
                      <div
                        key={`skeleton-${index}`}
                        className="p-8 bg-white dark:bg-gray-800/50 rounded-2xl border border-slate-200/50 dark:border-gray-700 animate-pulse"
                      >
                        <div className="flex items-start space-x-4 mb-6">
                          <div className="flex-shrink-0 w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                          <div className="flex-1">
                            <div className="h-5 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
                            <div className="flex items-center space-x-2">
                              <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                              <div className="h-6 w-20 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-3">
                          {[...Array(4)].map((_, optIndex) => (
                            <div
                              key={optIndex}
                              className="flex items-center space-x-4 p-4 rounded-xl border-2 border-slate-200 dark:border-slate-600"
                            >
                              <div className="w-5 h-5 bg-gray-300 dark:bg-gray-600 rounded"></div>
                              <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Submit/Cancel Buttons */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 sm:gap-6 mt-12 pb-8">
                  <Button
                    onClick={onBack || (() => window.history.back())}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto px-12 py-2 text-lg border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-200 rounded-xl font-bold text-slate-600 active:scale-95"
                  >
                    Cancel Quiz
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    size="lg"
                    className="w-full sm:w-auto px-12 py-2 text-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:shadow-xl transition-all duration-200 rounded-xl font-bold active:scale-95 shadow-lg shadow-blue-500/20"
                  >
                    Submit Assessment
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuizInterface;
