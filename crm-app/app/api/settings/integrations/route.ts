export async function GET() {
  return Response.json({
    smtp:      !!(process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_HOST),
    twilio:    !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER),
    anthropic: !!process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY !== "sk-ant-your-key-here",
    database:  !!process.env.MONGODB_URI,
  });
}
