"use client";

import { useState, useEffect } from "react";
import OnboardingSlider from "./components/OnboardingSlider";
import { getApiUrl } from "./lib/apiConfig";
import { useAuth } from "./components/AuthProvider";
import { useRouter } from "next/navigation";

export default function Home() {
  const [showSplash, setShowSplash] = useState(false);
  const [onboardingSeen, setOnboardingSeen] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const seen = localStorage.getItem('onboarding_seen') === 'true';
    setOnboardingSeen(seen);

    // Increment visitor counter on page load
    fetch(getApiUrl("/api/visitor-counter")).catch(() => {
      // Ignore errors for visitor counter in production
    });

    if (!loading && user) {
      router.push("/dashboard");
    } else if (!loading && !user && seen) {
      router.push("/auth/signup");
    }
  }, [user, loading, router]);

  // SplashScreen removed to avoid redundancy with native splash

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If user is logged in or has seen onboarding, the useEffect will handle redirection.
  // Otherwise, show onboarding.
  if (onboardingSeen) return null; // Let useEffect handle redirect
  return <OnboardingSlider />;
}
