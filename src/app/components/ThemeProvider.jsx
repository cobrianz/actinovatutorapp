"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children, initialTheme }) {
  const [theme, setTheme] = useState(initialTheme || "system");

  useEffect(() => {
    const getSystemTheme = () => {
      if (typeof window !== "undefined") {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      }
      return "light";
    };

    const getInitialTheme = () => {
      if (initialTheme === "system") {
        return getSystemTheme();
      }
      return initialTheme || localStorage.getItem("theme") || "system";
    };

    const savedTheme = getInitialTheme();

    // Handle system theme resolution
    if (savedTheme === "system") {
      const resolved = getSystemTheme();
      document.documentElement.classList.toggle("dark", resolved === "dark");
      setTheme("system");
    } else {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    }

    // Listen for system theme changes if system theme is selected
    if (
      initialTheme === "system" ||
      (!initialTheme && localStorage.getItem("theme") === "system")
    ) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e) => {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    // Also listen if we just fell back to system
    if (!initialTheme && !localStorage.getItem("theme")) {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e) => {
        const newTheme = e.matches ? "dark" : "light";
        document.documentElement.classList.toggle("dark", newTheme === "dark");
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [initialTheme]);

  const toggleTheme = () => {
    const currentTheme =
      theme === "system"
        ? document.documentElement.classList.contains("dark")
          ? "dark"
          : "light"
        : theme;
    const newTheme = currentTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const setThemePreference = (newTheme) => {
    if (newTheme === "system") {
      const systemTheme =
        typeof window !== "undefined" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      setTheme("system");
      localStorage.setItem("theme", "system");
      document.documentElement.classList.toggle("dark", systemTheme === "dark");
    } else {
      setTheme(newTheme);
      localStorage.setItem("theme", newTheme);
      document.documentElement.classList.toggle("dark", newTheme === "dark");
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setThemePreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Return fallback for build stability
    return { theme: "light", toggleTheme: () => { }, setThemePreference: () => { } };
  }
  return context;
};
