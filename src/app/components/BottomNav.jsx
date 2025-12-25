"use client";

import {
    BookOpen,
    MessageCircle,
    Plus,
    HelpCircle,
    FileText
} from "lucide-react";
import { motion } from "framer-motion";

export default function BottomNav({ activeContent, setActiveContent }) {
    const navItems = [
        { id: "library", icon: BookOpen },
        { id: "chat", icon: MessageCircle },
        { id: "generate", icon: Plus, isCenter: true },
        { id: "quizzes", icon: HelpCircle },
        { id: "flashcards", icon: FileText },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 px-6 py-4 z-[100] safe-area-inset-bottom">
            <div className="flex justify-between items-center max-w-lg mx-auto relative h-12">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeContent === item.id;

                    if (item.isCenter) {
                        return (
                            <div key={item.id} className="relative -top-5">
                                <button
                                    onClick={() => setActiveContent(item.id)}
                                    className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 transform active:scale-90 ${isActive
                                        ? "bg-indigo-600 text-white shadow-indigo-500/30"
                                        : "bg-blue-600 text-white shadow-blue-500/20"
                                        }`}
                                >
                                    <Plus className="w-6 h-6" strokeWidth={3} />
                                </button>
                            </div>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={() => setActiveContent(item.id)}
                            className="flex flex-col items-center relative p-2"
                        >
                            <div
                                className={`transition-all duration-300 ${isActive
                                    ? "text-indigo-600 dark:text-indigo-400"
                                    : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                                    }`}
                            >
                                <Icon className={`w-7 h-7 transition-transform duration-300 ${isActive ? "scale-110" : ""}`} />
                            </div>
                            {isActive && (
                                <motion.div
                                    layoutId="bottomNavDot"
                                    className="absolute -bottom-1 w-1 h-1 bg-indigo-600 dark:bg-indigo-400 rounded-full"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
