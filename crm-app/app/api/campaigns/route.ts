import { connectToDatabase } from "@/lib/mongodb";
import EmailCampaign from "@/models/EmailCampaign";

export async function GET() {
  try {
    await connectToDatabase();
    const campaigns = await EmailCampaign.find().sort({ createdAt: -1 }).lean();
    return Response.json(campaigns);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { name, subject, body, leadIds, scheduledAt } = await request.json();

    if (!name || !subject || !body) {
      return Response.json({ error: "Name, subject and body are required" }, { status: 400 });
    }

    await connectToDatabase();

    const status = scheduledAt ? "scheduled" : "draft";
    const campaign = await EmailCampaign.create({
      name,
      subject,
      body,
      leadIds: leadIds ?? [],
      scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
      status,
      stats: { total: leadIds?.length ?? 0, sent: 0, opened: 0, failed: 0 },
    });

    return Response.json(campaign, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
