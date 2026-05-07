import twilio from "twilio";

// Lazily initialised so the app doesn't crash when credentials are absent
let _client: ReturnType<typeof twilio> | null = null;

function getClient() {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    throw new Error(
      "Twilio credentials missing — set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env.local"
    );
  }
  if (!_client) {
    _client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }
  return _client;
}

export interface SendSMSOptions {
  to: string;
  body: string;
}

export async function sendSMS({ to, body }: SendSMSOptions) {
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error("TWILIO_PHONE_NUMBER is not set");

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const client = getClient();

  return client.messages.create({
    to,
    from,
    body,
    statusCallback: `${appUrl}/api/sms/webhook`,
  });
}
