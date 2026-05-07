import { Schema, model, models } from "mongoose";

const AppointmentSchema = new Schema(
  {
    title:      { type: String, required: true, trim: true },
    clientName: { type: String, required: true, trim: true },
    date:       { type: String, required: true },  // YYYY-MM-DD
    startTime:  { type: String, required: true },  // HH:MM
    endTime:    { type: String, required: true },  // HH:MM
    notes:      { type: String, default: "" },
    status: {
      type: String,
      default: "scheduled",
      enum: ["scheduled", "completed", "cancelled"],
    },
    reminderSent:    { type: Boolean, default: false },
    smsReminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Index for fast lookups by date
AppointmentSchema.index({ date: 1, startTime: 1 });

const Appointment = models.Appointment || model("Appointment", AppointmentSchema);
export default Appointment;
