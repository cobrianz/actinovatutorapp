import "./globals.css";
import { Jost } from "next/font/google";
import { AuthProvider } from "./components/AuthProvider";
import { Suspense } from "react";

const jost = Jost({ subsets: ["latin"] });

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata = {
  title: "Actinova AI Tutor - Personalized Learning Platform",
  description: "Master any skill with AI-powered personalized learning paths",
  icons: {
    icon: "/favicon.ico",
  },
};

import InitializationWrapper from "./components/InitializationWrapper";

export default function RootLayout({ children }) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body
        className={jost.className}
        suppressHydrationWarning={true}
        dir="ltr"
      >
        <AuthProvider>
          <InitializationWrapper>
            <Suspense fallback={null}>
              {children}
            </Suspense>
          </InitializationWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
