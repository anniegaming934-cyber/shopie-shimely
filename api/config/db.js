import mongoose from "mongoose";

// 🔧 Disable strictQuery warnings
mongoose.set("strictQuery", false);

// Cache connection promise to avoid duplicate connections
let mongoPromise = null;

export async function connectDB(retryCount = 0) {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB || "coin";

  if (!uri) {
    console.error("❌ MONGODB_URI is missing in environment variables");
    throw new Error("MONGODB_URI not set");
  }

  // ✅ Already connected
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  // ✅ Reuse existing connection attempt
  if (mongoPromise) {
    return mongoPromise;
  }

  console.log(`📡 Connecting to MongoDB (${dbName})...`);

  mongoPromise = mongoose
    .connect(uri, { dbName })
    .then((conn) => {
      console.log("✅ MongoDB connected successfully");
      return conn;
    })
    .catch(async (err) => {
      console.error("❌ MongoDB connection error:", err.message);

      // 🕒 Retry logic (up to 3 times)
      if (retryCount < 3) {
        const delay = (retryCount + 1) * 2000;
        console.log(`🔁 Retrying MongoDB connection in ${delay / 1000}s...`);
        await new Promise((res) => setTimeout(res, delay));
        mongoPromise = null;
        return connectDB(retryCount + 1);
      }

      console.error("🚨 Failed to connect to MongoDB after multiple attempts");
      mongoPromise = null;
      throw err;
    });

  return mongoPromise;
}
