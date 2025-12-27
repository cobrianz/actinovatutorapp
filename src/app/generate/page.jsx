"use client";

import React from "react";
import DashboardLayout from "../components/DashboardLayout";
import Generate from "../components/Generate";

export default function GeneratePage() {
    return (
        <DashboardLayout>
            <div className="max-w-3xl mx-auto px-4 py-6">
                <Generate />
            </div>
        </DashboardLayout>
    );
}
