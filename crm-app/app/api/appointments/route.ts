import { connectToDatabase } from "@/lib/mongodb";
import Appointment from "@/models/Appointment";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month"); // 1-12
    const year  = searchParams.get("year");

    await connectToDatabase();

    const query =
      month && year
        ? { date: { $regex: `^${year}-${String(month).padStart(2, "0")}` } }
        : {};

    const appointments = await Appointment.find(query)
      .sort({ date: 1, startTime: 1 })
      .lean();

    return Response.json(appointments);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { title, clientName, date, startTime, endTime, notes, status } =
      await request.json();

    if (!title || !clientName || !date || !startTime || !endTime) {
      return Response.json({ error: "Title, client, date and times are required" }, { status: 400 });
    }

    if (startTime >= endTime) {
      return Response.json({ error: "End time must be after start time" }, { status: 400 });
    }

    await connectToDatabase();
    const appointment = await Appointment.create({
      title,
      clientName,
      date,
      startTime,
      endTime,
      notes: notes ?? "",
      status: status ?? "scheduled",
    });

    return Response.json(appointment, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
