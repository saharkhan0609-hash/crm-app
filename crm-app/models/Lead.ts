import { Schema, model, models } from "mongoose";

export interface ILead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  pipelineStatus: string;
  welcomeEmailSent: boolean;
  followUpSent: boolean;
  welcomeSMSSent: boolean;
  followUpSMSSent: boolean;
  createdAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: true },
    status: { type: String, default: "New" },
    pipelineStatus: {
      type: String,
      default: "New",
      enum: ["New", "Contacted", "Qualified", "Proposal Sent", "Closed Won", "Closed Lost"],
    },
    welcomeEmailSent: { type: Boolean, default: false },
    followUpSent:     { type: Boolean, default: false },
    welcomeSMSSent:   { type: Boolean, default: false },
    followUpSMSSent:  { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Lead = models.Lead || model<ILead>("Lead", LeadSchema);

export default Lead;
