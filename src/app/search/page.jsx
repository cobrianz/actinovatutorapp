"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Search, BookOpen, FileText, Clock, Users } from "lucide-react";
import Link from "next/link";

function SearchContent() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Mock search results
  const mockResults = [
    {
      id: 1,
      title: "JavaScript Fundamentals",
      description: "Learn the core concepts of JavaScript programming",
      type: "course",
      difficulty: "beginner",
      duration: "3 weeks",
      students: 1250,
    },
    {
      id: 2,
      title: "React Development Guide",
      description: "Complete guide to building modern React applications",
      type: "questions",
      difficulty: "intermediate",
      duration: "5 weeks",
      students: 890,
    },
    {
      id: 3,
      title: "Node.js Backend Development",
      description: "Build scalable backend applications with Node.js",
      type: "course",
      difficulty: "intermediate",
      duration: "4 weeks",
      students: 670,
    },
    {
      id: 4,
      title: "Python for Data Science",
      description: "Use Python for data analysis and machine learning",
      type: "course",
      difficulty: "beginner",
      duration: "6 weeks",
      students: 2100,
    },
  ];

  useEffect(() => {
    if (query) {
      setLoading(true);
      // Simulate API call
      setTimeout(() => {
        const filtered = mockResults.filter(
          (result) =>
            result.title.toLowerCase().includes(query.toLowerCase()) ||
            result.description.toLowerCase().includes(query.toLowerCase())
        );
        setResults(filtered);
        setLoading(false);
      }, 500);
    } else {
      setResults([]);
    }
  }, [query]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Update URL with search query
    const url = new URL(window.location);
    url.searchParams.set("q", query);
    window.history.pushState({}, "", url);
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Search Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          Search Learning Resources
        </h1>

        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What do you want to learn?"
            className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </form>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Searching...</p>
        </div>
      ) : query && results.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">
            No results found for "{query}"
          </p>
        </div>
      ) : results.length > 0 ? (
        <div>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Found {results.length} results for "{query}"
          </p>

          <div className="space-y-4">
            {results.map((result) => (
              <Link
                key={result.id}
                href={`/learn/${encodeURIComponent(result.title)}`}
                className="block bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {result.type === "course" ? (
                        <BookOpen className="w-5 h-5 text-blue-500" />
                      ) : (
                        <FileText className="w-5 h-5 text-green-500" />
                      )}
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {result.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${result.difficulty === "beginner"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : result.difficulty === "intermediate"
                              ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                              : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                          }`}
                      >
                        {result.difficulty}
                      </span>
                    </div>

                    <p className="text-gray-600 dark:text-gray-400 mb-3">
                      {result.description}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{result.duration}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Users className="w-4 h-4" />
                        <span>{result.students.toLocaleString()} students</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            Enter a search term to find learning resources
          </p>
        </div>
      )}
    </div>
  );
}

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
