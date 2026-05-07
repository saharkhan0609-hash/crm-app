import { NextRequest } from "next/server";
import anthropic, { AI_MODEL_SMART } from "@/lib/anthropic";
import { connectToDatabase } from "@/lib/mongodb";
import Lead from "@/models/Lead";
import Appointment from "@/models/Appointment";
import SMSMessage from "@/models/SMSMessage";

const PIPELINE_WEIGHTS: Record<string, number> = {
  "New":           15,
  "Contacted":     30,
  "Qualified":     50,
  "Proposal Sent": 70,
  "Closed Won":    100,
  "Closed Lost":   5,
};

function extractJSON(text: string): Record<string, unknown> | null {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  try { return JSON.parse(jsonMatch ? jsonMatch[0] : raw); } catch { return null; }
}

export async function POST(request: NextRequest) {
  try {
    const { leadId } = await request.json();
    if (!leadId) return Response.json({ error: "leadId is required" }, { status: 400 });

    await connectToDatabase();

    const lead = await Lead.findById(leadId).lean() as Record<string, unknown> | null;
    if (!lead) return Response.json({ error: "Lead not found" }, { status: 404 });

    const appointments = await Appointment.find({ clientName: lead.name })
      .sort({ date: -1 }).limit(10).lean() as Record<string, unknown>[];
    const smsHistory = await SMSMessage.find({ leadId })
      .sort({ createdAt: -1 }).limit(10).lean() as Record<string, unknown>[];

    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(lead.createdAt as string).getTime()) / 86400000
    );

    const appointmentSummary = appointments.map(a =>
      `${a.date}: "${a.title}" (${a.status})`
    ).join("\n") || "None";

    const smsSummary = smsHistory.map(m =>
      `[${m.type}/${m.status}] ${String(m.body).slice(0, 80)}`
    ).join("\n") || "None";

    const pipelineScore = PIPELINE_WEIGHTS[lead.pipelineStatus as string] ?? 20;

    const systemPrompt = `You are an expert CRM lead scoring analyst. Analyze leads and return a data-driven score.
Return ONLY valid JSON with exactly these fields:
{
  "score": <integer 0-100>,
  "grade": <"F"|"D"|"C"|"B"|"A"|"A+">,
  "urgency": <"low"|"medium"|"high">,
  "reasoning": "<2-3 sentence analysis>",
  "nextAction": "<single most important next step>",
  "insights": ["<insight 1>", "<insight 2>", "<insight 3>"]
}

Scoring rubric:
- Pipeline stage is weighted heavily (${pipelineScore}/100 baseline from stage)
- Recency: penalize leads untouched >14 days
- Appointments: completed=+15, scheduled=+10, cancelled=-5
- Communication: any SMS/email sent = +5, follow-up sent = +10
- Urgency: high if in Proposal Sent stage >3 days, or Qualified >7 days`;

    const userPrompt = `Score this lead:

Name: ${lead.name}
Email: ${lead.email}
Status: ${lead.status}
Pipeline Stage: ${lead.pipelineStatus}
Days since created: ${daysSinceCreation}
Welcome Email Sent: ${lead.welcomeEmailSent}
Follow-up Email Sent: ${lead.followUpSent}
Welcome SMS Sent: ${lead.welcomeSMSSent}
Follow-up SMS Sent: ${lead.followUpSMSSent}

Appointments (${appointments.length}):
${appointmentSummary}

SMS History (${smsHistory.length} messages):
${smsSummary}`;

    const response = await anthropic.messages.create({
      model: AI_MODEL_SMART,
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = extractJSON(rawText);

    if (!parsed) {
      return Response.json({ error: "Failed to parse AI response", raw: rawText }, { status: 502 });
    }

    return Response.json(parsed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
