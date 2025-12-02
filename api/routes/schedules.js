import { Router } from "express";
import Schedule from "../models/Schedule.js";

const router = Router();

/**
 * GET /api/schedules
 * Optional query: ?username=john
 */
router.get("/", async (req, res) => {
  try {
    const { username } = req.query;

    const filter = {};
    if (username) {
      filter.username = username;
    }

    const items = await Schedule.find(filter).sort({ day: 1, startTime: 1 });
    res.json(items);
  } catch (err) {
    console.error("Error fetching schedules:", err);
    res.status(500).json({ message: "Failed to fetch schedules" });
  }
});

/**
 * POST /api/schedules
 * body: { username, day, shift, startTime, endTime }
 */
router.post("/", async (req, res) => {
  try {
    const { username, day, shift, startTime, endTime } = req.body;

    if (!username || !day || !shift || !startTime || !endTime) {
      return res.status(400).json({
        message: "username, day, shift, startTime, endTime are required",
      });
    }

    const created = await Schedule.create({
      username,
      day,
      shift,
      startTime,
      endTime,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("Error creating schedule:", err);
    res.status(500).json({ message: "Failed to create schedule" });
  }
});

/**
 * PUT /api/schedules/:id
 * body: { username, day, shift, startTime, endTime }
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { username, day, shift, startTime, endTime } = req.body;

    if (!username || !day || !shift || !startTime || !endTime) {
      return res.status(400).json({
        message: "username, day, shift, startTime, endTime are required",
      });
    }

    const updated = await Schedule.findByIdAndUpdate(
      id,
      { username, day, shift, startTime, endTime },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json(updated);
  } catch (err) {
    console.error("Error updating schedule:", err);
    res.status(500).json({ message: "Failed to update schedule" });
  }
});

/**
 * DELETE /api/schedules/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleted = await Schedule.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Schedule not found" });
    }

    res.json({ message: "Deleted successfully" });
  } catch (err) {
    console.error("Error deleting schedule:", err);
    res.status(500).json({ message: "Failed to delete schedule" });
  }
});

export default router;
