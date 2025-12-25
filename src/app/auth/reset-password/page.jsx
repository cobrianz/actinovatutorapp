"use client";

import { useState, useEffect, Suspense } from "react";
import { getApiUrl } from "@/lib/apiConfig";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";

function ResetPasswordForm() {
  const [formData, setFormData] = useState({
    email: "",
    code: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeValid, setCodeValid] = useState(null);
  const [passwordReset, setPasswordReset] = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email");
  const code = searchParams.get("code");


  const verifyCode = async () => {
    if (!formData.email || !formData.code) return;

    try {
      const res = await fetch(getApiUrl("/api/verify-reset-code"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email, code: formData.code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCodeValid(false);
        toast.error(data.error || "Invalid code");
      } else {
        setCodeValid(true);
      }
    } catch (error) {
      setCodeValid(false);
      toast.error("Failed to verify code");
    }
  };

  // Only verify code if we have both email and code (not token-based)
  useEffect(() => {
    if (email && code && !token) {
      setFormData(prev => ({ ...prev, email, code }));
      verifyCode();
    }
  }, [email, code, token]); // eslint-disable-line react-hooks/exhaustive-deps

  const [tokenValid, setTokenValid] = useState(null);
  const token = searchParams.get("token");

  useEffect(() => {
    // If we have a token, validate it
    if (token) {
      validateToken();
    }
    // If no token and no email/code, redirect to forgot-password
    else if (!email && !code) {
      toast.error("Invalid or missing reset link");
      router.push("/auth/forgot-password");
    }
  }, [token, email, code, router]); // eslint-disable-line react-hooks/exhaustive-deps

  const validateToken = async () => {
    try {
      const res = await fetch(getApiUrl(`/api/validate-reset-token?token=${token}`));
      const data = await res.json();

      if (!res.ok) {
        setTokenValid(false);
        toast.error(data.error || "Invalid or expired reset token");
      } else {
        setTokenValid(true);
      }
    } catch (error) {
      setTokenValid(false);
      toast.error("Failed to validate reset token");
    }
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push("Password must be at least 8 characters long");
    }
    if (!/(?=.*[a-z])/.test(password)) {
      errors.push("Password must contain at least one lowercase letter");
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      errors.push("Password must contain at least one uppercase letter");
    }
    if (!/(?=.*\d)/.test(password)) {
      errors.push("Password must contain at least one number");
    }
    if (!/(?=.*[@$!%*?&])/.test(password)) {
      errors.push(
        "Password must contain at least one special character (@$!%*?&)"
      );
    }
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }

    const passwordErrors = validatePassword(formData.password);
    if (passwordErrors.length > 0) {
      toast.error(passwordErrors[0]);
      return;
    }

    setLoading(true);

    try {
      // Use token-based flow if token exists, otherwise use code-based flow
      const body = token
        ? { token, password: formData.password }
        : { email: formData.email, code: formData.code, password: formData.password };

      const res = await fetch(getApiUrl("/api/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Something went wrong");
      } else {
        setPasswordReset(true);
        toast.success(data.message);
      }
    } catch (err) {
      toast.error("Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading only if we're validating a token
  if (token && tokenValid === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error only if token validation failed
  if (token && tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600 dark:text-red-400" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Invalid Reset Link
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              This password reset link is invalid or has expired.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg rounded-lg text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Please request a new password reset link.
            </p>
            <Link
              href="/auth/forgot-password"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Request New Reset Link
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (passwordReset) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
              Password Reset Successfully!
            </h2>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Your password has been updated. You can now sign in with your new
              password.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg rounded-lg text-center">
            <Link
              href="/auth/login"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Sign In Now
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
            <Lock className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Reset Your Password
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Enter your new password below.
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="bg-white dark:bg-gray-800 py-8 px-6 shadow-lg rounded-lg">
            <div className="space-y-6">
              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Enter your new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    placeholder="Confirm your new password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                  Password Requirements:
                </h4>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                  <li>• At least 8 characters long</li>
                  <li>• Contains uppercase and lowercase letters</li>
                  <li>• Contains at least one number</li>
                  <li>• Contains at least one special character (@$!%*?&)</li>
                </ul>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Resetting Password...
                    </div>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="text-center">
            <Link
              href="/auth/login"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            >
              Back to Sign In
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
