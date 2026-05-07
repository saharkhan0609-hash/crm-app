import { connectToDatabase } from "@/lib/mongodb";
import SMSMessage from "@/models/SMSMessage";
import Lead from "@/models/Lead";
import { sendSMS } from "@/lib/twilio";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type   = searchParams.get("type");
    const status = searchParams.get("status");
    const limit  = Math.min(Number(searchParams.get("limit") ?? 100), 500);

    await connectToDatabase();

    const query: Record<string, string> = {};
    if (type)   query.type   = type;
    if (status) query.status = status;

    const messages = await SMSMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return Response.json(messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

// Manual SMS — send to a single lead or arbitrary number
export async function POST(request: Request) {
  try {
    const { leadId, to, body } = await request.json();

    if (!body?.trim()) {
      return Response.json({ error: "Message body is required" }, { status: 400 });
    }

    await connectToDatabase();

    let phone = to?.trim();
    let leadName: string | undefined;
    let resolvedLeadId: string | undefined = leadId;

    if (leadId) {
      const lead = await Lead.findById(leadId).lean() as { name: string; phone: string } | null;
      if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });
      phone    = lead.phone;
      leadName = lead.name;
    }

    if (!phone) {
      return Response.json({ error: "Phone number or leadId is required" }, { status: 400 });
    }

    // Save record first (pending)
    const record = await SMSMessage.create({
      to: phone,
      body,
      leadId: resolvedLeadId,
      leadName,
      type: "manual",
      status: "pending",
    });

    // Send via Twilio
    try {
      const msg = await sendSMS({ to: phone, body });
      await SMSMessage.findByIdAndUpdate(record._id, {
        status: "queued",
        twilioSid: msg.sid,
      });
      return Response.json({ ...record.toObject(), status: "queued", twilioSid: msg.sid }, { status: 201 });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Twilio error";
      await SMSMessage.findByIdAndUpdate(record._id, { status: "failed", error: errMsg });
      return Response.json({ error: errMsg }, { status: 502 });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
