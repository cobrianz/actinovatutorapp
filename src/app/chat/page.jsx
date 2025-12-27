"use client";

import React from "react";
import DashboardLayout from "../components/DashboardLayout";
import Chat from "../components/Chat";
import { Suspense } from "react";

export default function ChatPage() {
    const [hideNav, setHideNav] = React.useState(false);

    return (
        <Suspense fallback={<div className="p-6">Loading chat...</div>}>
            <DashboardLayout hideBottomNav={hideNav}>
                <div className="h-[calc(100vh-64px)] overflow-hidden">
                    <Chat setHideNavs={setHideNav} />
                </div>
            </DashboardLayout>
        </Suspense>
    );
}
