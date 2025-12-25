// src/app/global-error.js
"use client";

import React from "react";

/**
 * Minimum possible Global Error handler for Next.js 16 / React 19.
 * 
 * IMPORTANT: This must be a Client Component and must contain <html> and <body>.
 * We use strictly minimal HTML and no hooks to avoid any dispatcher errors during build.
 */
export default function GlobalError({ error, reset }) {
    // Log error for debugging if window is present
    if (typeof window !== "undefined") {
        console.error("Global Error Caught:", error);
    }

    return React.createElement(
        "html",
        { lang: "en" },
        React.createElement(
            "body",
            {
                style: {
                    margin: 0,
                    background: "white",
                    color: "black",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "100vh",
                    fontFamily: "sans-serif"
                }
            },
            React.createElement("h1", null, "Application Error"),
            React.createElement("p", null, "A critical error occurred. Please refresh the page."),
            React.createElement(
                "button",
                {
                    onClick: function () {
                        if (typeof window !== "undefined") {
                            window.location.reload();
                        }
                    },
                    style: {
                        marginTop: "1rem",
                        padding: "8px 16px",
                        background: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }
                },
                "Refresh"
            )
        )
    );
}
