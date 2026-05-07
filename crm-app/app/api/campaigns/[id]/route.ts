import { connectToDatabase } from "@/lib/mongodb";
import EmailCampaign from "@/models/EmailCampaign";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowed = ["name", "subject", "body", "leadIds", "scheduledAt", "status"] as const;
    const update: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }
    if (update.scheduledAt) update.scheduledAt = new Date(update.scheduledAt as string);
    if (update.leadIds) update["stats.total"] = (update.leadIds as string[]).length;

    await connectToDatabase();
    const campaign = await EmailCampaign.findByIdAndUpdate(id, update, { new: true });
    if (!campaign) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(campaign);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const campaign = await EmailCampaign.findByIdAndDelete(id);
    if (!campaign) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
