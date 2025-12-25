import { ThemeProvider } from "../../components/ThemeProvider";
import ProtectedRoute from "../../components/ProtectedRoute";
import LearnContent from "../../components/LearnContent";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function LearnPage() {
  return (
    <Suspense fallback={null}>
      <ProtectedRoute>
        <ThemeProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            <LearnContent />
          </div>
        </ThemeProvider>
      </ProtectedRoute>
    </Suspense>
  );
}
