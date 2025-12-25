"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import Link from "next/link";

import { useSearchParams } from "next/navigation";
import { getApiUrl } from "@/lib/apiConfig";

const TakeQuizPageContent = () => {
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        if (!id) return;
        const response = await fetch(getApiUrl(`/api/quizzes/${id}`));
        if (response.ok) {
          const data = await response.json();
          setQuiz(data);
        } else {
          toast.error("Failed to load quiz.");
        }
      } catch (error) {
        toast.error("An error occurred while fetching the quiz.");
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleAnswerChange = (questionId, answer) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = () => {
    let totalScore = 0;
    quiz.questions.forEach((q) => {
      const userAnswer = answers[q._id];
      if (JSON.stringify(userAnswer) === JSON.stringify(q.correctAnswer)) {
        totalScore += q.points;
      }
    });
    setScore(totalScore);
    setSubmitted(true);
    toast.success(`Quiz submitted! Your score is ${totalScore}.`);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading quiz...</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <p className="text-red-500">Could not load the quiz.</p>
      </div>
    );
  }

  const totalMarks = quiz.questions.reduce((acc, q) => acc + q.points, 0);

  return (
    <div className="p-4 sm:p-8 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <div className="max-w-4xl mx-auto">
        <Link
          href="/dashboard?tab=quizzes"
          className="flex items-center text-sm text-blue-500 hover:underline mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Quizzes
        </Link>
        <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">{quiz.title}</CardTitle>
            <div className="flex justify-between text-gray-500 dark:text-gray-400 mt-2">
              <span>{quiz.course}</span>
              <span>Total Marks: {totalMarks}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {quiz.questions.map((q, index) => (
                <div
                  key={q._id}
                  className="p-4 border-t border-gray-200 dark:border-gray-700"
                >
                  <h3 className="text-lg font-semibold mb-4">
                    {index + 1}. {q.text}{" "}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400">
                      ({q.points} points)
                    </span>
                  </h3>

                  {q.type === "multiple-choice" && (
                    <RadioGroup
                      onValueChange={(value) =>
                        handleAnswerChange(q._id, value)
                      }
                      disabled={submitted}
                    >
                      {q.options.map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-3 my-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 has-[:checked]:bg-blue-50 has-[:checked]:dark:bg-blue-900/20 has-[:checked]:border-blue-500"
                        >
                          <RadioGroupItem
                            value={option}
                            id={`${q._id}-${option}`}
                          />
                          <Label
                            htmlFor={`${q._id}-${option}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {q.type === "true-false" && (
                    <RadioGroup
                      onValueChange={(value) =>
                        handleAnswerChange(q._id, value)
                      }
                      disabled={submitted}
                    >
                      {q.options.map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-3 my-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 has-[:checked]:bg-blue-50 has-[:checked]:dark:bg-blue-900/20 has-[:checked]:border-blue-500"
                        >
                          <RadioGroupItem
                            value={option}
                            id={`${q._id}-${option}`}
                          />
                          <Label
                            htmlFor={`${q._id}-${option}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  )}

                  {q.type === "multiple-select" && (
                    <div className="space-y-2">
                      {q.options.map((option) => (
                        <div
                          key={option}
                          className="flex items-center space-x-3 my-2 p-3 rounded-lg border border-gray-200 dark:border-gray-600 has-[:checked]:bg-blue-50 has-[:checked]:dark:bg-blue-900/20 has-[:checked]:border-blue-500"
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
                          />
                          <Label
                            htmlFor={`${q._id}-${option}`}
                            className="flex-1 cursor-pointer"
                          >
                            {option}
                          </Label>
                        </div>
                      ))}
                    </div>
                  )}

                  {submitted && (
                    <div className="mt-4 p-3 rounded-lg text-sm">
                      {JSON.stringify(answers[q._id]) ===
                        JSON.stringify(q.correctAnswer) ? (
                        <div className="flex items-center text-green-600 dark:text-green-400">
                          <CheckCircle className="w-5 h-5 mr-2" />
                          Correct!
                        </div>
                      ) : (
                        <div className="flex items-center text-red-600 dark:text-red-400">
                          <XCircle className="w-5 h-5 mr-2" />
                          Incorrect. Correct answer:{" "}
                          {Array.isArray(q.correctAnswer)
                            ? q.correctAnswer.join(", ")
                            : q.correctAnswer}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {submitted ? (
              <div className="mt-8 text-center">
                <h2 className="text-2xl font-bold">Quiz Complete!</h2>
                <p className="text-xl mt-2">
                  Your score:{" "}
                  <span className="font-bold text-blue-500">{score}</span> /{" "}
                  {totalMarks}
                </p>
                <Button
                  onClick={() => window.location.reload()}
                  className="mt-6"
                >
                  Try Again
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex justify-end space-x-4">
                <Link href="/dashboard?tab=quizzes">
                  <Button variant="outline">Cancel</Button>
                </Link>
                <Button onClick={handleSubmit}>Submit Quiz</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const TakeQuizPage = () => {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Loading quiz...</div>}>
      <TakeQuizPageContent />
    </React.Suspense>
  );
};

export default TakeQuizPage;
