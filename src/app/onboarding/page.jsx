"use client";
export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Onboarding from "../components/Onboarding";
import { useRouter } from "next/navigation";
import { useAuth } from "../components/AuthProvider";

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/auth/login");
        return;
      }
      // Check if user already completed onboarding
      if (user.onboardingCompleted) {
        router.push("/dashboard");
        return;
      }
    }
  }, [user, loading, router]);

  const handleComplete = () => {
    router.push("/dashboard");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Onboarding onComplete={handleComplete} />
    </div>
  );
}
