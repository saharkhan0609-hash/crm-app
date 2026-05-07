"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import DashboardLayout from "@/components/DashboardLayout";

type Section = "profile" | "security" | "crm" | "integrations";

interface IntegrationStatus {
  smtp: boolean;
  twilio: boolean;
  anthropic: boolean;
  database: boolean;
}

const SECTIONS: { id: Section; label: string; icon: React.ReactNode }[] = [
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: "security",
    label: "Security",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
  },
  {
    id: "crm",
    label: "CRM Preferences",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    id: "integrations",
    label: "Integrations",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
  },
];

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? "bg-indigo-600" : "bg-gray-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
        ok ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-600 border border-red-200"
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${ok ? "bg-emerald-500" : "bg-red-500"}`} />
      {label}
    </span>
  );
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function ProfileSection({ session }: { session: ReturnType<typeof useSession>["data"] }) {
  const [name, setName] = useState(session?.user?.name ?? "");
  const [email, setEmail] = useState(session?.user?.email ?? "");
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const initials = (session?.user?.name ?? "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="space-y-6">
      <SectionCard title="Personal Information" description="Update your display name and email address.">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-xl font-bold shadow-md shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{session?.user?.name ?? "User"}</p>
            <p className="text-sm text-gray-500">{session?.user?.email ?? ""}</p>
            <p className="text-xs text-gray-400 mt-1">Avatar is auto-generated from your initials.</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Your full name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Job Title</label>
            <input
              type="text"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="e.g. Sales Manager"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              {saved && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Changes saved
                </span>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Save Changes
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Account Details" description="Your account information and subscription details.">
        <dl className="divide-y divide-gray-100">
          {[
            { label: "Account Type", value: "Administrator" },
            { label: "Member Since", value: new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" }) },
            { label: "Plan", value: "CRM Pro — Unlimited" },
          ].map(({ label, value }) => (
            <div key={label} className="py-3 flex justify-between items-center">
              <dt className="text-sm text-gray-500">{label}</dt>
              <dd className="text-sm font-medium text-gray-900">{value}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  );
}

function SecuritySection() {
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setForm({ current: "", next: "", confirm: "" });
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Change Password" description="Use a strong password you don't use anywhere else.">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Current Password</label>
            <input
              type="password"
              value={form.current}
              onChange={(e) => setForm({ ...form, current: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="••••••••"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
              <input
                type="password"
                value={form.next}
                onChange={(e) => setForm({ ...form, next: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={form.confirm}
                onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>
          <ul className="text-xs text-gray-400 space-y-1 pl-1">
            <li>• At least 8 characters</li>
            <li>• Mix of uppercase, lowercase, and numbers</li>
          </ul>
          <div className="flex items-center justify-between pt-1">
            <div>
              {saved && (
                <span className="text-sm text-emerald-600 font-medium flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Password updated
                </span>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors"
            >
              Update Password
            </button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title="Active Sessions" description="Devices currently signed into your account.">
        <div className="space-y-3">
          {[
            { device: "Windows 11 — Chrome", location: "Current session", active: true },
            { device: "iPhone — Safari", location: "Last seen 2 days ago", active: false },
          ].map(({ device, location, active }) => (
            <div key={device} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
              <div className="flex items-center gap-3">
                <div className={`w-2 h-2 rounded-full ${active ? "bg-emerald-500" : "bg-gray-300"}`} />
                <div>
                  <p className="text-sm font-medium text-gray-900">{device}</p>
                  <p className="text-xs text-gray-400">{location}</p>
                </div>
              </div>
              {!active && (
                <button className="text-xs text-rose-500 hover:text-rose-700 font-medium">Revoke</button>
              )}
              {active && (
                <span className="text-xs text-emerald-600 font-medium">This device</span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function CRMSection() {
  const [prefs, setPrefs] = useState({
    defaultStatus: "New",
    defaultPipeline: "New",
    timezone: "America/New_York",
    notifyNewLead: true,
    notifyDealClosed: true,
    notifyAppointment: true,
    notifyFollowUp: false,
    compactView: false,
    autoFollowUp: true,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Default Lead Settings" description="Applied automatically when creating new leads.">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Lead Status</label>
              <select
                value={prefs.defaultStatus}
                onChange={(e) => setPrefs({ ...prefs, defaultStatus: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {["New", "Contacted", "Qualified", "Proposal", "Closed", "Lost"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Default Pipeline Stage</label>
              <select
                value={prefs.defaultPipeline}
                onChange={(e) => setPrefs({ ...prefs, defaultPipeline: e.target.value })}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {["New", "Contacted", "Qualified", "Proposal Sent", "Negotiation", "Closed Won", "Closed Lost"].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Timezone</label>
            <select
              value={prefs.timezone}
              onChange={(e) => setPrefs({ ...prefs, timezone: e.target.value })}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              {[
                ["America/New_York", "Eastern Time (ET)"],
                ["America/Chicago", "Central Time (CT)"],
                ["America/Denver", "Mountain Time (MT)"],
                ["America/Los_Angeles", "Pacific Time (PT)"],
                ["Europe/London", "London (GMT)"],
                ["Europe/Paris", "Central European Time (CET)"],
                ["Asia/Dubai", "Gulf Standard Time (GST)"],
                ["Asia/Karachi", "Pakistan Standard Time (PKT)"],
                ["Asia/Tokyo", "Japan Standard Time (JST)"],
              ].map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end pt-1">
            <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition-colors">
              Save Preferences
            </button>
          </div>
          {saved && (
            <p className="text-sm text-emerald-600 font-medium flex items-center gap-1.5 justify-end -mt-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved
            </p>
          )}
        </form>
      </SectionCard>

      <SectionCard title="Notification Preferences" description="Choose which events trigger in-app notifications.">
        <div className="space-y-4">
          {[
            { key: "notifyNewLead" as const, label: "New lead created", desc: "When a lead is added manually or via automation" },
            { key: "notifyDealClosed" as const, label: "Deal closed", desc: "When a lead status changes to Closed" },
            { key: "notifyAppointment" as const, label: "Upcoming appointment", desc: "Reminder 1 hour before scheduled meetings" },
            { key: "notifyFollowUp" as const, label: "Follow-up due", desc: "When a lead follow-up hasn't been sent" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle
                checked={prefs[key]}
                onChange={(v) => setPrefs({ ...prefs, [key]: v })}
              />
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Automation Behavior" description="Control how automated workflows behave.">
        <div className="space-y-4">
          {[
            { key: "autoFollowUp" as const, label: "Automatic follow-up emails", desc: "Send follow-up email 24 hours after lead creation" },
            { key: "compactView" as const, label: "Compact table view", desc: "Show more leads per page with smaller row height" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm font-medium text-gray-900">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
              </div>
              <Toggle
                checked={prefs[key]}
                onChange={(v) => setPrefs({ ...prefs, [key]: v })}
              />
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function IntegrationCard({
  icon,
  name,
  description,
  status,
  envKeys,
}: {
  icon: React.ReactNode;
  name: string;
  description: string;
  status: boolean;
  envKeys: string[];
}) {
  return (
    <div className="flex items-start gap-4 py-5 border-b border-gray-100 last:border-0">
      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0 text-gray-600">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-semibold text-gray-900">{name}</p>
          <StatusBadge ok={status} label={status ? "Connected" : "Not configured"} />
        </div>
        <p className="text-xs text-gray-500 mb-2">{description}</p>
        <div className="flex flex-wrap gap-1.5">
          {envKeys.map((k) => (
            <code key={k} className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded font-mono">
              {k}
            </code>
          ))}
        </div>
      </div>
    </div>
  );
}

function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/integrations")
      .then((r) => r.json())
      .then((d) => setIntegrations(d))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <SectionCard
        title="Integration Status"
        description="Live status of your configured services based on environment variables."
      >
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-4">
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Checking integrations…
          </div>
        ) : (
          <div>
            <IntegrationCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              name="Email / SMTP"
              description="Sends welcome emails, follow-ups, and appointment reminders via your SMTP provider."
              status={integrations?.smtp ?? false}
              envKeys={["SMTP_HOST", "SMTP_USER", "SMTP_PASS"]}
            />
            <IntegrationCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              }
              name="Twilio SMS"
              description="Sends SMS messages, follow-ups, and bulk campaigns via Twilio's messaging API."
              status={integrations?.twilio ?? false}
              envKeys={["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"]}
            />
            <IntegrationCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              }
              name="Anthropic AI"
              description="Powers the AI Assistant for lead scoring, message generation, and follow-up sequences."
              status={integrations?.anthropic ?? false}
              envKeys={["ANTHROPIC_API_KEY"]}
            />
            <IntegrationCard
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582 4 8 4s8 1.79 8 4" />
                </svg>
              }
              name="MongoDB Database"
              description="Stores all leads, appointments, campaigns, and message history."
              status={integrations?.database ?? false}
              envKeys={["MONGODB_URI"]}
            />
          </div>
        )}
      </SectionCard>

      <SectionCard title="Webhook Endpoints" description="Use these URLs in your external service dashboards.">
        <div className="space-y-3">
          {[
            {
              label: "Twilio SMS Status Webhook",
              url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/sms/webhook`,
              desc: "Set this as the Status Callback URL in Twilio for delivery receipts.",
            },
            {
              label: "Email Open Tracker",
              url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/email/track`,
              desc: "Embedded in campaign emails to track open rates.",
            },
            {
              label: "Campaign Cron Processor",
              url: `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/email/process`,
              desc: "Call this endpoint on a schedule to trigger automations.",
            },
          ].map(({ label, url, desc }) => (
            <WebhookRow key={label} label={label} url={url} desc={desc} />
          ))}
        </div>
      </SectionCard>
    </div>
  );
}

function WebhookRow({ label, url, desc }: { label: string; url: string; desc: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  };

  return (
    <div className="rounded-lg border border-gray-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          <p className="text-xs text-gray-400 mt-0.5 mb-2">{desc}</p>
          <code className="text-xs font-mono text-indigo-700 bg-indigo-50 px-2 py-1 rounded break-all">
            {url}
          </code>
        </div>
        <button
          onClick={copy}
          className="shrink-0 mt-0.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          {copied ? "Copied!" : "Copy"}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const [active, setActive] = useState<Section>("profile");

  const renderContent = () => {
    switch (active) {
      case "profile":      return <ProfileSection session={session} />;
      case "security":     return <SecuritySection />;
      case "crm":          return <CRMSection />;
      case "integrations": return <IntegrationsSection />;
    }
  };

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 shrink-0">
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account, preferences, and integrations.</p>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left nav */}
        <aside className="w-60 bg-white border-r border-gray-200 shrink-0 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {SECTIONS.map(({ id, label, icon }) => (
              <button
                key={id}
                onClick={() => setActive(id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  active === id
                    ? "bg-indigo-50 text-indigo-700 border border-indigo-100"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className={active === id ? "text-indigo-600" : "text-gray-400"}>{icon}</span>
                {label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl space-y-6">{renderContent()}</div>
        </main>
      </div>
    </DashboardLayout>
  );
}
