// api/models/Payment.js
import mongoose from "mongoose";
import { nanoid } from "nanoid";

export const METHODS = ["cashapp", "paypal", "chime"];
export const TX_TYPES = ["cashin", "cashout"];

const paymentSchema = new mongoose.Schema(
  {
    // Optional: link to a user later if needed
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
      index: true,
      default: null,
    },

    // Custom ID used in routes (auto if not provided)
    id: {
      type: String,
      unique: true,
      index: true,
      default: () => nanoid(12),
    },

    amount: { type: Number, required: true, min: 0 },

    // payment method (cashapp, paypal, chime)
    method: { type: String, required: true, enum: METHODS },

    // "cashin" (add) or "cashout" (withdraw)
    txType: { type: String, enum: TX_TYPES, required: true, default: "cashin" },

    // cashin only (optional)
    playerName: { type: String, trim: true, default: "" },

    // cashout only (optional audit math)
    totalPaid: { type: Number, default: 0, min: 0 },
    totalCashout: { type: Number, default: 0, min: 0 },

    note: { type: String, default: "", trim: true },

    // Keep both for convenience:
    // - date (real Date for sorting/ranges)
    // - dateString ("YYYY-MM-DD" for quick grouping/filtering)
    date: { type: Date, default: Date.now, index: true },
    dateString: { type: String, required: true, index: true },
  },
  { timestamps: true }
);

/** Normalize/defend fields before validation */
paymentSchema.pre("validate", function (next) {
  // Normalize date (ensure Date instance)
  const d = this.date ? new Date(this.date) : new Date();
  this.date = d;

  // Build UTC YYYY-MM-DD (timezone-safe)
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  this.dateString = `${y}-${m}-${day}`;

  // Normalize method
  if (typeof this.method === "string") {
    this.method = this.method.trim().toLowerCase();
  }
  if (!METHODS.includes(this.method)) {
    // Let enum validation produce a clear error
    this.invalidate("method", `Invalid method: ${this.method}`);
  }

  // Normalize txType
  if (!TX_TYPES.includes(this.txType)) {
    this.txType = "cashin";
  }

  // Strings, not nulls
  if (typeof this.note !== "string") this.note = "";
  if (typeof this.playerName !== "string") this.playerName = "";

  // Cashin vs cashout specifics
  if (this.txType === "cashin") {
    this.totalPaid = 0;
    this.totalCashout = 0;
  } else if (this.txType === "cashout") {
    // Keep playerName if provided; still ensure it's a string
    if (!this.playerName) this.playerName = "";
    // Clamp totals
    const toNum = (v) => (Number.isFinite(+v) && +v >= 0 ? +v : 0);
    this.totalPaid = toNum(this.totalPaid);
    this.totalCashout = toNum(this.totalCashout);
  }

  next();
});

// Helpful compound indexes
paymentSchema.index({ dateString: 1, txType: 1, method: 1 });
paymentSchema.index({ createdAt: -1 });

// Clean JSON output (keep custom id, hide _id/__v)
paymentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: (_doc, ret) => {
    delete ret._id;
  },
});

/** Convenience: find by YYYY-MM-DD (UTC string) */
paymentSchema.statics.findByDay = function (yyyyMmDd) {
  return this.find({ dateString: String(yyyyMmDd) }).sort({ createdAt: -1 });
};

/** Convenience: recompute dateString from current date */
paymentSchema.methods.recomputeDateString = function () {
  const d = this.date ? new Date(this.date) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getUTCFullYear();
  const m = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  this.dateString = `${y}-${m}-${day}`;
};

const Payment =
  mongoose.models.Payment || mongoose.model("Payment", paymentSchema);

export default Payment;
