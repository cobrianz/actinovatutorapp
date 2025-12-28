"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Play,
  ChevronDown,
  ChevronUp,
  Send,
  Bot,
  FileText,
  MessageCircle,
  Download,
  Award,
  Menu,
  Sparkles,
  X,
  CheckCircle,
  Home,
} from "lucide-react";

import { Keyboard } from "@capacitor/keyboard";
import { Capacitor } from "@capacitor/core";

import { toast } from "sonner";
import { downloadCourseAsPDF } from "@/lib/pdfUtils";
import { authenticatedFetch } from "@/lib/apiConfig";
import { useAuth } from "./AuthProvider";
import { useEnsureSession } from "./SessionGuard";
import { useRouter } from "next/navigation";
// D3 visualizations removed per policy: no interactive D3 visuals
import ActinovaLoader from "./ActinovaLoader";
import Flashcards from "./Flashcards";
import QuizInterface from "./QuizInterface";
import mermaid from "mermaid";
import { getWikipediaDiagram } from "@/lib/wikipediaDiagrams";

// Mermaid will be initialized dynamically based on theme

export default function LearnContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, refreshToken, fetchUser } = useAuth();
  const { authLoading } = useEnsureSession();

  if (authLoading) return <ActinovaLoader />;
  if (!user) return null;
  const topic = decodeURIComponent(searchParams.get("topic") || "");
  const originalTopic = searchParams.get("originalTopic");
  const format = searchParams.get("format") || "course";
  const difficulty = searchParams.get("difficulty") || "beginner";
  const existingQuizId = searchParams.get("existing");
  // Use original topic if provided, otherwise use the URL topic
  const actualTopic = originalTopic ? decodeURIComponent(originalTopic) : topic;
  const courseIdParam = searchParams.get("id") || searchParams.get("courseId");
  const [activeView, setActiveView] = useState("outline");
  const [completedLessons, setCompletedLessons] = useState(new Set());
  const [expandedModules, setExpandedModules] = useState(new Set([1]));
  const [activeLesson, setActiveLesson] = useState({
    moduleId: parseInt(searchParams.get("moduleId")) || 1,
    lessonIndex: parseInt(searchParams.get("lessonIndex")) || 0,
  });
  const [notes, setNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [aiQuestion, setAiQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState([
    {
      type: "ai",
      message:
        "Hi! I'm your AI tutor. I'm here to help you understand the concepts better. Feel free to ask me any questions about the lesson!",
      timestamp: new Date(),
    },
  ]);

  const [courseData, setCourseData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lessonContentLoading, setLessonContentLoading] = useState(false);
  const [typingContent, setTypingContent] = useState("");
  const fetchInProgressRef = useRef(false); // Prevent duplicate API calls
  const initializedCoursesRef = useRef(new Set()); // Track initialized courses
  const abortControllerRef = useRef(null); // Track active fetch to allow cancellation
  const mermaidCacheRef = useRef({}); // Cache for rendered Mermaid SVGs
  const contentRef = useRef(null);
  const chatContainerRef = useRef(null);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [limitModalData, setLimitModalData] = useState(null);
  const [isBottomBarVisible, setIsBottomBarVisible] = useState(true);
  const bottomBarTimerRef = useRef(null);


  const [currentNotes, setCurrentNotes] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRightPanelOpen, setIsRightPanelOpen] = useState(false);
  const [lessonQuestions, setLessonQuestions] = useState([]);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showQuestionResults, setShowQuestionResults] = useState(false);

  // Persist and restore agent conversation
  const conversationKey = () => {
    const id = courseData?._id || `${actualTopic}-${format}-${difficulty}`;
    return `conversation_${id}`;
  };

  const progressKey = () => {
    const id = courseData?._id || `${actualTopic}-${format}-${difficulty}`;
    return `progress_${id}`;
  };

  const saveConversation = (messages) => {
    try {
      localStorage.setItem(conversationKey(), JSON.stringify(messages));
    } catch (e) {
      // Silent fail for conversation persistence
    }
    // Also persist to backend library for reloads
    try {
      authenticatedFetch("/api/library", {
        method: "POST",
        headers: {
          "x-user-id": user?._id || user?.id || user?.idString || "",
        },
        body: JSON.stringify({
          action: "saveConversation",
          courseId: courseData?._id || null,
          topic: actualTopic,
          difficulty,
          format,
          messages,
        }),
      }).catch(() => { });
    } catch (e) {
      // Silent fail for backend conversation persistence
    }
  };

  const restoreConversation = async () => {
    try {
      const stored = localStorage.getItem(conversationKey());
      if (stored) {
        setChatMessages(JSON.parse(stored));
        return;
      }
    } catch { }
    try {
      const res = await authenticatedFetch("/api/library", {
        method: "POST",
        headers: {
          "x-user-id": user?._id || user?.id || user?.idString || "",
        },
        body: JSON.stringify({
          action: "getConversation",
          courseId: courseData?._id || null,
          topic: actualTopic,
          difficulty,
          format,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.messages) && data.messages.length) {
          setChatMessages(data.messages);
          try {
            localStorage.setItem(
              conversationKey(),
              JSON.stringify(data.messages)
            );
          } catch { }
        }
      }
    } catch { }
  };

  // Swipe handlers
  const touchStart = useRef(null);
  const touchEnd = useRef(null);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    touchEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e) => {
    touchEnd.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isRightSwipe) {
      setIsSidebarOpen(true);
    } else if (isLeftSwipe) {
      // Optional: Close sidebar on left swipe
      setIsSidebarOpen(false);
    }
  };

  useEffect(() => {
    if (courseData?._id) {
      restoreConversation();
      // Restore progress from local storage
      const savedProgress = localStorage.getItem(progressKey());
      if (savedProgress) {
        setCompletedLessons(new Set(JSON.parse(savedProgress)));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseData?._id]);

  // Save current lesson position to local storage for "Resume" functionality
  useEffect(() => {
    if (courseIdParam || courseData?._id) {
      const id = courseIdParam || courseData?._id;
      // Key format: last_position_[courseId]
      const key = `last_position_${id}`;
      const position = JSON.stringify(activeLesson);
      localStorage.setItem(key, position);
    }
  }, [activeLesson, courseIdParam, courseData?._id]);

  // Activity tracking for bottom bar
  useEffect(() => {
    const handleActivity = () => {
      setIsBottomBarVisible(true);
      if (bottomBarTimerRef.current) clearTimeout(bottomBarTimerRef.current);
      bottomBarTimerRef.current = setTimeout(() => {
        setIsBottomBarVisible(false);
      }, 3000); // 3 seconds
    };

    // Initial timer
    bottomBarTimerRef.current = setTimeout(() => {
      setIsBottomBarVisible(false);
    }, 3000);

    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("touchstart", handleActivity);
    window.addEventListener("keydown", handleActivity);
    window.addEventListener("scroll", handleActivity, true);

    return () => {
      if (bottomBarTimerRef.current) clearTimeout(bottomBarTimerRef.current);
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("touchstart", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      window.removeEventListener("scroll", handleActivity, true);
    };
  }, []);

  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Keyboard.addListener('keyboardWillShow', () => {
        setIsKeyboardOpen(true);
      });
      Keyboard.addListener('keyboardWillHide', () => {
        setIsKeyboardOpen(false);
      });

      return () => {
        Keyboard.removeAllListeners();
      };
    }
  }, []);

  // Auto-scroll chat to bottom when messages change
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [chatMessages]);

  useEffect(() => {
    // Initialize mermaid with theme based on current mode
    const isDark = document.documentElement.classList.contains('dark');

    mermaid.initialize({
      startOnLoad: false,
      theme: isDark ? 'dark' : 'base',
      padding: 20,
      themeVariables: isDark ? {
        darkMode: true,
        background: '#0f172a',
        primaryColor: '#1e293b',
        secondaryColor: '#334155',
        tertiaryColor: '#0f172a',
        primaryTextColor: '#e2e8f0',
        secondaryTextColor: '#cbd5e1',
        primaryBorderColor: '#475569',
        lineColor: '#94a3b8',
        fontSize: '16px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif'
      } : {
        darkMode: false,
        background: '#ffffff',
        primaryColor: '#e0e7ff',
        secondaryColor: '#f3f4f6',
        tertiaryColor: '#fff',
        primaryTextColor: '#374151',
        secondaryTextColor: '#4b5563',
        primaryBorderColor: '#d1d5db',
        lineColor: '#6b7280',
        fontSize: '16px',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif'
      }
    });

    // Re-run mermaid whenever content changes
    const t = setTimeout(() => {
      mermaid.run({
        nodes: document.querySelectorAll('.mermaid'),
        suppressErrors: true,
      }).then(() => {
        // Cache the rendered SVGs to prevent flashing on re-render
        document.querySelectorAll('.mermaid svg').forEach(svg => {
          const container = svg.parentElement;
          if (container && container.getAttribute('data-code')) {
            const code = decodeURIComponent(container.getAttribute('data-code'));
            mermaidCacheRef.current[code] = container.innerHTML;
          }
        });
      }).catch(err => console.debug('Mermaid error (harmless)', err));
    }, 100);

    return () => clearTimeout(t);
  }, [activeLesson, courseData]);

  // Watch for theme changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const isDark = document.documentElement.classList.contains('dark');

      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'base',
        padding: 20,
        themeVariables: isDark ? {
          darkMode: true,
          background: '#0f172a',
          primaryColor: '#1e293b',
          secondaryColor: '#334155',
          tertiaryColor: '#0f172a',
          primaryTextColor: '#e2e8f0',
          secondaryTextColor: '#cbd5e1',
          primaryBorderColor: '#475569',
          lineColor: '#94a3b8',
          fontSize: '16px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif'
        } : {
          darkMode: false,
          background: '#ffffff',
          primaryColor: '#e0e7ff',
          secondaryColor: '#f3f4f6',
          tertiaryColor: '#fff',
          primaryTextColor: '#374151',
          secondaryTextColor: '#4b5563',
          primaryBorderColor: '#d1d5db',
          lineColor: '#6b7280',
          fontSize: '16px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif'
        }
      });

      // Re-render all diagrams
      setTimeout(() => {
        mermaid.run({
          nodes: document.querySelectorAll('.mermaid'),
        }).catch(err => console.debug('Mermaid theme switch error', err));
      }, 50);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Handle Wikipedia diagram rendering
  useEffect(() => {
    const containers = document.querySelectorAll('.wikipedia-diagram-container');

    containers.forEach((container) => {
      const topic = container.getAttribute('data-topic');

      // Skip if already processed
      if (container.getAttribute('data-processed') === 'true') return;
      container.setAttribute('data-processed', 'true');

      try {
        const imageUrl = getWikipediaDiagram(topic);

        if (imageUrl) {
          // Replace placeholder with actual image
          container.innerHTML = `
            <div class="max-w-2xl mx-auto">
              <img 
                src="${imageUrl}" 
                alt="${topic} diagram from Wikipedia" 
                class="w-full h-auto rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
              />
              <p class="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
                <a href="https://commons.wikimedia.org" target="_blank" class="hover:underline">
                  📚 Diagram from Wikimedia Commons
                </a>
              </p>
            </div>
          `;
        } else {
          // Diagram not found in library
          container.innerHTML = `
            <div class="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-800 text-center">
              <p class="text-yellow-700 dark:text-yellow-400 text-sm">Wikipedia diagram for "${topic}" not available in library</p>
            </div>
          `;
        }
      } catch (error) {
        console.error('Wikipedia diagram error:', error);
        container.innerHTML = `
          <div class="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800 text-center">
            <p class="text-red-600 dark:text-red-400 text-sm">Failed to load diagram: ${error.message}</p>
          </div>
        `;
      }
    });
  }, [activeLesson, courseData]);

  const [activeRightPanel, setActiveRightPanel] = useState("notes");

  // Handle responsive sidebar defaults
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) { // Large
        setIsSidebarOpen(true);
        setIsRightPanelOpen(true);
      } else if (width >= 768) { // Medium
        setIsSidebarOpen(true);
        setIsRightPanelOpen(false);
      } else { // Small
        setIsSidebarOpen(true); // Open by default as requested
        setIsRightPanelOpen(false);
      }
    };

    // Set initial state
    handleResize();

    // We only want to set the defaults once on mount or when the user hasn't manually toggled them?
    // Actually, usually users expect themes/layouts to react to resize but manual toggles to persist.
    // For now, let's just do it on mount to satisfy the "defaults" requirement.
  }, []);

  const toggleModule = (moduleId) => {
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const selectLesson = async (moduleId, lessonIndex) => {
    // 1. Cancel any ongoing generation logic
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    setActiveLesson({ moduleId, lessonIndex });

    // Reset generation UI state immediately when switching
    setLessonContentLoading(false);
    setTypingContent("");

    // Only auto-close sidebar on smaller screens
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }

    // Fetch lesson content if not already loaded
    const module = courseData?.modules?.find((m) => m.id === moduleId);
    const lesson = module?.lessons?.[lessonIndex];

    // Check local storage first
    const localStorageKey = `lesson_${actualTopic}_${difficulty}_${moduleId}_${lessonIndex}`;
    const cachedContent = localStorage.getItem(localStorageKey);

    if (
      cachedContent &&
      cachedContent.trim() !== "" &&
      cachedContent.trim() !== "Content for this lesson is coming soon..."
    ) {
      // Update course data with cached content
      setCourseData((prevData) => {
        const newData = { ...prevData };
        if (newData.modules && newData.modules[moduleId - 1]) {
          if (newData.modules[moduleId - 1].lessons[lessonIndex]) {
            newData.modules[moduleId - 1].lessons[lessonIndex].content =
              cachedContent;
          }
        }
        return newData;
      });
      return;
    }

    // Only fetch if content doesn't exist or is empty
    if (
      lesson &&
      (!lesson.content ||
        lesson.content.trim() === "" ||
        lesson.content ===
        "Content will be generated when you start the lesson.")
    ) {
      // Don't await here to prevent blocking UI
      fetchLessonContent(
        moduleId,
        lessonIndex,
        lesson.title,
        module.title
      );
    }
  };

  const fetchLessonContent = async (
    moduleId,
    lessonIndex,
    lessonTitle,
    moduleTitle
  ) => {
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLessonContentLoading(true);
      setTypingContent("");

      const response = await authenticatedFetch("/api/course-agent", {
        method: "POST",
        signal: controller.signal,
        body: JSON.stringify({
          action: "generateLesson",
          courseId: courseData?._id || null,
          moduleId,
          lessonIndex,
          lessonTitle,
          moduleTitle,
          courseTopic: topic,
          difficulty,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate lesson content");
      }

      // Revert to regular JSON response (streaming removed)
      const data = await response.json();

      // Update course data with the new content
      setCourseData((prevData) => {
        const newData = { ...prevData };
        if (newData.modules && newData.modules[moduleId - 1]) {
          if (newData.modules[moduleId - 1].lessons[lessonIndex]) {
            newData.modules[moduleId - 1].lessons[lessonIndex].content =
              data.content;
          }
        }
        return newData;
      });

      // Save to local storage for faster future access
      const localStorageKey = `lesson_${actualTopic}_${difficulty}_${moduleId}_${lessonIndex}`;
      try {
        localStorage.setItem(localStorageKey, data.content);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("usageUpdated"));
        }
      } catch (storageError) {
        // Silent fail for localStorage
      }

      setTypingContent(data.content);

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log("Fetch aborted");
        return;
      }
      console.error(error);
      toast.error("Failed to load lesson content");
      // Set a fallback message
      setCourseData((prevData) => {
        const newData = { ...prevData };
        if (newData.modules && newData.modules[moduleId - 1]) {
          if (newData.modules[moduleId - 1].lessons[lessonIndex]) {
            newData.modules[moduleId - 1].lessons[lessonIndex].content =
              "Failed to load content. Please try again.";
          }
        }
        return newData;
      });
    } finally {
      if (abortControllerRef.current === null) {
        // Already aborted/cleared
      } else {
        setLessonContentLoading(false);
        abortControllerRef.current = null;
      }
    }
  };

  const toggleLessonCompletion = async (moduleId, lessonIndex) => {
    const lessonId = `${moduleId}-${lessonIndex}`;
    const newCompleted = new Set(completedLessons);

    if (newCompleted.has(lessonId)) {
      newCompleted.delete(lessonId);
    } else {
      newCompleted.add(lessonId);
    }
    setCompletedLessons(newCompleted);

    // --- Save progress ---
    try {
      // 1. Save to Local Storage for immediate persistence
      localStorage.setItem(
        progressKey(),
        JSON.stringify(Array.from(newCompleted))
      );

      // 2. Save to backend database
      if (courseData?._id) {
        const totalLessons = courseData?.totalLessons || 0;
        const progress =
          totalLessons > 0
            ? Math.round((newCompleted.size / totalLessons) * 100)
            : 0;

        const response = await fetch("/api/course-progress", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-user-id": user?._id || user?.id || user?.idString || "",
          },
          credentials: "include",
          body: JSON.stringify({
            courseId: courseData._id,
            progress,
            completed: progress === 100,
            isLessonCompleted: newCompleted.has(lessonId),
            userId: user?._id || user?.id || null,
            lessonId: lessonId,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to save progress: ${response.statusText}`);
        }
      }
    } catch (err) {
      toast.error("Failed to save progress to the cloud.");
    }
  };

  const sendAiQuestion = async () => {
    if (!aiQuestion.trim()) return;

    // Ask backend to classify relevance to the course before generating

    const isPro =
      !!(
        user?.subscription &&
        (user.subscription.plan === "pro" || user.subscription.plan === "enterprise") &&
        user.subscription.status === "active"
      ) || !!user?.isPremium;

    if (!isPro) {
      const key = `ai_responses_${new Date().toDateString()}`;
      const used = parseInt(localStorage.getItem(key) || "0", 10);
      if (used >= 3) {
        toast.error(
          "Daily AI tutor limit reached (3 responses of ≤50 words). Upgrade to Pro for unlimited responses."
        );
        return;
      }
      localStorage.setItem(key, String(used + 1));
    }

    const userMessage = {
      type: "user",
      message: aiQuestion,
      timestamp: new Date(),
    };

    // Add user message immediately
    setChatMessages((prev) => {
      const next = [...prev, userMessage];
      saveConversation(next);
      return next;
    });
    setAiQuestion("");

    // Add loading message
    const loadingMessage = {
      type: "ai",
      message: "Thinking...",
      timestamp: new Date(),
      isLoading: true,
    };
    setChatMessages((prev) => {
      const next = [...prev, loadingMessage];
      saveConversation(next);
      return next;
    });

    try {
      // Step 1: Check if question is relevant to the course
      const allCourseContent =
        courseData?.modules
          ?.flatMap(
            (module) =>
              module.lessons?.map((lesson) => ({
                moduleTitle: module.title,
                lessonTitle: lesson.title,
                content: lesson.content || "",
              })) || []
          )
          .map(
            (lesson) =>
              `Module: ${lesson.moduleTitle}\nLesson: ${lesson.lessonTitle}\nContent: ${lesson.content}`
          )
          .join("\n\n---\n\n") || "";

      const relevanceCheck = await authenticatedFetch("/api/course-agent", {
        method: "POST",
        body: JSON.stringify({
          action: "checkRelevance",
          question: userMessage.message,
          courseContent: allCourseContent,
          lessonTitle: currentLesson?.title || "",
          context: `Course: ${courseData?.title || ""
            }, Level: ${courseData?.level || ""}, Topic: ${topic}. Module: ${courseData?.modules?.find((m) => m.id === activeLesson.moduleId)
              ?.title || ""
            }`,
        }),
      });

      if (!relevanceCheck.ok) {
        throw new Error("Failed to check question relevance");
      }

      const relevanceData = await relevanceCheck.json();

      if (!relevanceData.relevant) {
        // Question is not related to the course
        const courseTitle = courseData?.title || "this course";
        setChatMessages((prev) => {
          const withoutLoading = prev.filter((msg) => !msg.isLoading);
          const next = [
            ...withoutLoading,
            {
              type: "ai",
              message: `I'm here to help with this course on **${courseTitle}**. What would you like to know about it?`,
              timestamp: new Date(),
            },
          ];
          saveConversation(next);
          return next;
        });
        return;
      }

      // Step 2: Question is relevant, get the answer
      const response = await authenticatedFetch("/api/course-agent", {
        method: "POST",
        body: JSON.stringify({
          action: "answer",
          question: userMessage.message,
          courseContent: allCourseContent,
          lessonTitle: currentLesson?.title || "",
          context: `Course: ${courseData?.title || ""
            }, Level: ${courseData?.level || ""}, Topic: ${topic}. Module: ${courseData?.modules?.find((m) => m.id === activeLesson.moduleId)
              ?.title || ""
            }`,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();

      // Remove loading message and add real response (agent instructed to <=50 words)
      setChatMessages((prev) => {
        const withoutLoading = prev.filter((msg) => !msg.isLoading);
        const formattedHtml = renderContent(data.response || "");
        const next = [
          ...withoutLoading,
          {
            type: "ai",
            message: formattedHtml,
            html: true,
            timestamp: new Date(),
          },
        ];
        saveConversation(next);
        return next;
      });
    } catch (error) {

      // Remove loading message and add error response
      setChatMessages((prev) => {
        const withoutLoading = prev.filter((msg) => !msg.isLoading);
        const next = [
          ...withoutLoading,
          {
            type: "ai",
            message:
              "I'm sorry, I'm having trouble responding right now. Please try again later.",
            timestamp: new Date(),
          },
        ];
        saveConversation(next);
        return next;
      });
    }
  };

  // Interactive D3 visualizations removed. If needed later, replace with static
  // images or links to externally hosted diagrams.

  const renderContent = (content) => {
    if (!content) return "";

    let html = content;

    // CRITICAL FIX: Strip any wrapping markdown code fences that might wrap the entire content
    // This prevents the entire lesson from being rendered as a code block
    html = html.trim();
    if (html.startsWith('```markdown') || html.startsWith('```md') || html.startsWith('```')) {
      // Find the opening fence
      const firstNewline = html.indexOf('\n');
      if (firstNewline !== -1) {
        html = html.substring(firstNewline + 1);
      }
      // Remove closing fence
      if (html.endsWith('```')) {
        html = html.substring(0, html.lastIndexOf('```')).trim();
      }
    }

    // Handle Wikipedia Diagrams FIRST (free, high-quality)
    html = html.replace(/\[Wikipedia Diagram:\s*([^\]]+)\]/gi, (match, topic) => {
      const cleanTopic = topic.trim();
      // We'll fetch the URL client-side from our library
      return `<div class="wikipedia-diagram-container my-6 flex justify-center" data-topic="${cleanTopic}">
        <div class="max-w-2xl mx-auto">
          <div class="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
            <div class="animate-pulse text-center">
              <div class="text-gray-500 dark:text-gray-400 mb-2">📚 Loading Wikipedia diagram...</div>
              <div class="text-sm text-gray-400 dark:text-gray-500">${cleanTopic}</div>
            </div>
          </div>
        </div>
      </div>`;
    });

    // keep content as generated

    // keep content as generated

    // First, escape any HTML that might be in the content
    const escapeHtml = (text) => {
      const map = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
      };
      // Don't escape if it's already part of our formatted output
      return text;
    };

    // Handle code blocks FIRST (before other replacements) - CRITICAL
    const codeBlocks = [];
    html = html.replace(/```(\w+)?\s*\n([\s\S]*?)```/g, (match, lang, code) => {
      const trimmedCode = code.trim();

      // Handle Mermaid Diagrams
      if (lang === 'mermaid') {
        const commonClasses = "mermaid-container my-6 flex justify-center p-6 rounded-lg overflow-x-auto border border-gray-200 dark:border-gray-700 shadow-sm transition-colors duration-200";
        // Fix background: bg-white for light, dark:bg-gray-900 (dark) instead of dark:bg-gray-100 (light gray)
        const bgClasses = "bg-white dark:bg-gray-900";

        // Use cached SVG if available to prevent flashing
        const cached = mermaidCacheRef.current[trimmedCode];
        if (cached) {
          // Return div without 'mermaid' class so it doesn't get re-processed, but with same styles
          return `<div class="${commonClasses} ${bgClasses}">${cached}</div>`;
        }

        // Wrap in a div with 'mermaid' class that mermaid.js will process
        // Store code in data attribute for caching references
        return `<div class="mermaid ${commonClasses} ${bgClasses}" data-code="${encodeURIComponent(trimmedCode)}">${trimmedCode}</div>`;
      }

      const placeholder = `___CODEBLOCK_${codeBlocks.length}___`;
      codeBlocks.push(
        `<pre class="bg-gray-900 dark:bg-gray-950 p-4 rounded-lg overflow-x-auto my-4 border border-gray-700"><code class="text-sm text-green-400 language-${lang || "plaintext"}">${trimmedCode.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</code></pre>`
      );
      return placeholder;
    });

    // Handle inline code
    const inlineCodes = [];
    html = html.replace(/`([^`]+)`/g, (match, code) => {
      const placeholder = `___INLINECODE_${inlineCodes.length}___`;
      inlineCodes.push(
        `<code class="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded text-sm font-mono text-blue-600 dark:text-blue-400">${code}</code>`
      );
      return placeholder;
    });

    // Handle equations - LaTeX display mode \[...\]
    html = html.replace(
      /\\\[([^\]]*?)\\\]/g,
      '<div class="my-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center overflow-x-auto"><span class="text-lg font-serif italic text-gray-900 dark:text-gray-100">$1</span></div>'
    );

    // Handle equations - LaTeX inline mode \(...\)
    html = html.replace(
      /\\\(([^\)]*?)\\\)/g,
      '<span class="font-serif italic text-blue-600 dark:text-blue-400 mx-1">$1</span>'
    );

    // Handle equations - display mode $$...$$
    html = html.replace(
      /\$\$([\s\S]*?)\$\$/g,
      '<div class="my-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center overflow-x-auto"><span class="text-lg font-serif italic text-gray-900 dark:text-gray-100">$1</span></div>'
    );

    // Handle equations - inline mode $...$
    html = html.replace(
      /\$([^\$\n]+)\$/g,
      '<span class="font-serif italic text-blue-600 dark:text-blue-400 mx-1">$1</span>'
    );

    // Handle headers
    html = html.replace(
      /^# (.*$)/gm,
      '<h1 class="text-3xl font-bold text-blue-600 dark:text-blue-400 underline decoration-blue-500/30 mb-6 mt-8">$1</h1>'
    );
    html = html.replace(
      /^## (.*$)/gm,
      '<h2 class="text-2xl font-semibold text-blue-600 dark:text-blue-400 underline decoration-blue-500/30 mb-4 mt-6">$1</h2>'
    );
    html = html.replace(
      /^### (.*$)/gm,
      '<h3 class="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 mt-5">$1</h3>'
    );
    html = html.replace(
      /^#### (.*$)/gm,
      '<h4 class="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2 mt-4">$1</h4>'
    );

    // Handle blockquotes
    html = html.replace(
      /^> (.*$)/gm,
      '<blockquote class="border-l-4 border-blue-500 pl-4 py-2 my-4 bg-blue-50 dark:bg-blue-900/20 text-gray-700 dark:text-gray-300 italic rounded-r">$1</blockquote>'
    );

    // Handle bold - must come before italics
    html = html.replace(
      /\*\*([^\*\n]+?)\*\*/g,
      '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>'
    );

    // Handle italics
    html = html.replace(
      /\*([^\*\n]+?)\*/g,
      '<em class="italic text-gray-800 dark:text-gray-200">$1</em>'
    );

    // Unified List Processing (Handles nesting without breaking ordered sequences)
    const lines = html.split("\n");
    let inOrderedList = false;
    let inUnorderedList = false;

    html = lines.map((line) => {
      const isOrdered = /^\s*\d+\.\s+/.test(line);
      const isUnordered = /^\s*[-•*]\s+/.test(line);

      if (isOrdered) {
        // Found numbered item
        const content = line.replace(/^\s*\d+\.\s+/, "");

        // If we were in a bullet list, close it
        let prefix = "";
        if (inUnorderedList) {
          inUnorderedList = false;
          prefix += "</ul>";
        }

        // If not already in ordered list, start one
        if (!inOrderedList) {
          inOrderedList = true;
          return prefix + '<ol class="list-decimal list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300 ml-4"><li class="mb-2">' + content + "</li>";
        }

        // Already in ordered list
        return prefix + '<li class="mb-2">' + content + "</li>";
      }
      else if (isUnordered) {
        // Found bullet item
        const content = line.replace(/^\s*[-•*]\s+/, "");

        // If we are in an ordered list, we want to render this bullet *inside* it
        // but wrapped in its own UL, without closing the OL.
        if (inOrderedList) {
          // Render a nested UL item (self-contained for this line)
          // Note: Ideally this should be inside the previous LI, but appending it works visually in most browsers
          return '<ul class="list-disc list-inside ml-6 text-gray-600 dark:text-gray-400"><li class="mb-1">' + content + "</li></ul>";
        }

        // Standard UL handling
        if (!inUnorderedList) {
          inUnorderedList = true;
          return '<ul class="list-disc list-inside mb-4 space-y-2 text-gray-700 dark:text-gray-300 ml-4"><li class="mb-2">' + content + "</li>";
        }

        return '<li class="mb-2">' + content + "</li>";
      }
      else {
        // Neither list type - generic text or blank
        let prefix = "";
        if (inUnorderedList) {
          inUnorderedList = false;
          prefix += "</ul>";
        }
        if (inOrderedList) {
          inOrderedList = false;
          prefix += "</ol>";
        }
        return prefix + line;
      }
    }).join("\n");

    // Close any remaining open lists at the end
    if (inOrderedList) html += "</ol>";
    if (inUnorderedList) html += "</ul>";

    // Handle paragraphs
    html = html
      .split("\n\n")
      .map((para) => {
        para = para.trim();
        if (para && !para.startsWith("<")) {
          // Check if this looks like an exercise (starts with bold)
          if (para.startsWith("<strong>") || para.startsWith("<b>")) {
            // Force separation between Question (bold) and Answer (italics) if they are adjacent
            para = para.replace(/<\/strong>\s*<em>/gi, "</strong><br><em>")
              .replace(/<\/b>\s*<em>/gi, "</b><br><em>")
              .replace(/<\/strong>\s*<i>/gi, "</strong><br><i>")
              .replace(/<\/b>\s*<i>/gi, "</b><br><i>");

            // Force block formatting for exercises to ensure Question is on top of Answer
            // and apply line-height 2 (leading-loose)
            return `<div class="mb-6 space-y-4 text-gray-700 dark:text-gray-300 leading-loose">${para.replace(/<br\s*\/?>/gi, "</div><div class='leading-loose'>")}</div>`;
          }
          return `<p class="mb-4 text-gray-700 dark:text-gray-300 leading-loose">${para}</p>`;
        }
        return para;
      })
      .join("\n");

    // Handle horizontal rules
    html = html.replace(
      /^---+$/gm,
      '<div class="my-4"></div>'
    );

    // Filter out "Module: X" title lines
    html = html.replace(/^#? ?Module:.*$/igm, '');

    // Handle Tables
    const tables = [];
    html = html.replace(/(\n|^)(\|.*\|(\n|$))+/g, (match) => {
      const tablePlaceholder = `___TABLE_${tables.length}___`;
      const rows = match.trim().split('\n').filter(r => r.trim());

      let tableHtml = '<div class="overflow-x-auto my-6 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm"><table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">';

      // Header
      const headerRow = rows[0];
      const headers = headerRow.split('|').filter(c => c.trim() !== '').map(c => c.trim());

      tableHtml += '<thead class="bg-gray-50 dark:bg-gray-800"><tr>';
      headers.forEach(h => {
        tableHtml += `<th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">${h}</th>`;
      });
      tableHtml += '</tr></thead>';

      // Body
      tableHtml += '<tbody class="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">';
      // Skip separator line (row 1)
      for (let i = 2; i < rows.length; i++) {
        const cells = rows[i].split('|').filter(c => c.trim() !== '').map(c => c.trim());
        tableHtml += '<tr>';
        cells.forEach(c => {
          tableHtml += `<td class="px-6 py-4 whitespace-normal text-sm text-gray-700 dark:text-gray-300">${c}</td>`;
        });
        tableHtml += '</tr>';
      }
      tableHtml += '</tbody></table></div>';

      tables.push(tableHtml);
      return tablePlaceholder;
    });

    // Restore Tables (after list processing to avoid interference)

    // ... (rest of logic)

    // Restore code blocks
    codeBlocks.forEach((block, i) => {
      html = html.replace(`___CODEBLOCK_${i}___`, block);
    });

    // Restore inline codes
    inlineCodes.forEach((code, i) => {
      html = html.replace(`___INLINECODE_${i}___`, code);
    });

    // Restore Tables
    tables.forEach((table, i) => {
      html = html.replace(`___TABLE_${i}___`, table);
    });

    return html;
  };

  // Knowledge-check removed: lessons will no longer include an embedded quiz

  const getCurrentLesson = () => {
    if (!courseData || !courseData.modules) return null;

    const module = courseData.modules.find(
      (m) => m.id === activeLesson.moduleId
    );
    if (!module) return null;

    const lesson = module.lessons[activeLesson.lessonIndex];
    if (typeof lesson === "string") {
      return {
        title: lesson,
        content: "Content for this lesson is coming soon...",
      };
    }

    return lesson;
  };

  const totalLessons =
    courseData && courseData.modules
      ? courseData.modules.reduce(
        (acc, module) => acc + module.lessons.length,
        0
      )
      : 0;
  const completedCount = completedLessons.size;
  const progressPercentage =
    totalLessons > 0 ? (completedCount / totalLessons) * 100 : 0;

  const currentLesson = getCurrentLesson();

  const saveNotes = async (notesContent) => {
    if (!notesContent.trim()) return;

    try {
      setIsSavingNotes(true);

      const response = await authenticatedFetch("/api/notes", {
        method: "POST",
        body: JSON.stringify({
          itemId: `course_${courseData?._id}`,
          lessonId: `${activeLesson.moduleId}-${activeLesson.lessonIndex}`,
          content: notesContent,
          title: currentLesson?.title || "Lesson Notes",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save notes");
      }

      const data = await response.json();
      console.log("Notes saved:", data.message);
      toast.success("Notes saved");
    } catch (error) {
      console.error("Error saving notes:", error);
      toast.error("Failed to save notes");
    } finally {
      setIsSavingNotes(false);
    }
  };

  const handleDownloadNotes = async () => {
    if (!notes || !notes.trim()) {
      toast.error("No notes to download");
      return;
    }

    const notesData = {
      title: currentLesson?.title || "Lesson Notes",
      content: notes,
      date: new Date().toLocaleDateString(),
      course: courseData.title,
      tags: ["Learning", courseData?.level || "General"],
    };

    toast.loading("Preparing your study notes PDF...", { id: "downloading-notes" });
    try {
      await downloadCourseAsPDF(notesData, "notes");
      toast.success("Notes downloaded successfully!", { id: "downloading-notes" });
    } catch (err) {
      console.error("PDF download error:", err);
      toast.error("Failed to generate PDF. Please try again.", { id: "downloading-notes" });
    }
  };

  // Auto-save notes when they change
  useEffect(() => {
    if (notes.trim() && courseData) {
      const timeoutId = setTimeout(() => {
        saveNotes(notes);
      }, 2000); // Auto-save after 2 seconds of inactivity

      return () => clearTimeout(timeoutId);
    }
  }, [notes, courseData, activeLesson]);

  // Clean up old local storage entries to prevent storage bloat
  const cleanupLocalStorage = () => {
    try {
      const keys = Object.keys(localStorage);
      const lessonKeys = keys.filter((key) => key.startsWith("lesson_"));

      // Keep only the most recent 50 lesson entries
      if (lessonKeys.length > 50) {
        // Sort by when they were last accessed (we'll use a simple approach)
        const sortedKeys = lessonKeys.sort((a, b) => {
          // For now, just remove oldest ones. In a more sophisticated approach,
          // we could track access times, but this is sufficient for now.
          return Math.random() - 0.5; // Random order for cleanup
        });

        const keysToRemove = sortedKeys.slice(50);
        keysToRemove.forEach((key) => {
          localStorage.removeItem(key);
        });

        console.log(
          `🧹 Cleaned up ${keysToRemove.length} old lesson entries from localStorage`
        );
      }
    } catch (error) {
      console.warn("Failed to cleanup localStorage:", error);
    }
  };

  // Fetch course data on component mount
  useEffect(() => {
    const courseKey = `${actualTopic}/${format}/${difficulty}`;

    // Clear initialized set when topic/format/difficulty changes
    initializedCoursesRef.current.clear();

    let isMounted = true; // Prevent state updates if component unmounts

    const fetchCourseData = async () => {
      // Prevent multiple simultaneous calls (guards StrictMode double-effect)
      if (fetchInProgressRef.current) {
        console.log("Fetch already in progress, skipping");
        return;
      }

      fetchInProgressRef.current = true;
      console.log("Setting isLoading to true");
      setIsLoading(true);
      setError(null);

      // Check if free user is trying to use non-beginner difficulty
      const isPro =
        !!(
          user?.subscription &&
          (user.subscription.plan === "pro" || user.subscription.plan === "enterprise") &&
          user.subscription.status === "active"
        ) || !!user?.isPremium;

      // Clean up local storage on component mount
      cleanupLocalStorage();

      // First, try to get from library (saves tokens!)
      if (courseIdParam) {
        try {
          const res = await authenticatedFetch(`/api/library?id=${courseIdParam}`, {
            headers: { "x-user-id": user?._id || user?.id || "" },
          });
          if (res.ok) {
            const data = await res.json();
            const existingCourse = data.item;
            if (existingCourse) {
              const courseData = existingCourse.courseData || existingCourse;
              if ((courseData.modules && courseData.modules.length > 0) || (courseData.topics && courseData.topics.length > 0)) {
                console.log("✅ Found exact course in library by ID");
                if (isMounted) {
                  setCourseData({ ...courseData, _id: existingCourse._id });
                  setIsLoading(false);
                  return;
                }
              }
            }
          }
        } catch (e) { console.error("ID fetch failed, falling back to topic search", e); }
      }

      // Search specifically for this topic to avoid pagination issues
      try {
        const libraryResponse = await authenticatedFetch(`/api/library?search=${encodeURIComponent(actualTopic)}&limit=50`, {
          headers: {
            "x-user-id": user?._id || user?.id || user?.idString || "",
          },
        });

        if (libraryResponse.ok) {
          const libraryData = await libraryResponse.json();

          // Find course matching this topic, format, and difficulty
          const existingCourse = libraryData.items?.find((c) => {
            if (c.type !== "course") return false;
            const matchesTopic =
              c.topic?.toLowerCase() === actualTopic.toLowerCase() ||
              c.originalTopic?.toLowerCase() === actualTopic.toLowerCase() ||
              c.courseData?.topic?.toLowerCase() === actualTopic.toLowerCase();
            const matchesDifficulty =
              c.difficulty?.toLowerCase() === difficulty.toLowerCase() ||
              c.level?.toLowerCase() === difficulty.toLowerCase() ||
              c.courseData?.difficulty?.toLowerCase() ===
              difficulty.toLowerCase() ||
              c.courseData?.level?.toLowerCase() === difficulty.toLowerCase();

            return matchesTopic && matchesDifficulty;
          });

          if (
            existingCourse &&
            ((existingCourse.modules && existingCourse.modules.length > 0) ||
              (existingCourse.courseData?.modules &&
                existingCourse.courseData.modules.length > 0))
          ) {
            // Course exists in library - use it!
            console.log(
              "✅ Found existing course in library:",
              existingCourse.title || existingCourse.courseData?.title
            );

            if (!isMounted) return;

            // Extract course data from the correct location
            const courseData = existingCourse.courseData || existingCourse;
            const courseDataWithProgress = {
              ...courseData,
              // Add any additional progress data if needed
            };

            setCourseData(courseDataWithProgress);

            // Restore completed lessons from database/library first
            const completedLessonsFromDB = new Set();
            if (courseData.modules) {
              courseData.modules.forEach((module) => {
                if (module.lessons) {
                  module.lessons.forEach((lesson, lIdx) => {
                    // Fallback ID if lesson.id is missing, matching the toggleLessonCompletion logic
                    const lId = lesson.id || `${module.id}-${lIdx}`;
                    if (lesson.completed) {
                      completedLessonsFromDB.add(lId);
                    }
                  });
                }
              });
            }

            // Then check localStorage for any additional progress
            const courseId =
              courseData._id || `${actualTopic}-${format}-${difficulty}`;
            const progressStorageKey = `progress_${courseId}`;
            const savedProgress = localStorage.getItem(progressStorageKey);
            if (savedProgress) {
              try {
                const parsed = JSON.parse(savedProgress);
                // Merge DB and localStorage progress
                parsed.forEach((lessonId) => completedLessonsFromDB.add(lessonId));
                console.log(
                  "✅ Restored completed lessons from DB and localStorage:",
                  Array.from(completedLessonsFromDB)
                );
              } catch (e) {
                console.warn("Failed to parse saved progress:", e);
              }
            } else {
              console.log(
                "✅ Restored completed lessons from DB:",
                Array.from(completedLessonsFromDB)
              );
            }

            setCompletedLessons(completedLessonsFromDB);

            console.log(
              "✅ Found course in library, setting isLoading to false"
            );
            console.log("Setting isLoading to false (library)");
            setIsLoading(false);

            // Notify other components that loading finished and perform a dev-time cleanup
            if (typeof window !== "undefined") {
              window.dispatchEvent(new CustomEvent("actinova:loading-done"));
              setTimeout(() => {
                const leftovers = document.querySelectorAll(
                  "[data-actinova-loader-overlay], [data-actinova-loader]"
                );
                if (leftovers.length) {
                  console.warn("Detected leftover loaders after library load, removing...", leftovers.length);
                  leftovers.forEach((n) => n.remove());
                }
              }, 1000);
            }

            fetchInProgressRef.current = false;
            initializedCoursesRef.current.add(courseKey);
            return;
          } else {
            console.log("generating course...");
          }
        }
      } catch (libraryError) {
        console.log("Library check error:", libraryError);
      }

      // For flashcards, check the flashcards collection
      if (format === "flashcards") {
        try {
          const cardsResponse = await authenticatedFetch("/api/flashcards", {
            cache: "no-store",
          });

          if (cardsResponse.ok) {
            const cardsData = await cardsResponse.json();
            console.log("Flashcards data received:", cardsData);

            // Find existing flashcard set matching this topic and difficulty
            const existingCardSet = cardsData.find((cardSet) => {
              const matchesTopic =
                cardSet.topic?.toLowerCase() === actualTopic.toLowerCase() ||
                cardSet.originalTopic?.toLowerCase() ===
                actualTopic.toLowerCase();
              const matchesDifficulty =
                cardSet.difficulty?.toLowerCase() ===
                difficulty.toLowerCase() ||
                cardSet.level?.toLowerCase() === difficulty.toLowerCase();

              console.log("Checking card set:", cardSet.title, {
                matchesTopic,
                matchesDifficulty,
                cardTopic: cardSet.topic || cardSet.originalTopic,
                cardDifficulty: cardSet.difficulty || cardSet.level,
              });

              return matchesTopic && matchesDifficulty;
            });

            if (existingCardSet) {
              console.log(
                "✅ Loading existing questions:",
                existingCardSet.title,
                "Cards:",
                existingCardSet.totalCards
              );
              setCourseData(existingCardSet);
              console.log(
                "✅ Found questions in library, setting isLoading to false"
              );
              setIsLoading(false);
              fetchInProgressRef.current = false;
              initializedCoursesRef.current.add(courseKey);
              return;
            } else {
              console.log("❌ Question set not found in cards collection");
            }
          }
        } catch (cardsError) {
          console.log("Cards check error:", cardsError);
        }
      }

      // Handle existing quiz loading
      if (format === "quiz" && existingQuizId) {
        try {
          const quizResponse = await fetch(`/api/quizzes/${existingQuizId}`);
          if (quizResponse.ok) {
            const quizData = await quizResponse.json();
            setCourseData(quizData);
            console.log("✅ Loaded existing quiz:", quizData.title);
            setIsLoading(false);
            fetchInProgressRef.current = false;
            initializedCoursesRef.current.add(courseKey);
            return;
          }
        } catch (quizError) {
          console.log("Error loading existing quiz:", quizError);
        }
      }

      if (!isPro && difficulty !== "beginner") {
        toast.error(
          "Intermediate and Advanced levels require Pro subscription. Redirecting to upgrade..."
        );
        router.push("/dashboard?tab=upgrade");
        console.log(
          "✅ Free user trying non-beginner difficulty, setting isLoading to false and redirecting"
        );
        console.log("Setting isLoading to false (free user redirect)");
        setIsLoading(false);
        fetchInProgressRef.current = false;
        initializedCoursesRef.current.add(courseKey);
        return;
      }

      // Course not in library - generate new one
      let apiEndpoint;
      let requestBody;

      if (format === "quiz") {
        // Quiz generation uses the same endpoint but with different logic
        apiEndpoint = "/api/generate-course";
        requestBody = {
          topic: actualTopic,
          format: "quiz",
          difficulty: isPro ? difficulty : "beginner",
          questions: parseInt(searchParams.get("questions")) || 10,
        };
      } else if (format === "flashcards") {
        apiEndpoint = "/api/generate-flashcards";
        requestBody = {
          topic: actualTopic,
          format,
          difficulty: isPro ? difficulty : "beginner",
        };
      } else {
        // Course generation
        apiEndpoint = "/api/generate-course";
        requestBody =
          format === "guide"
            ? {
              topic: actualTopic,
              difficulty: (isPro ? difficulty : "beginner").toLowerCase(),
            }
            : {
              topic: actualTopic,
              format,
              difficulty: (isPro ? difficulty : "beginner").toLowerCase(),
            };
      }

      try {
        const response = await authenticatedFetch(apiEndpoint, {
          method: "POST",
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          if (response.status === 429) {
            const errorData = await response.json();
            if (!isMounted) return;
            setLimitModalData({
              used: errorData.used || 0,
              limit: errorData.limit || 2,
              isPremium: errorData.isPremium || false,
            });
            setShowLimitModal(true);
            setIsLoading(false);
            fetchInProgressRef.current = false;
            return;
          }
          const errorData = await response.json();
          console.error("Course generation debug:", JSON.stringify(errorData));
          throw new Error(errorData.details || errorData.error || "Failed to generate course");
        }

        const data = await response.json();

        // Extract course data - API can return in different formats
        let courseDataToSet;
        if (data.content) {
          courseDataToSet = data.content;
        } else if (data.modules) {
          // Data is at root level
          courseDataToSet = data;
        } else {
          // Fallback - use the whole data object
          courseDataToSet = data;
        }

        // Only validate modules for course format, not quiz
        if (format === "course") {
          const hasModules =
            (Array.isArray(courseDataToSet.modules) && courseDataToSet.modules.length > 0) ||
            (Array.isArray(courseDataToSet.topics) && courseDataToSet.topics.length > 0);

          if (!hasModules) {
            // Log for debugging but don't expose full data
            console.error("Course generation failed: Invalid structure");
            throw new Error(
              "Generated course structure is invalid. Please try again."
            );
          }
        } else if (format === "quiz") {
          // For quiz format, validate questions exist
          const hasQuestions =
            Array.isArray(courseDataToSet.questions) &&
            courseDataToSet.questions.length > 0;
          if (!hasQuestions) {
            throw new Error(
              "Generated quiz has no questions. Please try again."
            );
          }
        }

        // Add the courseId to the course data for lesson content saving
        if (data.courseId) {
          courseDataToSet._id = data.courseId;
        }
        setCourseData(courseDataToSet);
        setIsLoading(false); // Ensure loader disappears immediately when course data is set

        // Notify other components and check for lingering loaders (dev safeguard)
        if (typeof window !== "undefined") {
          // Dispatch event immediately and with a small delay to ensure listeners catch it
          window.dispatchEvent(new CustomEvent("actinova:loading-done"));
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent("actinova:loading-done"));
          }, 50);
          setTimeout(() => {
            const leftovers = document.querySelectorAll(
              "[data-actinova-loader-overlay], [data-actinova-loader]"
            );
            if (leftovers.length) {
              console.warn("Detected leftover loaders after generation, removing...", leftovers.length);
              leftovers.forEach((n) => n.remove());
            }
          }, 1000);
        }

        // Persist generated course to library if it's new
        if (!data.isExisting) {
          try {
            const libRes = await authenticatedFetch("/api/library", {
              method: "POST",
              headers: {
                "x-user-id": user?._id || user?.id || user?.idString || "",
              },
              body: JSON.stringify({
                action: "add",
                course: {
                  isGenerated: true,
                  courseData: courseDataToSet,
                  title: courseDataToSet.title,
                  topic: courseDataToSet.topic || actualTopic,
                  level: courseDataToSet.level || difficulty,
                  format,
                },
              }),
            });

            if (!libRes.ok) {
              const errorText = await libRes.text();
              console.warn("Failed to store course in library:", {
                status: libRes.status,
                statusText: libRes.statusText,
                response: errorText
              });
            } else {
              try {
                const libData = await libRes.json();
                console.log("Course saved to library:", libData);
              } catch (jsonErr) {
                console.warn("Library response was not JSON");
              }
            }
          } catch (libErr) {
            console.warn("Error storing course in library:", libErr);
          }
        }

        // Refresh user profile/usage so sidebar & upgrade reflect new quotas
        try {
          await fetchUser();
          // Also emit a lightweight event for any listeners
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("usageUpdated"));
          }
        } catch (e) {
          console.warn("Failed to refresh user usage after generation", e);
        }
        initializedCoursesRef.current.add(courseKey);
        console.log("Course data set successfully");
      } catch (err) {
        console.error("Error fetching course data:", JSON.stringify(err, Object.getOwnPropertyNames(err)));
        if (isMounted) {
          setError(err.message);
          toast.error(`Failed to load course: ${err.message}`);
        }
      } finally {
        console.log("Finally block executed, setting isLoading to false");
        if (isMounted) {
          console.log("Setting isLoading to false (finally)");
          setIsLoading(false);

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("actinova:loading-done"));
            setTimeout(() => {
              const leftovers = document.querySelectorAll(
                "[data-actinova-loader-overlay], [data-actinova-loader]"
              );
              if (leftovers.length) {
                console.warn("Detected leftover loaders in finally block, removing...", leftovers.length);
                leftovers.forEach((n) => n.remove());
              }
            }, 1000);
          }
        }
        fetchInProgressRef.current = false;
      }

      // Safety timeout to ensure loading state is cleared
      setTimeout(() => {
        if (isMounted && fetchInProgressRef.current) {
          console.log("Safety timeout: forcing isLoading to false");
          setIsLoading(false);
          fetchInProgressRef.current = false;

          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("actinova:loading-done"));
            setTimeout(() => {
              const leftovers = document.querySelectorAll(
                "[data-actinova-loader-overlay], [data-actinova-loader]"
              );
              if (leftovers.length) {
                console.warn("Detected leftover loaders from safety timeout, removing...", leftovers.length);
                leftovers.forEach((n) => n.remove());
              }
            }, 1000);
          }
        }
      }, 30000); // 30 seconds timeout
    };

    fetchCourseData();

    // Cleanup function
    return () => {
      isMounted = false;
      // Don't clear initializedCoursesRef here as we want to persist across re-mounts
    };
  }, [actualTopic, format, difficulty]);

  useEffect(() => {
    if (!courseData) return;

    const progressPercentage = (completedCount / totalLessons) * 100;

    if (progressPercentage === 100 && completedCount > 0) {
      const achievement = {
        id: Date.now(),
        title: courseData.title,
        recipient: "Student Name",
        date: new Date().toLocaleDateString(),
        level: courseData.level,
        score: "95%",
        skills: ["TypeScript", "JavaScript", "Programming", "Problem Solving"],
        status: "completed",
        courseProgress: 100,
      };

      toast.success("🎉 Congratulations! You've completed the course!");
    }
  }, [completedCount, totalLessons, courseData]);

  // Ensure loader disappears when course data is available
  useLayoutEffect(() => {
    if (courseData && isLoading) {
      setIsLoading(false);
    }
  }, [courseData, isLoading]);

  // No knowledge-check parsing: nothing to do when content changes

  // Show loading state only if no course data yet
  if (isLoading && !courseData) {
    return (
      <ActinovaLoader
        text={
          format === "quiz"
            ? "Generating your test"
            : format === "guide"
              ? "Generating your questions"
              : "Generating your course"
        }
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-500 mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Failed to generate course
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Ensure courseData exists
  if (!courseData) {
    return (
      <div className="h-[calc(100vh-6rem)] flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">
              No course data available
            </p>
          </div>
        </div>
      </div>
    );
  }

  // For flashcards, render the Flashcards component
  if (format === "flashcards") {
    return <Flashcards cardData={courseData} />;
  }

  // For quiz format, render the quiz interface
  if (format === "quiz") {
    return (
      <QuizInterface
        quizData={courseData}
        topic={topic}
        existingQuizId={existingQuizId}
      />
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden pt-safe-top"
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      {/* Navbar moved to bottom */}
      {/* Main Layout Area */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Backdrops - moved outside to fix blur and hidden on large screens */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
        {isRightPanelOpen && (
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setIsRightPanelOpen(false)}
          />
        )}

        {/* Left Sidebar - Course Navigation */}
        <div
          className={`${isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            } w-full lg:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col absolute z-40 transition-transform duration-300 max-w-[90vw] md:max-w-[400px] h-full overflow-y-auto hide-scrollbar shadow-xl pb-32 pb-safe-bottom`}
        >

          <div className="p-4 lg:p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between flex-wrap flex-col">
              <h2 className="font-bold text-lg text-gray-900 dark:text-gray-100 mb-2">
                {courseData.title}
              </h2>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {courseData.totalModules} modules • {courseData.totalLessons}{" "}
              lessons
            </p>
            <button
              onClick={() => {
                const isPro =
                  user &&
                  ((user.subscription &&
                    user.subscription.plan === "pro" &&
                    user.subscription.status === "active") ||
                    user.isPremium);
                if (!isPro) {
                  toast.error(
                    "PDF downloads are a Pro feature. Please upgrade."
                  );
                  router.push("/dashboard?tab=upgrade");
                  return;
                }
                try {
                  downloadCourseAsPDF(courseData, format);
                  toast.success("PDF download started!");
                } catch (error) {
                  console.error("Error downloading PDF:", error);
                  toast.error("Failed to download PDF");
                }
              }}
              disabled={
                !(
                  user &&
                  ((user.subscription &&
                    user.subscription.plan === "pro" &&
                    user.subscription.status === "active") ||
                    user.isPremium)
                )
              }
              className={
                user &&
                  ((user.subscription &&
                    user.subscription.plan === "pro" &&
                    user.subscription.status === "active") ||
                    user.isPremium)
                  ? "w-full mb-4 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                  : "w-full mb-4 flex items-center justify-center space-x-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
              }
            >
              <Download className="w-4 h-4" />
              <span>
                {user &&
                  ((user.subscription &&
                    user.subscription.plan === "pro" &&
                    user.subscription.status === "active") ||
                    user.isPremium)
                  ? `Download ${format === "flashcards" ? "Flashcards" : "Course"} as PDF`
                  : "Upgrade to Pro for PDF"}
              </span>
            </button>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center text-sm font-semibold">
                {Math.round(progressPercentage)}%
              </div>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Completed
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
          <div className="flex-1">
            {Array.isArray(courseData.modules) &&
              courseData.modules.map((module, moduleIndex) => (
                <div
                  key={module?.id ?? moduleIndex}
                  className="border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                >
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">
                        {moduleIndex + 1}
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100 text-left">
                        {module.title}
                      </span>
                    </div>
                    {expandedModules.has(module.id) ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>
                  {expandedModules.has(module.id) && (
                    <div className="bg-gray-50 dark:bg-gray-700">
                      {module.lessons.map((lesson, lessonIndex) => {
                        const lessonTitle =
                          typeof lesson === "string" ? lesson : lesson.title;
                        const lessonId = `${module.id}-${lessonIndex}`;
                        const isCompleted = completedLessons.has(lessonId);
                        const isActive =
                          activeLesson.moduleId === module.id &&
                          activeLesson.lessonIndex === lessonIndex;
                        return (
                          <button
                            key={lessonIndex}
                            onClick={() => selectLesson(module.id, lessonIndex)}
                            className={`w-full p-3 pl-12 flex items-center justify-between hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors ${isActive
                              ? "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500"
                              : ""
                              }`}
                          >
                            <div className="flex items-center space-x-3">
                              <div
                                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs font-medium ${isCompleted
                                  ? "bg-green-500 border-green-500 text-white"
                                  : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400"
                                  }`}
                              >
                                {isCompleted ? "✓" : lessonIndex + 1}
                              </div>
                              <span
                                className={`text-sm text-left ${isActive
                                  ? "text-blue-600 dark:text-blue-400 font-medium"
                                  : "text-gray-700 dark:text-gray-300"
                                  }`}
                              >
                                {lessonTitle}
                              </span>
                            </div>
                            {!isCompleted && (
                              <Play className="w-4 h-4 text-gray-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto hide-scrollbar bg-white dark:bg-gray-800"
          >
            <div
              style={{ paddingBottom: isBottomBarVisible ? "calc(10rem + env(safe-area-inset-bottom))" : "calc(2rem + env(safe-area-inset-bottom))" }}
              className={`mx-auto p-4 sm:p-6 lg:p-8 transition-all duration-300 ${isRightPanelOpen && isSidebarOpen ? "max-w-4xl" : "max-w-5xl"}`}
            >
              {lessonContentLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Generating lesson content...
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Please wait while we create personalized content for you
                  </p>
                </div>
              ) : currentLesson?.content ? (
                <div>
                  <div className="prose prose-sm sm:prose-base lg:prose-lg dark:prose-invert max-w-none">
                    {/* Visualizations removed: use images or links in content */}
                    <div
                      dangerouslySetInnerHTML={{
                        __html: renderContent(currentLesson.content),
                      }}
                    />
                  </div>


                </div>
              ) : (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    Select a lesson to start learning
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    Choose a lesson from the sidebar to begin
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Notes & AI Tutor */}
        <div
          style={{ paddingBottom: isBottomBarVisible ? "calc(4rem + env(safe-area-inset-bottom))" : "env(safe-area-inset-bottom)" }}
          className={`${isRightPanelOpen ? "translate-x-0" : "translate-x-full"
            } w-full lg:w-80 xl:w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 flex flex-col absolute z-40 transition-transform duration-300 max-w-[100vw] md:max-w-[400px] right-0 h-full shadow-xl`}
        >

          <div className="border-b border-gray-200 dark:border-gray-700 relative">
            <div className="flex">
              <button
                onClick={() => setActiveRightPanel("notes")}
                className={`flex-1 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeRightPanel === "notes"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
              >
                <FileText className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                Notes
              </button>
              <button
                onClick={() => setActiveRightPanel("chat")}
                className={`flex-1 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm font-medium border-b-2 transition-colors ${activeRightPanel === "chat"
                  ? "border-blue-500 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
              >
                <MessageCircle className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" />
                AI Tutor
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-hidden">
            {activeRightPanel === "notes" ? (
              <div className="h-full flex flex-col">
                <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100">
                    My Notes
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                    Take notes while learning
                  </p>
                </div>
                <div className="flex-1 p-3 sm:p-4">
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Write your notes here... remember to download them before leaving this page!!"
                    className="w-full h-full resize-none overflow-y-auto hide-scrollbar bg-transparent text-sm sm:text-base text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
                    dir="ltr"
                    style={{ direction: "ltr", unicodeBidi: "plaintext" }}
                  />
                  {isSavingNotes && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                      Saving...
                    </div>
                  )}
                </div>
                <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => {
                      const isPro =
                        user &&
                        ((user.subscription &&
                          user.subscription.plan === "pro" &&
                          user.subscription.status === "active") ||
                          user.isPremium);
                      if (!isPro) {
                        toast.error(
                          "Notes PDF export is a Pro feature. Please upgrade."
                        );
                        // Redirect removed per user request: "he should remain on the lesson"
                        return;
                      }
                      handleDownloadNotes();
                    }}
                    disabled={
                      !notes.trim() ||
                      !(
                        user &&
                        ((user.subscription &&
                          user.subscription.plan === "pro" &&
                          user.subscription.status === "active") ||
                          user.isPremium)
                      )
                    }
                    className={
                      user &&
                        ((user.subscription &&
                          user.subscription.plan === "pro" &&
                          user.subscription.status === "active") ||
                          user.isPremium)
                        ? "w-full flex items-center justify-center space-x-1 sm:space-x-2 py-1.5 sm:py-4 px-3 sm:px-4 text-sm rounded-lg transition-colors sm:p-x3 bg-blue-600 text-white hover:bg-blue-700"
                        : "w-full flex items-center justify-center space-x-1 sm:space-x-2 py-1.5 sm:py-4 px-3 sm:px-4 text-sm rounded-lg disabled:opacity-50 transition-colors sm:p-x3 bg-gray-300 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                    }
                  >
                    <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                    <span>
                      {user &&
                        ((user.subscription &&
                          user.subscription.plan === "pro" &&
                          user.subscription.status === "active") ||
                          user.isPremium)
                        ? "Download Notes"
                        : "Pro: Notes PDF"}
                    </span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col bg-[#e5ddd5] dark:bg-[#0b141a] relative overflow-hidden">
                {/* Chat Background Pattern - Subtle Overlay */}
                <div
                  className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none"
                  style={{
                    backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")`,
                    backgroundRepeat: 'repeat'
                  }}
                />

                <div className="p-3 sm:p-4 border-b border-gray-200/50 dark:border-gray-700/50 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-10 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-gray-100 flex items-center">
                      <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                      AI Tutor
                    </h3>
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Online & ready to help
                    </p>
                  </div>
                </div>

                <div
                  ref={chatContainerRef}
                  className="flex-1 overflow-y-auto scrollbar-hide p-3 sm:p-4 space-y-3 z-10"
                >
                  <style jsx>{`
                    .scrollbar-hide::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  {chatMessages.map((message, index) => {
                    const isUser = message.type === "user";
                    const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                    return (
                      <div
                        key={index}
                        className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                      >
                        <div
                          className={`max-w-[85%] px-3 py-2 rounded-xl text-sm relative shadow-sm ${isUser
                            ? "bg-blue-600 dark:bg-blue-700 text-white rounded-tr-none"
                            : "bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 rounded-tl-none"
                            }`}
                        >
                          {!isUser && (
                            <div className="flex items-center space-x-2 mb-1 opacity-70">
                              <Bot className="w-3 h-3 text-blue-500" />
                              <span className="text-[10px] font-bold uppercase tracking-wider">
                                AI Tutor
                              </span>
                            </div>
                          )}

                          {message.html ? (
                            <div
                              className="prose prose-sm dark:prose-invert max-w-none break-words"
                              dangerouslySetInnerHTML={{
                                __html: message.message,
                              }}
                            />
                          ) : (
                            <p className="whitespace-pre-wrap break-words">{message.message}</p>
                          )}

                          <div className={`text-[10px] mt-1 flex justify-end items-center space-x-1 opacity-50 ${isUser ? "text-gray-700 dark:text-gray-300" : "text-gray-500 dark:text-gray-400"}`}>
                            <span>{time}</span>
                            {isUser && (
                              <svg className="w-3 h-3 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M20 6L9 17l-5-5" />
                                <path d="M20 10l-11 11-5-5" className="translate-x-1" />
                              </svg>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 sm:p-4 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-t border-gray-200/50 dark:border-gray-700/50 z-10 transition-all">
                  <div className="flex items-end space-x-2 max-w-full">
                    <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-2xl shadow-sm border border-gray-200 dark:border-transparent focus-within:border-blue-500 transition-all flex items-end p-1">
                      <textarea
                        value={aiQuestion}
                        onChange={(e) => {
                          setAiQuestion(e.target.value);
                          // Auto expand height
                          e.target.style.height = 'auto';
                          e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            if (aiQuestion.trim()) {
                              sendAiQuestion();
                              e.target.style.height = 'auto';
                            }
                          }
                        }}
                        placeholder="Type a message"
                        className="flex-1 px-3 py-2 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none resize-none max-h-[120px]"
                        rows={1}
                      />
                    </div>
                    <button
                      onClick={() => {
                        sendAiQuestion();
                        // Reset textarea height after click
                        const textarea = document.querySelector('textarea[placeholder="Type a message"]');
                        if (textarea) textarea.style.height = 'auto';
                      }}
                      disabled={!aiQuestion.trim()}
                      className={`p-3 rounded-full flex items-center justify-center transition-all ${aiQuestion.trim()
                        ? "bg-[#00a884] shadow-lg scale-100 hover:bg-[#008f72] active:scale-95"
                        : "bg-gray-300 dark:bg-gray-700 opacity-50 cursor-not-allowed scale-90"
                        }`}
                    >
                      <Send className={`w-5 h-5 text-white ${aiQuestion.trim() ? "translate-x-0.5 -translate-y-0.5" : ""}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Bar - Redesigned to match Dashboard */}
      <motion.div
        initial={{ y: 0 }}
        animate={{ y: isBottomBarVisible && !isKeyboardOpen ? 0 : 100 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe-bottom z-50"
      >
        <div className="flex justify-around items-center h-14 px-2">

          {/* 1. Modules (Left) */}
          <button
            onClick={() => {
              setIsSidebarOpen(!isSidebarOpen);
              if (!isSidebarOpen) setIsRightPanelOpen(false);
            }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isSidebarOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <Menu size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Modules</span>
          </button>

          {/* 2. Status / Mark Complete (Left) */}
          <button
            onClick={async () => {
              if (!activeLesson || lessonContentLoading) return;
              const lessonId = `${activeLesson.moduleId}-${activeLesson.lessonIndex}`;
              const isCurrentlyCompleted = completedLessons.has(lessonId);
              const action = isCurrentlyCompleted ? "incomplete" : "complete";
              toast.loading(`Marking lesson as ${action}...`, { id: "mark-complete" });
              try {
                await toggleLessonCompletion(activeLesson.moduleId, activeLesson.lessonIndex);
                toast.success(`Lesson marked as ${action}!`, { id: "mark-complete" });
              } catch (error) {
                toast.error(`Error: ${error.message}`, { id: "mark-complete" });
              }
            }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${completedLessons.has(`${activeLesson.moduleId}-${activeLesson.lessonIndex}`) ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"}`}
            disabled={!currentLesson?.content || lessonContentLoading}
          >
            <CheckCircle size={22} strokeWidth={2} className={completedLessons.has(`${activeLesson.moduleId}-${activeLesson.lessonIndex}`) ? "fill-current opacity-20" : ""} />
            <span className="text-[10px] font-medium">Status</span>
          </button>

          {/* 3. Home (Center) */}
          <Link
            href="/dashboard"
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Home size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Home</span>
          </Link>

          {/* 4. Download (Right) */}
          <button
            onClick={() => {
              const isPro = user && ((user.subscription?.plan === "pro" && user.subscription?.status === "active") || user.isPremium);
              if (!isPro) {
                toast.error("Pro feature. Please upgrade to download.");
                // Redirect removed per user request
                return;
              }
              if (!currentLesson?.content) return;
              downloadCourseAsPDF({ title: currentLesson.title, content: currentLesson.content }, "notes");
              toast.success("Downloading...");
            }}
            className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <Download size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Save</span>
          </button>

          {/* 5. Tools (Right) */}
          <button
            onClick={() => {
              setIsRightPanelOpen(!isRightPanelOpen);
              if (!isRightPanelOpen) setIsSidebarOpen(false);
            }}
            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isRightPanelOpen ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400"}`}
          >
            <MessageCircle size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Tools</span>
          </button>
        </div>
      </motion.div>

      {/* Notes Download Modal removed for instant download */}

      {/* Limit Reached Modal */}
      {showLimitModal && limitModalData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-orange-600 dark:text-orange-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Monthly Limit Reached
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                You've used {limitModalData.used} of {limitModalData.limit} free{" "}
                {format === "flashcards" ? "flashcard sets" : "courses"} this
                month.
              </p>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  Upgrade to Pro for unlimited{" "}
                  {format === "flashcards" ? "flashcards" : "courses"} and
                  premium features!
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setLimitModalData(null);
                  }}
                  className="flex-1 px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Maybe Later
                </button>
                <button
                  onClick={() => {
                    setShowLimitModal(false);
                    setLimitModalData(null);
                    router.push("/dashboard?tab=upgrade");
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Upgrade to Pro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}