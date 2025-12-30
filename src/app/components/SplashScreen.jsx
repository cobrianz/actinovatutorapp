"use client";

import Image from "next/image";

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-gray-950 transition-opacity duration-500">
      <div className="flex flex-col items-center gap-6">
        <div className="relative w-40 h-40 animate-pulse">
          <Image
            src="/logo.png"
            alt="Actinova Logo"
            fill
            className="object-contain"
            priority
          />
        </div>

        {/* Initializing Loader */}
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-600 animate-pulse" style={{ width: '100%' }}></div>
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 dark:text-gray-500">
            Initializing
          </p>
        </div>
      </div>
    </div>
  );
}
