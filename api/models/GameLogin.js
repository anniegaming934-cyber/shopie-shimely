// models/GameLogin.ts
import mongoose from "mongoose";

const gameLoginSchema = new mongoose.Schema(
  {
    ownerType: {
      type: String,
      enum: ["admin", "user"],
      required: true,
    },
    gameName: {
      type: String,
      required: true,
      trim: true,
    },
    loginUsername: {
      type: String,
      trim: true,
      required: function () {
        // only required when ownerType === "admin"
        return this.ownerType === "admin";
      },
    },
    password: {
      type: String,
      trim: true,
      required: function () {
        // only required when ownerType === "admin"
        return this.ownerType === "admin";
      },
    },
    gameLink: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("GameLogin", gameLoginSchema);
