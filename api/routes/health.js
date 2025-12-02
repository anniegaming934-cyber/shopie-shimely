// api/routes/health.js
import express from "express";
import { connectDB } from "../config/db.js";

const router = express.Router();

router.get("/", async (_req, res) => {
  try {
    await connectDB();
    res.json({ ok: true, db: "connected" });
  } catch (err) {
    console.error("❌ DB connect error in /api/health:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
      code: err.code,
      codeName: err.codeName,
    });
  }
});

export default router;
