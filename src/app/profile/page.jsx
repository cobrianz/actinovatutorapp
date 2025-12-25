"use client";

import dynamic from "next/dynamic";
import NavbarOnlyLayout from "../components/NavbarOnlyLayout";

const ProfileContent = dynamic(() => import("../components/ProfileContent"), {
  ssr: false,
});

export default function ProfilePage() {
  return (
    <NavbarOnlyLayout>
      <ProfileContent />
    </NavbarOnlyLayout>
  );
}
