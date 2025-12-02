// api/routes/logins.js
import express from "express";
import { connectDB } from "../config/db.js";
import LoginSession from "../models/LoginSession.js";

const router = express.Router();

// Ensure DB connection for all routes
router.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connection error in logins:", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// Helper: format any session consistently + add isOnline flag
function formatSession(s) {
  const signIn = s.signInAt ? new Date(s.signInAt).toISOString() : null;
  const signOut = s.signOutAt ? new Date(s.signOutAt).toISOString() : null;

  const isOnline = signIn && !signOut; // 👈 ONLINE condition

  return {
    _id: String(s._id),
    username: s.username,
    email: s.email || null,
    signInAt: signIn,
    signOutAt: signOut,
    isOnline, // 👈 NEW
    createdAt:
      s.createdAt && s.createdAt.toISOString
        ? s.createdAt.toISOString()
        : undefined,
    updatedAt:
      s.updatedAt && s.updatedAt.toISOString
        ? s.updatedAt.toISOString()
        : undefined,
  };
}

/**
 * 🟢 POST /api/logins/start
 * Body: { username, email?, signInAt }
 */
router.post("/start", async (req, res) => {
  const { username, email, signInAt } = req.body;

  if (!username || typeof username !== "string") {
    return res.status(400).json({ message: "username is required" });
  }

  const session = await LoginSession.create({
    username,
    email: email || null, // store email also
    signInAt: signInAt ? new Date(signInAt) : new Date(),
  });

  res.status(201).json(formatSession(session));
});

/**
 * 🔴 POST /api/logins/end
 * Body: { sessionId, signOutAt }
 */
router.post("/end", async (req, res) => {
  try {
    const { sessionId, signOutAt } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required" });
    }

    const session = await LoginSession.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    session.signOutAt = signOutAt ? new Date(signOutAt) : new Date();
    await session.save();

    return res.json(formatSession(session));
  } catch (err) {
    console.error("Error in POST /api/logins/end:", err);
    res
      .status(500)
      .json({ message: "Failed to end session", error: err.message });
  }
});

/**
 * 🧾 GET /api/logins
 * Optional:
 *   ?username=foo     -> filter by username
 *   ?latest=1         -> only latest session
 */
router.get("/", async (req, res) => {
  try {
    const { username, latest } = req.query;

    const filter = {};
    if (username && typeof username === "string") {
      filter.username = username;
    }

    let query = LoginSession.find(filter).sort({ signInAt: -1 });

    if (latest === "1" || latest === "true") {
      query = query.limit(1);
    } else {
      query = query.limit(200);
    }

    const sessions = await query.lean();
    const formatted = sessions.map(formatSession);

    console.log(
      "📜 GET /api/logins => filter:",
      filter,
      "count:",
      formatted.length
    );
    res.json(formatted);
  } catch (err) {
    console.error("Error in GET /api/logins:", err);
    res
      .status(500)
      .json({ message: "Failed to load sessions", error: err.message });
  }
});

/**
 * 🧾 GET /api/logins/:username
 * Returns only the *latest* session for this user
 */
router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;

    if (!username) {
      return res.status(400).json({ message: "username is required" });
    }

    const session = await LoginSession.findOne({ username })
      .sort({ signInAt: -1 })
      .lean();

    if (!session) {
      return res
        .status(404)
        .json({ message: "No session found for this user" });
    }

    res.json(formatSession(session));
  } catch (err) {
    console.error("Error in GET /api/logins/:username:", err);
    res.status(500).json({
      message: "Failed to load user session",
      error: err.message,
    });
  }
});

/**
 * 🗑️ DELETE /api/logins/user/:username
 * Delete all login records for this user
 */
router.delete("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    if (!username) {
      return res.status(400).json({ message: "Username is required" });
    }

    const result = await LoginSession.deleteMany({ username });

    res.json({
      message: "User login activity deleted",
      username,
      deletedCount: result.deletedCount,
    });
  } catch (err) {
    console.error("Error deleting user login activity:", err);
    res.status(500).json({
      message: "Failed to delete user login activity",
      error: err.message,
    });
  }
});

export default router;
