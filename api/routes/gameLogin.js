import { Router } from "express";
import GameLogin from "../models/GameLogin.js";

const router = Router();

/**
 * GET /api/game-logins
 * Optional query: ?ownerType=admin|user
 */
router.get("/", async (req, res) => {
  try {
    const { ownerType } = req.query;

    const filter = {}; // ← removed ": any"
    if (ownerType === "admin" || ownerType === "user") {
      filter.ownerType = ownerType;
    }

    const items = await GameLogin.find(filter).sort({ createdAt: -1 });
    res.json(items);
  } catch (err) {
    console.error("Error fetching game logins:", err);
    res.status(500).json({ message: "Failed to fetch game logins" });
  }
});

/**
 * POST /api/game-logins
 * body: { ownerType, gameName, loginUsername?, password?, gameLink? }
 */
router.post("/", async (req, res) => {
  try {
    const { ownerType, gameName, loginUsername, password, gameLink } = req.body;

    if (!ownerType || !["admin", "user"].includes(ownerType)) {
      return res.status(400).json({ message: "Invalid ownerType" });
    }

    if (!gameName || !gameName.trim()) {
      return res.status(400).json({ message: "gameName is required" });
    }

    // Only enforce username/password for admin entries
    if (ownerType === "admin") {
      if (
        !loginUsername ||
        !loginUsername.trim() ||
        !password ||
        !password.trim()
      ) {
        return res.status(400).json({
          message: "loginUsername and password are required for admin logins",
        });
      }
    }

    const created = await GameLogin.create({
      ownerType,
      gameName: gameName.trim(),
      gameLink: gameLink?.trim() || undefined,
      // Only set these for admin; user entries will have them undefined
      loginUsername: ownerType === "admin" ? loginUsername.trim() : undefined,
      password: ownerType === "admin" ? password.trim() : undefined,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating game login:", err);
    res.status(500).json({ message: "Failed to create game login" });
  }
});

/**
 * PUT /api/game-logins/:id
 * body (from frontend): { gameName, loginUsername?, password?, gameLink? }
 * - For admin rows: gameName + loginUsername + password required
 * - For user rows: only gameName required
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { gameName, loginUsername, password, gameLink } = req.body;

    const existing = await GameLogin.findById(id);
    if (!existing) {
      return res.status(404).json({ message: "Game login not found" });
    }

    if (!gameName || !gameName.trim()) {
      return res.status(400).json({
        message: "gameName is required",
      });
    }

    const updateData = {
      // ← removed ": any"
      gameName: gameName.trim(),
      gameLink: gameLink?.trim() || undefined,
    };

    if (existing.ownerType === "admin") {
      // For admin records, still enforce username/password
      if (
        !loginUsername ||
        !loginUsername.trim() ||
        !password ||
        !password.trim()
      ) {
        return res.status(400).json({
          message: "loginUsername and password are required for admin logins",
        });
      }
      updateData.loginUsername = loginUsername.trim();
      updateData.password = password.trim();
    } else {
      // For user records, do not touch loginUsername/password
    }

    const updated = await GameLogin.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    res.json(updated);
  } catch (err) {
    console.error("Error updating game login:", err);
    res.status(500).json({ message: "Failed to update game login" });
  }
});

/**
 * DELETE /api/game-logins/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await GameLogin.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Game login not found" });
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting game login:", err);
    res.status(500).json({ message: "Failed to delete game login" });
  }
});

export default router;
