import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import SMSMessage from "@/models/SMSMessage";
import { sendSMS } from "@/lib/twilio";
import {
  followUpSMS,
  appointmentReminderSMS,
} from "@/lib/smsTemplates";

// Called by a cron job (e.g. Vercel Cron) every hour.
// Handles: 24h lead follow-ups + appointment reminders via SMS.
export async function POST() {
  try {
    await connectToDatabase();
    const results = { followUps: 0, reminders: 0 };
    const now = new Date();

    // ── 1. 24h follow-up SMS ─────────────────────────────────────────────────
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const followUpLeads = await Lead.find({
      followUpSMSSent: false,
      createdAt: { $lte: yesterday },
    }).lean() as Array<{ _id: unknown; name: string; phone: string }>;

    for (const lead of followUpLeads) {
      const body = followUpSMS(lead.name);
      const record = await SMSMessage.create({
        to: lead.phone,
        body,
        leadId: lead._id,
        leadName: lead.name,
        type: "followup",
        status: "pending",
      });

      try {
        const msg = await sendSMS({ to: lead.phone, body });
        await SMSMessage.findByIdAndUpdate(record._id, { status: "queued", twilioSid: msg.sid });
        await Lead.findByIdAndUpdate(lead._id, { followUpSMSSent: true });
        results.followUps++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Twilio error";
        await SMSMessage.findByIdAndUpdate(record._id, { status: "failed", error: errMsg });
      }
    }

    // ── 2. Appointment reminder SMS (for appointments tomorrow) ──────────────
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);

    const dueAppointments = await Appointment.find({
      date: tomorrowStr,
      smsReminderSent: false,
    }).lean() as Array<{
      _id: unknown;
      clientName: string;
      title: string;
      date: string;
      startTime: string;
    }>;

    for (const appt of dueAppointments) {
      // Look up lead phone by client name
      const lead = await Lead.findOne({ name: appt.clientName }).lean() as {
        _id: unknown;
        phone: string;
      } | null;
      if (!lead) continue;

      const body = appointmentReminderSMS({
        clientName: appt.clientName,
        title: appt.title,
        date: appt.date,
        startTime: appt.startTime,
      });

      const record = await SMSMessage.create({
        to: lead.phone,
        body,
        leadId: lead._id,
        leadName: appt.clientName,
        type: "reminder",
        status: "pending",
      });

      try {
        const msg = await sendSMS({ to: lead.phone, body });
        await SMSMessage.findByIdAndUpdate(record._id, { status: "queued", twilioSid: msg.sid });
        await Appointment.findByIdAndUpdate(appt._id, { smsReminderSent: true });
        results.reminders++;
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "Twilio error";
        await SMSMessage.findByIdAndUpdate(record._id, { status: "failed", error: errMsg });
      }
    }

    return Response.json({ success: true, processed: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
