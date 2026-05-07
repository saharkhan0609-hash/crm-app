import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import { sendEmail } from "@/lib/mailer";
import { welcomeEmailTemplate } from "@/lib/emailTemplates";
import { sendSMS } from "@/lib/twilio";
import { welcomeSMS } from "@/lib/smsTemplates";

export async function GET() {
  try {
    await connectToDatabase();
    const leads = await Lead.find().sort({ createdAt: -1 }).lean();
    return Response.json(leads);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[GET /api/leads]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || !email || !phone) {
      return Response.json(
        { error: "Name, email, and phone are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();
    const lead = await Lead.create({ name, email, phone });

    // Fire-and-forget welcome email
    sendEmail({
      to: email,
      subject: `Welcome to CRM Pro, ${name}!`,
      html: welcomeEmailTemplate(name),
    })
      .then(() => Lead.findByIdAndUpdate(lead._id, { welcomeEmailSent: true }))
      .catch(() => {/* non-critical */});

    // Fire-and-forget welcome SMS
    sendSMS({ to: phone, body: welcomeSMS(name) })
      .then(() => Lead.findByIdAndUpdate(lead._id, { welcomeSMSSent: true }))
      .catch(() => {/* non-critical — SMS may not be configured */});

    return Response.json(lead, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[POST /api/leads]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}
