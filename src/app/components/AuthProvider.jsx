// components/AuthProvider.jsx
"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import { useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { getApiUrl, authenticatedFetch } from "../lib/apiConfig";

// Detect Capacitor environment
const IS_CAPACITOR = typeof window !== 'undefined' && (
  window.Capacitor ||
  window.location.protocol === 'capacitor:' ||
  window.origin?.startsWith('capacitor://') ||
  window.origin?.startsWith('http://localhost') ||
  window.origin?.startsWith('https://localhost')
);

const InactivityModal = dynamic(() => import("./InactivityModal"), { ssr: false });
const ToasterClient = dynamic(() => import("./ToasterClient"), { ssr: false });

const AuthContext = createContext();

/**
 * Get CSRF token from cookies for API requests
 * @returns {string|null} CSRF token or null if not found
 */
function getCsrfToken() {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/csrfToken=([^;]+)/);
  return match ? match[1] : null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInactivityModal, setShowInactivityModal] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(120); // 2 minutes in seconds
  const router = useRouter();
  const pathname = usePathname();

  // Refs for timers
  const inactivityTimerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const countdownTimerRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const refreshPromiseRef = useRef(null);

  // Do not hydrate user from localStorage; always source user from secure server-side cookie via `/api/me`
  useEffect(() => { }, []);
  // Refresh token function (declare before fetchUser to avoid reference errors)
  const refreshToken = useCallback(async () => {
    // If a refresh is already in progress, return the existing promise to avoid race conditions
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    refreshPromiseRef.current = (async () => {
      try {
        const res = await authenticatedFetch("/api/refresh", {
          method: "POST",
        });

        if (res.ok) {
          // After refreshing tokens, rehydrate user from server
          try {
            const meRes = await authenticatedFetch("/api/me");
            if (meRes.ok) {
              const meData = await meRes.json();
              setUser(meData.user);
              return true;
            }
          } catch (err) {
            console.error("Failed to re-fetch profile after refresh:", err);
          }
          return true;
        } else {
          return false;
        }
      } catch (err) {
        console.error("Token refresh failed:", err);
        return false;
      } finally {
        refreshPromiseRef.current = null;
      }
    })();

    return refreshPromiseRef.current;
  }, []);

  // Fetch user on initial load
  const fetchUser = useCallback(async () => {
    try {
      setError(null);

      console.log(`[Actinova] Fetching user from: ${getApiUrl("/api/me")}`);

      let res = await authenticatedFetch("/api/me");

      console.log(`[Actinova] /api/me status: ${res.status}`);
      let data = null;

      if (res.ok) {
        const text = await res.text();
        try {
          data = JSON.parse(text);
          setUser(data.user);
          setLoading(false);
          return data.user;
        } catch (e) {
          console.error(`[Actinova] Failed to parse /api/me JSON. Response text: ${text.substring(0, 100)}...`);
          throw new Error("Invalid server response format");
        }
      }

      // If server returned 401, attempt token refresh then retry
      if (res.status === 401) {
        const refreshSuccess = await refreshToken();
        if (refreshSuccess) {
          const retryRes = await authenticatedFetch("/api/me");
          if (retryRes.ok) {
            data = await retryRes.json();
            setUser(data.user);
            setLoading(false);
            return data.user;
          }
        }
      }

      // If everything failed, clear user
      setUser(null);
      return null;
    } catch (err) {
      console.error("Failed to fetch user:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [refreshToken]);

  // (refreshToken declared above)

  // Initial user fetch
  useEffect(() => {
    // Always fetch server-sourced user (reads secure HttpOnly cookies)
    fetchUser();
  }, [fetchUser]);

  // Refresh token when page becomes visible (user returns to tab)
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        await refreshToken();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, refreshToken]);

  // Redirect after login if on an auth page
  useEffect(() => {
    if (!loading && user && pathname.startsWith("/auth")) {
      // Don't auto-redirect from verification page
      if (pathname === "/auth/verify-email") {
        return;
      }

      // Check if onboarding is completed
      if (user.onboardingCompleted === false) {
        router.replace("/onboarding");
      } else {
        router.replace("/dashboard");
      }
    }
  }, [user, loading, pathname, router]);

  // Activity tracking and inactivity timeout
  const resetInactivityTimer = useCallback(() => {
    lastActivityRef.current = Date.now();

    // Clear existing timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    // Hide modal if shown
    setShowInactivityModal(false);
    setTimeRemaining(120);

    // Only set timers if user is logged in
    if (user) {
      // Set warning timer for 13 minutes (13 * 60 * 1000 = 780000ms)
      warningTimerRef.current = setTimeout(
        () => {
          setShowInactivityModal(true);
          setTimeRemaining(120);

          // Start countdown timer
          countdownTimerRef.current = setInterval(() => {
            setTimeRemaining((prev) => {
              if (prev <= 1) {
                // Time's up - logout
                handleInactivityLogout();
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        },
        13 * 60 * 1000
      );

      // Set final logout timer for 15 minutes (15 * 60 * 1000 = 900000ms)
      inactivityTimerRef.current = setTimeout(
        () => {
          handleInactivityLogout();
        },
        15 * 60 * 1000
      );
    }
  }, [user]);

  const handleInactivityLogout = useCallback(async () => {
    // Clear all timers
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
    }
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
    }

    // Perform logout
    try {
      await fetch(getApiUrl("/api/logout"), {
        method: "POST",
        credentials: "include",
        headers: {
          "X-CSRF-Token": getCsrfToken(),
        },
      });
    } catch (err) {
      console.error("Logout failed:", err);
    }

    setUser(null);
    setShowInactivityModal(false);
    router.push("/?loggedOut=inactivity");
  }, [router]);

  const extendSession = useCallback(() => {
    resetInactivityTimer();
  }, [resetInactivityTimer]);

  // Set up activity listeners
  useEffect(() => {
    if (!user) return;

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keypress",
      "scroll",
      "touchstart",
      "click",
    ];

    const handleActivity = () => {
      resetInactivityTimer();
    };

    // Add event listeners
    activityEvents.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Start the initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      activityEvents.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });

      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
    };
  }, [user, resetInactivityTimer]);

  // Clear timers when user logs out
  useEffect(() => {
    if (!user) {
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
      }
      setShowInactivityModal(false);
    }
  }, [user]);

  const login = async (credentials) => {
    try {
      setError(null);
      setLoading(true);

      const res = await fetch(getApiUrl("/api/login"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: IS_CAPACITOR ? "omit" : "include",
        body: JSON.stringify(credentials),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error('[Actinova] Login failed status:', res.status, 'data:', data);
        // Check if verification is required
        if (data.requiresVerification) {
          return {
            success: false,
            error: data.error || "Please verify your email first",
            requiresVerification: true,
            email: data.email,
          };
        }
        throw new Error(data.error || "Login failed");
      }

      console.log('[Actinova] Login successful, fetching user profile...');

      // For Capacitor, store the token from response
      if (IS_CAPACITOR && data.token) {
        localStorage.setItem('auth_token', data.token);
        console.log('[Actinova] Token stored in localStorage for Capacitor');
      }

      // Sync client state from server-side secure cookie via `/api/me`
      const freshUser = await fetchUser();
      return { success: true, user: freshUser };
    } catch (err) {
      console.error('[Actinova] Login exception:', err);
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (userData) => {
    try {
      setError(null);
      setLoading(true);

      const res = await authenticatedFetch("/api/signup", {
        method: "POST",
        body: JSON.stringify(userData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Signup failed");
      }

      return {
        success: true,
        message: data.message,
        requiresVerification: data.requiresVerification,
      };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      setError(null);
      await authenticatedFetch("/api/logout", {
        method: "POST",
        headers: {
          "X-CSRF-Token": getCsrfToken(),
        },
      });

      // Clear token from localStorage for Capacitor
      if (IS_CAPACITOR) {
        localStorage.removeItem('auth_token');
      }
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setUser(null);
      setError(null);
      router.push("/");
    }
  };

  const forgotPassword = async (email) => {
    try {
      setError(null);
      const res = await authenticatedFetch("/api/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send reset email");
      }

      return { success: true, message: data.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const resetPassword = async (token, password, confirmPassword) => {
    try {
      setError(null);
      const res = await authenticatedFetch("/api/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      return { success: true, message: data.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const verifyEmail = async (token) => {
    try {
      setError(null);
      const res = await authenticatedFetch("/api/verify-email", {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to verify email");
      }

      return { success: true, message: data.message };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  };

  const setUserData = (userData) => {
    setUser(userData);
    setLoading(false);
    setError(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        showInactivityModal,
        timeRemaining,
        login,
        signup,
        logout,
        forgotPassword,
        resetPassword,
        verifyEmail,
        refreshToken,
        setUserData,
        fetchUser,
        clearError,
        extendSession,
        handleInactivityLogout,
      }}
    >
      <>
        {children}
        <ToasterClient />
        <InactivityModal />
      </>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    // Return fallback for build stability
    return {
      user: null,
      loading: false,
      error: null,
      showInactivityModal: false,
      timeRemaining: 120,
      login: async () => ({ success: false }),
      signup: async () => ({ success: false }),
      logout: async () => { },
      forgotPassword: async () => ({ success: false }),
      resetPassword: async () => ({ success: false }),
      verifyEmail: async () => ({ success: false }),
      refreshToken: async () => false,
      setUserData: () => { },
      fetchUser: async () => null,
      clearError: () => { },
      extendSession: () => { },
      handleInactivityLogout: () => { },
    };
  }
  return context;
};

export default AuthProvider;
