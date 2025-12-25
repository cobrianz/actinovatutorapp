"use client";

export default function GlobalError({ error, reset }) {
    console.error("Global Error Caught:", error);

    return (
        <html lang="en">
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
                    fontFamily: 'sans-serif'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Application Error</h1>
                    <p style={{ marginBottom: '2rem', color: '#4b5563' }}>
                        A fatal error occurred. Please try refreshing the page.
                    </p>
                    <button
                        onClick={() => reset ? reset() : window.location.reload()}
                        style={{
                            padding: '10px 20px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '5px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </body>
        </html>
    );
}
