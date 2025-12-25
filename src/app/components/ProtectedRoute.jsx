"use client";

import { useAuth } from "./AuthProvider";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    
    // Allow access to auth pages without user
    const authPages = ["/auth/login", "/auth/signup", "/auth/verify-email", "/auth/forgot-password", "/auth/reset-password"];
    if (authPages.includes(pathname) || pathname?.startsWith("/auth/")) {
      return;
    }
    
    if (!user) {
      router.push("/auth/login");
      return;
    }
    
    // Check if email is not verified
    if (!user.emailVerified && pathname !== "/auth/verify-email" && !pathname?.startsWith("/auth/")) {
      // Store email for resend functionality
      if (user.email) {
        localStorage.setItem("pendingVerificationEmail", user.email);
      }
      router.push("/auth/verify-email");
      return;
    }
    
    // Allow access to verify-email page even if not verified
    if (pathname === "/auth/verify-email") {
      return;
    }
    
    if (user.onboardingCompleted === false && pathname !== "/onboarding") {
      router.push("/onboarding");
      return;
    }
  }, [user, loading, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return children;
}
