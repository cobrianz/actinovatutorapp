import React from "react";

export default function GlobalError({ error, reset }) {
    return (
        <html lang="en">
            <head>
                <title>Application Error</title>
            </head>
            <body>
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
                        onClick={() => {
                            if (typeof window !== "undefined") {
                                window.location.reload();
                            }
                        }}
                        style={{
                            padding: '12px 24px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem',
                            fontWeight: '600'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
