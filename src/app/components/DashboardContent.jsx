"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import Generate from "./Generate";
import Explore from "./Explore";
import Library from "./Library";
import PremiumCourses from "./PremiumCourses";
import Upgrade from "./Upgrade";
import Chat from "./Chat";
import FlashcardsLibrary from "./FlashcardsLibrary";
import TestYourself from "./TestYourself";
import ProfileContent from "./ProfileContent";
import { useAuth } from "./AuthProvider";
import { toast } from "sonner";

export default function DashboardContent({ setHideNavs }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading, fetchUser } = useAuth();

  const activeContent = searchParams.get("tab") || "generate";

  // Reset hideNavs when changing tabs
  useEffect(() => {
    if (setHideNavs) setHideNavs(false);
  }, [activeContent, setHideNavs]);

  // Handle payment success/failure messages
  useEffect(() => {
    const payment = searchParams.get("payment");
    const plan = searchParams.get("plan");

    if (payment === "success") {
      toast.success(
        `🎉 Payment successful! You now have ${plan || "Pro"} plan access.`
      );
      // Refresh user data to get updated subscription status
      if (fetchUser) {
        fetchUser();
      }
      // Remove query params
      router.replace("/dashboard");
    } else if (payment === "failed") {
      toast.error("Payment failed. Please try again.");
      router.replace("/dashboard");
    } else if (payment === "error") {
      toast.error("An error occurred during payment. Please contact support.");
      router.replace("/dashboard");
    }
  }, [searchParams, router, fetchUser]);

  const isChat = activeContent === 'chat';

  const setActiveContent = (tab) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    router.push(`/dashboard?${params.toString()}`);
  };

  const routeComponents = {
    generate: Generate,
    explore: Explore,
    library: Library,
    flashcards: FlashcardsLibrary,
    quizzes: TestYourself,
    "staff-picks": PremiumCourses,
    upgrade: Upgrade,
    chat: Chat,
    profile: ProfileContent,
  };
  const ContentComponent =
    routeComponents[activeContent] || routeComponents.generate;

  const ComponentWrapper = isChat ? "div" : "div"; // Keep div for now

  return (
    <div className={`relative bg-gray-50 dark:bg-gray-900 ${isChat ? 'h-[calc(100vh-64px)] overflow-hidden' : ''}`}>
      <div
        className={
          isChat
            ? "w-full h-full"
            : "max-w-[90rem] w-full mx-auto px-3 sm:px-6 lg:px-8 xl:px-12 py-6 sm:py-8 lg:py-12 scrollbar-hide"
        }
        style={
          isChat
            ? {}
            : {
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }
        }
      >
        {!isChat && (
          <style jsx>{`
            .scrollbar-hide::-webkit-scrollbar {
              display: none;
            }
          `}</style>
        )}

        <div className={isChat ? "h-full" : "grid grid-cols-1 gap-4 sm:gap-6"}>
          <div className="w-full h-full">
            {ContentComponent ? (
              <ContentComponent
                key={activeContent}
                setActiveContent={setActiveContent}
                setHideNavs={setHideNavs}
              />
            ) : (
              <div className="text-center text-gray-600 dark:text-gray-400">
                Loading content...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
