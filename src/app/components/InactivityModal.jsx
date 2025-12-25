"use client";

import { useEffect } from "react";
import { Clock, LogOut, UserCheck } from "lucide-react";
import { useAuth } from "./AuthProvider";

export default function InactivityModal() {
  const {
    showInactivityModal,
    timeRemaining,
    extendSession,
    handleInactivityLogout,
  } = useAuth();

  // Format time remaining
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!showInactivityModal) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-center w-16 h-16 bg-orange-100 dark:bg-orange-900/20 rounded-full mx-auto mb-4">
            <Clock className="w-8 h-8 text-orange-600 dark:text-orange-400" />
          </div>

          <h3 className="text-xl font-bold text-gray-900 dark:text-white text-center mb-2">
            Are you still there?
          </h3>

          <p className="text-gray-600 dark:text-gray-400 text-center mb-6">
            You've been inactive for a while. For security reasons, you'll be
            logged out in:
          </p>

          <div className="text-center mb-6">
            <div className="text-4xl font-bold text-orange-600 dark:text-orange-400 font-mono">
              {formatTime(timeRemaining)}
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              minutes remaining
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleInactivityLogout}
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out Now</span>
            </button>
            <button
              onClick={extendSession}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <UserCheck className="w-4 h-4" />
              <span>Stay Logged In</span>
            </button>
          </div>

          <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
            Any activity will automatically extend your session
          </p>
        </div>
      </div>
    </div>
  );
}
