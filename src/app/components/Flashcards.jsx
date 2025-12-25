"use client";

import { useState, useEffect } from "react";
import {
  BookOpen,
  Lightbulb,
  AlertCircle,
  CheckCircle,
  Flame,
  Brain,
  Zap,
  Plus,
  Crown,
  X,
  Sparkles,
} from "lucide-react";
import { useAuth } from "./AuthProvider";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function Flashcards({ cardData }) {
  const [flipped, setFlipped] = useState({});
  const [studyCards, setStudyCards] = useState([]);
  const [activeFilter, setActiveFilter] = useState(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (cardData?.cards) {
      setStudyCards(cardData.cards);
    } else if (cardData?._id) {
      // Fetch the cards if not provided
      fetch(`/api/flashcards/${cardData._id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && data.cards) {
            setStudyCards(data.cards);
          }
        })
        .catch(console.error);
    }
  }, [cardData]);

  const categoryIcons = {
    concept: <BookOpen size={20} className="text-blue-400" />,
    tip: <Lightbulb size={20} className="text-cyan-400" />,
    warning: <AlertCircle size={20} className="text-amber-400" />,
    practice: <CheckCircle size={20} className="text-emerald-400" />,
  };

  const categoryColors = {
    concept: "from-blue-900/40 to-blue-900/20 border-blue-700/50",
    tip: "from-cyan-900/40 to-cyan-900/20 border-cyan-700/50",
    warning: "from-amber-900/40 to-amber-900/20 border-amber-700/50",
    practice: "from-emerald-900/40 to-emerald-900/20 border-emerald-700/50",
  };

  const categoryBadge = {
    concept: "bg-blue-900/60 text-blue-300 border border-blue-600/60",
    tip: "bg-cyan-900/60 text-cyan-300 border border-cyan-600/60",
    warning: "bg-amber-900/60 text-amber-300 border border-amber-600/60",
    practice: "bg-emerald-900/60 text-emerald-300 border border-emerald-600/60",
  };

  const difficultyConfig = {
    beginner: {
      label: "Beginner",
      icon: <BookOpen size={14} />,
      color: "text-blue-300",
    },
    intermediate: {
      label: "Intermediate",
      icon: <Zap size={14} />,
      color: "text-cyan-300",
    },
    advanced: {
      label: "Advanced",
      icon: <Flame size={14} />,
      color: "text-purple-300",
    },
  };

  const handleGenerateMore = async () => {
    const isPremium =
      user?.isPremium ||
      (user?.subscription?.plan === "pro" &&
        user?.subscription?.status === "active");

    if (!isPremium) {
      // Free users: limit to 8 cards
      if (studyCards.length >= 8) {
        setShowUpgradeModal(true);
        return;
      }
    } else {
      // Pro users: limit to 60 cards
      if (studyCards.length >= 60) {
        toast.error("You've reached the maximum of 60 cards for this set");
        return;
      }
    }

    setIsGeneratingMore(true);
    try {
      const maxCards = isPremium ? 60 : 8;
      const increment = isPremium ? 15 : 8; // Pro: 15 more, Free: up to 8 total
      const additionalCards = Math.min(increment, maxCards - studyCards.length);

      const genRes = await fetch("/api/generate-flashcards", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: cardData.topic || cardData.title,
          difficulty: cardData.level || "beginner",
          existingCardSetId: cardData._id,
          additionalCards: additionalCards,
          existingCardCount: studyCards.length,
        }),
      });

      if (!genRes.ok) {
        const errorData = await genRes.json().catch(() => ({}));
        throw new Error(
          `Failed to generate more cards: ${genRes.status} ${errorData.error || errorData.details || ""}`
        );
      }

      const generated = await genRes.json();

      // Add new cards to existing set
      if (generated.cards && Array.isArray(generated.cards)) {
        setStudyCards((prevCards) => [...prevCards, ...generated.cards]);
        toast.success(`Generated ${generated.cards.length} more cards!`);
        // Scroll to the new cards
        setTimeout(() => {
          window.scrollTo({
            top: document.body.scrollHeight,
            behavior: "smooth",
          });
        }, 500);
      } else if (generated.success) {
        // For existing set updates, refresh the cards from the API
        try {
          const refreshRes = await fetch(`/api/flashcards/${cardData._id}`);
          if (refreshRes.ok) {
            const refreshData = await refreshRes.json();
            setStudyCards(refreshData.cards || []);
            toast.success(`Generated ${additionalCards} more cards!`);
          }
        } catch (refreshError) {
          console.error("Failed to refresh cards:", refreshError);
          toast.success("Cards generated successfully!");
        }
      }
    } catch (e) {
      console.error("Generate more cards error:", e);
      toast.error(`Failed to generate more cards: ${e.message}`);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const filteredCards = activeFilter
    ? studyCards.filter((card) => card.category === activeFilter)
    : studyCards;
  const totalCards = filteredCards.length;
  const conceptCards = studyCards.filter(
    (c) => c.category === "concept"
  ).length;
  const tipCards = studyCards.filter((c) => c.category === "tip").length;
  const warningCards = studyCards.filter(
    (c) => c.category === "warning"
  ).length;
  const practiceCards = studyCards.filter(
    (c) => c.category === "practice"
  ).length;

  const toggleFlip = (id) => {
    setFlipped((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const resetAll = () => {
    setFlipped({});
  };

  const renderFormattedText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*|`[^`]+`)/g);
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const boldContent = part.slice(2, -2);
        return (
          <strong key={index} className="font-semibold">
            {boldContent}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        const codeContent = part.slice(1, -1);
        return (
          <code
            key={index}
            className="bg-slate-100 dark:bg-slate-800/50 px-1.5 py-0.5 rounded text-xs font-mono text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 backdrop-blur-sm"
          >
            {codeContent}
          </code>
        );
      }
      return part;
    });
  };

  if (!cardData) {
    return (
      <section className="px-4 py-8 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 min-h-screen">
        <div className="mx-auto max-w-7xl">
          {/* Centered Title and Description Skeleton */}
          <div className="text-center mb-12">
            <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-96 mx-auto mb-3 animate-pulse"></div>
            <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-[600px] mx-auto animate-pulse"></div>
          </div>

          {/* Cards Window Skeleton */}
          <div className="bg-gray-50 dark:bg-slate-800 rounded-2xl p-8 mb-8">
            <div className="flex flex-wrap gap-3 mb-6 justify-center">
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-24 animate-pulse"></div>
            </div>

            {/* Question Grid Skeleton */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
              {[...Array(8)].map((_, index) => (
                <div
                  key={index}
                  className="h-96 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl p-6 animate-pulse"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-xl"></div>
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
                  </div>
                  <div className="space-y-3 flex-1">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24"></div>
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                  </div>
                  <div className="mt-auto">
                    <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded-lg w-full"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Generate More Section Skeleton */}
          <div className="mb-8">
            <div className="h-12 bg-gray-300 dark:bg-gray-600 rounded-lg w-full animate-pulse"></div>
          </div>

          {/* Study Tips Section Skeleton */}
          <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800/50">
            <div className="flex gap-4">
              <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-64 animate-pulse"></div>
                <div className="space-y-2">
                  {[...Array(4)].map((_, index) => (
                    <div key={index} className="flex gap-3">
                      <div className="w-4 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                      <div className="flex-1 h-4 bg-gray-300 dark:bg-gray-600 rounded animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="px-4 py-8 sm:px-6 lg:px-8 bg-white dark:bg-slate-900 min-h-screen">
      <div className="mx-auto max-w-7xl">
        {/* Centered Title and Description */}
        <div className="text-center mb-6">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-3 text-balance">
            {cardData.title}
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 text-balance max-w-3xl mx-auto">
            Master key concepts with interactive flashcards. Click each card to
            reveal detailed answers with explanations, key points, and
            real-world examples.
          </p>
        </div>

        {/* Cards Window */}
        <div className="bg-slate-50/50 dark:bg-slate-900/50 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-3xl p-8 mb-8">
          <div className="flex flex-wrap gap-3 mb-6 justify-center">
            <button
              onClick={resetAll}
              className="px-6 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-750 transition-all"
            >
              Reset All Progress
            </button>
            <div className="text-sm text-slate-600 dark:text-slate-400 flex items-center gap-2 px-6 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {totalCards}
              </span>{" "}
              Concepts Found
            </div>
          </div>

          {/* Question Grid */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mb-6">
            {studyCards
              .filter((card) => !activeFilter || card.category === activeFilter)
              .map((card) => (
                <div
                  key={card.id}
                  onClick={() => toggleFlip(card.id)}
                  className="relative h-96 cursor-pointer transition-transform duration-500 perspective"
                  style={{
                    transformStyle: "preserve-3d",
                    transform: flipped[card.id]
                      ? "rotateY(180deg)"
                      : "rotateY(0deg)",
                  }}
                >
                  {/* Front of card */}
                  <div
                    className={`absolute inset-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-300 hover:border-blue-500/50 h-full ${flipped[card.id] ? "hidden" : ""}`}
                    style={{ backfaceVisibility: "hidden" }}
                  >
                    {/* Header Section */}
                    <div className="space-y-3 flex-shrink-0">
                      <div className="flex items-start justify-between">
                        <div className="text-2xl bg-gradient-to-tr from-blue-500 to-indigo-600 bg-clip-text text-transparent opacity-80">
                          ✦
                        </div>
                        <div
                          className={`flex items-center gap-1 text-xs font-medium ${difficultyConfig[card.difficulty]?.color || "text-gray-300"}`}
                        >
                          {difficultyConfig[card.difficulty]?.icon || (
                            <Zap size={14} />
                          )}
                          {difficultyConfig[card.difficulty]?.label ||
                            card.difficulty}
                        </div>
                      </div>

                      <div className="min-h-0 flex-1 overflow-hidden">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-widest font-semibold">
                          {card.topic}
                        </p>
                        <h3 className="text-lg sm:text-xl text-gray-900 dark:text-white leading-tight line-clamp-4 sm:line-clamp-6 overflow-hidden">
                          {renderFormattedText(card.question)}
                        </h3>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-center gap-2 text-xs font-bold text-white bg-blue-600 rounded-xl px-4 py-3 flex-shrink-0 transition-all group-hover:bg-blue-700">
                      <Zap size={14} className="fill-current" />
                      <span>Flip to Master</span>
                    </div>
                  </div>

                  {/* Back of card */}
                  <div
                    className={`absolute inset-0 bg-slate-50 dark:bg-slate-950 border border-blue-500/30 dark:border-blue-500/20 rounded-3xl p-6 sm:p-8 flex flex-col transition-all h-full ${!flipped[card.id] ? "hidden" : ""}`}
                    style={{
                      backfaceVisibility: "hidden",
                      transform: "rotateY(180deg)",
                    }}
                  >
                    {/* Answer Section */}
                    <div
                      className="flex-1 overflow-y-auto space-y-4 pr-2"
                      style={{
                        scrollbarWidth: "thin",
                        scrollbarColor: "#cbd5e1 #f1f5f9",
                      }}
                    >
                      <style jsx>{`
                        div::-webkit-scrollbar {
                          width: 4px;
                        }
                        div::-webkit-scrollbar-track {
                          background: #f1f5f9;
                          border-radius: 2px;
                        }
                        div::-webkit-scrollbar-thumb {
                          background: #cbd5e1;
                          border-radius: 2px;
                        }
                        div::-webkit-scrollbar-thumb:hover {
                          background: #94a3b8;
                        }
                      `}</style>
                      <div className="flex items-center gap-2 pb-3 border-b border-gray-200 dark:border-slate-600 flex-shrink-0">
                        <Brain
                          size={18}
                          className="text-cyan-500 dark:text-cyan-400 flex-shrink-0"
                        />
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                          Main Answer
                        </span>
                      </div>

                      <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed font-medium">
                        {renderFormattedText(card.answer)}
                      </div>

                      {card.explanation && (
                        <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-slate-600">
                          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
                            Why This Matters
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                            {card.explanation}
                          </p>
                        </div>
                      )}

                      {card.keyPoints && card.keyPoints.length > 0 && (
                        <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-slate-600">
                          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
                            Key Points
                          </p>
                          <ul className="space-y-1">
                            {card.keyPoints.map((point, idx) => (
                              <li
                                key={idx}
                                className="text-xs text-gray-700 dark:text-gray-300 flex gap-2"
                              >
                                <span className="text-blue-500 dark:text-blue-400 flex-shrink-0">
                                  •
                                </span>
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {card.example && (
                        <div className="space-y-2 pt-3 border-t border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
                          <p className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 uppercase tracking-wide">
                            Example
                          </p>
                          <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-mono break-words">
                            {card.example}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Back footer */}
                    <div className="flex items-center justify-center gap-2 text-xs text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-slate-800 rounded-lg px-3 py-2 mt-4 border border-gray-200 dark:border-slate-600 flex-shrink-0">
                      <Zap size={14} />
                      <span>Click to see question</span>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Generate More Section */}
        <div className="mb-8">
          <button
            onClick={handleGenerateMore}
            disabled={isGeneratingMore}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-2 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isGeneratingMore ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate more cards</span>
              </>
            )}
          </button>
        </div>

        {/* Study Tips Section */}
        <div className="p-6 rounded-xl bg-gradient-to-br from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20 border border-cyan-200 dark:border-cyan-800/50">
          <div className="flex gap-4">
            <Lightbulb
              size={24}
              className="text-cyan-600 dark:text-cyan-400 flex-shrink-0 mt-1"
            />
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">
                Study Tips for Maximum Learning
              </h3>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
                <li className="flex gap-3">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                    1.
                  </span>
                  <span>
                    <strong>Spaced Repetition:</strong> Review cards regularly
                    to reinforce memory and move knowledge to long-term
                    retention
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                    2.
                  </span>
                  <span>
                    <strong>Active Recall:</strong> Try to answer before
                    flipping the card. This strengthens memory pathways.
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                    3.
                  </span>
                  <span>
                    <strong>Deep Understanding:</strong> Read explanations and
                    examples to understand the "why" behind concepts
                  </span>
                </li>
                <li className="flex gap-3">
                  <span className="text-cyan-600 dark:text-cyan-400 font-bold flex-shrink-0">
                    4.
                  </span>
                  <span>
                    <strong>Practice:</strong> Work on practice cards first to
                    identify weak areas, then focus on those
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Upgrade Modal */}
        {showUpgradeModal && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl w-full max-w-2xl h-1/2 flex flex-col shadow-2xl">
              <div className="flex justify-between items-center p-6 border-b border-white/20">
                <h3 className="text-2xl font-bold text-white">
                  Upgrade to Pro
                </h3>
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="text-white/70 hover:text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Crown size={64} className="text-white mb-6" />
                <h4 className="text-xl font-semibold text-white mb-4">
                  Unlock Unlimited Flashcards
                </h4>
                <p className="text-white/90 mb-8 max-w-md">
                  Generate unlimited flashcards, access advanced features, and
                  supercharge your learning experience with premium tools.
                </p>
                <div className="flex gap-4 w-full max-w-sm">
                  <button
                    onClick={() => setShowUpgradeModal(false)}
                    className="flex-1 px-6 py-3 border border-white/30 text-white rounded-xl hover:bg-white/10 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      setShowUpgradeModal(false);
                      router.push("/dashboard?tab=upgrade");
                    }}
                    className="flex-1 px-6 py-3 bg-white text-blue-600 rounded-xl hover:bg-gray-50 font-semibold shadow-lg transition-colors"
                  >
                    Upgrade Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
