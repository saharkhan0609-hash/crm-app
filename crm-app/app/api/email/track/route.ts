import { connectToDatabase } from "@/lib/mongodb";
import EmailCampaign from "@/models/EmailCampaign";
import { NextRequest } from "next/server";

// 1×1 transparent GIF
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("t");
    if (token) {
      const { c: campaignId } = JSON.parse(
        Buffer.from(token, "base64url").toString("utf-8")
      );
      await connectToDatabase();
      await EmailCampaign.findByIdAndUpdate(campaignId, {
        $inc: { "stats.opened": 1 },
      });
    }
  } catch {
    // silently ignore tracking errors
  }

  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}
