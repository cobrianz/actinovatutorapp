"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutDashboard, Compass, User, MessageSquare } from "lucide-react";

export default function BottomNavigation() {
    const pathname = usePathname();

    const navItems = [
        {
            label: "Home",
            icon: Home,
            href: "/dashboard",
            isActive: (path) => path === "/dashboard",
        },
        {
            label: "Courses",
            icon: LayoutDashboard,
            href: "/courses",
            isActive: (path) => path.startsWith("/courses"),
        },
        {
            label: "Explore",
            icon: Compass,
            href: "/explore",
            isActive: (path) => path.startsWith("/explore"),
        },
        {
            label: "AI Chat",
            icon: MessageSquare,
            href: "/chat",
            isActive: (path) => path.startsWith("/chat"),
        },
        {
            label: "Account",
            icon: User,
            href: "/profile",
            isActive: (path) => path.startsWith("/profile"),
        },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-gray-900/80 backdrop-blur-lg border-t border-gray-200 dark:border-gray-800 pb-safe-bottom z-50">
            <div className="flex justify-around items-center h-14">
                {navItems.map((item) => {
                    const active = item.isActive(pathname);
                    return (
                        <Link
                            key={item.label}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${active
                                ? "text-blue-600 dark:text-blue-400"
                                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                                }`}
                        >
                            <item.icon
                                size={24}
                                className={`transition-transform duration-200 ${active ? "scale-110" : ""
                                    }`}
                                strokeWidth={active ? 2.5 : 2}
                            />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
