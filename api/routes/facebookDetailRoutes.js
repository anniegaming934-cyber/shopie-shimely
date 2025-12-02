// routes/facebookDetailRoutes.js
import express from "express";
import bcrypt from "bcryptjs";
import { FacebookDetail } from "../models/FacebookDetail.js";

const router = express.Router();

// GET /api/facebook-details
router.get("/", async (_req, res) => {
  try {
    const details = await FacebookDetail.find().sort({ createdAt: -1 });
    res.json(details);
  } catch (err) {
    console.error("GET /facebook-details error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// POST /api/facebook-details
router.post("/", async (req, res) => {
  try {
    const { email, password, label } = req.body || {};

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required." });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ message: "Password must be at least 6 characters." });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const detail = await FacebookDetail.findOneAndUpdate(
      { email: email.toLowerCase().trim() },
      {
        email: email.toLowerCase().trim(),
        passwordHash,
        label: label?.trim(),
      },
      { new: true, upsert: true }
    );

    res.status(201).json({
      message: "Facebook detail saved.",
      detail: {
        _id: detail._id,
        email: detail.email,
        label: detail.label,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
      },
    });
  } catch (err) {
    console.error("POST /facebook-details error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// PUT /api/facebook-details/:id
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, label } = req.body || {};

    const update = {};
    if (email) update.email = email.toLowerCase().trim();
    if (typeof label === "string") update.label = label.trim();

    if (password) {
      if (password.length < 6) {
        return res
          .status(400)
          .json({ message: "Password must be at least 6 characters." });
      }
      update.passwordHash = await bcrypt.hash(password, 10);
    }

    const detail = await FacebookDetail.findByIdAndUpdate(id, update, {
      new: true,
    });

    if (!detail) {
      return res.status(404).json({ message: "Record not found." });
    }

    res.json({
      message: "Facebook detail updated.",
      detail: {
        _id: detail._id,
        email: detail.email,
        label: detail.label,
        createdAt: detail.createdAt,
        updatedAt: detail.updatedAt,
      },
    });
  } catch (err) {
    console.error("PUT /facebook-details/:id error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

// DELETE /api/facebook-details/:id
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const detail = await FacebookDetail.findByIdAndDelete(id);
    if (!detail) {
      return res.status(404).json({ message: "Record not found." });
    }
    res.json({ message: "Facebook detail deleted." });
  } catch (err) {
    console.error("DELETE /facebook-details/:id error:", err);
    res.status(500).json({ message: "Server error." });
  }
});

export default router;
