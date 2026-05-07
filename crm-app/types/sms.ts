export interface SMSMessage {
  _id: string;
  to: string;
  body: string;
  leadId?: string;
  leadName?: string;
  type: "welcome" | "followup" | "reminder" | "manual" | "campaign";
  campaignName?: string;
  status: "pending" | "queued" | "sent" | "delivered" | "failed";
  twilioSid?: string;
  error?: string;
  createdAt: string;
  updatedAt: string;
}
