"use client";

import { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Plus,
  MessageSquare,
  X,
  Trash2,
  ChevronLeft,
  Search,
  MoreVertical,
  Paperclip
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "./AuthProvider";
import { useTheme } from "./ThemeProvider";
import { useSearchParams } from "next/navigation";
import ConfirmModal from "./ConfirmModal";
import ActinovaLoader from "./ActinovaLoader";
import SessionGuard, { useEnsureSession } from "./SessionGuard";

// Function to render markdown/rich text formatting
const renderFormattedContent = (content) => {
  if (!content) return "";

  let html = content;

  // Handle bold **text** or __text__
  html = html.replace(
    /\*\*([^*]+?)\*\*/g,
    '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>'
  );
  html = html.replace(
    /__([^_]+?)__/g,
    '<strong class="font-bold text-gray-900 dark:text-gray-100">$1</strong>'
  );

  // Handle italics *text* or _text_
  html = html.replace(
    /\*([^*\n]+?)\*/g,
    '<em class="italic text-gray-800 dark:text-gray-200">$1</em>'
  );
  html = html.replace(
    /_([^_\n]+?)_/g,
    '<em class="italic text-gray-800 dark:text-gray-200">$1</em>'
  );

  // Handle underline
  html = html.replace(
    /<u>([^<]+?)<\/u>/g,
    '<u class="underline decoration-2">$1</u>'
  );

  // Handle inline code `code`
  html = html.replace(
    /`([^`]+)`/g,
    '<code class="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm font-mono text-red-500 dark:text-red-400 border border-gray-200 dark:border-gray-700">$1</code>'
  );

  // Handle line breaks
  html = html.replace(/\n/g, "<br />");

  return html;
};

export default function Chat({ topic: propTopic }) {
  const searchParams = useSearchParams();
  const urlTopic = searchParams.get("topic");
  const { theme } = useTheme();

  const [topic, setTopic] = useState(() => {
    if (propTopic) return propTopic;
    if (urlTopic) return decodeURIComponent(urlTopic);
    return null;
  });
  const [topicInput, setTopicInput] = useState("");
  const [showTopicInput, setShowTopicInput] = useState(!propTopic && !urlTopic);
  const messagesEndRef = useRef(null);
  const { user, authLoading } = useEnsureSession();

  if (authLoading) return <ActinovaLoader />;
  if (!user) return null;

  // Load chat history from database
  const loadChatHistory = async (currentTopic) => {
    if (!currentTopic || !user) return [];

    try {
      const response = await fetch(
        `/api/chat/history?topic=${encodeURIComponent(currentTopic)}`,
        {
          credentials: "include",
          headers: {
            "x-user-id": user?._id || user?.id || "",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.messages || [];
      }
    } catch (error) {
      console.error("Error loading chat history:", error);
    }
    return [];
  };

  // Save chat history to database
  const saveChatHistory = async (messagesToSave, currentTopic) => {
    if (!currentTopic || !user || messagesToSave.length === 0) return;

    try {
      await fetch("/api/chat/history", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-user-id": user?._id || user?.id || "",
        },
        body: JSON.stringify({
          topic: currentTopic,
          messages: messagesToSave,
        }),
        credentials: "include",
      });
    } catch (error) {
      console.error("Error saving chat history:", error);
    }
  };

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [chatTopics, setChatTopics] = useState([]);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showClearHistoryModal, setShowClearHistoryModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState(null);

  // Load chat topics list
  const loadChatTopics = async () => {
    if (!user) return;

    setLoadingTopics(true);
    try {
      const response = await fetch("/api/chat/history?action=topics", {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        setChatTopics(data.topics || []);
      }
    } catch (error) {
      console.error("Error loading chat topics:", error);
    } finally {
      setLoadingTopics(false);
    }
  };

  useEffect(() => {
    if (topic && user) {
      setLoadingHistory(true);
      setMessages([]);
      loadChatHistory(topic).then((history) => {
        setMessages(history);
        setLoadingHistory(false);
      });
    } else {
      setMessages([]);
    }
  }, [topic, user]);

  useEffect(() => {
    if (user) {
      loadChatTopics();
    }
  }, [user]);

  useEffect(() => {
    if (messages.length > 0 && user) {
      loadChatTopics();
    }
  }, [messages.length, user]);

  useEffect(() => {
    if (messages.length > 0 && topic && user) {
      const timeoutId = setTimeout(() => {
        saveChatHistory(messages, topic);
      }, 1000);
      return () => clearTimeout(timeoutId);
    }
  }, [messages, topic, user]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSetTopic = () => {
    if (!topicInput.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    setTopic(topicInput.trim());
    setTopicInput("");
    setShowTopicInput(false);
    toast.success(`Topic set to: ${topicInput.trim()}`);
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      setShowNewChatModal(true);
    } else {
      setTopic(null);
      setMessages([]);
      setShowTopicInput(true);
      setInput("");
      setView("chat");
    }
  };

  const confirmNewChat = () => {
    setTopic(null);
    setMessages([]);
    setShowTopicInput(true);
    setInput("");
    setShowNewChatModal(false);
    setView("chat");
  };

  const handleLoadTopic = async (topicName) => {
    setMessages([]);
    setLoadingHistory(true);
    setTopic(topicName);
    setShowTopicInput(false);
    setView("chat");
    await new Promise((resolve) => setTimeout(resolve, 100));
    const history = await loadChatHistory(topicName);
    setMessages(history);
    setLoadingHistory(false);
  };

  const handleClearTopic = () => {
    setTopic(null);
    setMessages([]);
    setShowTopicInput(true);
  };

  const handleClearHistory = () => {
    if (!topic) return;
    setShowClearHistoryModal(true);
  };

  const confirmClearHistory = async () => {
    if (!topic) return;
    try {
      const response = await fetch(
        `/api/chat/history?topic=${encodeURIComponent(topic)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (response.ok) {
        setMessages([]);
        setShowClearHistoryModal(false);
        toast.success("Chat history cleared");
        loadChatTopics();
      }
    } catch (error) {
      console.error("Error clearing chat history:", error);
    }
  };

  const handleDeleteTopic = (topicName, e) => {
    e.stopPropagation();
    setTopicToDelete(topicName);
    setShowDeleteModal(true);
  };

  const confirmDeleteTopic = async () => {
    if (!topicToDelete) return;
    try {
      const response = await fetch(
        `/api/chat/history?topic=${encodeURIComponent(topicToDelete)}&action=delete`,
        { method: "DELETE", credentials: "include" }
      );
      if (response.ok) {
        toast.success(`Chat "${topicToDelete}" deleted`);
        if (topic === topicToDelete) {
          setTopic(null);
          setMessages([]);
          setShowTopicInput(true);
        }
        loadChatTopics();
      }
    } catch (error) {
      console.error("Error deleting chat:", error);
    } finally {
      setShowDeleteModal(false);
      setTopicToDelete(null);
    }
  };

  const isPro =
    user &&
    ((user.subscription &&
      (user.subscription.plan === "pro" || user.subscription.plan === "enterprise") &&
      user.subscription.status === "active") ||
      user.isPremium);

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!isPro) {
      toast.error("Premium subscription required for AI tutor chat. Please upgrade.");
      return;
    }
    if (!topic) {
      toast.error("Please set a topic first.");
      return;
    }

    const userMessage = {
      role: "user",
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    const updatedMessagesWithUser = [...messages, userMessage];
    setMessages(updatedMessagesWithUser);
    setInput("");
    setLoading(true);

    try {
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory,
          topic: topic,
        }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        const aiMessage = {
          role: "assistant",
          content: data.response,
          timestamp: data.timestamp,
        };
        const finalMessages = [...updatedMessagesWithUser, aiMessage];
        setMessages(finalMessages);
        await saveChatHistory(finalMessages, topic);
      } else {
        setMessages((prev) => prev.slice(0, -1));
        toast.error(data.error || "Failed to get response");
      }
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const [view, setView] = useState(topic ? "chat" : "history");

  useEffect(() => {
    if (topic) setView("chat");
    else setView("history");
  }, [topic]);

  return (
    <div className={`flex flex-col w-full h-full overflow-hidden relative ${theme === 'dark' ? 'bg-gray-950 text-white' : 'bg-white text-gray-900'}`}>

      {/* History View */}
      {view === "history" && (
        <div className="flex-1 overflow-y-auto px-4 py-6 max-w-2xl mx-auto w-full space-y-4">
          <h2 className="text-2xl font-black uppercase tracking-widest mb-6 px-2">Your Conversations</h2>

          {/* New Chat Button at Top */}
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-4 p-4 rounded-3xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all mb-8"
          >
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center">
              <Plus size={24} />
            </div>
            <div className="text-left">
              <span className="block font-black uppercase tracking-widest text-xs opacity-80">Start Fresh</span>
              <span className="text-lg font-bold">New Question</span>
            </div>
          </button>

          <div className="space-y-3">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-500 mb-2 px-2">Recent Sessions</h3>
            {loadingTopics ? (
              <div className="py-12 flex justify-center"><ActinovaLoader /></div>
            ) : chatTopics.length === 0 ? (
              <div className="text-center py-20 bg-gray-50 dark:bg-gray-900/50 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
                <MessageSquare className="mx-auto mb-4 opacity-20" size={48} />
                <p className="text-gray-500 font-medium">No history yet. Ask your first question!</p>
              </div>
            ) : (
              chatTopics.map((chat) => (
                <button
                  key={chat.id || chat.topic}
                  onClick={() => handleLoadTopic(chat.topic)}
                  className="w-full flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm active:scale-[0.98] transition-all"
                >
                  <div className="flex items-center gap-4 text-left">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                      <MessageSquare className="text-indigo-600 dark:text-indigo-400" size={20} />
                    </div>
                    <div>
                      <span className="block font-bold text-sm tracking-tight truncate max-w-[200px]">{chat.topic}</span>
                      <span className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">
                        {chat.messageCount || 0} messages
                      </span>
                    </div>
                  </div>
                  <ChevronLeft size={18} className="text-gray-400 rotate-180" />
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area - WhatsApp Style with Gradient */}
      {view === "chat" && (
        <div className="flex-1 flex flex-col relative w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">

          {/* Chat Background Pattern */}
          <div
            className="absolute inset-0 opacity-[0.05] dark:opacity-[0.03] pointer-events-none"
            style={{
              backgroundImage: `url("https://www.transparenttextures.com/patterns/cubes.png")`,
              backgroundRepeat: 'repeat'
            }}
          />

          {/* Header */}
          <div className="h-16 flex items-center justify-between px-4 sticky top-0 w-full bg-white/80 dark:bg-[#111b21]/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700/50 z-10 shadow-sm">
            <div className="flex items-center">
              <button onClick={() => setView("history")} className="p-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white rounded-lg">
                <ChevronLeft className="w-6 h-6" />
              </button>
              <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-3 shadow-inner">
                <Bot className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-gray-100 tracking-tight truncate max-w-[150px]">{topic || "AI Tutor"}</h3>
                <p className="text-[10px] text-green-500 dark:text-green-400 font-bold uppercase tracking-widest">online</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={handleClearHistory} className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content Stream - Bubbles */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 scroll-smooth z-10">
            {showTopicInput && (
              <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto text-center px-4">
                <div className="w-20 h-20 bg-white dark:bg-gray-800 rounded-3xl flex items-center justify-center mb-6 shadow-xl active:scale-95 transition-all">
                  <Sparkles className="w-10 h-10 text-indigo-600" />
                </div>
                <h2 className="text-3xl font-black uppercase tracking-tighter text-gray-900 dark:text-white mb-2">Ask Anything</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">Enter a topic to begin your personalized session</p>
                <div className="w-full relative shadow-2xl rounded-3xl overflow-hidden border border-gray-100 dark:border-gray-800">
                  <input
                    type="text"
                    value={topicInput}
                    onChange={(e) => setTopicInput(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSetTopic()}
                    placeholder="Enter a topic..."
                    className="w-full px-6 py-5 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-0 outline-none text-lg font-bold"
                    autoFocus
                  />
                  <button
                    onClick={handleSetTopic}
                    className="absolute right-2 top-2 bottom-2 px-8 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs"
                  >
                    Start
                  </button>
                </div>
              </div>
            )}

            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((message, index) => {
                const isUser = message.role === "user";
                const time = message.timestamp ? new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";

                return (
                  <div key={index} className={`flex ${isUser ? "justify-end" : "justify-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-2xl shadow-sm text-sm relative ${isUser
                      ? "bg-indigo-600 text-white rounded-tr-none shadow-indigo-500/10"
                      : "bg-white dark:bg-[#1c2c33] text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-800/50"
                      }`}>
                      <div
                        className={`prose prose-sm max-w-none break-words ${isUser ? 'prose-invert text-white' : 'dark:prose-invert text-gray-800 dark:text-gray-100'}`}
                        dangerouslySetInnerHTML={{ __html: renderFormattedContent(message.content) }}
                      />
                      <div className={`text-[9px] font-bold uppercase tracking-widest mt-2 flex justify-end items-center gap-1 opacity-50 ${isUser ? "text-indigo-100" : "text-gray-400"}`}>
                        <span>{time}</span>
                        {isUser && <Sparkles size={10} className="text-white" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-[#1c2c33] px-4 py-2 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce delay-75"></div>
                    <div className="w-1.5 h-1.5 bg-indigo-600 rounded-full animate-bounce delay-150"></div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-32" />
            </div>
          </div>

          {/* Input Area - Beautiful and Focused */}
          <div className="p-4 bg-transparent z-10 absolute bottom-0 w-full">
            <div className="max-w-2xl mx-auto flex items-end gap-2 px-2">
              <div className="flex-1 flex items-end bg-white/95 dark:bg-[#1c2c33]/95 backdrop-blur-md rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800 px-4 py-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Type a question..."
                  className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2.5 text-sm text-gray-900 dark:text-white font-medium"
                  rows={1}
                  onInput={(e) => {
                    e.target.style.height = 'auto';
                    e.target.style.height = e.target.scrollHeight + 'px';
                  }}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-90 ${input.trim()
                  ? "bg-indigo-600 text-white shadow-indigo-500/30"
                  : "bg-gray-300 dark:bg-gray-700 text-white opacity-50"
                  }`}
              >
                <Send className="w-5 h-5 -mr-0.5 mt-0.5" />
              </button>
            </div>
          </div>

        </div>
      )}

      <ConfirmModal
        isOpen={showNewChatModal}
        onClose={() => setShowNewChatModal(false)}
        onConfirm={confirmNewChat}
        title="Start New Session"
        message="Would you like to start a fresh learning session? Your history will be preserved."
        confirmText="Confirm"
        cancelText="Maybe later"
        confirmColor="black"
      />

      <ConfirmModal isOpen={showClearHistoryModal} onClose={() => setShowClearHistoryModal(false)} onConfirm={confirmClearHistory} title="Clear Context" message="Clear current chat context? This will remove these messages from memory." confirmText="Clear" cancelText="Cancel" confirmColor="red" />
      <ConfirmModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} onConfirm={confirmDeleteTopic} title="Delete Conversation" message="Are you sure you want to permanently delete this conversation?" confirmText="Delete" cancelText="Cancel" confirmColor="red" />

    </div>
  );
}
