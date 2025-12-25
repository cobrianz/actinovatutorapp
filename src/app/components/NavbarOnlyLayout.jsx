"use client";

import React from "react";
import Navbar from "./Navbar";
import { ThemeProvider } from "./ThemeProvider";
import ProtectedRoute from "./ProtectedRoute";

export default function ProfileLayout({ children }) {
  return (
    <ProtectedRoute>
      <ThemeProvider>
        <div className="h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
          <Navbar toggleSidebar={() => {}} />
          <main className="flex-1 overflow-auto">{children}</main>
        </div>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
