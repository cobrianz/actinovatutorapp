"use client";

import {
  Moon,
  Sun,
  User,
  Settings,
  LogOut,
  Menu,
  Home,
  BookOpen,
  Search,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useTheme } from "./ThemeProvider";
import { useAuth } from "./AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";

export default function Navbar({ setActiveContent }) {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef(null);

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST" });
      logout();
      toast.success("Successfully logged out");
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
      logout();
      router.push("/");
    }
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-8 py-3 sticky top-0 left-0 right-0 z-40">
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
        {/* Left Section: Explore and Theme */}
        <div className="flex items-center space-x-2 sm:space-x-4">
          <button
            onClick={() => setActiveContent("explore")}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Explore"
          >
            <Search className="w-5 h-5" />
          </button>
          <button
            onClick={toggleTheme}
            className="p-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
        </div>

        {/* Center: Brand/Logo (Optional, can be hidden if minimalist is preferred) */}
        {!user && (
          <div className="flex-1 flex justify-center">
            <Link href="/" className="flex items-center space-x-2">
              <img src="/logo.png" alt="Actinova" className="w-6 h-6 object-contain" />
              <span className="font-bold text-gray-900 dark:text-white hidden sm:block">Actinova</span>
            </Link>
          </div>
        )}

        {/* Right Section: Direct Profile Link */}
        <div className="flex items-center">
          {user && (
            <button
              onClick={() => setActiveContent("profile")}
              className="flex items-center space-x-2 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="View Profile"
            >
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-blue-600 text-white dark:bg-blue-500 overflow-hidden shadow-sm">
                <User className="w-5 h-5" />
              </div>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
