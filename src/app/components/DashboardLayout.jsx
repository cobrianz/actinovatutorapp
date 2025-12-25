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
  return (
    <ProtectedRoute>
      <ThemeProvider>
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          {/* Top Navbar with Explore, Theme, Account */}
          <Navbar setActiveContent={setActiveContent} />

          <div className="flex flex-1 overflow-hidden pb-[80px]">
            <main className="flex-1 overflow-auto">
              {React.Children.map(children, (child) =>
                React.cloneElement(child, { sidebarOpen: false })
              )}
            </main>
          </div>

          {/* Bottom Navigation for Mobile App Feel */}
          <BottomNav activeContent={activeContent} setActiveContent={setActiveContent} />
        </div>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
