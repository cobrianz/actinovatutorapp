"use client";

import React from "react";
import { useState } from "react";
import Sidebar from "./Sidebar";
import { ThemeProvider } from "./ThemeProvider";
import ProtectedRoute from "./ProtectedRoute";

export default function DashboardLayout({
  children,
  activeContent = "generate",
  setActiveContent,
}) {
  const [hideNavs, setHideNavs] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <ThemeProvider>
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
          {/* Sidebar Navigation */}
          {!hideNavs && (
            <Sidebar
              activeContent={activeContent}
              setActiveContent={setActiveContent}
              isOpen={isSidebarOpen}
              setIsOpen={setIsSidebarOpen}
            />
          )}

          <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
            <main className="flex-1 overflow-auto relative">
              {React.Children.map(children, (child) =>
                React.cloneElement(child, { sidebarOpen: isSidebarOpen, setHideNavs })
              )}
            </main>
          </div>
        </div>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
