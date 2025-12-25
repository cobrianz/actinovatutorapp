"use client";

import Link from "next/link";

export default function NotFound() {
    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 text-gray-900">
            <h2 className="mb-4 text-3xl font-bold">404 - Page Not Found</h2>
            <p className="mb-8 text-gray-600">Could not find the requested resource.</p>
            <Link
                href="/"
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors"
            >
                Return Home
            </Link>
        </div>
    );
}
