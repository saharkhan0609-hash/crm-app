import { NextRequest } from "next/server";
import anthropic, { AI_MODEL } from "@/lib/anthropic";
import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import SMSMessage from "@/models/SMSMessage";

const BASE_SYSTEM = `You are an expert AI sales assistant embedded inside CRM Pro, a modern SaaS CRM platform.

Your role is to help sales teams:
- Nurture leads through personalized, human-sounding communication
- Identify the best next actions to move deals forward and close them
- Generate compelling email and SMS messages tailored to each lead
- Score and prioritize leads based on their engagement and behavior
- Create effective multi-step follow-up sequences

Today's date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.

Tone guidelines:
- Be concise and actionable — sales reps are busy
- Reference actual lead data when giving advice (don't be generic)
- When generating messages, make them feel personal, not templated
- Use plain, confident language — avoid AI-sounding phrases
- When scoring or analyzing, give specific numbers and clear reasoning

If asked to generate an email or SMS, produce the final text ready to send.
If asked for next steps, give 2-3 specific, numbered actions.`;

function buildLeadContext(lead: Record<string, unknown>, appointments: Record<string, unknown>[], smsHistory: Record<string, unknown>[]): string {
  const lines = [
    "--- LEAD CONTEXT ---",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Status: ${lead.status}`,
    `Pipeline Stage: ${lead.pipelineStatus}`,
    `Created: ${new Date(lead.createdAt as string).toLocaleDateString()}`,
    `Welcome Email Sent: ${lead.welcomeEmailSent}`,
    `Follow-up Email Sent: ${lead.followUpSent}`,
    `Welcome SMS Sent: ${lead.welcomeSMSSent}`,
    `Follow-up SMS Sent: ${lead.followUpSMSSent}`,
  ];

  if (appointments.length > 0) {
    lines.push(`\nAppointments (${appointments.length}):`);
    appointments.forEach(a => {
      lines.push(`  • ${a.date} ${a.startTime}: "${a.title}" — ${a.status}`);
    });
  } else {
    lines.push("\nAppointments: None");
  }

  if (smsHistory.length > 0) {
    lines.push(`\nRecent SMS History:`);
    smsHistory.forEach(m => {
      lines.push(`  • [${m.type}/${m.status}] ${String(m.body).slice(0, 120)}`);
    });
  }

  return lines.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const { messages, leadId } = await request.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: "messages array is required" }, { status: 400 });
    }

    let systemPrompt = BASE_SYSTEM;

    if (leadId) {
      await connectToDatabase();
      const lead = await Lead.findById(leadId).lean() as Record<string, unknown> | null;
      if (lead) {
        const appointments = await Appointment.find({ clientName: lead.name })
          .sort({ date: -1 }).limit(5).lean() as Record<string, unknown>[];
        const smsHistory = await SMSMessage.find({ leadId })
          .sort({ createdAt: -1 }).limit(5).lean() as Record<string, unknown>[];
        systemPrompt += "\n\n" + buildLeadContext(lead, appointments, smsHistory);
      }
    }

    const stream = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      stream: true,
      system: systemPrompt,
      messages: messages.map((m: { role: "user" | "assistant"; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
        } catch (err) {
          controller.error(err);
        }
        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
