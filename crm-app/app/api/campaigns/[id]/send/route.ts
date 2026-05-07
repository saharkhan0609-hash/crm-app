import { connectToDatabase } from "@/lib/mongodb";
import EmailCampaign from "@/models/EmailCampaign";
import Lead from "@/models/Lead";
import { sendEmail } from "@/lib/mailer";
import { campaignEmailTemplate } from "@/lib/emailTemplates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();

    const campaign = await EmailCampaign.findById(id);
    if (!campaign) return Response.json({ error: "Not found" }, { status: 404 });
    if (campaign.status === "sent") {
      return Response.json({ error: "Campaign already sent" }, { status: 400 });
    }

    const leads = await Lead.find({ _id: { $in: campaign.leadIds } }).lean() as Array<{
      _id: { toString(): string };
      name: string;
      email: string;
    }>;

    await EmailCampaign.findByIdAndUpdate(id, { status: "sending" });

    let sent = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        const token = Buffer.from(
          JSON.stringify({ c: id, e: lead.email })
        ).toString("base64url");
        const trackingPixelUrl = `${APP_URL}/api/email/track?t=${token}`;

        await sendEmail({
          to: lead.email,
          subject: campaign.subject,
          html: campaignEmailTemplate({
            leadName: lead.name,
            subject: campaign.subject,
            body: campaign.body,
            trackingPixelUrl,
          }),
        });
        sent++;
      } catch {
        failed++;
      }
    }

    const updated = await EmailCampaign.findByIdAndUpdate(
      id,
      {
        status: "sent",
        "stats.total": leads.length,
        "stats.sent": sent,
        "stats.failed": failed,
      },
      { new: true }
    );

    return Response.json(updated);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
