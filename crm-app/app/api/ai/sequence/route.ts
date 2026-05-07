import { NextRequest } from "next/server";
import anthropic, { AI_MODEL } from "@/lib/anthropic";
import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";

function extractJSON(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  try { return JSON.parse(jsonMatch ? jsonMatch[0] : raw); } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const {
      leadId,
      steps = 5,
      type = "mixed",
      goal = "nurture",
    } = await request.json() as {
      leadId: string;
      steps?: number;
      type?: "email" | "sms" | "mixed";
      goal?: "nurture" | "close" | "reactivate";
    };

    if (!leadId) return Response.json({ error: "leadId is required" }, { status: 400 });

    await connectToDatabase();

    const lead = await Lead.findById(leadId).lean() as Record<string, unknown> | null;
    if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

    const appointments = await Appointment.find({ clientName: lead.name })
      .sort({ date: -1 }).limit(3).lean() as Record<string, unknown>[];

    const goalDescriptions = {
      nurture:    "build trust and keep the lead engaged over time",
      close:      "aggressively move toward a sale and create urgency",
      reactivate: "re-engage a cold or inactive lead who has gone quiet",
    };

    const typeInstruction = {
      email:  "Use only email steps.",
      sms:    "Use only SMS steps (keep each under 160 chars).",
      mixed:  "Mix email and SMS steps strategically — use SMS for quick touch-points and email for detailed content.",
    };

    const systemPrompt = `You are an expert CRM sales strategist. Create a personalized follow-up sequence.
Return ONLY valid JSON with this structure:
{
  "sequence": [
    {
      "day": <integer>,
      "type": "email"|"sms",
      "subject": "<email subject or null for SMS>",
      "body": "<full message text ready to send>",
      "notes": "<brief coaching tip for the sales rep>"
    }
  ],
  "strategy": "<2-sentence overall strategy summary>"
}

Rules:
- ${typeInstruction[type]}
- Make each message feel personal, not generic
- Use the lead's name. Reference their pipeline stage contextually.
- Vary the angle each step (value, social proof, urgency, question, etc.)
- SMS must be under 160 characters and end with "Reply STOP to opt out."
- Space messages naturally (not every day — vary the gaps)`;

    const userPrompt = `Create a ${steps}-step follow-up sequence for this lead.
Goal: ${goalDescriptions[goal]}

Lead Details:
Name: ${lead.name}
Pipeline Stage: ${lead.pipelineStatus}
Status: ${lead.status}
Days since created: ${Math.floor((Date.now() - new Date(lead.createdAt as string).getTime()) / 86400000)}
Welcome Email Sent: ${lead.welcomeEmailSent}
Follow-up Email Sent: ${lead.followUpSent}
Welcome SMS Sent: ${lead.welcomeSMSSent}
Follow-up SMS Sent: ${lead.followUpSMSSent}
${appointments.length > 0 ? `Appointments: ${appointments.map(a => `${a.date} "${a.title}" (${a.status})`).join(", ")}` : "No appointments scheduled"}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 3000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(rawText);

    if (!parsed) {
      return Response.json({ error: "Failed to parse AI response", raw: rawText }, { status: 502 });
    }

    return Response.json({ leadName: lead.name, goal, type, steps, ...parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
