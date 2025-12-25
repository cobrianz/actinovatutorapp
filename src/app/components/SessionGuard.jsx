"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import ActinovaLoader from "./ActinovaLoader";
import { useAuth } from "./AuthProvider";

export function useEnsureSession() {
  const { user, loading, fetchUser } = useAuth();

  useEffect(() => {
    // If not loading and no user, attempt to fetch from server
    if (!loading && !user) {
      fetchUser().catch(() => {});
    }
  }, [loading, user, fetchUser]);

  return { user, authLoading: loading };
}

export default function SessionGuard({ children, fallback = null }) {
  const { user, authLoading } = useEnsureSession();
  const router = useRouter();
  useEffect(() => {
    if (!authLoading && !user) {
      // Redirect to login if no session
      router.replace("/auth/login");
    }
  }, [authLoading, user, router]);

  if (authLoading) return fallback || <ActinovaLoader />;
  if (!user) return null;

  return <>{children}</>;
}
