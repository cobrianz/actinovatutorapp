// lib/mongodb.js
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      return mongoose;
    });
  }

  try {
    const mongooseInstance = await cached.promise;
    // Return an object compatible with both native driver users and Mongoose users
    cached.conn = {
      client: mongooseInstance.connection.getClient(),
      db: mongooseInstance.connection.db,
      mongoose: mongooseInstance
    };
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export async function closeDatabaseConnection() {
  if (cached.conn) {
    await cached.conn.mongoose.disconnect();
    cached.conn = null;
    cached.promise = null;
  }
}

