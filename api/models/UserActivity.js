// api/models/UserActivity.js
import mongoose from "mongoose";

const UserActivitySchema = new mongoose.Schema(
  {
    username: { type: String, required: true },
    gameId: { type: Number, required: true },
    gameName: { type: String, required: true },

    freeplay: { type: Number, default: 0 }, // coinsEarned +
    redeem: { type: Number, default: 0 }, // coinsSpent +
    deposit: { type: Number, default: 0 }, // coinsRecharged +

    date: {
      type: String,
      default: () => new Date().toISOString().slice(0, 10),
    },
    time: {
      type: String,
      default: () => new Date().toLocaleTimeString("en-US"),
    },
  },
  { timestamps: true }
);

const UserActivity =
  mongoose.models.UserActivity ||
  mongoose.model("UserActivity", UserActivitySchema);

export default UserActivity;
