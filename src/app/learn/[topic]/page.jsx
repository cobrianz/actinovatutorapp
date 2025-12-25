import { ThemeProvider } from "../../components/ThemeProvider";
import ProtectedRoute from "../../components/ProtectedRoute";
import LearnContent from "../../components/LearnContent";

export default function LearnPage() {
  return (
    <ProtectedRoute>
      <ThemeProvider>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
          <LearnContent />
        </div>
      </ThemeProvider>
    </ProtectedRoute>
  );
}
