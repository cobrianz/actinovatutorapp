"use client";
export const dynamic = "force-dynamic";

import nextDynamic from "next/dynamic";
import NavbarOnlyLayout from "../components/NavbarOnlyLayout";
import { Suspense } from "react";

const ProfileContent = nextDynamic(() => import("../components/ProfileContent"), {
  ssr: false,
});

export default function ProfilePage() {
  return (
    <Suspense fallback={null}>
      <NavbarOnlyLayout>
        <ProfileContent />
      </NavbarOnlyLayout>
    </Suspense>
  );
}
