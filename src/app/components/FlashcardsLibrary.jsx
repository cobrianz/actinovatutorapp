"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { toast } from "sonner";
import { authenticatedFetch } from "../lib/apiConfig";
import Flashcards from "./Flashcards";
import {
  Plus,
  BookOpen,
  Sparkles,
  Bookmark,
  ArrowLeft,
  Eye,
  Scroll,
} from "lucide-react";

export default function FlashcardsLibrary({ setActiveContent, setHideNavs }) {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlashcard, setSelectedFlashcard] = useState(null);
  const [showFlashcards, setShowFlashcards] = useState(false);

  useEffect(() => {
    if (setHideNavs) {
      setHideNavs(showFlashcards && !!selectedFlashcard);
    }
  }, [showFlashcards, selectedFlashcard, setHideNavs]);
  const [loadingFlashcards, setLoadingFlashcards] = useState(new Set());
  const [transitioning, setTransitioning] = useState(false);
  const [bookmarkedFlashcards, setBookmarkedFlashcards] = useState(new Set());
  const { user, refreshToken } = useAuth();
  const isPro =
    user &&
    ((user.subscription &&
      user.subscription.plan === "pro" &&
      user.subscription.status === "active") ||
      user.isPremium);

  useEffect(() => {
    fetchFlashcards();
    // Load bookmarked from localStorage
    try {
      const saved = localStorage.getItem("bookmarked_flashcards");
      if (saved) {
        setBookmarkedFlashcards(new Set(JSON.parse(saved)));
      }
    } catch { }
  }, []);

  const fetchFlashcards = async (retryAfterRefresh = true) => {
    try {
      const response = await authenticatedFetch("/api/flashcards", {
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.status === 401 && retryAfterRefresh) {
        // Try to refresh token and retry
        console.log("Token expired, attempting to refresh...");
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          return fetchFlashcards(false);
        } else {
          toast.error("Session expired. Please log in again.");
          return;
        }
      }

      if (response.ok) {
        const data = await response.json();
        setFlashcards(data.cards || []);
      } else {
        toast.error("Failed to load flashcards");
      }
    } catch (error) {
      console.error("Error fetching flashcards:", error);
      toast.error("Error loading flashcards");
    } finally {
      setLoading(false);
    }
  };

  const handleBookmark = async (flashcardId, retryAfterRefresh = true) => {
    // Optimistic UI update
    const isCurrentlyBookmarked = bookmarkedFlashcards.has(flashcardId);
    const newSet = new Set(bookmarkedFlashcards);
    if (isCurrentlyBookmarked) {
      newSet.delete(flashcardId);
    } else {
      newSet.add(flashcardId);
    }
    setBookmarkedFlashcards(newSet);
    // Save to localStorage
    try {
      localStorage.setItem(
        "bookmarked_flashcards",
        JSON.stringify([...newSet])
      );
    } catch { }

    try {
      const response = await authenticatedFetch("/api/library", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?._id || user?.id || "",
        },
        body: JSON.stringify({
          action: "bookmark",
          itemId: `cards_${flashcardId}`,
        }),
      });

      if (response.status === 401 && retryAfterRefresh) {
        // Try to refresh token and retry
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          return handleBookmark(flashcardId, false);
        }
      }

      if (response.ok) {
        toast.success(
          isCurrentlyBookmarked
            ? "Removed from bookmarks"
            : "Added to bookmarks"
        );
      } else {
        // Revert optimistic update on failure
        const revertSet = new Set(bookmarkedFlashcards);
        if (!isCurrentlyBookmarked) {
          revertSet.delete(flashcardId);
        } else {
          revertSet.add(flashcardId);
        }
        setBookmarkedFlashcards(revertSet);
        try {
          localStorage.setItem(
            "bookmarked_flashcards",
            JSON.stringify([...revertSet])
          );
        } catch { }
        toast.error("Failed to update bookmark");
      }
    } catch (error) {
      // Revert optimistic update on error
      const revertSet = new Set(bookmarkedFlashcards);
      if (!isCurrentlyBookmarked) {
        revertSet.delete(flashcardId);
      } else {
        revertSet.add(flashcardId);
      }
      setBookmarkedFlashcards(revertSet);
      try {
        localStorage.setItem(
          "bookmarked_flashcards",
          JSON.stringify([...revertSet])
        );
      } catch { }
      console.error("Error bookmarking card:", error);
      toast.error("Failed to update bookmark");
    }
  };


  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-48 mb-2"></div>
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-64"></div>
          </div>
          <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-40"></div>
        </div>

        <div className="py-12 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl mb-12 border border-gray-200/50 dark:border-slate-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, index) => (
                <div key={index} className="text-center">
                  <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16 mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-24 mx-auto"></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-12">
          <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-64 mb-2"></div>
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-96"></div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 animate-pulse"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-gray-300 dark:bg-gray-600 rounded-xl w-12 h-12"></div>
                <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded-full w-20"></div>
              </div>
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
              <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded mb-6"></div>
              <div className="flex items-center gap-2 mb-6 py-3 border-t border-gray-200 dark:border-slate-700">
                <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-16"></div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-10"></div>
                  <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded flex-1"></div>
                </div>
                <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-10"></div>
              </div>
              <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-full mt-4"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // If showing individual card set
  if (showFlashcards && selectedFlashcard) {
    return (
      <div
        className={`min-h-screen bg-white dark:bg-slate-900 transition-opacity duration-300 ${transitioning ? "opacity-0" : "opacity-100"}`}
      >
        <div className="p-4">
          <button
            onClick={() => {
              setShowFlashcards(false);
              setSelectedFlashcard(null);
            }}
            className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            aria-label="Back to flashcards library"
          >
            <ArrowLeft size={20} />
            <span>Back</span>
          </button>
        </div>
        <Flashcards cardData={selectedFlashcard} />
      </div>
    );
  }

  // Main library view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">
            My Flashcards
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1 sm:mt-2">
            View and manage your generated flashcard sets
          </p>
        </div>
        {/* Create New Button Removed to avoid double FAB */}
      </div>

      {flashcards.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-400 dark:text-gray-600 mb-4">
            <Sparkles className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            No flashcards yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Create your first flashcard set to get started
          </p>
        </div>
      ) : (
        <>
          {/* Stats Section */}
          {(() => {
            const totalSets = flashcards.length;
            const totalCards = flashcards.reduce(
              (acc, card) => acc + (card.totalCards || 0),
              0
            );
            // Compute opened cards by reading localStorage entries per set
            let openedCardsTotal = 0;
            try {
              openedCardsTotal = flashcards.reduce((acc, set) => {
                const key = `opened_cards_${set._id}`;
                const raw =
                  typeof window !== "undefined"
                    ? localStorage.getItem(key)
                    : null;
                if (!raw) return acc;
                try {
                  const arr = JSON.parse(raw);
                  return acc + (Array.isArray(arr) ? arr.length : 0);
                } catch {
                  return acc;
                }
              }, 0);
            } catch { }
            // Compute bookmarked sets using current UI state
            const bookmarkedCount = bookmarkedFlashcards.size;

            return (
              <div className="py-8 sm:py-10 mb-12">
                <div className="max-w-full mx-auto px-0 ">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: "Sets", value: totalSets, bg: "bg-blue-50/50 dark:bg-blue-900/10", border: "border-blue-100 dark:border-blue-800/50", text: "text-blue-600 dark:text-blue-400" },
                      { label: "Total Cards", value: totalCards, bg: "bg-pink-50/50 dark:bg-pink-900/10", border: "border-pink-100 dark:border-pink-800/50", text: "text-pink-600 dark:text-pink-400" },
                      { label: "Opened", value: openedCardsTotal, bg: "bg-emerald-50/50 dark:bg-emerald-900/10", border: "border-emerald-100 dark:border-emerald-800/50", text: "text-emerald-600 dark:text-emerald-400" },
                      { label: "Bookmarks", value: bookmarkedCount, bg: "bg-yellow-50/50 dark:bg-yellow-900/10", border: "border-yellow-100 dark:border-yellow-800/50", text: "text-yellow-600 dark:text-yellow-400" }
                    ].map((stat, i) => (
                      <div
                        key={i}
                        className={`relative ${stat.bg} ${stat.border} border rounded-xl p-5 flex flex-col items-center justify-center text-center transition-all duration-500`}
                      >
                        <div className={`text-2xl font-black ${stat.text} leading-none mb-1.5`}>
                          {stat.value}
                        </div>
                        <div className="text-[10px] font-black text-gray-500 dark:text-gray-400">
                          {stat.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Section Header */}
          <div className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2 text-balance">
              Your Flashcards Library
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-balance">
              Master key concepts with your personalized flashcard collections
            </p>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {flashcards.map((card) => {
              const diff = (
                card.difficulty ||
                card.level ||
                "beginner"
              ).toLowerCase();
              const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1);

              const total =
                card.totalCards ??
                (Array.isArray(card.cards) ? card.cards.length : 0);

              return (
                <div key={card._id} className="h-full">
                  <div className="relative flex h-full flex-col rounded-sm bg-gradient-to-br from-indigo-600 to-purple-700 text-white transition-transform hover:scale-[1.02]">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -translate-y-16 translate-x-16 blur-2xl" />

                    <div className="relative z-10 p-5 flex flex-col h-full">
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="flex items-center justify-center shrink-0">
                            <Scroll size={24} className="text-white" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-black leading-tight text-white line-clamp-2 text-balance">
                              {card.title}
                            </h3>
                            <p className="mt-1 text-xs font-medium text-white/70 line-clamp-1">
                              {card.topic || "Personalized Course"}
                            </p>
                          </div>
                        </div>
                        <div className="inline-flex items-center px-3 py-1 rounded-full bg-white/20 border border-white/20 text-xs font-bold text-white">
                          {diffLabel}
                        </div>
                      </div>

                      <div className="mt-auto pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-xs font-bold text-white/80 bg-white/10 px-3 py-1.5 rounded-lg border border-white/10">
                            <Scroll size={14} />
                            <span>{total} cards</span>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleBookmark(card._id);
                            }}
                            className={`p-2 rounded-xl transition-all active:scale-95 border ${bookmarkedFlashcards.has(card._id)
                              ? "bg-white text-indigo-600 border-white shadow-lg shadow-white/10"
                              : "bg-white/10 text-white border-white/10 hover:bg-white/20"
                              }`}
                            title={bookmarkedFlashcards.has(card._id) ? "Remove bookmark" : "Bookmark set"}
                          >
                            <Bookmark
                              size={18}
                              className={bookmarkedFlashcards.has(card._id) ? "fill-current" : ""}
                            />
                          </button>
                        </div>

                        <button
                          onClick={async (e) => {
                            e.stopPropagation();
                            setTransitioning(true);
                            setLoadingFlashcards((prev) =>
                              new Set(prev).add(card._id)
                            );
                            setTimeout(() => {
                              setSelectedFlashcard(card);
                              setShowFlashcards(true);
                              setLoadingFlashcards((prev) => {
                                const newSet = new Set(prev);
                                newSet.delete(card._id);
                                return newSet;
                              });
                              setTransitioning(false);
                            }, 300);
                          }}
                          disabled={loadingFlashcards.has(card._id)}
                          className="w-full mt-4 py-3 px-4 rounded-xl bg-white text-indigo-900 hover:bg-white/90 active:scale-[0.98] font-black text-xs tracking-widest transition-all flex items-center justify-center gap-2"
                        >
                          {loadingFlashcards.has(card._id) ? (
                            <div className="h-4 w-4 border-2 border-indigo-900/30 border-t-indigo-900 rounded-full animate-spin" />
                          ) : (
                            <Sparkles size={16} />
                          )}
                          <span>
                            {loadingFlashcards.has(card._id)
                              ? "Preparing..."
                              : "Study Now"}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )
      }

    </div>
  );
}
