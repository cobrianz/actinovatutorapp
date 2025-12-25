import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

// Configuration
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const WEBHOOK_TIMEOUT_MS = 10_000; // 10 seconds

// Helper: Verify Paystack signature
function verifySignature(body, signature) {
  if (!PAYSTACK_SECRET_KEY || !signature) return false;
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET_KEY)
    .update(body)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(signature));
}

// Helper: Safe JSON parse
function safeParse(body) {
  try {
    return JSON.parse(body);
  } catch (err) {
    console.error("Invalid JSON in webhook:", err);
    return null;
  }
}

// Helper: Idempotent billing entry
async function addBillingEntry(userId, data, source = "webhook") {
  const existing = await User.findOne({
    _id: userId,
    "billingHistory.reference": data.reference,
  });

  if (existing) {
    console.log("Duplicate webhook ignored (idempotent):", data.reference);
    return false; // already processed
  }

  const entry = {
    type: "subscription",
    plan: data.metadata?.plan || "pro",
    billingCycle: data.metadata?.billingCycle || "monthly",
    amount: data.amount / 100,
    currency: data.currency,
    reference: data.reference,
    transactionId: data.id,
    status: "success",
    paymentMethod: data.channel,
    gateway: "paystack",
    source,
    gatewayResponse: data.gateway_response,
    paidAt: data.paid_at ? new Date(data.paid_at) : new Date(),
    metadata: {
      authorization_code: data.authorization?.authorization_code,
      card_type: data.authorization?.card_type,
      last4: data.authorization?.last4,
      bank: data.authorization?.bank,
    },
  };

  await User.findByIdAndUpdate(
    userId,
    { $push: { billingHistory: entry } },
    { runValidators: true }
  );

  return true;
}

// Helper: Update subscription period
async function updateSubscriptionPeriod(user, data) {
  const now = new Date();
  const expiresAt = new Date(now);

  const cycle = data.metadata?.billingCycle || "monthly";
  if (cycle === "yearly") {
    expiresAt.setFullYear(now.getFullYear() + 1);
  } else {
    expiresAt.setMonth(now.getMonth() + 1);
  }

  await User.findByIdAndUpdate(
    user._id,
    {
      $set: {
        isPremium: true,
        "subscription.plan": data.metadata?.plan || "pro",
        "subscription.status": "active",
        "subscription.billingCycle": cycle,
        "subscription.currentPeriodStart": now,
        "subscription.currentPeriodEnd": expiresAt,
        "subscription.lastPaymentDate": now,
        "subscription.paystackCustomerCode": data.customer?.customer_code,
        "subscription.paystackReference": data.reference,
      },
    },
    { runValidators: true }
  );
}

export async function POST(request) {
  const startTime = Date.now();
  const bodyRaw = await request.text();
  const signature = headers().get("x-paystack-signature");

  console.log("Webhook received", {
    event: "unknown",
    hasSignature: !!signature,
    bodyLength: bodyRaw.length,
  });

  try {
    // === 1. Validate request timeout (prevent replay attacks) ===
    const deliveredAt = headers().get("x-paystack-delivered-at");
    if (deliveredAt) {
      const age = Date.now() - new Date(deliveredAt).getTime();
      if (age > WEBHOOK_TIMEOUT_MS) {
        console.warn("Webhook too old, possible replay attack");
        return NextResponse.json({ error: "Expired" }, { status: 410 });
      }
    }

    // === 2. Verify signature ===
    if (!verifySignature(bodyRaw, signature)) {
      console.error("Invalid Paystack signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    const event = safeParse(bodyRaw);
    if (!event?.event || !event?.data) {
      console.error("Malformed webhook payload");
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    console.log("Processing Paystack event:", event.event);

    await connectToDatabase();

    // === 3. Handle Events ===
    switch (event.event) {
      case "charge.success": {
        const data = event.data;
        const userId = data.metadata?.userId;

        if (!userId) {
          console.warn("charge.success: No userId in metadata");
          break;
        }

        const user = await User.findById(userId);
        if (!user) {
          console.error("User not found for charge.success:", userId);
          break;
        }

        // Idempotent billing + subscription update
        const isNew = await addBillingEntry(userId, data, "webhook");
        if (isNew) {
          await updateSubscriptionPeriod(user, data);
          console.log(`User ${user.email} upgraded via webhook`);
        }
        break;
      }

      case "subscription.create":
      case "subscription.enable": {
        const data = event.data;
        const userId = data.customer?.metadata?.userId;

        if (!userId) break;

        await User.findByIdAndUpdate(
          userId,
          {
            "subscription.paystackSubscriptionCode": data.subscription_code,
            "subscription.status": "active",
            "subscription.autoRenew": true,
          },
          { runValidators: true }
        );
        console.log(`Subscription activated: ${data.subscription_code}`);
        break;
      }

      case "subscription.disable":
      case "subscription.cancel": {
        const code = event.data.subscription_code;
        const user = await User.findOne({
          "subscription.paystackSubscriptionCode": code,
        });

        if (user) {
          await User.findByIdAndUpdate(user._id, {
            "subscription.status": "canceled",
            "subscription.canceledAt": new Date(),
            "subscription.autoRenew": false,
          });
          console.log(`Subscription canceled: ${code}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const data = event.data;
        const userId = data.customer?.metadata?.userId;
        if (userId) {
          await User.findByIdAndUpdate(userId, {
            "subscription.paymentFailed": true,
            "subscription.lastFailedAt": new Date(),
          });
        }
        break;
      }

      case "invoice.update": {
        // Handle renewal amount changes, etc.
        break;
      }

      default:
        console.log(`Unhandled event: ${event.event}`);
    }

    const processingTime = Date.now() - startTime;
    console.log(`Webhook processed in ${processingTime}ms`);

    return NextResponse.json({ received: true, processed: true });
  } catch (error) {
    console.error("Webhook handler crashed:", {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// Optional: Health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    webhook: "paystack",
    timestamp: new Date().toISOString(),
    tip: "Use POST for events",
  });
}
