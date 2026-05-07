import { Schema, model, models } from "mongoose";

const EmailCampaignSchema = new Schema(
  {
    name:    { type: String, required: true, trim: true },
    subject: { type: String, required: true, trim: true },
    body:    { type: String, required: true },
    status: {
      type: String,
      default: "draft",
      enum: ["draft", "scheduled", "sending", "sent"],
    },
    leadIds:     [{ type: Schema.Types.ObjectId, ref: "Lead" }],
    scheduledAt: { type: Date },
    stats: {
      total:  { type: Number, default: 0 },
      sent:   { type: Number, default: 0 },
      opened: { type: Number, default: 0 },
      failed: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

const EmailCampaign = models.EmailCampaign || model("EmailCampaign", EmailCampaignSchema);
export default EmailCampaign;
