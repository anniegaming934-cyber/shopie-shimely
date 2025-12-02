// api/models/GameEntryHistory.js
import mongoose from "mongoose";

const gameEntryHistorySchema = new mongoose.Schema(
  {
    // Original GameEntry reference
    entryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "GameEntry",
    },

    username: { type: String, trim: true },
    createdBy: { type: String, trim: true },

    type: { type: String, trim: true }, // "freeplay" | "deposit" | "redeem"
    method: { type: String, trim: true }, // "cashapp" | "paypal" | "chime" | "venmo"

    playerName: { type: String, trim: true },
    playerTag: { type: String, trim: true },
    gameName: { type: String, trim: true },

    amountBase: { type: Number, min: 0 },
    amount: { type: Number, min: 0 },
    bonusRate: { type: Number, min: 0 },
    bonusAmount: { type: Number, min: 0 },
    amountFinal: { type: Number, min: 0 },

    totalPaid: { type: Number, min: 0 },
    totalCashout: { type: Number, min: 0 },
    remainingPay: { type: Number, min: 0 },
    extraMoney: { type: Number, min: 0 },
    reduction: { type: Number, min: 0 },

    isPending: { type: Boolean, default: false },

    date: { type: String }, // "YYYY-MM-DD"
    note: { type: String, trim: true, default: "" },

    action: {
      type: String,
      enum: ["create", "update", "delete"],
      default: "update",
    },

    snapshot: { type: Object },
  },
  { timestamps: true }
);

const GameEntryHistory =
  mongoose.models.GameEntryHistory ||
  mongoose.model("GameEntryHistory", gameEntryHistorySchema);

export default GameEntryHistory;
