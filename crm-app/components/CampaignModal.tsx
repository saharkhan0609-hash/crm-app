"use client";

import { useState, useEffect } from "react";
import { EmailCampaign } from "@/types/campaign";

interface Lead {
  _id: string;
  name: string;
  email: string;
}

interface Props {
  campaign?: EmailCampaign;
  onClose: () => void;
  onSaved: (campaign: EmailCampaign) => void;
}

export default function CampaignModal({ campaign, onClose, onSaved }: Props) {
  const isEdit = !!campaign;

  const [form, setForm] = useState({
    name: "",
    subject: "",
    body: "",
    scheduledAt: "",
  });
  const [selectedLeads, setSelectedLeads] = useState<string[]>([]);
  const [allLeads, setAllLeads]           = useState<Lead[]>([]);
  const [leadSearch, setLeadSearch]       = useState("");
  const [error, setError]   = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/leads")
      .then(r => r.json())
      .then(setAllLeads)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEdit && campaign) {
      setForm({
        name: campaign.name,
        subject: campaign.subject,
        body: campaign.body,
        scheduledAt: campaign.scheduledAt
          ? new Date(campaign.scheduledAt).toISOString().slice(0, 16)
          : "",
      });
      setSelectedLeads(campaign.leadIds);
    }
  }, [isEdit, campaign]);

  function set(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }));
    setError("");
  }

  function toggleLead(id: string) {
    setSelectedLeads(prev =>
      prev.includes(id) ? prev.filter(l => l !== id) : [...prev, id]
    );
  }

  function selectAll() {
    setSelectedLeads(filteredLeads.map(l => l._id));
  }

  function clearAll() {
    setSelectedLeads([]);
  }

  const filteredLeads = allLeads.filter(
    l =>
      l.name.toLowerCase().includes(leadSearch.toLowerCase()) ||
      l.email.toLowerCase().includes(leadSearch.toLowerCase())
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.subject || !form.body) {
      setError("Name, subject and body are required.");
      return;
    }
    if (selectedLeads.length === 0) {
      setError("Select at least one lead.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        subject: form.subject,
        body: form.body,
        leadIds: selectedLeads,
        scheduledAt: form.scheduledAt || undefined,
      };

      const url    = isEdit ? `/api/campaigns/${campaign!._id}` : "/api/campaigns";
      const method = isEdit ? "PUT" : "POST";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onSaved(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">
            {isEdit ? "Edit Campaign" : "New Campaign"}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg">
                {error}
              </div>
            )}

            {/* Name */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Campaign Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder="e.g. May Follow-up Blast"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Email Subject
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={e => set("subject", e.target.value)}
                placeholder="e.g. We have something special for you"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Body */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Email Body <span className="normal-case font-normal text-gray-400">(HTML supported)</span>
              </label>
              <textarea
                value={form.body}
                onChange={e => set("body", e.target.value)}
                placeholder="Write your email content here. You can use HTML tags for formatting."
                rows={6}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none font-mono"
              />
            </div>

            {/* Schedule */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
                Schedule <span className="normal-case font-normal text-gray-400">(leave blank to save as draft)</span>
              </label>
              <input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => set("scheduledAt", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {/* Lead selection */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Select Leads{" "}
                  <span className="normal-case font-medium text-indigo-600">
                    ({selectedLeads.length} selected)
                  </span>
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    All
                  </button>
                  <span className="text-gray-300">|</span>
                  <button
                    type="button"
                    onClick={clearAll}
                    className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                  >
                    Clear
                  </button>
                </div>
              </div>

              <input
                type="text"
                placeholder="Search leads..."
                value={leadSearch}
                onChange={e => setLeadSearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent mb-2"
              />

              <div className="border border-gray-200 rounded-lg overflow-hidden max-h-44 overflow-y-auto">
                {filteredLeads.length === 0 ? (
                  <div className="py-6 text-center text-sm text-gray-400">No leads found</div>
                ) : (
                  filteredLeads.map(lead => (
                    <label
                      key={lead._id}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 cursor-pointer border-b border-gray-50 last:border-b-0"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeads.includes(lead._id)}
                        onChange={() => toggleLead(lead._id)}
                        className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900 truncate">{lead.name}</p>
                        <p className="text-xs text-gray-500 truncate">{lead.email}</p>
                      </div>
                    </label>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 px-4 py-2.5 rounded-lg bg-indigo-600 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60 transition-colors"
            >
              {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Campaign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
