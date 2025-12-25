"use client";

import React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "./DashboardLayout";
import DashboardContent from "./DashboardContent";

export default function DashboardContentWrapper() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const activeContent = searchParams.get("tab") || "generate";

    const setActiveContent = (tab) => {
        const params = new URLSearchParams(searchParams);
        params.set("tab", tab);
        router.push(`/dashboard?${params.toString()}`);
    };

    return (
        <DashboardLayout
            activeContent={activeContent}
            setActiveContent={setActiveContent}
        >
            <DashboardContent />
        </DashboardLayout>
    );
}
