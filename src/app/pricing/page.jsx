"use client";

import React, { Suspense } from "react";
import DashboardLayout from "../components/DashboardLayout";
import Upgrade from "../components/Upgrade";

export default function PricingPage() {
    return (
        <DashboardLayout>
            <Suspense fallback={<div className="p-6">Loading pricing...</div>}>
                <Upgrade />
            </Suspense>
        </DashboardLayout>
    );
}
