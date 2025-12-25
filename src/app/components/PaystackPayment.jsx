"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function PaystackPayment({ plan, amount, userEmail }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handlePayment = async () => {
    setLoading(true);
    try {
      // Call your API to create checkout session
      const response = await fetch("/api/billing/create-session", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (response.ok && data.sessionUrl) {
        // Redirect to Paystack payment page
        window.location.href = data.sessionUrl;
      } else {
        toast.error(data.error || "Failed to initialize payment");
        setLoading(false);
      }
    } catch (error) {
      console.error("Payment error:", error);
      toast.error("Failed to initialize payment");
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handlePayment}
      disabled={loading}
      className="w-full py-3 px-4 rounded-lg font-medium transition-all bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? "Processing..." : `Pay $${amount}`}
    </button>
  );
}
