// api/models/FacebookLead.js
import mongoose from "mongoose";

const FacebookLeadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    phone: {
      type: String,
      trim: true,
    },

    contactPreference: {
      type: String,
      enum: ["whatsapp", "telegram", ""],
      default: "",
    },

    facebookLink: {
      type: String,
      trim: true,
    },

    source: {
      type: String,
      default: "facebook",
    },
  },
  { timestamps: true }
);

const FacebookLead = mongoose.model("FacebookLead", FacebookLeadSchema);
export default FacebookLead;
