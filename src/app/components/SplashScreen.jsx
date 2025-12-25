"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export default function SplashScreen({ onComplete }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onComplete, 500); // Wait for fade out
    }, 2000); 

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-white dark:bg-gray-950 transition-opacity duration-500 ${visible ? "opacity-100" : "opacity-0"}`}>
      <div className="relative w-48 h-48 animate-pulse">
        <Image
          src="/logo.png"
          alt="Actinova Logo"
          fill
          className="object-contain"
          priority
        />
      </div>
    </div>
  );
}
