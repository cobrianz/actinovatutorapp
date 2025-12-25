"use client";

import React from "react";
import { useState } from "react";
import Navbar from "./Navbar";
import BottomNav from "./BottomNav";
import { ThemeProvider } from "./ThemeProvider";
import ProtectedRoute from "./ProtectedRoute";
export default function DashboardLayout({
  children,
  activeContent = "generate",
  setActiveContent,
}) {
  const [hideNavs, setHideNavs] = useState(false);

  return (
    <ProtectedRoute>
      <ThemeProvider>
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          {/* Top Navbar */}
          {!hideNavs && <Navbar setActiveContent={setActiveContent} />}

          <div className={`flex flex-1 overflow-hidden ${!hideNavs ? 'pb-[80px]' : ''}`}>
            <main className="flex-1 overflow-auto">
              {React.Children.map(children, (child) =>
                React.cloneElement(child, { sidebarOpen: false, setHideNavs })
              )}
            </main>
          </div>

          {/* Bottom Navigation */}
          {!hideNavs && <BottomNav activeContent={activeContent} setActiveContent={setActiveContent} />}
        </div>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
