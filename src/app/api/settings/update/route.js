// src/app/api/user/settings/route.js

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

const DEFAULT_SETTINGS = {
  notifications: {
    email: true,
    push: false,
    marketing: true,
    courseUpdates: true,
  },
  privacy: {
    profileVisible: true,
    progressVisible: false,
    achievementsVisible: true,
  },
  preferences: {
    theme: "light",
    language: "en",
    difficulty: "beginner",
    learningStyle: "visual",
    dailyGoal: 30,
  },
};

export async function GET(request) {
  try {
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : null;

    let userId = null;
    const { verifyToken } = await import("@/lib/auth");

    if (token) {
      try {
        const payload = verifyToken(token);
        if (payload?.id) {
          userId = new ObjectId(payload.id);
        }
      } catch (error) {
        // Header token invalid, try cookie
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
            const [key, value] = cookie.split("=");
            acc[key] = value;
            return acc;
          }, {});
          token = cookies.token;
          if (token) {
            try {
              const payload = verifyToken(token);
              if (payload?.id) {
                userId = new ObjectId(payload.id);
              }
            } catch (cookieError) {
              // Cookie token also invalid
            }
          }
        }
      }
    } else {
      // No header, check cookie
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
          const [key, value] = cookie.split("=");
          acc[key] = value;
          return acc;
        }, {});
        token = cookies.token;
        if (token) {
          try {
            const payload = verifyToken(token);
            if (payload?.id) {
              userId = new ObjectId(payload.id);
            }
          } catch (error) {
            // Cookie token invalid
          }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { db } = await connectToDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: userId }, { projection: { settings: 1 } });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      settings: user.settings || DEFAULT_SETTINGS,
    });
  } catch (error) {
    console.error("[GET /settings] Error:", error);
    return NextResponse.json(
      { error: "Failed to load settings" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const authHeader = request.headers.get("authorization");
    let token = authHeader?.startsWith("Bearer ")
      ? authHeader.split("Bearer ")[1]
      : null;

    let userId = null;
    const { verifyToken } = await import("@/lib/auth");

    if (token) {
      try {
        const payload = verifyToken(token);
        if (payload?.id) {
          userId = new ObjectId(payload.id);
        }
      } catch (error) {
        // Header token invalid, try cookie
        const cookieHeader = request.headers.get("cookie");
        if (cookieHeader) {
          const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
            const [key, value] = cookie.split("=");
            acc[key] = value;
            return acc;
          }, {});
          token = cookies.token;
          if (token) {
            try {
              const payload = verifyToken(token);
              if (payload?.id) {
                userId = new ObjectId(payload.id);
              }
            } catch (cookieError) {
              // Cookie token also invalid
            }
          }
        }
      }
    } else {
      // No header, check cookie
      const cookieHeader = request.headers.get("cookie");
      if (cookieHeader) {
        const cookies = cookieHeader.split("; ").reduce((acc, cookie) => {
          const [key, value] = cookie.split("=");
          acc[key] = value;
          return acc;
        }, {});
        token = cookies.token;
        if (token) {
          try {
            const payload = verifyToken(token);
            if (payload?.id) {
              userId = new ObjectId(payload.id);
            }
          } catch (error) {
            // Cookie token invalid
          }
        }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let updates;
    try {
      updates = await request.json();

      // Basic validation — prevent malicious keys
      if (typeof updates !== "object" || Array.isArray(updates)) {
        return NextResponse.json(
          { error: "Invalid settings format" },
          { status: 400 }
        );
      }

      // Only allow these top-level keys
      const allowed = ["notifications", "privacy", "preferences"];
      const filtered = {};
      for (const key of allowed) {
        if (updates[key] !== undefined) {
          filtered[key] = updates[key];
        }
      }

      if (Object.keys(filtered).length === 0) {
        return NextResponse.json(
          { error: "No valid settings provided" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { db } = await connectToDatabase();

    const result = await db.collection("users").updateOne(
      { _id: userId },
      {
        $set: {
          "settings.notifications": updates.notifications,
          "settings.privacy": updates.privacy,
          "settings.preferences": updates.preferences,
          "settings.updatedAt": new Date(),
        },
      },
      { upsert: false }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Return merged settings (preserves untouched values)
    const user = await db
      .collection("users")
      .findOne({ _id: userId }, { projection: { settings: 1 } });

    return NextResponse.json({
      success: true,
      message: "Settings saved successfully",
      settings: user.settings || DEFAULT_SETTINGS,
    });
  } catch (error) {
    console.error("[POST /settings] Error:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
