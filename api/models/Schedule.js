import mongoose from "mongoose";

const { Schema, model } = mongoose;

const scheduleSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },
    day: {
      type: String,
      required: true,
      trim: true,
    },
    shift: {
      type: String,
      enum: ["morning", "day", "evening", "night"],
      required: true,
    },
    // stored as "09:00 AM"
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

const Schedule = model("Schedule", scheduleSchema);

export default Schedule;
