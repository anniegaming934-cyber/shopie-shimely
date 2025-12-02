import mongoose from "mongoose";

const LoginSessionSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      index: true, // faster lookups
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: null,
      // Optional email format validation
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Invalid email format"],
    },

    signInAt: {
      type: Date,
      required: true,
      default: Date.now,
    },

    signOutAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

/**
 * Virtual: isOnline
 * True when: signInAt exists AND signOutAt is null
 */
LoginSessionSchema.virtual("isOnline").get(function () {
  return !!this.signInAt && !this.signOutAt;
});

// Ensure virtuals are included in JSON output
LoginSessionSchema.set("toJSON", { virtuals: true });
LoginSessionSchema.set("toObject", { virtuals: true });

// Prevent model overwrite issues in dev/hot reload
const LoginSession =
  mongoose.models.LoginSession ||
  mongoose.model("LoginSession", LoginSessionSchema);

export default LoginSession;
