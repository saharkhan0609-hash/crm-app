import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/Lead";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectToDatabase();
    const lead = await Lead.findById(id).lean();
    if (!lead) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(lead);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Only update fields that were actually provided
    const update: Record<string, string> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.email !== undefined) update.email = body.email;
    if (body.phone !== undefined) update.phone = body.phone;
    if (body.status !== undefined) update.status = body.status;
    if (body.pipelineStatus !== undefined) update.pipelineStatus = body.pipelineStatus;

    await connectToDatabase();
    const lead = await Lead.findByIdAndUpdate(id, update, { new: true, runValidators: true });

    if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });
    return Response.json(lead);
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
    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
