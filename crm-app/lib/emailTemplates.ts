const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function baseLayout(content: string, preheader = ""): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>CRM Pro</title>
  <style>
    body { margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; }
    a { color:#4f46e5; }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ""}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:rgba(255,255,255,0.15);border-radius:10px;padding:8px 12px;display:inline-block;">
                    <span style="color:#ffffff;font-size:18px;font-weight:800;letter-spacing:-0.5px;">⚡ CRM Pro</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.6;">
                You're receiving this because you're a contact in CRM Pro.
                <br/>© ${new Date().getFullYear()} CRM Pro. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ─── Welcome Email ─────────────────────────────────────────────────────────────

export function welcomeEmailTemplate(leadName: string): string {
  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#0f172a;">
      Welcome, ${leadName}! 👋
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.7;">
      We're thrilled to have you on board. Our team will be reaching out soon to understand your needs and explore how we can help.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:28px;border:1px solid #e2e8f0;width:100%;">
      <tr>
        <td>
          <p style="margin:0 0 12px;font-size:13px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:0.05em;">What's next?</p>
          <table cellpadding="0" cellspacing="0">
            <tr>
              <td style="padding:6px 0;">
                <span style="display:inline-block;width:20px;height:20px;background:#4f46e5;border-radius:50%;color:white;font-size:11px;font-weight:700;text-align:center;line-height:20px;margin-right:10px;">1</span>
                <span style="font-size:14px;color:#334155;">A team member will contact you within 24 hours</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="display:inline-block;width:20px;height:20px;background:#4f46e5;border-radius:50%;color:white;font-size:11px;font-weight:700;text-align:center;line-height:20px;margin-right:10px;">2</span>
                <span style="font-size:14px;color:#334155;">We'll schedule a free discovery call</span>
              </td>
            </tr>
            <tr>
              <td style="padding:6px 0;">
                <span style="display:inline-block;width:20px;height:20px;background:#4f46e5;border-radius:50%;color:white;font-size:11px;font-weight:700;text-align:center;line-height:20px;margin-right:10px;">3</span>
                <span style="font-size:14px;color:#334155;">We'll put together a tailored solution for you</span>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#4f46e5;border-radius:10px;">
          <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
            Visit Our Website →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:32px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
      Best regards,<br/>
      <strong style="color:#0f172a;">The CRM Pro Team</strong>
    </p>
  `;
  return baseLayout(content, `Welcome to CRM Pro, ${leadName}!`);
}

// ─── Follow-up Email ────────────────────────────────────────────────────────────

export function followUpEmailTemplate(leadName: string): string {
  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#0f172a;">
      Just checking in, ${leadName} 👋
    </h1>
    <p style="margin:0 0 24px;font-size:15px;color:#64748b;line-height:1.7;">
      It's been a day since you connected with us and we wanted to follow up. We'd love to learn more about your goals and see how we can make a difference.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#eff6ff;border-left:4px solid #4f46e5;border-radius:0 12px 12px 0;padding:20px 24px;margin-bottom:28px;width:100%;">
      <tr>
        <td>
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#1e40af;">Quick question</p>
          <p style="margin:0;font-size:14px;color:#1d4ed8;line-height:1.6;">
            What's the biggest challenge you're currently facing in your business? Reply to this email and let us know — we read every response.
          </p>
        </td>
      </tr>
    </table>
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#4f46e5;border-radius:10px;margin-right:12px;">
          <a href="${APP_URL}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;">
            Schedule a Call →
          </a>
        </td>
      </tr>
    </table>
    <p style="margin:32px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
      Warm regards,<br/>
      <strong style="color:#0f172a;">The CRM Pro Team</strong>
    </p>
  `;
  return baseLayout(content, `A quick follow-up for you, ${leadName}`);
}

// ─── Appointment Reminder ───────────────────────────────────────────────────────

export function appointmentReminderTemplate(opts: {
  clientName: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  notes?: string;
}): string {
  const displayDate = new Date(opts.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  function fmt(t: string) {
    const [h, m] = t.split(":").map(Number);
    const ampm = h >= 12 ? "PM" : "AM";
    return `${h % 12 || 12}:${m.toString().padStart(2, "0")} ${ampm}`;
  }

  const content = `
    <div style="display:inline-block;background:#fef3c7;border-radius:8px;padding:6px 14px;margin-bottom:20px;">
      <span style="font-size:13px;font-weight:700;color:#92400e;">⏰ Appointment Reminder</span>
    </div>
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:800;color:#0f172a;">
      Your appointment is tomorrow, ${opts.clientName}!
    </h1>
    <p style="margin:0 0 28px;font-size:15px;color:#64748b;line-height:1.7;">
      This is a friendly reminder about your upcoming appointment with us.
    </p>
    <table cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:16px;padding:28px;margin-bottom:28px;border:1px solid #e2e8f0;width:100%;">
      <tr>
        <td>
          <p style="margin:0 0 20px;font-size:18px;font-weight:800;color:#0f172a;">${opts.title}</p>
          <table cellpadding="0" cellspacing="0" width="100%">
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Date</span><br/>
                <span style="font-size:15px;font-weight:600;color:#0f172a;">${displayDate}</span>
              </td>
            </tr>
            <tr>
              <td style="padding:8px 0;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Time</span><br/>
                <span style="font-size:15px;font-weight:600;color:#0f172a;">${fmt(opts.startTime)} – ${fmt(opts.endTime)}</span>
              </td>
            </tr>
            ${opts.notes ? `
            <tr>
              <td style="padding:8px 0;">
                <span style="font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Notes</span><br/>
                <span style="font-size:14px;color:#475569;line-height:1.6;">${opts.notes}</span>
              </td>
            </tr>` : ""}
          </table>
        </td>
      </tr>
    </table>
    <p style="margin:0 0 8px;font-size:14px;color:#64748b;">Need to reschedule? Reply to this email and we'll find a new time that works for you.</p>
    <p style="margin:28px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
      See you soon,<br/>
      <strong style="color:#0f172a;">The CRM Pro Team</strong>
    </p>
  `;
  return baseLayout(content, `Reminder: ${opts.title} tomorrow`);
}

// ─── Campaign Email ─────────────────────────────────────────────────────────────

export function campaignEmailTemplate(opts: {
  leadName: string;
  subject: string;
  body: string;
  trackingPixelUrl?: string;
}): string {
  const pixel = opts.trackingPixelUrl
    ? `<img src="${opts.trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />`
    : "";

  const content = `
    <h1 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0f172a;">
      Hi ${opts.leadName},
    </h1>
    <div style="font-size:15px;color:#334155;line-height:1.8;">
      ${opts.body}
    </div>
    <p style="margin:32px 0 0;font-size:14px;color:#64748b;line-height:1.6;">
      Best regards,<br/>
      <strong style="color:#0f172a;">The CRM Pro Team</strong>
    </p>
    ${pixel}
  `;
  return baseLayout(content, opts.subject);
}
