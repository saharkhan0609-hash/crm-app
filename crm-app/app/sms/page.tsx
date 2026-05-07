"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import SMSComposeModal from "@/components/SMSComposeModal";
import SMSCampaignModal from "@/components/SMSCampaignModal";
import { SMSMessage } from "@/types/sms";

// ─── Helpers ────────────────────────────────────────────────────────────────────

const TYPE_BADGE: Record<string, string> = {
  welcome:  "bg-indigo-50 text-indigo-700 border-indigo-200",
  followup: "bg-amber-50 text-amber-700 border-amber-200",
  reminder: "bg-blue-50 text-blue-700 border-blue-200",
  manual:   "bg-gray-100 text-gray-600 border-gray-200",
  campaign: "bg-violet-50 text-violet-700 border-violet-200",
};

const STATUS_BADGE: Record<string, string> = {
  pending:   "bg-gray-100 text-gray-500 border-gray-200",
  queued:    "bg-amber-50 text-amber-600 border-amber-200",
  sent:      "bg-blue-50 text-blue-700 border-blue-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed:    "bg-rose-50 text-rose-700 border-rose-200",
};

const STATUS_DOT: Record<string, string> = {
  pending:   "bg-gray-400",
  queued:    "bg-amber-400 animate-pulse",
  sent:      "bg-blue-400",
  delivered: "bg-emerald-400",
  failed:    "bg-rose-400",
};

const STATUS_ICON: Record<string, React.ReactElement> = {
  delivered: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
    </svg>
  ),
  failed: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  sent: (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
};

function formatRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function StatCard({
  label, value, sub, color, icon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color: string;
  icon: React.ReactElement;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-gray-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

type Tab = "history" | "campaigns" | "automations";

interface CampaignSummary {
  name: string;
  total: number;
  sent: number;
  failed: number;
  sentAt: string;
}

export default function SMSPage() {
  const [messages, setMessages]         = useState<SMSMessage[]>([]);
  const [loading, setLoading]           = useState(true);
  const [activeTab, setActiveTab]       = useState<Tab>("history");
  const [showCompose, setShowCompose]   = useState(false);
  const [showCampaign, setShowCampaign] = useState(false);
  const [filterType, setFilterType]     = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [campaigns, setCampaigns]       = useState<CampaignSummary[]>([]);
  const [processing, setProcessing]     = useState(false);
  const [processResult, setProcessResult] = useState<{ followUps: number; reminders: number } | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterType)   params.set("type", filterType);
      if (filterStatus) params.set("status", filterStatus);
      const res = await fetch(`/api/sms?${params}`);
      if (!res.ok) throw new Error("Failed");
      const data: SMSMessage[] = await res.json();
      setMessages(data);

      // Build campaign summaries from campaign-type messages
      const campaignMap = new Map<string, CampaignSummary>();
      for (const msg of data) {
        if (msg.type !== "campaign" || !msg.campaignName) continue;
        const existing = campaignMap.get(msg.campaignName);
        if (existing) {
          existing.total++;
          if (msg.status === "delivered" || msg.status === "sent" || msg.status === "queued") existing.sent++;
          if (msg.status === "failed") existing.failed++;
        } else {
          campaignMap.set(msg.campaignName, {
            name: msg.campaignName,
            total: 1,
            sent: msg.status !== "failed" ? 1 : 0,
            failed: msg.status === "failed" ? 1 : 0,
            sentAt: msg.createdAt,
          });
        }
      }
      setCampaigns(Array.from(campaignMap.values()));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filterType, filterStatus]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  async function runProcess() {
    setProcessing(true);
    setProcessResult(null);
    try {
      const res  = await fetch("/api/sms/process", { method: "POST" });
      const data = await res.json();
      if (data.processed) setProcessResult(data.processed);
      await fetchMessages();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  }

  function handleSent(msg: SMSMessage) {
    setMessages(prev => [msg, ...prev]);
    setShowCompose(false);
  }

  function handleCampaignSent(result: { campaignName: string; stats: { total: number; sent: number; failed: number } }) {
    setShowCampaign(false);
    fetchMessages();
    alert(`Campaign "${result.campaignName}" sent!\n✅ ${result.stats.sent} sent, ❌ ${result.stats.failed} failed`);
  }

  // Stats
  const total     = messages.length;
  const delivered = messages.filter(m => m.status === "delivered").length;
  const failed    = messages.filter(m => m.status === "failed").length;
  const pending   = messages.filter(m => m.status === "pending" || m.status === "queued").length;

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: "history",     label: "Message History", count: total },
    { id: "campaigns",   label: "Campaigns",        count: campaigns.length },
    { id: "automations", label: "Automations" },
  ];

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">SMS Automation</h1>
          <p className="text-sm text-gray-500 mt-0.5">Send and automate SMS messages to your leads via Twilio.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCampaign(true)}
            className="flex items-center gap-2 border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            SMS Campaign
          </button>
          <button
            onClick={() => setShowCompose(true)}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Compose SMS
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-slate-50 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Sent"
            value={total}
            sub="all time"
            color="bg-gray-100"
            icon={
              <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            }
          />
          <StatCard
            label="Delivered"
            value={delivered}
            sub={total ? `${Math.round((delivered / total) * 100)}% delivery rate` : "—"}
            color="bg-emerald-100"
            icon={
              <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            }
          />
          <StatCard
            label="Failed"
            value={failed}
            sub="delivery failures"
            color="bg-rose-100"
            icon={
              <svg className="w-5 h-5 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            label="In Transit"
            value={pending}
            sub="queued or pending"
            color="bg-amber-100"
            icon={
              <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-gray-100 px-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-4 px-1 mr-6 text-sm font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-green-500 text-green-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── History tab ─── */}
          {activeTab === "history" && (
            <div>
              {/* Filters */}
              <div className="px-6 py-3 border-b border-gray-50 flex items-center gap-3">
                <select
                  value={filterType}
                  onChange={e => setFilterType(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Types</option>
                  <option value="welcome">Welcome</option>
                  <option value="followup">Follow-up</option>
                  <option value="reminder">Reminder</option>
                  <option value="manual">Manual</option>
                  <option value="campaign">Campaign</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={e => setFilterStatus(e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="">All Statuses</option>
                  <option value="pending">Pending</option>
                  <option value="queued">Queued</option>
                  <option value="sent">Sent</option>
                  <option value="delivered">Delivered</option>
                  <option value="failed">Failed</option>
                </select>
                {(filterType || filterStatus) && (
                  <button
                    onClick={() => { setFilterType(""); setFilterStatus(""); }}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>

              {loading ? (
                <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
                  <svg className="animate-spin w-5 h-5 mr-2 text-green-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Loading messages…
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-300">
                  <svg className="w-14 h-14 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-400 mb-1">No messages yet</p>
                  <p className="text-xs text-gray-300">Send your first SMS to get started.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100">
                        <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Message</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {messages.map(msg => (
                        <tr key={msg._id} className="hover:bg-gray-50 transition-colors">
                          {/* Recipient */}
                          <td className="px-6 py-3.5">
                            <p className="font-semibold text-gray-900 truncate max-w-[140px]">
                              {msg.leadName ?? "Unknown"}
                            </p>
                            <p className="text-xs text-gray-400 font-mono">{msg.to}</p>
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${TYPE_BADGE[msg.type] ?? TYPE_BADGE.manual}`}>
                              {msg.type === "followup" ? "Follow-up" : msg.type}
                            </span>
                          </td>

                          {/* Message */}
                          <td className="px-4 py-3.5 max-w-[280px]">
                            <p className="text-sm text-gray-600 truncate">{msg.body}</p>
                            {msg.campaignName && (
                              <p className="text-xs text-violet-500 mt-0.5 truncate">{msg.campaignName}</p>
                            )}
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_BADGE[msg.status]}`}>
                              {STATUS_ICON[msg.status] ?? (
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[msg.status]}`} />
                              )}
                              {msg.status}
                            </span>
                          </td>

                          {/* Time */}
                          <td className="px-4 py-3.5 text-xs text-gray-400 whitespace-nowrap">
                            {formatRelative(msg.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ── Campaigns tab ─── */}
          {activeTab === "campaigns" && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-500">{campaigns.length} campaign{campaigns.length !== 1 ? "s" : ""} sent</p>
                <button
                  onClick={() => setShowCampaign(true)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New Campaign
                </button>
              </div>

              {campaigns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-300">
                  <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <p className="text-sm font-medium text-gray-400 mb-1">No campaigns yet</p>
                  <p className="text-xs text-gray-300">Create an SMS campaign to message multiple leads at once.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.map(c => (
                    <div key={c.name} className="flex items-center justify-between bg-gray-50 rounded-xl border border-gray-100 px-5 py-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{c.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{formatRelative(c.sentAt)}</p>
                      </div>
                      <div className="flex items-center gap-6 text-center">
                        <div>
                          <p className="text-lg font-extrabold text-gray-900">{c.total}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Total</p>
                        </div>
                        <div>
                          <p className="text-lg font-extrabold text-emerald-600">{c.sent}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Sent</p>
                        </div>
                        <div>
                          <p className="text-lg font-extrabold text-rose-500">{c.failed}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Failed</p>
                        </div>
                        <div>
                          <p className="text-lg font-extrabold text-indigo-600">
                            {c.total ? `${Math.round(((c.total - c.failed) / c.total) * 100)}%` : "—"}
                          </p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-wide">Success</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Automations tab ─── */}
          {activeTab === "automations" && (
            <div className="p-6 space-y-6">
              {/* Manual process trigger */}
              <div className="flex items-center justify-between bg-slate-50 rounded-xl border border-gray-100 px-5 py-4">
                <div>
                  <p className="text-sm font-bold text-gray-900">Run Automations Now</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Manually trigger follow-ups and reminders. In production, call{" "}
                    <code className="bg-gray-100 px-1 rounded text-[11px] font-mono">POST /api/sms/process</code> via cron.
                  </p>
                </div>
                <button
                  onClick={runProcess}
                  disabled={processing}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
                >
                  {processing ? (
                    <>
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Processing…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Run Now
                    </>
                  )}
                </button>
              </div>

              {processResult && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4 text-sm text-emerald-800">
                  ✅ Processed: <strong>{processResult.followUps}</strong> follow-up SMS
                  {processResult.followUps !== 1 ? "s" : ""},{" "}
                  <strong>{processResult.reminders}</strong> appointment reminder
                  {processResult.reminders !== 1 ? "s" : ""}
                </div>
              )}

              {/* Automation cards */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  {
                    emoji: "👋",
                    title: "Welcome SMS",
                    desc: "Sent automatically when a new lead is created. No cron needed.",
                    trigger: "Automatic on lead creation",
                    color: "bg-indigo-50 border-indigo-100",
                    stats: messages.filter(m => m.type === "welcome").length,
                  },
                  {
                    emoji: "⏰",
                    title: "24h Follow-up",
                    desc: "Sent to leads created >24 hours ago who haven't received a follow-up SMS.",
                    trigger: "POST /api/sms/process",
                    color: "bg-amber-50 border-amber-100",
                    stats: messages.filter(m => m.type === "followup").length,
                  },
                  {
                    emoji: "📅",
                    title: "Appointment Reminder",
                    desc: "Sent to clients with appointments scheduled for tomorrow.",
                    trigger: "POST /api/sms/process",
                    color: "bg-emerald-50 border-emerald-100",
                    stats: messages.filter(m => m.type === "reminder").length,
                  },
                ].map(item => (
                  <div key={item.title} className={`rounded-xl border p-5 ${item.color}`}>
                    <div className="flex items-start justify-between mb-3">
                      <p className="text-3xl">{item.emoji}</p>
                      <span className="text-xs font-bold text-gray-500 bg-white/70 px-2 py-0.5 rounded-full border border-white">
                        {item.stats} sent
                      </span>
                    </div>
                    <p className="text-sm font-bold text-gray-900 mb-1">{item.title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed mb-3">{item.desc}</p>
                    <code className="text-[10px] bg-white/80 border border-white px-2 py-1 rounded font-mono text-gray-600">
                      {item.trigger}
                    </code>
                  </div>
                ))}
              </div>

              {/* Webhook info */}
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                  Delivery Status Webhook
                </h3>
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  Twilio will POST delivery updates to this URL. Set it in your Twilio console under
                  your phone number's messaging configuration, or it's set automatically per-message.
                </p>
                <div className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-2.5">
                  <code className="text-sm font-mono text-indigo-700 flex-1">
                    {typeof window !== "undefined" ? window.location.origin : "https://your-domain.com"}/api/sms/webhook
                  </code>
                  <button
                    onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/sms/webhook`)}
                    className="text-xs text-gray-400 hover:text-gray-600 font-medium shrink-0"
                  >
                    Copy
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {showCompose && (
        <SMSComposeModal
          onClose={() => setShowCompose(false)}
          onSent={handleSent}
        />
      )}
      {showCampaign && (
        <SMSCampaignModal
          onClose={() => setShowCampaign(false)}
          onSent={handleCampaignSent}
        />
      )}
    </DashboardLayout>
  );
}
