import { Schema, model, models } from "mongoose";

const SMSMessageSchema = new Schema(
  {
    to:           { type: String, required: true },
    body:         { type: String, required: true },
    leadId:       { type: Schema.Types.ObjectId, ref: "Lead" },
    leadName:     { type: String },
    type: {
      type: String,
      enum: ["welcome", "followup", "reminder", "manual", "campaign"],
      default: "manual",
    },
    campaignName: { type: String },
    status: {
      type: String,
      enum: ["pending", "queued", "sent", "delivered", "failed"],
      default: "pending",
    },
    twilioSid:    { type: String },
    error:        { type: String },
  },
  { timestamps: true }
);

SMSMessageSchema.index({ leadId: 1 });
SMSMessageSchema.index({ createdAt: -1 });
SMSMessageSchema.index({ twilioSid: 1 });

const SMSMessage = models.SMSMessage || model("SMSMessage", SMSMessageSchema);
export default SMSMessage;
