"use client";

import { useState } from "react";

export default function PaystackTestPage() {
  const [testResults, setTestResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const runTests = async () => {
    setLoading(true);
    setError(null);
    setTestResults(null);

    try {
      const response = await fetch('/api/billing/run-tests');
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Test failed');
      }

      setTestResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          Paystack API Test Suite
        </h1>

        <div className="mb-6">
          <button
            onClick={runTests}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            {loading ? 'Running Tests...' : 'Run Paystack Tests'}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
            <h3 className="text-red-800 dark:text-red-200 font-semibold mb-2">Error</h3>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {testResults && (
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Test Summary
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{testResults.summary.passed}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Passed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{testResults.summary.failed}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{testResults.summary.total}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total</div>
                </div>
              </div>
              <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Test completed at: {new Date(testResults.timestamp).toLocaleString()}
              </div>
            </div>

            {/* Individual Tests */}
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Test Results
              </h2>

              {testResults.tests.map((test, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${
                    test.success
                      ? 'border-green-200 bg-green-50 dark:bg-green-900/10 dark:border-green-800'
                      : 'border-red-200 bg-red-50 dark:bg-red-900/10 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {test.name}
                    </h3>
                    <span className={`px-2 py-1 rounded text-sm font-medium ${
                      test.success
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100'
                    }`}>
                      {test.success ? 'PASS' : 'FAIL'}
                    </span>
                  </div>

                  <p className={`text-sm mb-2 ${
                    test.success
                      ? 'text-green-700 dark:text-green-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}>
                    {test.message}
                  </p>

                  {test.data && (
                    <details className="mt-2">
                      <summary className="text-sm font-medium text-gray-600 dark:text-gray-400 cursor-pointer">
                        View Details
                      </summary>
                      <pre className="mt-2 text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded overflow-x-auto">
                        {typeof test.data === 'string' ? test.data : JSON.stringify(test.data, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {!testResults && !loading && !error && (
          <div className="text-center text-gray-600 dark:text-gray-400 py-12">
            <div className="text-6xl mb-4">🧪</div>
            <h3 className="text-xl font-semibold mb-2">Ready to Test</h3>
            <p>Click the button above to run the comprehensive Paystack API test suite.</p>
          </div>
        )}
      </div>
    </div>
  );
}