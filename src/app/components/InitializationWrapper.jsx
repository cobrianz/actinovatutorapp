"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./AuthProvider";
import SplashScreen from "./SplashScreen";

export default function InitializationWrapper({ children }) {
    const { loading: authLoading, user } = useAuth();
    const [isAppReady, setIsAppReady] = useState(false);
    const [dashboardReady, setDashboardReady] = useState(false);
    const [minTimeElapsed, setMinTimeElapsed] = useState(false);

    // Minimum splash time for aesthetic (1.5s)
    useEffect(() => {
        const timer = setTimeout(() => setMinTimeElapsed(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    // Listen for dashboard ready event
    useEffect(() => {
        const handleReady = () => setDashboardReady(true);
        window.addEventListener("actinova:dashboard-ready", handleReady);
        return () => window.removeEventListener("actinova:dashboard-ready", handleReady);
    }, []);

    const pathname = usePathname();

    // Also consider it ready if NOT logged in or NOT on dashboard
    useEffect(() => {
        const isDashboard = pathname === "/dashboard" || pathname.startsWith("/learn") || pathname.startsWith("/courses");

        if (!authLoading && (!user || !isDashboard)) {
            setDashboardReady(true);
        }
    }, [authLoading, user, pathname]);

    // Final check
    useEffect(() => {
        if (!authLoading && dashboardReady && minTimeElapsed) {
            // Small extra delay for smoothness or to let animations finish
            const finalTimer = setTimeout(() => setIsAppReady(true), 500);
            return () => clearTimeout(finalTimer);
        }
    }, [authLoading, dashboardReady, minTimeElapsed]);

    if (!isAppReady) {
        return <SplashScreen onComplete={() => { }} />;
    }

    return children;
}
