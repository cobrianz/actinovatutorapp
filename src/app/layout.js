import "./globals.css";
import { Jost } from "next/font/google";
import { AuthProvider } from "./components/AuthProvider";
import { Suspense } from "react";

const jost = Jost({ subsets: ["latin"] });

export const metadata = {
  title: "Actinova AI Tutor - Personalized Learning Platform",
  description: "Master any skill with AI-powered personalized learning paths",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body
        className={jost.className}
        suppressHydrationWarning={true}
        dir="ltr"
      >
        <AuthProvider>
          <Suspense fallback={null}>
            {children}
          </Suspense>
        </AuthProvider>
      </body>
    </html>
  );
}
