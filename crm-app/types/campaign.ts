export interface EmailCampaign {
  _id: string;
  name: string;
  subject: string;
  body: string;
  status: "draft" | "scheduled" | "sending" | "sent";
  leadIds: string[];
  scheduledAt?: string;
  stats: {
    total: number;
    sent: number;
    opened: number;
    failed: number;
  };
  createdAt: string;
  updatedAt: string;
}
