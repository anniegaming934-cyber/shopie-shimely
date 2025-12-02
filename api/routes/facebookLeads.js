// api/routes/facebookLeads.js
import express from "express";
import { connectDB } from "../config/db.js";
import FacebookLead from "../models/FacebookLead.js";

const router = express.Router();

// Ensure DB connection for all routes
router.use(async (_req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("❌ DB connection error in facebookLeads:", err);
    res.status(500).json({ message: "Database connection failed" });
  }
});

/**
 * 📥 GET /api/facebook-leads
 * Returns JSON list of leads (for table)
 */
router.get("/", async (_req, res) => {
  try {
    const leads = await FacebookLead.find().sort({ createdAt: -1 }).lean();
    res.json(leads);
  } catch (err) {
    console.error("Error in GET /api/facebook-leads:", err);
    res
      .status(500)
      .json({ message: "Failed to load leads", error: err.message });
  }
});

/**
 * 🟢 POST /api/facebook-leads
 * Body: { name, email, phone?, contactPreference?, facebookLink? }
 */
router.post("/", async (req, res) => {
  try {
    const { name, email, phone, contactPreference, facebookLink } = req.body;

    if (!name) {
      return res.status(400).json({ message: "Both name are required" });
    }

    const lead = await FacebookLead.create({
      name,
      email,
      phone: phone || undefined,
      contactPreference: contactPreference || "",
      facebookLink: facebookLink || "",
    });

    res.status(201).json({ message: "Lead saved", lead });
  } catch (err) {
    console.error("Error in POST /api/facebook-leads:", err);
    res
      .status(500)
      .json({ message: "Failed to save lead", error: err.message });
  }
});

/**
 * ✏️ PUT /api/facebook-leads/:id
 * Body: { name, email, phone?, contactPreference?, facebookLink? }
 * Used for editing from the table
 */
router.put("/:id", async (req, res) => {
  try {
    const { name, email, phone, contactPreference, facebookLink } = req.body;

    if (!name || !email) {
      return res
        .status(400)
        .json({ message: "Both name and email are required" });
    }

    const updated = await FacebookLead.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        phone: phone || undefined,
        contactPreference: contactPreference || "",
        facebookLink: facebookLink || "",
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ message: "Lead not found" });
    }

    res.json({ message: "Lead updated", lead: updated });
  } catch (err) {
    console.error("Error in PUT /api/facebook-leads/:id:", err);
    res
      .status(500)
      .json({ message: "Failed to update lead", error: err.message });
  }
});

/**
 * 📤 GET /api/facebook-leads/export
 * Returns CSV that can be opened in Excel
 */
router.get("/export", async (_req, res) => {
  try {
    const leads = await FacebookLead.find().sort({ createdAt: -1 }).lean();

    // CSV header (now includes phone, contact, facebook link)
    let csv =
      "Name,Email,Phone,Contact Preference,Facebook Link,Source,Created At\n";

    // CSV rows
    csv += leads
      .map((lead) => {
        const name = (lead.name || "").replace(/"/g, '""');
        const email = (lead.email || "").replace(/"/g, '""');
        const phone = (lead.phone || "").replace(/"/g, '""');
        const contactPreference = (lead.contactPreference || "")
          .toString()
          .replace(/"/g, '""');
        const facebookLink = (lead.facebookLink || "").replace(/"/g, '""');
        const source = (lead.source || "").replace(/"/g, '""');
        const createdAt = lead.createdAt
          ? new Date(lead.createdAt).toISOString()
          : "";

        // wrap in quotes to be safe for commas
        return `"${name}","${email}","${phone}","${contactPreference}","${facebookLink}","${source}","${createdAt}"`;
      })
      .join("\n");

    const fileName = `facebook_leads_${Date.now()}.csv`;

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(csv);
  } catch (err) {
    console.error("Error in GET /api/facebook-leads/export:", err);
    res
      .status(500)
      .json({ message: "Failed to export leads", error: err.message });
  }
});
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await FacebookLead.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ message: "Lead not found" });
    }
    res.json({ message: "Lead deleted" });
  } catch (err) {
    console.error("Failed to delete lead:", err);
    res.status(500).json({ message: "Failed to delete lead" });
  }
});
export default router;
