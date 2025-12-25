"use client";

import React from "react";

export default function GlobalError({ error, reset }) {
    // Use a local effect for side effects like logging
    React.useEffect(() => {
        if (error) {
            console.error("Global Error Caught:", error);
        }
    }, [error]);

    const handleReset = () => {
        if (typeof window !== "undefined") {
            if (typeof reset === "function") {
                reset();
            } else {
                window.location.reload();
            }
        }
    };

    return (
        <html lang="en" suppressHydrationWarning>
            <body suppressHydrationWarning>
                <div style={{
                    display: 'flex',
                    minHeight: '100vh',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb',
                    color: '#111827',
                    padding: '20px',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <h1 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1rem' }}>
                        Application Error
                    </h1>
                    <p style={{ marginBottom: '2rem', color: '#4b5563', maxWidth: '400px' }}>
                        A fatal error occurred in the application. Please try refreshing the page.
                    </p>
                    <button
                        onClick={handleReset}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600',
                            transition: 'background-color 0.2s'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
