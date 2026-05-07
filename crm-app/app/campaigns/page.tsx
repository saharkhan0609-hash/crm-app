"use client";

import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import CampaignModal from "@/components/CampaignModal";
import { EmailCampaign } from "@/types/campaign";

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, string> = {
  draft:     "bg-gray-100 text-gray-600 border-gray-200",
  scheduled: "bg-amber-50 text-amber-700 border-amber-200",
  sending:   "bg-blue-50 text-blue-700 border-blue-200",
  sent:      "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_DOT: Record<string, string> = {
  draft:     "bg-gray-400",
  scheduled: "bg-amber-400",
  sending:   "bg-blue-400 animate-pulse",
  sent:      "bg-emerald-400",
};

function openRate(stats: EmailCampaign["stats"]) {
  if (!stats.sent) return "—";
  return `${Math.round((stats.opened / stats.sent) * 100)}%`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatScheduled(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// ─── Stats card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, color,
}: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<EmailCampaign | undefined>(undefined);
  const [sending, setSending]     = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const res = await fetch("/api/campaigns");
      if (!res.ok) throw new Error("Failed");
      setCampaigns(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCampaigns(); }, [fetchCampaigns]);

  function handleSaved(campaign: EmailCampaign) {
    setCampaigns(prev => {
      const exists = prev.find(c => c._id === campaign._id);
      return exists
        ? prev.map(c => c._id === campaign._id ? campaign : c)
        : [campaign, ...prev];
    });
    setShowModal(false);
    setEditing(undefined);
  }

  async function handleSend(id: string) {
    setSending(id);
    try {
      const res = await fetch(`/api/campaigns/${id}/send`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Send failed");
      setCampaigns(prev => prev.map(c => c._id === id ? data : c));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Send failed");
    } finally {
      setSending(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/campaigns/${id}`, { method: "DELETE" });
      setCampaigns(prev => prev.filter(c => c._id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setPendingDelete(null);
    }
  }

  // Aggregate stats
  const totalSent   = campaigns.reduce((s, c) => s + c.stats.sent, 0);
  const totalOpened = campaigns.reduce((s, c) => s + c.stats.opened, 0);
  const totalFailed = campaigns.reduce((s, c) => s + c.stats.failed, 0);
  const globalOpenRate = totalSent
    ? `${Math.round((totalOpened / totalSent) * 100)}%`
    : "—";

  return (
    <DashboardLayout>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Email Campaigns</h1>
          <p className="text-sm text-gray-500 mt-0.5">Create and send automated email campaigns to your leads.</p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowModal(true); }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Campaign
        </button>
      </header>

      <main className="flex-1 overflow-auto p-6 bg-slate-50 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Total Campaigns"
            value={campaigns.length}
            sub={`${campaigns.filter(c => c.status === "sent").length} sent`}
            color="text-gray-900"
          />
          <StatCard
            label="Emails Sent"
            value={totalSent.toLocaleString()}
            sub="across all campaigns"
            color="text-indigo-600"
          />
          <StatCard
            label="Open Rate"
            value={globalOpenRate}
            sub={`${totalOpened} opens`}
            color="text-emerald-600"
          />
          <StatCard
            label="Failed"
            value={totalFailed.toLocaleString()}
            sub="delivery failures"
            color="text-rose-600"
          />
        </div>

        {/* Automation info banner */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex gap-4 items-start">
          <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-indigo-900 mb-0.5">Automations are active</p>
            <p className="text-xs text-indigo-700 leading-relaxed">
              Welcome emails fire automatically when a lead is created. Follow-up emails (24h) and appointment reminders are processed via{" "}
              <code className="bg-indigo-100 px-1 py-0.5 rounded text-indigo-800 font-mono text-[11px]">POST /api/email/process</code>.
              Schedule this with a cron job or Vercel Cron.
            </p>
          </div>
        </div>

        {/* Campaigns table */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-bold text-gray-900">All Campaigns</h2>
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full font-medium">
              {campaigns.length} total
            </span>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
              <svg className="animate-spin w-5 h-5 mr-2 text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Loading campaigns…
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-300">
              <svg className="w-14 h-14 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <p className="text-sm font-semibold text-gray-400 mb-1">No campaigns yet</p>
              <p className="text-xs text-gray-300">Create your first campaign to start reaching your leads.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Campaign</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Leads</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Sent</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Opened</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Failed</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Scheduled</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {campaigns.map(c => (
                    <tr key={c._id} className="hover:bg-gray-50 transition-colors">
                      {/* Name + subject */}
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900 truncate max-w-[180px]">{c.name}</p>
                        <p className="text-xs text-gray-400 truncate max-w-[180px] mt-0.5">{c.subject}</p>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_BADGE[c.status]}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status]}`} />
                          {c.status}
                        </span>
                      </td>

                      {/* Leads */}
                      <td className="px-4 py-4 text-gray-700 font-medium">
                        {c.leadIds.length}
                      </td>

                      {/* Sent */}
                      <td className="px-4 py-4">
                        <span className="text-indigo-600 font-semibold">{c.stats.sent}</span>
                      </td>

                      {/* Opened */}
                      <td className="px-4 py-4">
                        <div>
                          <span className="text-emerald-600 font-semibold">{c.stats.opened}</span>
                          <span className="text-xs text-gray-400 ml-1">({openRate(c.stats)})</span>
                        </div>
                      </td>

                      {/* Failed */}
                      <td className="px-4 py-4">
                        <span className={c.stats.failed > 0 ? "text-rose-600 font-semibold" : "text-gray-400"}>
                          {c.stats.failed}
                        </span>
                      </td>

                      {/* Scheduled */}
                      <td className="px-4 py-4 text-xs text-gray-500">
                        {formatScheduled(c.scheduledAt)}
                      </td>

                      {/* Created */}
                      <td className="px-4 py-4 text-xs text-gray-400">
                        {formatDate(c.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 justify-end">
                          {/* Send */}
                          {c.status !== "sent" && c.status !== "sending" && (
                            <button
                              onClick={() => handleSend(c._id)}
                              disabled={!!sending}
                              title="Send now"
                              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-semibold transition-colors disabled:opacity-50"
                            >
                              {sending === c._id ? (
                                <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                </svg>
                              ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                              )}
                              {sending === c._id ? "Sending…" : "Send"}
                            </button>
                          )}

                          {/* Edit */}
                          {c.status !== "sent" && (
                            <button
                              onClick={() => { setEditing(c); setShowModal(true); }}
                              title="Edit"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}

                          {/* Delete */}
                          {pendingDelete === c._id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleDelete(c._id)}
                                className="text-[10px] font-semibold px-2 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setPendingDelete(null)}
                                className="text-[10px] font-semibold px-2 py-1 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setPendingDelete(c._id)}
                              title="Delete"
                              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Automation reference */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Automation Triggers
          </h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: "👋",
                title: "Welcome Email",
                desc: "Fires instantly when a new lead is created via the Leads page.",
                trigger: "Automatic",
                color: "bg-indigo-50 border-indigo-100",
              },
              {
                icon: "⏰",
                title: "24h Follow-up",
                desc: "Sent to leads created >24 hours ago who haven't had a follow-up.",
                trigger: "POST /api/email/process",
                color: "bg-amber-50 border-amber-100",
              },
              {
                icon: "📅",
                title: "Appointment Reminder",
                desc: "Sent to clients with appointments scheduled for tomorrow.",
                trigger: "POST /api/email/process",
                color: "bg-emerald-50 border-emerald-100",
              },
            ].map(item => (
              <div key={item.title} className={`rounded-xl border p-4 ${item.color}`}>
                <p className="text-2xl mb-2">{item.icon}</p>
                <p className="text-sm font-bold text-gray-900 mb-1">{item.title}</p>
                <p className="text-xs text-gray-500 leading-relaxed mb-3">{item.desc}</p>
                <code className="text-[10px] bg-white/80 border border-white px-2 py-1 rounded font-mono text-gray-600">
                  {item.trigger}
                </code>
              </div>
            ))}
          </div>
        </div>
      </main>

      {showModal && (
        <CampaignModal
          campaign={editing}
          onClose={() => { setShowModal(false); setEditing(undefined); }}
          onSaved={handleSaved}
        />
      )}
    </DashboardLayout>
  );
}
