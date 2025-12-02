// models/DeletedUsername.js
import mongoose from "mongoose";

const deletedUsernameSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      unique: true, // ensure 1 row per username
    },
  },
  {
    timestamps: true,
  }
);

const DeletedUsername =
  mongoose.models.DeletedUsername ||
  mongoose.model("DeletedUsername", deletedUsernameSchema);

export default DeletedUsername;
