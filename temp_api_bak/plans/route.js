import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";

export async function GET() {
    try {
        const { db } = await connectToDatabase();

        // Fetch all active plans
        const plans = await db
            .collection("plans")
            .find({ status: "active" })
            .sort({ price: 1 }) // Sort by price ascending
            .toArray();

        // Transform for frontend if needed, or return as is
        // The seed data has correct structure: id, name, price, features, etc.

        // We want to format the output to match what the frontend expects,
        // or update the frontend to use the DB format.
        // The DB format from seed-plans.js is quite good.
        // Let's add 'popular' flag logic if needed, or just return as is.

        const formattedPlans = plans.map(plan => ({
            ...plan,
            id: plan.id || plan.name.toLowerCase().split(' ')[0], // efficient fallback
            popular: plan.id === 'premium' || plan.name.toLowerCase().includes('pro'),
        }));

        return NextResponse.json({ plans: formattedPlans });
    } catch (error) {
        console.error("Failed to fetch plans:", error);
        return NextResponse.json(
            { error: "Failed to fetch plans" },
            { status: 500 }
        );
    }
}
