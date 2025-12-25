"use client";

export default function GlobalError({ error, reset }) {
    return (
        <html>
            <body>
                <div style={{
                    display: 'flex',
                    minHeight: '100vh',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f3f4f6',
                    color: '#1f2937',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem' }}>Something went wrong!</h2>
                    <button
                        onClick={() => reset()}
                        style={{
                            borderRadius: '0.375rem',
                            backgroundColor: '#2563eb',
                            padding: '0.75rem 1.5rem',
                            color: 'white',
                            border: 'none',
                            fontWeight: '600',
                            cursor: 'pointer'
                        }}
                    >
                        Try again
                    </button>
                </div>
            </body>
        </html>
    );
}
