import { connectToDatabase } from "@/lib/mongodb";
import Appointment from "@/models/Appointment";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const allowed = ["title", "clientName", "date", "startTime", "endTime", "notes", "status", "reminderSent"] as const;
    const update: Partial<Record<(typeof allowed)[number], string | boolean>> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) update[key] = body[key];
    }

    if (
      update.startTime &&
      update.endTime &&
      update.startTime >= update.endTime
    ) {
      return Response.json({ error: "End time must be after start time" }, { status: 400 });
    }

    await connectToDatabase();
    const appointment = await Appointment.findByIdAndUpdate(id, update, { new: true });

    if (!appointment) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(appointment);
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
    const appointment = await Appointment.findByIdAndDelete(id);

    if (!appointment) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
