"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import Library from "../components/Library";
import PremiumCourses from "../components/PremiumCourses";
import FlashcardsLibrary from "../components/FlashcardsLibrary";
import TestYourself from "../components/TestYourself";
import Generate from "../components/Generate";
import Explore from "../components/Explore";
import { Plus } from "lucide-react";

export default function CoursesPage() {
    const searchParams = useSearchParams();
    const tabParam = searchParams.get("tab");
    const newParam = searchParams.get("new");

    const [activeTab, setActiveTab] = useState(tabParam || "library");

    useEffect(() => {
        if (tabParam) {
            setActiveTab(tabParam);
        }
    }, [tabParam]);

    // Tabs configuration - Added "Explore" as requested
    const tabs = [
        { id: "library", label: "My Courses" },
        { id: "explore", label: "Explore" },
        { id: "premium", label: "Premium" },
        { id: "flashcards", label: "Flashcards" },
        { id: "quizzes", label: "Quizzes" },
    ];

    return (
        <DashboardLayout>
            <div className="min-h-full bg-gray-50 dark:bg-gray-900 pb-20 relative">
                {/* Sticky Header with Tabs */}
                <div className="sticky top-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur z-30 pt-4 px-4 shadow-sm">
                    <div className="flex space-x-1 overflow-x-auto pb-4 scrollbar-hide">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.id
                                    ? "bg-blue-600 text-white shadow-md"
                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content Area */}
                <div className="px-4 py-4">
                    {activeTab === "library" && <Library setActiveContent={setActiveTab} />}
                    {activeTab === "explore" && <Explore />}
                    {activeTab === "premium" && <PremiumCourses />}
                    {activeTab === "flashcards" && <FlashcardsLibrary setActiveContent={setActiveTab} />}
                    {activeTab === "quizzes" && <TestYourself />}
                </div>
            </div>
        </DashboardLayout>
    );
}
