"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getApiUrl, authenticatedFetch } from "../lib/apiConfig";
import { CheckCircle, AlertCircle, Mail, ArrowLeft, Key } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "./AuthProvider";

export default function VerifyEmailContent() {
    const [code, setCode] = useState("");
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [userEmail, setUserEmail] = useState("");

    const router = useRouter();
    const searchParams = useSearchParams();
    const { fetchUser } = useAuth();

    useEffect(() => {
        // Get email from localStorage
        const email = localStorage.getItem("pendingVerificationEmail");
        if (email) {
            setUserEmail(email);
        }

        // Check for token in URL
        const token = searchParams.get("token");
        if (token) {
            handleTokenVerification(token);
        }
    }, [searchParams]);

    const handleTokenVerification = async (token) => {
        setLoading(true);

        try {
            const res = await authenticatedFetch("/api/verify-email", {
                method: "POST",
                body: JSON.stringify({ token }),
            });

            const data = await res.json();

            if (!res.ok) {
                setVerificationStatus("error");
                toast.error(data.error || "Email verification failed");
            } else {
                toast.success(data.message);

                // Do not persist sensitive user/token info to localStorage; rely on secure HttpOnly cookies and `/api/me`

                // Send welcome email
                try {
                    await authenticatedFetch("/api/send-welcome-email", {
                        method: "POST",
                        body: JSON.stringify({
                            email: data.user.email,
                            firstName: data.user.name?.split(" ")[0] || "User",
                        }),
                    });
                } catch (emailError) {
                    console.error("Failed to send welcome email:", emailError);
                }

                // Refresh user data from cookies
                await fetchUser();

                // Clear pending verification email
                localStorage.removeItem("pendingVerificationEmail");

                // Redirect to onboarding immediately
                router.push("/onboarding");
            }
        } catch (error) {
            setVerificationStatus("error");
            toast.error("Failed to verify email");
        } finally {
            setLoading(false);
        }
    };

    const handleResendEmail = async () => {
        if (resendCooldown > 0) return;

        setResendLoading(true);
        try {
            const response = await authenticatedFetch("/api/resend-verification", {
                method: "POST",
                body: JSON.stringify({ email: userEmail }),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Verification email sent! Please check your inbox.");
                setResendCooldown(60); // 60 second cooldown
                const interval = setInterval(() => {
                    setResendCooldown((prev) => {
                        if (prev <= 1) {
                            clearInterval(interval);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                toast.error(data.error || "Failed to resend email");
            }
        } catch (error) {
            toast.error("Failed to resend verification email");
        } finally {
            setResendLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!code.trim()) {
            toast.error("Please enter the verification code from your email");
            return;
        }

        setLoading(true);

        try {
            const res = await authenticatedFetch("/api/verify-email", {
                method: "POST",
                body: JSON.stringify({ code }),
            });

            const data = await res.json();

            if (!res.ok) {
                setVerificationStatus("error");
                toast.error(data.error || "Email verification failed");
            } else {
                toast.success(data.message);

                // Do not persist sensitive user/token info to localStorage; rely on secure HttpOnly cookies and `/api/me`

                // Refresh user data from cookies
                await fetchUser();

                // Clear pending verification email
                localStorage.removeItem("pendingVerificationEmail");

                // Redirect to onboarding immediately
                router.push("/onboarding");
            }
        } catch (error) {
            setVerificationStatus("error");
            toast.error("Failed to verify email");
        } finally {
            setLoading(false);
        }
    };

    // Removed success modal - redirect immediately instead
    if (verificationStatus === "success") {
        return null;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-6 sm:py-12 px-4 sm:px-6 lg:px-8 pt-safe-top pb-safe-bottom">
            <div className="max-w-md w-full space-y-8">
                {/* Header */}
                <div className="text-center">
                    <Link href="/" className="inline-flex items-center space-x-3 mb-8">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-2xl font-bold text-gray-900 dark:text-white">
                            Actinova AI Tutor
                        </span>
                    </Link>

                    <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                        Verify Your Email
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400">
                        Enter the verification code sent to your email address
                    </p>
                </div>

                {/* Form */}
                <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                    <div className="space-y-4">
                        <div>
                            <label
                                htmlFor="token"
                                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                            >
                                Verification Code
                            </label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                                <input
                                    id="token"
                                    name="token"
                                    type="text"
                                    required
                                    value={code}
                                    onChange={(e) => setCode(e.target.value)}
                                    className="pl-10 w-full px-4 py-3 text-base border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono"
                                    placeholder="Enter the 6-digit verification code"
                                />
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                                Enter the 6-digit code from your email
                            </p>
                        </div>
                    </div>

                    {verificationStatus === "error" && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                            <div className="flex items-start space-x-3">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                                <div>
                                    <h4 className="text-sm font-medium text-red-900 dark:text-red-100">
                                        Verification Failed
                                    </h4>
                                    <p className="text-sm text-red-800 dark:text-red-200">
                                        The code you entered is invalid or has expired. Please check
                                        your email and try again.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading || !code.trim()}
                        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg font-medium hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {loading ? "Verifying..." : "Verify Email"}
                    </button>

                    <div className="text-center space-y-3">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Didn't receive the code?{" "}
                            <button
                                type="button"
                                onClick={handleResendEmail}
                                disabled={resendLoading || resendCooldown > 0}
                                className="text-blue-600 hover:text-blue-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {resendLoading
                                    ? "Sending..."
                                    : resendCooldown > 0
                                        ? `Resend in ${resendCooldown}s`
                                        : "Resend email"}
                            </button>
                        </p>

                        <div>
                            <Link
                                href="/auth/login"
                                className="inline-flex items-center text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" />
                                Back to Sign In
                            </Link>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
