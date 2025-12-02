import jwt from "jsonwebtoken";
import { connectDB } from "../config/db.js";
import User from "../models/User.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev_jwt_secret_change_me";

export async function requireAdmin(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const [, token] = authHeader.split(" ");

    if (!token) {
      return res.status(401).json({ message: "Missing token" });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    await connectDB();

    const user = await User.findById(payload.userId).select(
      "_id name email role isAdmin"
    );
    if (!user || !user.isAdmin) {
      return res.status(403).json({ message: "Admin access required" });
    }

    // attach admin to request for further use if needed
    req.admin = user;
    next();
  } catch (err) {
    console.error("requireAdmin error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
