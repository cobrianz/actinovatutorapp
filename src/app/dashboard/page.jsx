"use client";

import React, { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import DashboardLayout from "../components/DashboardLayout";
import DashboardContent from "../components/DashboardContent";

function DashboardInner() {
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

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading dashboard...</div>}>
      <DashboardInner />
    </Suspense>
  );
}
