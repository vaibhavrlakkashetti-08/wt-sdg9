import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectToDatabase() {
  if (!env.mongoUri) {
    if (env.databaseRequired) {
      throw new Error("MONGODB_URI is required when the database is required.");
    }

    console.warn("MONGODB_URI is not set; database-backed routes are not ready.");
    return false;
  }

  try {
    await mongoose.connect(env.mongoUri, { serverSelectionTimeoutMS: 5000 });
    console.info("Connected to MongoDB.");
    return true;
  } catch (error) {
    throw new Error("Could not connect to MongoDB.", { cause: error });
  }
}

export function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}