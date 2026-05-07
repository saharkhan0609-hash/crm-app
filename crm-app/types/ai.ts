export interface LeadScore {
  score: number;
  grade: "F" | "D" | "C" | "B" | "A" | "A+";
  urgency: "low" | "medium" | "high";
  reasoning: string;
  nextAction: string;
  insights: string[];
}

export interface GeneratedEmail {
  type: "email";
  subject: string;
  body: string;
}

export interface GeneratedSMS {
  type: "sms";
  body: string;
}

export interface FollowUpPlan {
  type: "followup_plan";
  nextAction: string;
  reasoning: string;
  urgency: "low" | "medium" | "high";
  suggestions: string[];
}

export type GeneratedContent = GeneratedEmail | GeneratedSMS | FollowUpPlan;

export interface SequenceStep {
  day: number;
  type: "email" | "sms";
  subject?: string;
  body: string;
  notes: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}
