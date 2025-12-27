"use client";

import dynamic from "next/dynamic";
import DashboardLayout from "../components/DashboardLayout";
import { Suspense } from "react";

const ProfileContent = dynamic(() => import("../components/ProfileContent"), {
  ssr: false,
});

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <DashboardLayout>
        <ProfileContent />
      </DashboardLayout>
    </Suspense>
  );
}
