"use client";

import { motion } from "framer-motion";

export default function ActinovaLoader({ text = "course" }) {
  const loadingText =
    text === "flashcards"
      ? "Preparing your flashcards..."
      : text === "quiz" || text.includes("test")
        ? "Creating your quiz..."
        : text.includes("questions")
          ? "Generating your questions..."
          : "Preparing your course...";

  return (
    <div
      data-actinova-loader="true"
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center overflow-hidden bg-white dark:bg-gray-950"
    >
      {/* Dynamic Background Gradients */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-40">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, 50, 0],
          }}
          transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-400 blur-[120px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -120, 0],
            y: [0, -80, 0],
          }}
          transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[10%] -right-[10%] w-[65%] h-[65%] rounded-full bg-purple-400 blur-[130px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] right-[10%] w-[40%] h-[40%] rounded-full bg-pink-300 blur-[100px]"
        />
      </div>

      <div className="relative flex flex-col items-center gap-8">
        {/* Central Pulsing Neural Core */}
        <div className="relative w-40 h-40 flex items-center justify-center">
          {/* Static Outer Glow */}
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-3xl" />

          {/* Animated Pulsing Rings */}
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{
                scale: [0.8, 1.5],
                opacity: [0.5, 0]
              }}
              transition={{
                duration: 2.5,
                repeat: Infinity,
                delay: i * 0.8,
                ease: "easeOut"
              }}
              className="absolute inset-0 border-2 border-blue-400/30 rounded-full"
            />
          ))}

          {/* Core Icon Wrapper */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              rotate: [0, 5, -5, 0],
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="relative z-10 w-24 h-24 flex items-center justify-center bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-blue-100 dark:border-blue-900/50"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/10 to-purple-500/10 rounded-3xl" />
            <img
              src="/logo.png"
              alt="Actinova Logo"
              className="w-16 h-16 object-contain relative z-20"
            />

            {/* Spinning Orbitals */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
              className="absolute -inset-4 border border-dashed border-blue-400/40 rounded-full pointer-events-none"
            />
          </motion.div>
        </div>

        {/* Text Section */}
        <div className="flex flex-col items-center gap-3">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400"
          >
            Actinova AI
          </motion.h2>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center"
          >
            <p className="text-gray-500 dark:text-gray-400 font-medium tracking-wide">
              {loadingText}
            </p>

            {/* Smooth Progress Indicator */}
            <div className="mt-4 flex gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                  className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400"
                />
              ))}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer Branding */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="absolute bottom-10 text-gray-400 dark:text-gray-600 text-xs font-medium uppercase tracking-[0.2em]"
      >
        Neural Engine Active
      </motion.div>
    </div>
  );
}
