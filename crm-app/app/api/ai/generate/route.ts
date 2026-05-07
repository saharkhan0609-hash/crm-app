import { NextRequest } from "next/server";
import anthropic, { AI_MODEL } from "@/lib/anthropic";
import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import SMSMessage from "@/models/SMSMessage";

function extractJSON(text: string): Record<string, unknown> | null {
  // Strip markdown code fences if present
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  try { return JSON.parse(jsonMatch ? jsonMatch[0] : raw); } catch { return null; }
}

function buildContext(
  lead: Record<string, unknown>,
  appointments: Record<string, unknown>[],
  smsHistory: Record<string, unknown>[]
): string {
  return [
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone}`,
    `Status: ${lead.status}`,
    `Pipeline Stage: ${lead.pipelineStatus}`,
    `Days since created: ${Math.floor((Date.now() - new Date(lead.createdAt as string).getTime()) / 86400000)}`,
    `Welcome Email Sent: ${lead.welcomeEmailSent}`,
    `Follow-up Email Sent: ${lead.followUpSent}`,
    `Welcome SMS Sent: ${lead.welcomeSMSSent}`,
    `Follow-up SMS Sent: ${lead.followUpSMSSent}`,
    appointments.length > 0
      ? `Appointments: ${appointments.map(a => `${a.date} "${a.title}" (${a.status})`).join("; ")}`
      : "Appointments: None",
    smsHistory.length > 0
      ? `SMS History: ${smsHistory.slice(0, 3).map(m => `[${m.type}] ${String(m.body).slice(0, 80)}`).join(" | ")}`
      : "SMS History: None",
  ].join("\n");
}

type GenerateType = "email" | "sms" | "followup_plan";

const SYSTEM_PROMPTS: Record<GenerateType, (tone: string) => string> = {
  email: (tone) => `You are an expert CRM sales copywriter. Generate a personalized follow-up email.
Return ONLY valid JSON with exactly these fields: { "subject": "...", "body": "..." }
The body should be plain text (no HTML tags), 3-5 short paragraphs.
Tone: ${tone}. Make it feel human and personal, not templated. No placeholders like [Name].`,

  sms: (tone) => `You are an expert CRM sales copywriter. Generate a concise follow-up SMS.
Return ONLY valid JSON with exactly this field: { "body": "..." }
Rules: Under 160 characters. End with "Reply STOP to opt out." Tone: ${tone}. Feel personal, not spammy.`,

  followup_plan: (_tone) => `You are an expert CRM sales strategist. Analyze this lead and provide next steps.
Return ONLY valid JSON with exactly these fields:
{ "nextAction": "single most important thing to do NOW", "reasoning": "why this action", "urgency": "low|medium|high", "suggestions": ["action 1", "action 2", "action 3"] }
Be specific — reference the lead's actual stage and history.`,
};

export async function POST(request: NextRequest) {
  try {
    const { leadId, type, tone = "professional", context } = await request.json() as {
      leadId: string;
      type: GenerateType;
      tone?: string;
      context?: string;
    };

    if (!leadId || !type) {
      return Response.json({ error: "leadId and type are required" }, { status: 400 });
    }

    await connectToDatabase();

    const lead = await Lead.findById(leadId).lean() as Record<string, unknown> | null;
    if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

    const appointments = await Appointment.find({ clientName: lead.name })
      .sort({ date: -1 }).limit(5).lean() as Record<string, unknown>[];
    const smsHistory = await SMSMessage.find({ leadId })
      .sort({ createdAt: -1 }).limit(5).lean() as Record<string, unknown>[];

    const leadContext = buildContext(lead, appointments, smsHistory);
    const userPrompt = `Generate a ${type} for this lead:\n\n${leadContext}${context ? `\n\nAdditional context: ${context}` : ""}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1024,
      system: SYSTEM_PROMPTS[type](tone),
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(rawText);

    if (!parsed) {
      return Response.json({ type, body: rawText });
    }

    return Response.json({ type, ...parsed });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
