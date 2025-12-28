"use client";

import React from "react";
import TopBar from "./TopBar";
import BottomNavigation from "./BottomNavigation";
import { ThemeProvider } from "./ThemeProvider";
import ProtectedRoute from "./ProtectedRoute";

export default function DashboardLayout({
  children,
  activeContent, // Kept for prop compatibility check if needed, but primary nav is now URL based
  setActiveContent,
  hideBottomNav = false,
}) {
  return (
    <ProtectedRoute>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col pt-safe-top">
          {/* Mobile First Navigation */}
          {/* Mobile First Navigation - TopBar Removed */}

          <main className={`flex-1 ${hideBottomNav ? '' : 'pb-20 pb-safe-bottom'} overflow-x-hidden`}>
            <div className="">
              {children}
            </div>
          </main>

          {!hideBottomNav && <BottomNavigation />}
        </div>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
