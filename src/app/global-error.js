"use client";

import React from "react";

/**
 * Robust Global Error handler for Next.js 16 / React 19.
 * 
 * IMPORTANT: This must be a Client Component and must contain <html> and <body>.
 * We use strictly minimal dependencies to avoid any dispatcher errors during build.
 */
export default function GlobalError({ error, reset }) {
    // Use React.useEffect to log the error safely
    React.useEffect(() => {
        if (error) {
            console.error("Global Error Caught:", error);
        }
    }, [error]);

    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4 font-sans"
                suppressHydrationWarning
            >
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                        <svg
                            className="w-10 h-10 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>

                    <h1 className="text-3xl font-black tracking-tight">Something went wrong</h1>

                    <p className="text-gray-600">
                        A critical application error occurred. We've been notified and are looking into it.
                    </p>

                    <div className="pt-4 flex gap-3 justify-center">
                        <button
                            onClick={() => reset ? reset() : window.location.reload()}
                            className="px-6 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95 transition-transform"
                        >
                            Try again
                        </button>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="px-6 py-3 bg-gray-100 text-gray-700 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95 transition-transform"
                        >
                            Go Home
                        </button>
                    </div>
                </div>
            </body>
        </html>
    );
}
