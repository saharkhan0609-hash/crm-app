// All templates are kept under 160 chars to stay in a single SMS segment.

export function welcomeSMS(name: string): string {
  return `Hi ${name}! 👋 Welcome to CRM Pro. Our team will reach out shortly. We look forward to working with you! Reply STOP to unsubscribe.`;
}

export function followUpSMS(name: string): string {
  return `Hi ${name}, just following up from CRM Pro! Have questions or ready to move forward? Reply to this message anytime. Reply STOP to opt out.`;
}

export function appointmentReminderSMS(opts: {
  clientName: string;
  title: string;
  date: string;
  startTime: string;
}): string {
  const displayDate = new Date(opts.date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  const [h, m] = opts.startTime.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  const timeStr = `${hour}:${m.toString().padStart(2, "0")} ${ampm}`;

  return `Hi ${opts.clientName}! Reminder: "${opts.title}" is tomorrow (${displayDate}) at ${timeStr}. See you then! Reply STOP to opt out.`;
}

export function campaignSMS(name: string, message: string): string {
  // Replace {name} placeholder in campaign messages
  return message.replace(/\{name\}/gi, name);
}
