import { NextResponse } from "next/server";
import { withErrorHandling } from "@/lib/middleware";
import { verifyToken } from "@/lib/auth";
import { findUserById } from "@/lib/db";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

async function createCheckoutSessionHandler(request) {
  let user = request.user;

  // Helper: robust token extraction
  const extractToken = () => {
    try {
      const cookieApiToken = request.cookies?.get?.("token")?.value;
      if (cookieApiToken) return cookieApiToken;
    } catch (e) { }

    try {
      const ah = request.headers.get("authorization");
      if (ah && ah.startsWith("Bearer ")) return ah.replace("Bearer ", "");
      if (ah) return ah;
    } catch (e) { }

    try {
      const raw = request.headers.get("cookie");
      if (raw) {
        const parts = raw.split(";").map((p) => p.trim());
        for (const p of parts) {
          if (p.startsWith("token=")) return p.slice("token=".length);
        }
      }
    } catch (e) { }

    return null;
  };

  if (!user || !user?._id) {
    try {
      const token = extractToken();
      if (token) {
        let decoded;
        try {
          decoded = verifyToken(token);
        } catch (e) { }

        if (decoded?.id) {
          let found = null;
          try {
            found = await findUserById(decoded.id);
          } catch (e) {
            console.warn("Checkout: findUserById threw", e.message || e);
          }

          if (!found) {
            try {
              const { db } = await connectToDatabase();
              const objId = new ObjectId(decoded.id);
              found = await db.collection("users").findOne({ _id: objId });
            } catch (e) {
              console.warn("Checkout: native DB lookup failed", e.message || e);
            }
          }

          if (found) {
            user = found;
          }
        }
      }
    } catch (err) {
      console.warn("Checkout: fallback token extraction failed", err.message || err);
    }
  }

  if (!user?._id || !user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      console.error("PAYSTACK_SECRET_KEY missing");
      return NextResponse.json(
        { error: "Payment service unavailable" },
        { status: 500 }
      );
    }

    const {
      plan = "pro",
      billingCycle = "monthly",
      paymentMethod = "card",
    } = await request.json();

    // ------------------------------------------------------------------
    // 1. Fetch Plan Details from DB
    // ------------------------------------------------------------------
    const { db } = await connectToDatabase();
    const dbPlans = await db.collection("plans").find({ status: "active" }).toArray();

    // Logic to match the requested plan ID
    const targetPlanId = plan || "pro";



    const selectedPlan = dbPlans.find(p => {
      const pId = p.id || p.name.toLowerCase().split(' ')[0];
      // Match exact ID OR if we requested 'pro' but found a 'premium' plan (alias)
      return pId === targetPlanId || (targetPlanId === 'pro' && (pId === 'premium' || p.name.toLowerCase().includes('premium')));
    });

    if (!selectedPlan) {
      return NextResponse.json(
        { error: "Invalid plan selected" },
        { status: 400 }
      );
    }

    // ------------------------------------------------------------------
    // 2. Calculate Amounts & Determine Currency
    // ------------------------------------------------------------------
    const cycle = billingCycle.toLowerCase() === "yearly" ? "yearly" : "monthly";
    const isYearly = cycle === "yearly";

    // Base USD Price
    const monthlyUsd = selectedPlan.price || 0;

    let finalUsd = monthlyUsd;
    let planNameDisplay = `${selectedPlan.name} - Monthly`;

    if (isYearly) {
      // If DB has a specific yearly price, use it; otherwise apply 7% discount
      const yearlyUsd = selectedPlan.yearlyPrice || (monthlyUsd * 12 * 0.93);
      finalUsd = yearlyUsd;
      planNameDisplay = `${selectedPlan.name} - Yearly (Save 7%)`;
    }

    let currency = "USD";
    let amountToSend = Math.round(finalUsd * 100); // Default USD cents
    let finalKesAmount = 0;
    let channels = ["card"];

    // handle payment method specific logic
    if (paymentMethod === "mobile_money") {
      currency = "KES";
      channels = ["mobile_money"];

      // Dynamic exchange rate fetch
      let exchangeRate = 129; // Fallback
      try {
        const rateRes = await fetch("https://api.exchangerate-api.com/v4/latest/USD", { next: { revalidate: 3600 } });
        if (rateRes.ok) {
          const rateData = await rateRes.json();
          if (rateData?.rates?.KES) {
            exchangeRate = rateData.rates.KES;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch exchange rate, using fallback:", err);
      }

      const exactKes = finalUsd * exchangeRate;
      amountToSend = Math.round(exactKes * 100); // KES cents
      finalKesAmount = Math.ceil(exactKes);
    }

    const planConfig = {
      amount: amountToSend,
      name: planNameDisplay,
      usd: Number(finalUsd.toFixed(2)),
      kes: finalKesAmount,
      interval: cycle
    };

    // Dynamic origin for callback URL
    const host = request.headers.get("host") || "localhost:3000";
    const protocol =
      request.headers.get("x-forwarded-proto")?.split(",").shift() ||
      (host.includes("localhost") ? "http" : "https");
    const origin = `${protocol}://${host}`;
    const callbackUrl = `${origin}/api/billing/verify-payment`;

    const response = await fetch(
      "https://api.paystack.co/transaction/initialize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          amount: planConfig.amount,
          currency: currency,
          callback_url: callbackUrl,
          metadata: {
            userId: user._id.toString(),
            plan: targetPlanId,
            billingCycle: cycle,
            usdAmount: planConfig.usd,
            kesAmount: planConfig.kes || undefined,
            paymentMethod,
          },
          channels: channels,
          custom_fields: [
            {
              display_name: "Customer",
              variable_name: "customer",
              value: user.name || user.email.split("@")[0],
            },
            {
              display_name: "Plan",
              variable_name: "plan",
              value: `${planConfig.name} (${currency === 'USD' ? '$' : 'KES '}${planConfig.amount / 100})`,
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      console.error("Paystack error:", err);
      return NextResponse.json(
        { error: "Payment failed to initialize", details: err.message },
        { status: 502 }
      );
    }

    const { status, data } = await response.json();

    if (!status || !data?.authorization_url || !data?.reference) {
      console.error("Invalid Paystack response:", data);
      return NextResponse.json(
        { error: "Failed to create payment session" },
        { status: 500 }
      );
    }



    // Provide safe user info alongside session so UI can use it immediately
    const safeUser = {
      id: user._id?.toString?.() || user._id,
      email: user.email,
      name: user.name || (user.email || "").split("@")[0],
      avatar: user.avatar || null,
      emailVerified: !!user.emailVerified,
      status: user.status,
      onboardingCompleted: !!user.onboardingCompleted,
      isPremium: !!user.isPremium,
      subscription: user.subscription || null,
    };

    return NextResponse.json({
      success: true,
      sessionUrl: data.authorization_url,
      reference: data.reference,
      amount: planConfig.amount,
      currency: currency,
      billingCycle: cycle,
      user: safeUser,
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      {
        error: "Failed to create checkout session",
        message:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      },
      { status: 500 }
    );
  }
}

export const POST = withErrorHandling(createCheckoutSessionHandler);
