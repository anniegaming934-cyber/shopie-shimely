// api/models/Salary.js
import mongoose from "mongoose";

const salarySchema = new mongoose.Schema(
  {
    username: { type: String, required: true, index: true },
    month: { type: String, required: true }, // "2025-11"

    // base fields
    totalSalary: { type: Number, required: true },
    daysAbsent: { type: Number, default: 0 },

    // store remaining; compute paid from it
    remainingSalary: { type: Number, default: 0 },

    dueDate: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  {
    timestamps: true,
    // include virtuals when sending JSON / toObject
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// 🔢 Virtual: paidSalary = totalSalary - remainingSalary
salarySchema.virtual("paidSalary").get(function () {
  const total = this.totalSalary || 0;
  const remaining = this.remainingSalary || 0;
  const paid = total - remaining;
  return paid < 0 ? 0 : paid;
});

// Ensure combination username + month is unique (one row per month per user)
salarySchema.index({ username: 1, month: 1 }, { unique: true });

const Salary = mongoose.models.Salary || mongoose.model("Salary", salarySchema);

export default Salary;
