import React, { Suspense } from "react";
import DashboardContentWrapper from "../components/DashboardContentWrapper";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading dashboard...</div>}>
      <DashboardContentWrapper />
    </Suspense>
  );
}
