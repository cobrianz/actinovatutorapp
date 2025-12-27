import React, { Suspense } from "react";
import DashboardContentWrapper from "../components/DashboardContentWrapper";

// Static export friendly

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading cards...</div>}>
      <DashboardContentWrapper />
    </Suspense>
  );
}
