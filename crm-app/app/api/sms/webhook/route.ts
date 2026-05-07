import { connectToDatabase } from "@/lib/mongodb";
import SMSMessage from "@/models/SMSMessage";
import { NextRequest } from "next/server";

// Twilio calls this URL with delivery status updates.
// Configure it in your Twilio console or pass as statusCallback when sending.
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const messageSid    = formData.get("MessageSid") as string | null;
    const messageStatus = formData.get("MessageStatus") as string | null;
    const errorCode     = formData.get("ErrorCode") as string | null;

    if (!messageSid || !messageStatus) {
      return new Response("Missing fields", { status: 400 });
    }

    // Map Twilio statuses to our status enum
    const statusMap: Record<string, string> = {
      queued:      "queued",
      accepted:    "queued",
      sending:     "queued",
      sent:        "sent",
      delivered:   "delivered",
      undelivered: "failed",
      failed:      "failed",
    };

    const mappedStatus = statusMap[messageStatus] ?? "sent";

    await connectToDatabase();
    await SMSMessage.findOneAndUpdate(
      { twilioSid: messageSid },
      {
        status: mappedStatus,
        ...(errorCode ? { error: `Twilio error ${errorCode}` } : {}),
      }
    );

    // Twilio expects a 204 or empty 200
    return new Response(null, { status: 204 });
  } catch (error) {
    console.error("[SMS webhook]", error);
    return new Response("Internal error", { status: 500 });
  }
}
