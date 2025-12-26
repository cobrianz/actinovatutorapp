import { NextResponse } from "next/server";
import { connectToMongoDB } from "@/lib/db";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

// Helper: Generate redirect URL from request
const redirectTo = (req, path) => {
  const url = new URL(path, req.url);
  return NextResponse.redirect(url);
};

export async function GET(request) {
  const startTime = Date.now();

  try {
    await connectToMongoDB();

    const { searchParams } = new URL(request.url);
    const reference =
      searchParams.get("reference") || searchParams.get("trxref");

    if (!reference) {
      return redirectTo(request, "/dashboard?payment=error&msg=no-reference");
    }

    // === 1. Verify transaction with Paystack ===
    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!verifyRes.ok) {
      const err = await verifyRes.text();
      console.error(`Paystack API error ${verifyRes.status}:`, err);
      return redirectTo(request, "/dashboard?payment=error&msg=provider-error");
    }

    const { status, message, data } = await verifyRes.json();

    if (!status || !data) {
      console.error("Paystack verification failed:", { message, data });
      return redirectTo(
        request,
        "/dashboard?payment=failed&msg=invalid-response"
      );
    }

    if (data.status !== "success") {
      console.log(`Payment not successful: ${data.status}`, data);
      return redirectTo(
        request,
        `/dashboard?payment=failed&status=${data.status}`
      );
    }

    // payment verified successfully

    // === 2. Extract critical data ===
    const metadata = data.metadata || {};
    const userId = metadata.userId;
    const plan = metadata.plan || "pro";
    const billingCycle = metadata.billingCycle || "monthly";

    if (!userId) {
      console.error("Missing userId in metadata");
      return redirectTo(request, "/dashboard?payment=error&msg=no-user");
    }

    // === 3. Find user ===
    let user = null;
    try {
      user = await User.findById(userId).select("-password");
    } catch (e) {
      console.warn("User.findById threw", e.message || e);
    }

    // Fallback: search by email (in case of race condition)
    if (!user && data.customer?.email) {
      // try find by email fallback
      try {
        user = await User.findOne({ email: data.customer.email }).select(
          "-password"
        );
      } catch (e) {
        console.warn("User.findOne by email threw", e.message || e);
      }
    }

    // Extra fallback: native driver lookup in case Mongoose models/connection mismatch
    if (!user) {
      try {
        // Attempt native DB lookup for userId fallback
        const { db } = await connectToDatabase();
        let objId = null;
        try {
          objId = new ObjectId(userId);
        } catch (e) {
          console.warn("Invalid ObjectId format for userId", userId);
        }

        if (objId) {
          const nativeUser = await db.collection("users").findOne({ _id: objId });
          if (nativeUser) {
            user = nativeUser;
          } else if (data.customer?.email) {
            const nativeByEmail = await db.collection("users").findOne({ email: data.customer.email });
            if (nativeByEmail) {
              user = nativeByEmail;
            }
          }
        }
      } catch (e) {
        console.warn("Native DB lookup failed", e.message || e);
      }
    }

    if (!user) {
      console.error("User not found", { userId, email: data.customer?.email });
      return redirectTo(request, "/dashboard?payment=error&msg=user-not-found");
    }

    // === 4. Prevent duplicate processing ===
    const alreadyProcessed = user.billingHistory?.some(
      (h) => h.reference === data.reference
    );

    if (alreadyProcessed) {
      console.log("Transaction already processed (idempotent)", data.reference);
      return redirectTo(
        request,
        `/dashboard?payment=success&plan=${plan}&ref=${data.reference}`
      );
    }

    // === 5. Calculate subscription period ===
    const now = new Date();
    const expiresAt = new Date(now);

    if (billingCycle === "yearly") {
      expiresAt.setFullYear(now.getFullYear() + 1);
    } else {
      expiresAt.setMonth(now.getMonth() + 1);
    }

    // === 6. Create billing record ===
    const billingEntry = {
      type: "subscription",
      plan,
      billingCycle,
      amount: data.amount / 100,
      currency: data.currency,
      reference: data.reference,
      transactionId: data.id,
      status: "success",
      paymentMethod: data.channel,
      gateway: "paystack",
      gatewayResponse: data.gateway_response,
      paidAt: data.paid_at ? new Date(data.paid_at) : now,
      metadata: {
        ...metadata, // Preserve custom fields (userId, paymentMethod, plan, etc.)
        authorization_code: data.authorization?.authorization_code,
        card_type: data.authorization?.card_type,
        last4: data.authorization?.last4,
        exp_month: data.authorization?.exp_month,
        exp_year: data.authorization?.exp_year,
        bank: data.authorization?.bank,
        country_code: data.authorization?.country_code,
      },
    };

    // === 7. Update user subscription ===
    let updatedUser = null;
    try {
      updatedUser = await User.findByIdAndUpdate(
        user._id,
        {
          $set: {
            isPremium: true,
            "subscription.plan": plan,
            "subscription.status": "active",
            "subscription.billingCycle": billingCycle,
            "subscription.currentPeriodStart": now,
            "subscription.currentPeriodEnd": expiresAt,
            "subscription.paystackCustomerCode": data.customer?.customer_code,
            "subscription.paystackReference": data.reference,
            "subscription.lastPaymentDate": now,
            "subscription.autoRenew": true,
          },
          $push: { billingHistory: billingEntry },
        },
        { new: true, runValidators: true }
      );
    } catch (e) {
      // Mongoose update threw
      updatedUser = null;
    }

    // If Mongoose update failed or returned null, try native DB update
    if (!updatedUser) {
      try {
        // Attempt native DB update as a fallback
        const { db } = await connectToDatabase();
        const objId = new ObjectId(user._id);
        const res = await db.collection("users").updateOne(
          { _id: objId },
          {
            $set: {
              isPremium: true,
              "subscription.plan": plan,
              "subscription.status": "active",
              "subscription.billingCycle": billingCycle,
              "subscription.currentPeriodStart": now,
              "subscription.currentPeriodEnd": expiresAt,
              "subscription.paystackCustomerCode": data.customer?.customer_code,
              "subscription.paystackReference": data.reference,
              "subscription.lastPaymentDate": now,
              "subscription.autoRenew": true,
            },
            $push: { billingHistory: billingEntry },
          }
        );

        if (res.matchedCount > 0) {
          const { db: _db } = await connectToDatabase();
          updatedUser = await _db.collection("users").findOne({ _id: objId });
        }
      } catch (e) {
        // native DB update failed
      }
    }

    if (!updatedUser) {
      return redirectTo(request, "/dashboard?payment=error&msg=update-failed");
    }

    // === 8. Send confirmation email (non-blocking) ===
    import("@/lib/email")
      .then(({ sendUpgradeEmail }) => {
        sendUpgradeEmail({
          to: user.email,
          name: user.firstName || user.name,
          plan,
          billingCycle,
          amount: data.amount / 100,
          currency: data.currency,
          expiresAt,
          reference: data.reference,
        }).catch((err) => console.error("Failed to send upgrade email:", err));
      })
      .catch(() => console.warn("Email module not available"));

    // === 9. Success! ===
    const successUrl = `/dashboard?payment=success&plan=${plan}&cycle=${billingCycle}&ref=${data.reference}&amount=${data.amount / 100}`;
    // verification complete
    return redirectTo(request, successUrl);
  } catch (error) {
    console.error("Payment verification crashed:", error.message);
    return redirectTo(request, "/dashboard?payment=error&msg=server-error");
  }
}

// Optional: Debug endpoint (remove or protect in production!)
export async function POST(request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Debug endpoint disabled" },
      { status: 404 }
    );
  }

  try {
    const { reference } = await request.json();
    if (!reference)
      return NextResponse.json(
        { error: "reference required" },
        { status: 400 }
      );

    const res = await fetch(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      }
    );

    const data = await res.json();
    return NextResponse.json({
      reference,
      success: data.status && data.data?.status === "success",
      data: data.data,
    });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
