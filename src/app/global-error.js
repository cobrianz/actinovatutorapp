"use client";

import React from "react";

/**
 * Standard Next.js 15+ Global Error Boundary
 * Must be a Client Component and must contain <html> and <body> tags.
 * We use a plain .js extension and minimal React syntax for maximum build stability.
 */
export default function GlobalError({ error, reset }) {
    return React.createElement(
        "html",
        { lang: "en" },
        React.createElement(
            "body",
            {
                style: {
                    margin: 0,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minHeight: "100vh",
                    backgroundColor: "#f8fafc",
                    color: "#0f172a",
                    textAlign: "center",
                    padding: "20px"
                }
            },
            React.createElement(
                "div",
                null,
                React.createElement("h1", { style: { fontSize: "2rem", marginBottom: "1rem" } }, "Application Error"),
                React.createElement("p", { style: { marginBottom: "2rem", color: "#64748b" } }, "A fatal error occurred. Please try refreshing the page."),
                React.createElement(
                    "button",
                    {
                        onClick: function () {
                            if (typeof window !== "undefined") {
                                if (typeof reset === "function") {
                                    reset();
                                } else {
                                    window.location.reload();
                                }
                            }
                        },
                        style: {
                            padding: "12px 24px",
                            backgroundColor: "#2563eb",
                            color: "white",
                            border: "none",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "1rem",
                            fontWeight: "600"
                        }
                    },
                    "Try Again"
                )
            )
        )
    );
}
