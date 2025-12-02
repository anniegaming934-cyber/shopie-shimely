// api/routes/salaries.js
import express from "express";
import { connectDB } from "../config/db.js";
import Salary from "../models/Salary.js";

const router = express.Router();

// Ensure DB for all routes here
router.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connect (salaries) failed:", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// helper
const toNumber = (v, def = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
};

const PER_ABSENT = 500; // 👈 each absent = 500 deduction

/**
 * 🔹 GET /api/salaries
 */
router.get("/", async (req, res) => {
  try {
    const { username, month } = req.query;

    const filter = {};

    if (username && String(username).trim()) {
      filter.username = String(username).trim();
    }

    if (month && String(month).trim()) {
      filter.month = String(month).trim();
    }

    const docs = await Salary.find(filter)
      .sort({ month: -1, createdAt: -1 })
      .lean({ virtuals: true });

    res.json(docs);
  } catch (err) {
    console.error("❌ GET /api/salaries error:", err);
    res.status(500).json({ message: "Failed to load salaries" });
  }
});

/**
 * 🔹 POST /api/salaries
 * Uses paidSalary + daysAbsent to calculate remainingSalary if needed.
 */
router.post("/", async (req, res) => {
  try {
    const {
      username,
      month,
      totalSalary,
      daysAbsent,
      paidSalary,
      remainingSalary,
      dueDate,
      note,
    } = req.body;

    console.log("💾 POST /api/salaries body:", req.body); // TEMP: for debug

    if (!username || !String(username).trim()) {
      return res.status(400).json({ message: "username is required" });
    }
    if (!month || !String(month).trim()) {
      return res.status(400).json({ message: "month is required (YYYY-MM)" });
    }

    const total = toNumber(totalSalary, NaN);
    if (!Number.isFinite(total) || total < 0) {
      return res.status(400).json({ message: "Invalid totalSalary" });
    }

    const absDays = toNumber(daysAbsent, 0);
    const paid = toNumber(paidSalary, 0);

    // 👇 net salary AFTER absence deduction
    const netSalary = Math.max(0, total - absDays * PER_ABSENT);

    // if remainingSalary is provided, trust it; otherwise compute from netSalary - paid
    let remaining =
      remainingSalary != null ? toNumber(remainingSalary, 0) : netSalary - paid;

    if (remaining < 0) remaining = 0;

    const doc = await Salary.findOneAndUpdate(
      { username: String(username).trim(), month: String(month).trim() },
      {
        username: String(username).trim(),
        month: String(month).trim(),
        totalSalary: total,
        daysAbsent: absDays,
        paidSalary: paid,      // ✅ store paidSalary
        remainingSalary: remaining,
        dueDate: dueDate ?? "",
        note: note ?? "",
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    res.status(201).json(doc);
  } catch (err) {
    console.error("❌ POST /api/salaries error:", err);
    res.status(500).json({ message: "Failed to save salary" });
  }
});

/**
 * 🔹 PUT /api/salaries/:id
 */
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const {
      totalSalary,
      daysAbsent,
      paidSalary,
      remainingSalary,
      dueDate,
      note,
    } = req.body;

    const doc = await Salary.findById(id);
    if (!doc) {
      return res.status(404).json({ message: "Salary row not found" });
    }

    // Start from existing values
    let newTotal = doc.totalSalary;
    let newDaysAbsent = doc.daysAbsent;
    let newPaid = doc.paidSalary ?? 0;

    if (totalSalary !== undefined) {
      const total = toNumber(totalSalary, NaN);
      if (!Number.isFinite(total) || total < 0) {
        return res.status(400).json({ message: "Invalid totalSalary" });
      }
      newTotal = total;
      doc.totalSalary = total;
    }

    if (daysAbsent !== undefined) {
      const absDays = toNumber(daysAbsent, NaN);
      if (!Number.isFinite(absDays) || absDays < 0) {
        return res.status(400).json({ message: "Invalid daysAbsent" });
      }
      newDaysAbsent = absDays;
      doc.daysAbsent = absDays;
    }

    if (paidSalary !== undefined) {
      const paid = toNumber(paidSalary, NaN);
      if (!Number.isFinite(paid) || paid < 0) {
        return res.status(400).json({ message: "Invalid paidSalary" });
      }
      newPaid = paid;
      doc.paidSalary = paid; // ✅ persist
    }

    // Decide remainingSalary
    if (remainingSalary !== undefined) {
      // Frontend gave us final remainingSalary → trust it
      let rem = toNumber(remainingSalary, NaN);
      if (!Number.isFinite(rem) || rem < 0) {
        return res.status(400).json({ message: "Invalid remainingSalary" });
      }
      doc.remainingSalary = rem;
    } else if (paidSalary !== undefined || totalSalary !== undefined || daysAbsent !== undefined) {
      // If we changed any of these, recompute remaining
      const netSalary = Math.max(0, newTotal - newDaysAbsent * PER_ABSENT);
      let rem = netSalary - newPaid;
      if (rem < 0) rem = 0;
      doc.remainingSalary = rem;
    }

    if (dueDate !== undefined) {
      doc.dueDate = dueDate ?? "";
    }

    if (note !== undefined) {
      doc.note = note ?? "";
    }

    const updated = await doc.save();
    res.json(updated);
  } catch (err) {
    console.error("❌ PUT /api/salaries/:id error:", err);
    res.status(500).json({ message: "Failed to update salary" });
  }
});

/**
 * 🔹 PATCH /api/salaries/:id/clear-due
 * Sets remainingSalary = 0 for that record.
 */
router.patch("/:id/clear-due", async (req, res) => {
  try {
    const { id } = req.params;

    const doc = await Salary.findById(id);
    if (!doc) {
      return res.status(404).json({ message: "Salary row not found" });
    }

    doc.remainingSalary = 0;

    const updated = await doc.save();
    res.json(updated);
  } catch (err) {
    console.error("❌ PATCH /api/salaries/:id/clear-due error:", err);
    res.status(500).json({ message: "Failed to clear due" });
  }
});

/**
 * 🔹 DELETE /api/salaries/:id
 */
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const removed = await Salary.findByIdAndDelete(id).lean();

    if (!removed) {
      return res.status(404).json({ message: "Salary row not found" });
    }

    res.json({ ok: true, removed });
  } catch (err) {
    console.error("❌ DELETE /api/salaries/:id error:", err);
    res.status(500).json({ message: "Failed to delete salary" });
  }
});

export default router;
