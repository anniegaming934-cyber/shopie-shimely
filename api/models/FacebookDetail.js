// src/models/FacebookDetail.js
import mongoose from "mongoose";

const facebookDetailSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export const FacebookDetail = mongoose.model(
  "FacebookDetail",
  facebookDetailSchema
);
