import { NextResponse } from "next/server";

// Helper: Safely get base URL
const getBaseUrl = () => {
  return process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : "http://localhost:3000";
};

export async function GET() {
  const baseUrl = getBaseUrl();
  const hasSecretKey = !!process.env.PAYSTACK_SECRET_KEY;

  // Always mask the key — never expose full value
  const secretKeyStatus = hasSecretKey
    ? `sk_live_***${process.env.PAYSTACK_SECRET_KEY.slice(-6)}` // show last 6 chars
    : "Not configured";

  const result = {
    paystackConfigured: hasSecretKey,
    secretKeyStatus,
    environment: process.env.NODE_ENV || "unknown",
    timestamp: new Date().toISOString(),
    urls: {
      webhook: `${baseUrl}/api/billing/webhook`,
      verifyPayment: `${baseUrl}/api/billing/verify-payment`,
      dashboard: "https://dashboard.paystack.com/#/transactions",
    },
    apiTest: { status: "skipped" },
    latestTransactions: [],
  };

  // Only test API if key exists
  if (!hasSecretKey) {
    result.apiTest = {
      status: "skipped",
      reason: "PAYSTACK_SECRET_KEY not set",
    };
    return NextResponse.json(result);
  }

  try {
    const response = await fetch(
      "https://api.paystack.co/transaction?perPage=5",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    result.apiTest = {
      status: response.ok ? "connected" : "failed",
      statusCode: response.status,
      ok: response.ok,
    };

    if (response.ok) {
      const data = await response.json();

      result.latestTransactions = (data.data || []).map((tx) => ({
        reference: tx.reference,
        amount: tx.amount / 100, // convert from kobo/cents
        currency: tx.currency,
        status: tx.status,
        customer: tx.customer?.email || "N/A",
        paidAt: tx.paid_at,
        channel: tx.channel,
      }));
    } else {
      const error = await response.json().catch(() => ({}));
      result.apiTest.error = error.message || "Unknown error";
    }
  } catch (error) {
    console.error("Paystack health check failed:", error);
    result.apiTest = {
      status: "error",
      message: error.message,
      hint: "Check your internet or Paystack secret key permissions",
    };
  }

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Content-Type": "application/json",
    },
  });
}
