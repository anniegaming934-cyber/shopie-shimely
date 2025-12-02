// api/models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },

    // 👇 you already had this, just keep it
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    // Password hash (bcrypt)
    passwordHash: {
      type: String,
      required: true,
    },

    // Optional display name (used in auth.js)
    name: {
      type: String,
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },

    // boolean admin flag (used in tokens)
    isAdmin: {
      type: Boolean,
      default: false,
    },

    // ⭐ Admin verification flags
    isApproved: {
      type: Boolean,
      default: false, // new users must be approved
    },
    status: {
      type: String,
      enum: ["pending", "active", "blocked"],
      default: "pending",
    },

    // For your tables
    lastSignInAt: { type: Date },
    lastSignOutAt: { type: Date },

    totalPayments: { type: Number, default: 0 },
    totalFreeplay: { type: Number, default: 0 },
    totalDeposit: { type: Number, default: 0 },
    totalRedeem: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
