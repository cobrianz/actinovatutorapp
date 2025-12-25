"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import { ThemeProvider } from "./ThemeProvider";
import ProtectedRoute from "./ProtectedRoute";

export default function ProfileLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <ProtectedRoute>
      <ThemeProvider>
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex overflow-hidden">
          <Sidebar
            activeContent="profile"
            setActiveContent={() => { }}
            isOpen={isSidebarOpen}
            setIsOpen={setIsSidebarOpen}
          />
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-950">
            {children}
          </main>
        </div>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
