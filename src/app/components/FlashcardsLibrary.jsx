"use client";

import { useState, useEffect } from "react";
import { useAuth } from "./AuthProvider";
import { toast } from "sonner";
import Flashcards from "./Flashcards";
import {
  Trash2,
  Plus,
  BookOpen,
  Sparkles,
  Bookmark,
  ArrowLeft,
  Eye,
} from "lucide-react";

export default function FlashcardsLibrary({ setActiveContent }) {
  const [flashcards, setFlashcards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlashcard, setSelectedFlashcard] = useState(null);
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [loadingFlashcards, setLoadingFlashcards] = useState(new Set());
  const [transitioning, setTransitioning] = useState(false);
  const [bookmarkedFlashcards, setBookmarkedFlashcards] = useState(new Set());
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [flashcardToDelete, setFlashcardToDelete] = useState(null);
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
      const response = await fetch("/api/flashcards", {
        credentials: "include",
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

  const handleDeleteClick = (flashcard) => {
    setFlashcardToDelete(flashcard);
    setShowDeleteModal(true);
  };

  const confirmDelete = async (retryAfterRefresh = true) => {
    if (!flashcardToDelete) return;

    try {
      const response = await fetch(`/api/flashcards/${flashcardToDelete._id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (response.status === 401 && retryAfterRefresh) {
        // Try to refresh token and retry
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          return confirmDelete(false);
        } else {
          toast.error("Session expired. Please log in again.");
          return;
        }
      }

      if (response.ok) {
        setFlashcards(
          flashcards.filter((card) => card._id !== flashcardToDelete._id)
        );
        toast.success("Flashcard set deleted successfully");
        setShowDeleteModal(false);
        setFlashcardToDelete(null);
      } else {
        toast.error("Failed to delete flashcard set");
      }
    } catch (error) {
      console.error("Error deleting flashcard set:", error);
      toast.error("Error deleting flashcard set");
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
      const response = await fetch("/api/library", {
        method: "POST",
        credentials: "include",
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
            <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
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
        <button
          onClick={() => setActiveContent("generate")}
          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>Create New</span>
        </button>
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
                  <div className="flex flex-wrap justify-between gap-6">
                    {/* Tile: Total Sets */}
                    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1 min-w-[240px]">
                      <div className="relative p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center font-bold">
                          {totalSets}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total Sets
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Collections you've created
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tile: Total Cards */}
                    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1 min-w-[240px]">
                      <div className="relative p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-300 flex items-center justify-center font-bold">
                          {totalCards}
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Total Cards
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Across all sets
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tile: Opened Cards */}
                    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1 min-w-[240px]">
                      <div className="relative p-5 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 flex items-center justify-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text-white">
                            {openedCardsTotal}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Opened Cards
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Across all sets (this device)
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Tile: Bookmarked Sets */}
                    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 flex-1 min-w-[240px]">
                      <div className="relative p-3 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-300 flex items-center justify-center">
                          <p className="text-2xl font-bold text-gray-900 dark:text:white">
                            {bookmarkedCount}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Bookmarked
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">
                            Sets saved for quick access
                          </p>
                        </div>
                      </div>
                    </div>
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
              const diffClasses =
                diff === "beginner"
                  ? "bg-green-500/15 text-green-600 border-green-500/30 dark:bg-green-500/20 dark:text-green-300"
                  : diff === "intermediate"
                    ? "bg-yellow-500/15 text-yellow-600 border-yellow-500/30 dark:bg-yellow-500/20 dark:text-yellow-300"
                    : "bg-red-500/15 text-red-600 border-red-500/30 dark:bg-red-500/20 dark:text-red-300";

              const total =
                card.totalCards ??
                (Array.isArray(card.cards) ? card.cards.length : 0);

              return (
                <div key={card._id} className="h-full">
                  <div className="relative flex h-full flex-col rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors hover:border-blue-300 dark:hover:border-blue-500">
                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 flex items-center justify-center shrink-0">
                            <Sparkles size={20} />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2 text-balance">
                              {card.title}
                            </h3>
                            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-1">
                              {card.topic
                                ? `Flashcards for ${card.topic}`
                                : `Interactive flashcards to master key concepts.`}
                            </p>
                          </div>
                        </div>
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold ${diffClasses}`}
                        >
                          {diffLabel}
                        </div>
                      </div>

                      <div className="mt-4 flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles
                            size={14}
                            className="text-gray-500 dark:text-gray-400"
                          />
                          <span className="font-medium">{total}</span>
                          <span>cards</span>
                        </span>
                      </div>
                    </div>

                    <div className="mt-auto px-5 pb-5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleBookmark(card._id)}
                            className={`p-2 rounded-lg border transition-colors ${bookmarkedFlashcards.has(card._id)
                              ? "text-yellow-600 dark:text-yellow-300 border-yellow-300/40 bg-yellow-50 dark:bg-yellow-900/20"
                              : "text-gray-600 dark:text-gray-300 border-gray-200 dark:border-slate-700 hover:bg-yellow-50/40 dark:hover:bg-yellow-900/10 hover:text-yellow-600"
                              }`}
                            title={
                              bookmarkedFlashcards.has(card._id)
                                ? "Remove bookmark"
                                : "Bookmark"
                            }
                          >
                            <Bookmark
                              size={18}
                              className={
                                bookmarkedFlashcards.has(card._id)
                                  ? "fill-current"
                                  : ""
                              }
                            />
                          </button>

                        </div>


                      </div>

                      <button
                        onClick={async () => {
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
                        className="w-full mt-4 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-600/90 dark:hover:bg-blue-600 text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2"
                      >
                        <Sparkles size={16} />
                        <span>
                          {loadingFlashcards.has(card._id)
                            ? "Loading..."
                            : "Study Flashcards"}
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && flashcardToDelete && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>

              <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
                Delete Flashcard Set
              </h3>

              <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
                Are you sure you want to delete{" "}
                <strong>"{flashcardToDelete.title}"</strong>? This action cannot
                be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setFlashcardToDelete(null);
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
