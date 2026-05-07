import { connectToDatabase } from "@/lib/mongodb";
import EmailCampaign from "@/models/EmailCampaign";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import { sendEmail } from "@/lib/mailer";
import {
  followUpEmailTemplate,
  appointmentReminderTemplate,
  campaignEmailTemplate,
} from "@/lib/emailTemplates";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Called by a cron job (e.g. Vercel Cron) on a schedule.
// Handles: scheduled campaigns, lead follow-ups, appointment reminders.
export async function POST() {
  try {
    await connectToDatabase();
    const results = { campaigns: 0, followUps: 0, reminders: 0 };
    const now = new Date();

    // ── 1. Process scheduled campaigns ──────────────────────────────────────
    const dueCampaigns = await EmailCampaign.find({
      status: "scheduled",
      scheduledAt: { $lte: now },
    });

    for (const campaign of dueCampaigns) {
      const leads = await Lead.find({ _id: { $in: campaign.leadIds } }).lean() as Array<{
        _id: { toString(): string };
        name: string;
        email: string;
      }>;

      await EmailCampaign.findByIdAndUpdate(campaign._id, { status: "sending" });
      let sent = 0, failed = 0;

      for (const lead of leads) {
        try {
          const token = Buffer.from(
            JSON.stringify({ c: campaign._id.toString(), e: lead.email })
          ).toString("base64url");

          await sendEmail({
            to: lead.email,
            subject: campaign.subject,
            html: campaignEmailTemplate({
              leadName: lead.name,
              subject: campaign.subject,
              body: campaign.body,
              trackingPixelUrl: `${APP_URL}/api/email/track?t=${token}`,
            }),
          });
          sent++;
        } catch {
          failed++;
        }
      }

      await EmailCampaign.findByIdAndUpdate(campaign._id, {
        status: "sent",
        "stats.total": leads.length,
        "stats.sent": sent,
        "stats.failed": failed,
      });
      results.campaigns++;
    }

    // ── 2. Send follow-up emails (leads created > 24h ago, no follow-up sent) ──
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const followUpLeads = await Lead.find({
      followUpSent: false,
      createdAt: { $lte: yesterday },
    }).lean() as Array<{ _id: unknown; name: string; email: string }>;

    for (const lead of followUpLeads) {
      try {
        await sendEmail({
          to: lead.email,
          subject: "Just checking in — CRM Pro",
          html: followUpEmailTemplate(lead.name),
        });
        await Lead.findByIdAndUpdate(lead._id, { followUpSent: true });
        results.followUps++;
      } catch {
        // continue with next lead
      }
    }

    // ── 3. Send appointment reminders (appointments tomorrow, not yet sent) ──
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10); // YYYY-MM-DD

    const dueAppointments = await Appointment.find({
      date: tomorrowStr,
      reminderSent: false,
    }).lean() as Array<{
      _id: unknown;
      clientName: string;
      title: string;
      date: string;
      startTime: string;
      endTime: string;
      notes?: string;
      clientEmail?: string;
    }>;

    for (const appt of dueAppointments) {
      if (!appt.clientEmail) {
        // Try to find lead by name to get email
        const lead = await Lead.findOne({ name: appt.clientName }).lean() as { email: string } | null;
        if (!lead) continue;
        appt.clientEmail = lead.email;
      }

      try {
        await sendEmail({
          to: appt.clientEmail,
          subject: `Reminder: ${appt.title} tomorrow`,
          html: appointmentReminderTemplate({
            clientName: appt.clientName,
            title: appt.title,
            date: appt.date,
            startTime: appt.startTime,
            endTime: appt.endTime,
            notes: appt.notes,
          }),
        });
        await Appointment.findByIdAndUpdate(appt._id, { reminderSent: true });
        results.reminders++;
      } catch {
        // continue
      }
    }

    return Response.json({ success: true, processed: results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
