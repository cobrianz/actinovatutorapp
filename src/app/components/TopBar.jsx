import React from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { useAuth } from "../components/AuthProvider";

export default function TopBar() {
    const { user } = useAuth();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    return (
        <div className="fixed top-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-b border-gray-100 dark:border-gray-800 z-40 pt-safe-top">
            <div className="h-16 flex items-center justify-between px-4">
                {/* Left: User Profile / Greeting */}
                <Link href="/profile" className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-sm">
                        {user?.name?.[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {getGreeting()}
                        </span>
                        <span className="text-sm font-bold text-gray-900 dark:text-white leading-tight truncate max-w-[150px]">
                            {user?.name?.split(" ")[0] || "Learner"}
                        </span>
                    </div>
                </Link>

                {/* Right: Search */}
                <Link
                    href="/search"
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition"
                >
                    <Search size={20} />
                </Link>
            </div>
        </div>
    );
}
