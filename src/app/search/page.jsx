import SearchContent from "../components/SearchContent";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
        <p className="text-gray-600 dark:text-gray-400 mt-4">Loading Search...</p>
      </div>
    }>
      <SearchContent />
    </Suspense>
  );
}
