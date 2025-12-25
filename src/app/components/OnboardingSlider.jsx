"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

const onboardingScreens = [
    {
        title: "Personalized AI Tutoring",
        description: "Experience learning tailored specifically to your needs with our advanced AI engine.",
        image: "/logo.png", // Replace with appropriate icons/images if available
        color: "bg-indigo-600"
    },
    {
        title: "Learn Anywhere, Anytime",
        description: "Access your lessons, quizzes, and flashcards on the go. Seamlessly sync across devices.",
        image: "/logo.png",
        color: "bg-purple-600"
    },
    {
        title: "Empowering Your Success",
        description: "Join thousands of learners worldwide and reach your educational goals faster.",
        image: "/logo.png",
        color: "bg-blue-600"
    }
];

export default function OnboardingSlider() {
    const [currentScreen, setCurrentScreen] = useState(0);
    const router = useRouter();

    const handleNext = () => {
        if (currentScreen < onboardingScreens.length - 1) {
            setCurrentScreen(currentScreen + 1);
        } else {
            localStorage.setItem('onboarding_seen', 'true');
            router.push("/auth/signup");
        }
    };

    return (
        <div className="fixed inset-0 z-40 bg-white dark:bg-gray-950 flex flex-col items-center justify-between p-8">
            {/* Top Transitioning Dots */}
            <div className="w-full flex justify-center gap-2 mt-12">
                {onboardingScreens.map((_, index) => (
                    <div
                        key={index}
                        className={`h-2 rounded-full transition-all duration-300 ${index === currentScreen ? "w-8 bg-indigo-600" : "w-2 bg-gray-300 dark:bg-gray-700"
                            }`}
                    />
                ))}
            </div>

            {/* Screen Content */}
            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-sm">
                <div className="relative w-64 h-64 mb-4">
                    <Image
                        src={onboardingScreens[currentScreen].image}
                        alt={onboardingScreens[currentScreen].title}
                        fill
                        className="object-contain"
                    />
                </div>
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                    {onboardingScreens[currentScreen].title}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
                    {onboardingScreens[currentScreen].description}
                </p>
            </div>

            {/* Bottom Buttons */}
            <div className="w-full flex flex-col gap-4 mb-12">
                <button
                    onClick={handleNext}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-blue-500/20 dark:shadow-none transition-all active:scale-95"
                >
                    {currentScreen === onboardingScreens.length - 1 ? "Get Started" : "Next"}
                </button>
            </div>
        </div>
    );
}
