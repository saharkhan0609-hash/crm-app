import Anthropic from "@anthropic-ai/sdk";

if (!process.env.ANTHROPIC_API_KEY) {
  console.warn("[AI] ANTHROPIC_API_KEY is not set — AI features will not work until configured.");
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? "missing",
});

// Use Sonnet for fast generation, Opus for deep analysis
export const AI_MODEL        = "claude-sonnet-4-6";
export const AI_MODEL_SMART  = "claude-opus-4-7";

export default anthropic;
