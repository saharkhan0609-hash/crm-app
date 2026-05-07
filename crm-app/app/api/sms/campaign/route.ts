import { connectToDatabase } from "@/lib/mongodb";
import SMSMessage from "@/models/SMSMessage";
import Lead from "@/models/Lead";
import { sendSMS } from "@/lib/twilio";
import { campaignSMS } from "@/lib/smsTemplates";

export async function POST(request: Request) {
  try {
    const { name, message, leadIds } = await request.json();

    if (!name || !message) {
      return Response.json({ error: "Campaign name and message are required" }, { status: 400 });
    }
    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return Response.json({ error: "Select at least one lead" }, { status: 400 });
    }

    await connectToDatabase();

    const leads = await Lead.find({ _id: { $in: leadIds } }).lean() as Array<{
      _id: { toString(): string };
      name: string;
      phone: string;
    }>;

    let sent = 0;
    let failed = 0;
    const results = [];

    for (const lead of leads) {
      const body = campaignSMS(lead.name, message);

      const record = await SMSMessage.create({
        to: lead.phone,
        body,
        leadId: lead._id,
        leadName: lead.name,
        type: "campaign",
        campaignName: name,
        status: "pending",
      });

      try {
        const msg = await sendSMS({ to: lead.phone, body });
        await SMSMessage.findByIdAndUpdate(record._id, {
          status: "queued",
          twilioSid: msg.sid,
        });
        sent++;
        results.push({ lead: lead.name, status: "queued" });
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Twilio error";
        await SMSMessage.findByIdAndUpdate(record._id, { status: "failed", error: errMsg });
        failed++;
        results.push({ lead: lead.name, status: "failed", error: errMsg });
      }
    }

    return Response.json({
      success: true,
      campaignName: name,
      stats: { total: leads.length, sent, failed },
      results,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
