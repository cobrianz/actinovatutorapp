"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    BookOpen,
    MessageCircle,
    Plus,
    HelpCircle,
    FileText,
    Search,
    User,
    LogOut,
    Moon,
    Sun,
    Menu,
    ChevronLeft,
    ChevronRight,
    TrendingUp,
    Settings,
    X,
    Crown,
    Zap
} from "lucide-react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import { getApiUrl } from "../lib/apiConfig";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";

export default function Sidebar({ activeContent, setActiveContent, isOpen, setIsOpen }) {
    const { theme, toggleTheme } = useTheme();
    const { user, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(false);

    const navItems = [
        { id: "generate", label: "New", icon: Plus, color: "text-blue-500" },
        { id: "explore", label: "Explore", icon: Search, color: "text-emerald-500" },
        { id: "library", label: "Library", icon: BookOpen, color: "text-indigo-500" },
        { id: "flashcards", label: "Flashcards", icon: FileText, color: "text-rose-500" },
        { id: "quizzes", label: "Test Yourself", icon: HelpCircle, color: "text-orange-500" },
        { id: "chat", label: "AI Chat", icon: MessageCircle, color: "text-purple-500" },
        { id: "staff-picks", label: "Premium", icon: Crown, color: "text-amber-500" },
        { id: "upgrade", label: "Upgrade", icon: Zap, color: "text-blue-600" },
    ];

    const handleLogout = async () => {
        try {
            await fetch(getApiUrl("/api/logout"), { method: "POST" });
            logout();
            toast.success("Logged out successfully");
            router.push("/");
        } catch (error) {
            console.error("Logout error:", error);
            logout();
            router.push("/");
        }
    };

    // Mobile Swipe Logic
    useEffect(() => {
        let touchStartX = 0;
        let touchStartY = 0;

        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        };

        const handleTouchEnd = (e) => {
            if (isOpen) return; // Already open, handled by backdrop click or close button

            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Check for horizontal swipe (right)
            // Allow swipe from left 30% of screen to be generous ("not touching left")
            // Ensure vertical movement is minimal to avoid scrolling interference
            if (
                diffX > 100 &&
                Math.abs(diffY) < 60
            ) {
                setIsOpen(true);
            }
        };

        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [isOpen, setIsOpen]);

    const sidebarVariants = {
        open: { x: 0, opacity: 1 },
        closed: { x: "-100%", opacity: 0 },
    };

    const desktopWidth = isCollapsed ? "w-20" : "w-64";

    return (
        <>
            {/* Mobile Drag Handle / Edge Trigger */}
            <div
                className="fixed inset-y-0 left-0 w-12 z-50 lg:hidden"
                onMouseEnter={() => !isOpen && setIsOpen(true)}
            />

            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsOpen(false)}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] lg:hidden"
                    />
                )}
            </AnimatePresence>

            {/* Sidebar Container */}
            <motion.aside
                initial={false}
                animate={isOpen ? "open" : "closed"}
                variants={sidebarVariants}
                drag="x"
                dragConstraints={{ left: -300, right: 0 }}
                dragElastic={0.1}
                onDragEnd={(e, info) => {
                    if (info.offset.x < -100) setIsOpen(false);
                    if (info.offset.x > 100) setIsOpen(true);
                }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className={`fixed inset-y-0 left-0 z-[70] bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col transition-all duration-300 lg:relative lg:translate-x-0 lg:opacity-100 ${desktopWidth}`}
            >
                {/* Header */}
                <div className="p-6 flex items-center justify-between">
                    <div className={`flex items-center gap-3 overflow-hidden ${isCollapsed ? 'lg:justify-center lg:w-full' : ''}`}>
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                            <img src="/logo.png" alt="Actinova" className="w-full h-full object-contain" />
                        </div>
                        {!isCollapsed && (
                            <span className="font-black text-xl tracking-tight text-gray-900 dark:text-white">
                                Actinova
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation Section */}
                <div className="flex-1 px-4 py-4 space-y-2 overflow-y-auto no-scrollbar">
                    {navItems.map((item) => {
                        const isActive = activeContent === item.id;
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    setActiveContent(item.id);
                                    if (window.innerWidth < 1024) setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl transition-all duration-200 group relative ${isActive
                                    ? "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400"
                                    : "text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-gray-100"
                                    } ${isCollapsed ? 'lg:justify-center lg:px-0' : ''}`}
                            >
                                <div className={`${isActive ? item.color : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-900 dark:group-hover:text-gray-100'}`}>
                                    <item.icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                                </div>
                                {!isCollapsed && (
                                    <span className={`font-bold text-sm ${isActive ? 'translate-x-1' : ''} transition-transform`}>
                                        {item.label}
                                    </span>
                                )}
                                {isActive && !isCollapsed && (
                                    <motion.div
                                        layoutId="activePill"
                                        className="absolute inset-y-2 left-0 w-1 bg-blue-600 rounded-full"
                                    />
                                )}
                                {isCollapsed && isActive && (
                                    <div className="absolute inset-y-3 right-0 w-0.5 bg-blue-600 rounded-full" />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Bottom Section */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-800 space-y-2">
                    {/* User Profile */}
                    <button
                        onClick={() => {
                            setActiveContent("profile");
                            if (window.innerWidth < 1024) setIsOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-all ${isCollapsed ? 'lg:justify-center lg:p-2' : ''}`}
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-500/10">
                            <User size={20} />
                        </div>
                        {!isCollapsed && (
                            <div className="flex-1 text-left overflow-hidden">
                                <p className="font-bold text-sm text-gray-900 dark:text-white truncate">
                                    {user?.firstName || user?.name || "Premium User"}
                                </p>
                                <p className="text-[10px] text-gray-500 dark:text-gray-400 font-bold uppercase tracking-wider">
                                    View Profile
                                </p>
                            </div>
                        )}
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleTheme}
                            className={`flex-1 flex items-center justify-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-all ${isCollapsed ? 'lg:p-3' : ''}`}
                        >
                            {theme === "light" ? <Moon size={20} /> : <Sun size={20} />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className={`flex-1 flex items-center justify-center p-3 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400 hover:text-rose-500 transition-all ${isCollapsed ? 'lg:p-3' : ''}`}
                        >
                            <LogOut size={20} />
                        </button>
                    </div>

                    <button
                        onClick={() => setIsCollapsed(!isCollapsed)}
                        className="hidden lg:flex w-full items-center justify-center p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
                    </button>
                </div>
            </motion.aside>
        </>
    );
}
